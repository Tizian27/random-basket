// physicsObjects.js

import { Vec2d } from "../utils/vec2d.js";
import { globals } from "../globals.js";

export class PhysicsObject {
    constructor({
        pos
    }) {
        this.pos = pos;
        this.vel = new Vec2d(0, 0);
        this.acc = new Vec2d(0, 0);
    }

    update() {
        // acceleration
        this.acc.set(0, 0); // reset at start
        this.acc.y += globals.gravity;
        this.acc.x += globals.wind;

        // velocity
        this.vel.addMut(this.acc);

        // position
        this.pos.addMut(this.vel);
    }
}