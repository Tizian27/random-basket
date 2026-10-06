// physics.js

import { Vec2d } from "./vec2d.js"

const PLAYER_BUMP_IMPULSE = 0.35       // Basis-Wackel-Impuls bei Spieler-Kollision (Winkel, unabhängig vom Koordinatensystem)
const BALL_BUMP_IMPULSE = 0.15         // Wackel-Impuls beim Ballkontakt
const BALL_BOUNCE_SPEED = 0.01         // Abprallgeschwindigkeit des Balls bei Treffer (normalisierte Einheiten)
const BALL_BOUNCE_LIFT = 0.02          // kleiner Extra-Lift nach oben beim Treffer

// --------------------------------
// Ragdoll-Physik
// --------------------------------

export function applyBalanceImpulse(object, amount) {
    object.balanceVel += amount;
}

export function applyAngularImpulse(object, amount) {
    object.angleAcc += amount;
}

// Einfache AABB-Trennung + Wackel-Impuls, keine echte Rigid-Body-Auflösung
export function resolvePlayerCollision(objectA, objectB) {
    const overlapX = Math.min(objectA.pos.x + objectA.width, objectB.pos.x + objectB.width) - Math.max(objectA.pos.x, objectB.pos.x);
    const overlapY = Math.min(objectA.pos.y + objectA.height, objectB.pos.y + objectB.height) - Math.max(objectA.pos.y, objectB.pos.y);

    if (overlapX <= 0 || overlapY <= 0) {
        return;
    }

    const dir = objectB.pos.sub(objectA.pos).normalized();
    const separation = overlapX / 2;
    const separationVec = new Vec2d(dir.x * separation, 0);

    objectA.pos.subMut(separationVec.scale(2));
    objectB.pos.addMut(separationVec.scale(2));

    const relVel = objectA.vel.sub(objectB.vel);
    const relSpeed = relVel.length();

    const impulse = PLAYER_BUMP_IMPULSE + relSpeed * 0.05;

    // applyBalanceImpulse(objectA, -dir.x * impulse);
    // applyBalanceImpulse(objectB, dir.x * impulse);
    // applyAngularImpulse(objectA, -dir.x * impulse * 0.5);
    // applyAngularImpulse(objectB, dir.x * impulse * 0.5);
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
    applyAngularImpulse(player, -normal.x * BALL_BUMP_IMPULSE);
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