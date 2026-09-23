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
    const overlapX = Math.min(a.posX + a.width, b.posX + b.width) - Math.max(a.posX, b.posX);
    const overlapY = Math.min(a.posY + a.height, b.posY + b.height) - Math.max(a.posY, b.posY);

    if (overlapX <= 0 || overlapY <= 0) {
        return;
    }

    const pushDir = a.posX <= b.posX ? -1 : 1; // a nach links, b nach rechts (oder umgekehrt)
    const separation = overlapX / 2;
    a.posX += pushDir * separation;
    b.posX -= pushDir * separation;

    const relSpeed = Math.abs(a.velX - b.velX) + Math.abs(a.velY - b.velY);
    const impulse = PLAYER_BUMP_IMPULSE + relSpeed * 0.05;

    applyBalanceImpulse(a, -pushDir * impulse);
    applyBalanceImpulse(b, pushDir * impulse);
    applyAngularImpulse(a.torso, -pushDir * impulse * 0.5);
    applyAngularImpulse(b.torso, pushDir * impulse * 0.5);
}

// Kreis-Distanz-Check (Ball) gegen die Bounding-Box-Mitte des Spielers
function resolveBallCollision(player, ball) {
    const centerX = player.posX + player.width / 2;
    const centerY = player.posY + player.height / 2;

    const dx = ball.posX - centerX;
    const dy = ball.posY - centerY;
    const dist = Math.hypot(dx, dy) || 0.0001; // Division durch 0 vermeiden
    const collisionRange = ball.radius + player.width;

    if (dist >= collisionRange) {
        return;
    }

    const nx = dx / dist;
    const ny = dy / dist;

    // Ball wegstoßen, mit etwas Schwung vom Spieler
    ball.velX = nx * BALL_BOUNCE_SPEED + player.velX * 0.4;
    ball.velY = ny * BALL_BOUNCE_SPEED + player.velY * 0.4 + BALL_BOUNCE_LIFT;

    // aus der Überlappung herausschieben, damit der Ball nicht "klebt"
    const pushOut = collisionRange - dist;
    ball.posX += nx * pushOut;
    ball.posY += ny * pushOut;

    // leichter Ausweich-Wobble beim Spieler
    applyBalanceImpulse(player, -nx * BALL_BUMP_IMPULSE);
    applyAngularImpulse(player.torso, -nx * BALL_BUMP_IMPULSE);
}

export function resolveCollisions(player1, player2, basketBall) {   
    resolvePlayerCollision(player1, player2);
    resolveBallCollision(player1, basketBall);
    resolveBallCollision(player2, basketBall);
}



// --------------------------------
// BALL
// --------------------------------

// Ball an Seitenwänden und auf der Wiesenoberkante abprallen lassen (mit Energieverlust).
// Läuft im selben normalisierten Modellraum (0..1, posY wächst nach oben) wie die Spieler.
export function updateBallBounds(ball, grassHeight) {
    if (ball.posX - ball.radius < 0) {
        ball.posX = ball.radius;
        ball.velX = Math.abs(ball.velX) * BALL_WALL_RESTITUTION;
    } else if (ball.posX + ball.radius > 1) {
        ball.posX = 1 - ball.radius;
        ball.velX = -Math.abs(ball.velX) * BALL_WALL_RESTITUTION;
    }

    const minBallY = grassHeight + ball.radius;
    if (ball.posY < minBallY) {
        ball.posY = minBallY;
        ball.velY = Math.abs(ball.velY) * BALL_GROUND_RESTITUTION;
        ball.velX *= BALL_GROUND_FRICTION; // bremst seitlich ab, statt endlos weiterzurollen
    }
}

// Harte Obergrenze für die Ballgeschwindigkeit. Anders als bei Boden-/Wandprall (Restitution < 1,
// verliert automatisch Energie) setzt eine Spielerkollision die Geschwindigkeit einfach neu -
// ohne diesen Clamp gäbe es keinen Deckel, falls mehrere Treffer kurz hintereinander passieren.
function clampBallSpeed(ball, ball_max_speed) {
    const speed = Math.hypot(ball.velX, ball.velY);
    if (speed > ball_max_speed) {
        const scale = ball_max_speed / speed;
        ball.velX *= scale;
        ball.velY *= scale;
    }
}

export function updateBall(ball, grassHeight) {
    updateBallBounds(ball, grassHeight);
    clampBallSpeed(ball, BALL_MAX_SPEED);
}