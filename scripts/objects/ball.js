// objects/ball.js

import { globals, ETextAnchor } from "../globals.js";
import * as draw from "../drawFunctions.js";
import { Vec2d } from "../utils/vec2d.js";
import { PhysicsObject } from "./physicsObjects.js";

const BallImage = new Image();
BallImage.src = "./assets/Basketball.png";

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
        }
    }
}