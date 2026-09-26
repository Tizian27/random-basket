// physics.js

import { Vec2d } from "./utils/vec2d.js"

const PLAYER_BUMP_IMPULSE = 0.35       // Basis-Wackel-Impuls bei Spieler-Kollision (Winkel, unabhängig vom Koordinatensystem)
const BALL_BUMP_IMPULSE = 0.15         // Wackel-Impuls beim Ballkontakt
const BALL_BOUNCE_SPEED = 0.01         // Abprallgeschwindigkeit des Balls bei Treffer (normalisierte Einheiten)
const BALL_BOUNCE_LIFT = 0.02          // kleiner Extra-Lift nach oben beim Treffer

// --------------------------------
// Ragdoll-Physik
// --------------------------------

export function applyBalanceImpulse(player, amount) {
    player.balanceVel += amount;
}

export function applyAngularImpulse(segment, amount) {
    segment.angularVel += amount;
}

// Einfache AABB-Trennung + Wackel-Impuls, keine echte Rigid-Body-Auflösung
export function resolvePlayerCollision(a, b) {
    const overlapX = Math.min(a.pos.x + a.width, b.pos.x + b.width) - Math.max(a.pos.x, b.pos.x);
    const overlapY = Math.min(a.pos.y + a.height, b.pos.y + b.height) - Math.max(a.pos.y, b.pos.y);

    if (overlapX <= 0 || overlapY <= 0) {
        return;
    }

    const dir = b.pos.sub(a.pos).normalized();
    const separation = overlapX / 2;
    const separationVec = new Vec2d(dir.x * separation, 0);

    a.pos.subMut(separationVec.scale(2));
    b.pos.addMut(separationVec.scale(2));

    const relVel = a.vel.sub(b.vel);
    const relSpeed = relVel.length();

    const impulse = PLAYER_BUMP_IMPULSE + relSpeed * 0.05;

    applyBalanceImpulse(a, -dir.x * impulse);
    applyBalanceImpulse(b, dir.x * impulse);
    applyAngularImpulse(a.torso, -dir.x * impulse * 0.5);
    applyAngularImpulse(b.torso, dir.x * impulse * 0.5);
}

// Kreis-Distanz-Check (Ball) gegen die Bounding-Box-Mitte des Spielers
function resolveBallCollision(player, ball) {
    const playerCenter = {
        x: player.pos.x + player.width / 2,
        y: player.pos.y + player.height / 2
    };

    const delta = ball.pos.sub(playerCenter);

    const dist = delta.length() || 0.0001; // Division durch 0 vermeiden
    const collisionRange = ball.radius + player.width;

    if (dist >= collisionRange) {
        return;
    }

    const normal = delta.normalized();

    // Ball wegstoßen, mit etwas Schwung vom Spieler
    ball.vel.set(
        normal.x * BALL_BOUNCE_SPEED + player.vel.x * 0.4,
        normal.y * BALL_BOUNCE_SPEED + player.vel.y * 0.4 + BALL_BOUNCE_LIFT
    );

    // aus der Überlappung herausschieben, damit der Ball nicht "klebt"
    const pushOut = collisionRange - dist;
    ball.pos.addMut(normal.scale(pushOut));

    // leichter Ausweich-Wobble beim Spieler
    applyBalanceImpulse(player, -normal.x * BALL_BUMP_IMPULSE);
    applyAngularImpulse(player.torso, -normal.x * BALL_BUMP_IMPULSE);
}

// resolve collision between a list of players and a list of balls
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