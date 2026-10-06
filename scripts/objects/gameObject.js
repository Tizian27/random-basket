// objects/physicsObjects.js

import { globals, ETextAnchor } from "../globals.js";
import { Vec2d } from "../utils/vec2d.js";
import * as draw from "../rendering/drawFunctions.js";
import * as shape from "../rendering/drawShapes.js";
import { formatNumber, logColor } from "../utils/generalUtilities.js";

export class GameObject {
    static idCounter = 0;

    constructor({
        pos = new Vec2d(0, 0),
        angle = 0,
    }) {
        this.objectId = GameObject.idCounter++;
        this.pos = pos;
        this.angle = angle;
    }

    update() {
        // empty for now
    }

    render(ctx) {
        // empty for now
    }

    renderDebugging(ctx) {
        const length = 1 / 8;
        const dx = Math.cos(this.angle) * length;
        const dy = Math.sin(this.angle) * length;
        draw.drawLine(ctx, this.pos, this.pos.add(new Vec2d(dx, dy)), "#ff0", 0.01); // heading line
        shape.drawVector(ctx, this.pos, this.vel, "#00f", 0.01, 5); // velocity vector
        shape.drawVector(ctx, this.pos, this.acc, "#f0f", 0.01, 5); // acceleration vector
        draw.drawText(ctx, this.pos.sub({ x: 1/10, y: 0}), 1/40, `vel: (${this.vel.x.toFixed(3)},${this.vel.y.toFixed(3)})`, "#fff", "Arial", "center", ETextAnchor.C);
        draw.drawText(ctx, this.pos.sub({ x: 1/10, y: -1/40}), 1/40, `acc: (${this.acc.x.toFixed(3)},${this.acc.y.toFixed(3)})`, "#fff", "Arial", "center", ETextAnchor.C);
    }

    uvToWorldScale(uv) {
        return new Vec2d(
            uv.x * this.width,
            uv.y * this.height
        );
    }

    uvPosToWorld(uv) {
        // 1. UV → local (relativ zum Pivot des Objects)
        const local = new Vec2d(
            (uv.x - this.pivot.x) * this.width,
            (uv.y - this.pivot.y) * this.height
        );

        // 2. Rotation
        const cos = Math.cos(this.angle);
        const sin = Math.sin(this.angle);

        const rotated = new Vec2d(
            local.x * cos - local.y * sin,
            local.x * sin + local.y * cos
        );

        // 3. → World
        return this.pos.add(rotated);
    }

    uvToLocal(uv) {
        return new Vec2d(
            (uv.x - this.pivot.x) * this.width,
            (uv.y - this.pivot.y) * this.height
        );
    }

    uvToWorld(uv) {
        return this.localToWorld(this.uvToLocal(uv));
    }
}