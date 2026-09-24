// objects/ball.js

import { globals, ETextAnchor } from "../globals.js";
import * as draw from "../drawFunctions.js";
import { Vec2d } from "../utils/vec2d.js";
import { PhysicsObject } from "./physicsObjects.js";

const BallImage = new Image();
BallImage.src = "./assets/Basketball.png";


const PLAYER_BUMP_IMPULSE = 0.35       // Basis-Wackel-Impuls bei Spieler-Kollision (Winkel, unabhängig vom Koordinatensystem)
const BALL_BUMP_IMPULSE = 0.15         // Wackel-Impuls beim Ballkontakt

const BALL_BOUNCE_SPEED = 0.07         // Abprallgeschwindigkeit des Balls bei Treffer (normalisierte Einheiten)
const BALL_BOUNCE_LIFT = 0.02          // kleiner Extra-Lift nach oben beim Treffer
const BALL_GROUND_RESTITUTION = 0.6
const BALL_WALL_RESTITUTION = 0.7
const BALL_GROUND_FRICTION = 0.9       // bremst den Ball seitlich ab, während er auf dem Boden liegt

const BALL_MAX_SPEED = 0.12            // harte Obergrenze für die Ballgeschwindigkeit (sonst kein Max bei mehreren Treffern hintereinander)

export class Ball extends PhysicsObject{
    constructor({
        pos,
        radius = 1 / 25,
        color = "#ff9d13",
    }) {
        super({ pos });

        this.angle = 0;

        this.radius = radius;
        this.color = color;
    }

    get width() {
        return this.radius * 2;
    }

    get height() {
        return this.radius * 2;
    }

    update() {
        super.update();

        // Spielfeldbegrenzung seitlich (Boden wird unten pro Objekttyp behandelt)
        this.pos.x = Math.max(0, Math.min(1 - this.width, this.pos.x));
    }

    render(ctx) {
        draw.drawText(ctx, this.pos.x, this.pos.y, this.radius * 2.4, "🏀", "#fff", "Arial", "center", ETextAnchor.C);
        draw.drawSpriteF(ctx, BallImage, this.pos.x, this.pos.y, this.angle, this.radius * 2, 0, false);
        if (globals.DRAW_DEBUGGING) {
            draw.drawCircleF(ctx, this.pos.x, this.pos.y, this.radius, this.color);
            draw.drawLine(ctx, { x: 0, y: this.pos.y }, { x: 1, y: this.pos.y }); // horizontal
            draw.drawLine(ctx, { x: this.pos.x, y: 0 }, { x: this.pos.x, y: 1 }); // vertical
        }
    }

    updateBallAfter() {
        updateBallBounds(this, globals.grassHeight);
        clampBallSpeed(this, BALL_MAX_SPEED);
    }
}


// --------------------------------
// BALL
// --------------------------------

// Ball an Seitenwänden und auf der Wiesenoberkante abprallen lassen (mit Energieverlust).
// Läuft im selben normalisierten Modellraum (0..1, posY wächst nach oben) wie die Spieler.
export function updateBallBounds(ball, grassHeight) {
    if (ball.pos.x - ball.radius < 0) {
        ball.pos.x = ball.radius;
        ball.vel.x = Math.abs(ball.vel.x) * BALL_WALL_RESTITUTION;
    } else if (ball.pos.x + ball.radius > 1) {
        ball.pos.x = 1 - ball.radius;
        ball.vel.x = -Math.abs(ball.vel.x) * BALL_WALL_RESTITUTION;
    }

    const minBallY = grassHeight + ball.radius;
    if (ball.pos.y < minBallY) {
        ball.pos.y = minBallY;
        ball.vel.y = Math.abs(ball.vel.y) * BALL_GROUND_RESTITUTION;
        ball.vel.x *= BALL_GROUND_FRICTION; // bremst seitlich ab, statt endlos weiterzurollen
    }
}

// Harte Obergrenze für die Ballgeschwindigkeit. Anders als bei Boden-/Wandprall (Restitution < 1,
// verliert automatisch Energie) setzt eine Spielerkollision die Geschwindigkeit einfach neu -
// ohne diesen Clamp gäbe es keinen Deckel, falls mehrere Treffer kurz hintereinander passieren.
function clampBallSpeed(ball, ball_max_speed) {
    const speed = Math.hypot(ball.vel.x, ball.vel.y);
    if (speed > ball_max_speed) {
        const scale = ball_max_speed / speed;
        ball.vel.x *= scale;
        ball.vel.y *= scale;
    }
}