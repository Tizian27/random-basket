// objects/ball.js

import { Vec2d } from "../utils/vec2d.js";
import { PhysicsObject } from "./physicsObjects.js";

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
}