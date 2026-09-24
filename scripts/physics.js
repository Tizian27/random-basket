// physics.js
import { clamp } from "./utils/mathFunctions.js"




// --------------------------------
// Ragdoll-Wobble (Balance + Segment-Federphysik)
// --------------------------------
// Keine echte Rigid-Body-Engine: jedes Segment ist ein gedämpfter Feder-Schwinger,
// der zu einem Ziel-Winkel zurückfedert. "balance" ist ein pro Spieler treibender
// Wert, der diesen Ziel-Winkel des Torsos vorgibt und ohne aktive Steuerung leicht
// zufällig driftet -> komödiantisches Dauerwackeln statt stabilem Stehen.
const BALANCE_NOISE = 0.015            // zufälliges "Zittern" pro Frame (nur solange IDLE_SETTLE_FRAMES nicht überschritten ist)
const BALANCE_CORRECTION_ACTIVE = 0.12 // Rückstellkraft bei aktiver Steuerung
const BALANCE_CORRECTION_IDLE = 0.02   // Rückstellkraft im Leerlauf (schwach -> Drift, solange noch "kürzlich" gesprungen wurde)
const BALANCE_DAMPING = 0.92
const MAX_BALANCE = 1.1                // rad, harte Grenze bevor die Figur "umkippt"
const MAX_BALANCE_VEL = 0.3
const IDLE_SETTLE_FRAMES = 180         // ~3s bei 60fps: so lange nach dem letzten Sprung wird noch gewackelt/gedriftet, danach komplett still

const SEGMENT_SPRING = 0.008           // noch weichere Feder -> spürbar längere Schwingungsdauer (Periode ~ 1/sqrt(SEGMENT_SPRING))
const SEGMENT_DAMPING = 0.985          // an die längere Periode angepasst, damit weiterhin mehrere Schwingungen sichtbar ausklingen statt zu schnell zu stoppen
const MAX_ANGULAR_VEL = 0.05         // weiter gedeckelt: pro Frame noch weniger Drehung möglich -> insgesamt sanftere, langsamere Bewegung


const PLAYER_BUMP_IMPULSE = 0.35       // Basis-Wackel-Impuls bei Spieler-Kollision (Winkel, unabhängig vom Koordinatensystem)
const BALL_BUMP_IMPULSE = 0.15         // Wackel-Impuls beim Ballkontakt

const BALL_BOUNCE_SPEED = 0.07         // Abprallgeschwindigkeit des Balls bei Treffer (normalisierte Einheiten)
const BALL_BOUNCE_LIFT = 0.02          // kleiner Extra-Lift nach oben beim Treffer
const BALL_GROUND_RESTITUTION = 0.6
const BALL_WALL_RESTITUTION = 0.7
const BALL_GROUND_FRICTION = 0.9       // bremst den Ball seitlich ab, während er auf dem Boden liegt

const BALL_MAX_SPEED = 0.12            // harte Obergrenze für die Ballgeschwindigkeit (sonst kein Max bei mehreren Treffern hintereinander)


// --------------------------------
// Ragdoll-Physik
// --------------------------------

export function applyBalanceImpulse(player, amount) {
    player.balanceVel += amount;
}

export function applyAngularImpulse(segment, amount) {
    segment.angularVel += amount;
}

// Balance ist der treibende Wert für den Ziel-Winkel des Torsos. Ohne aktive
// Steuerung ("activeInput") ist die Rückstellkraft schwach -> die Figur driftet spürbar statt
// kerzengerade stehenzubleiben - aber nur eine Weile nach dem letzten Sprung (IDLE_SETTLE_FRAMES),
// danach hört das Rauschen ganz auf und Feder+Dämpfung bringen die Figur komplett zur Ruhe.

function updateBalance(player, activeInput) {
    player.framesSinceJump++;

    if (player.framesSinceJump < IDLE_SETTLE_FRAMES) {
        player.balanceVel += (Math.random() - 0.5) * BALANCE_NOISE;
    }

    const correction = activeInput ? BALANCE_CORRECTION_ACTIVE : BALANCE_CORRECTION_IDLE;
    player.balanceVel += -player.balance * correction;

    player.balanceVel *= BALANCE_DAMPING;
    player.balanceVel = clamp(player.balanceVel, -MAX_BALANCE_VEL, MAX_BALANCE_VEL);

    player.balance += player.balanceVel;
    player.balance = clamp(player.balance, -MAX_BALANCE, MAX_BALANCE);
}

// Gedämpfter Feder-Schwinger: das Segment dreht sich Richtung restAngle,
// bestehende angularVel (z.B. aus Impulsen) klingt dabei aus statt abrupt
// zu stoppen -> das typische "Wobble"-Überschwingen.
function updateSegmentPhysics(segment, restAngle) {
    const angleError = segment.angle - restAngle;
    segment.angularVel += -angleError * SEGMENT_SPRING;
    segment.angularVel *= SEGMENT_DAMPING;
    segment.angularVel = clamp(segment.angularVel, -MAX_ANGULAR_VEL, MAX_ANGULAR_VEL);

    segment.angle += segment.angularVel;
}

export function updateRagdoll(player, activeInput) {
    // In der Luft kein Pendeln: Winkel/Balance bleiben eingefroren, wie sie beim Absprung waren,
    // und laufen erst beim nächsten Bodenkontakt (Landungs-Impuls) wieder weiter.
    if (!player.onGround) {
        return;
    }

    updateBalance(player, activeInput);

    // Torso zeigt in Ruhe nach oben (Math.PI) und kippt um "balance" aus der Hüfte aus.
    // Beine und Arm haben keine eigene Federphysik mehr - sie werden in syncRagdoll starr
    // aus der aktuellen Torso-Neigung abgeleitet (kein unabhängiges Wackeln).
    updateSegmentPhysics(player.torso, Math.PI + player.balance);
}

// Einfache AABB-Trennung + Wackel-Impuls, keine echte Rigid-Body-Auflösung
export function resolvePlayerCollision(a, b) {
    const overlapX = Math.min(a.pos.x + a.width, b.pos.x + b.width) - Math.max(a.pos.x, b.pos.x);
    const overlapY = Math.min(a.pos.y + a.height, b.pos.y + b.height) - Math.max(a.pos.y, b.pos.y);

    if (overlapX <= 0 || overlapY <= 0) {
        return;
    }

    const pushDir = a.pos.x <= b.pos.x ? -1 : 1; // a nach links, b nach rechts (oder umgekehrt)
    const separation = overlapX / 2;
    a.pos.x += pushDir * separation;
    b.pos.x -= pushDir * separation;

    const relSpeed = Math.abs(a.vel.x - b.vel.x) + Math.abs(a.vel.y - b.vel.y);
    const impulse = PLAYER_BUMP_IMPULSE + relSpeed * 0.05;

    applyBalanceImpulse(a, -pushDir * impulse);
    applyBalanceImpulse(b, pushDir * impulse);
    applyAngularImpulse(a.torso, -pushDir * impulse * 0.5);
    applyAngularImpulse(b.torso, pushDir * impulse * 0.5);
}

// Kreis-Distanz-Check (Ball) gegen die Bounding-Box-Mitte des Spielers
function resolveBallCollision(player, ball) {
    const centerX = player.pos.x + player.width / 2;
    const centerY = player.pos.y + player.height / 2;

    const dx = ball.pos.x - centerX;
    const dy = ball.pos.y - centerY;
    const dist = Math.hypot(dx, dy) || 0.0001; // Division durch 0 vermeiden
    const collisionRange = ball.radius + player.width;

    if (dist >= collisionRange) {
        return;
    }

    const nx = dx / dist;
    const ny = dy / dist;

    // Ball wegstoßen, mit etwas Schwung vom Spieler
    ball.vel.x = nx * BALL_BOUNCE_SPEED + player.vel.x * 0.4;
    ball.vel.y = ny * BALL_BOUNCE_SPEED + player.vel.y * 0.4 + BALL_BOUNCE_LIFT;

    // aus der Überlappung herausschieben, damit der Ball nicht "klebt"
    const pushOut = collisionRange - dist;
    ball.pos.x += nx * pushOut;
    ball.pos.y += ny * pushOut;

    // leichter Ausweich-Wobble beim Spieler
    applyBalanceImpulse(player, -nx * BALL_BUMP_IMPULSE);
    applyAngularImpulse(player.torso, -nx * BALL_BUMP_IMPULSE);
}

export function resolveCollisions(players, balls) {

    // Player ↔ Player
    for (let i = 0; i < players.length; i++) {
        for (let j = i + 1; j < players.length; j++) {
            resolvePlayerCollision(players[i], players[j]);
        }
    }

    // Player ↔ Ball
    for (let i = 0; i < players.length; i++) {
        for (let j = 0; j < balls.length; j++) {
            resolveBallCollision(players[i], balls[j]);
        }
    }
}