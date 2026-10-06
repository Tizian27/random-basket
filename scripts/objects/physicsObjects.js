// objects/physicsObjects.js

import { globals, ETextAnchor } from "../globals.js";
import { Vec2d } from "../utils/vec2d.js";
import * as draw from "../rendering/drawFunctions.js";
import * as shape from "../rendering/drawShapes.js";
import { formatNumber, logColor } from "../utils/generalUtilities.js";
import { GameObject } from "./gameObject.js";

export class PhysicsObject extends GameObject {

    constructor({
        pos = new Vec2d(0, 0),
        angle = 0,
    }) {
        super({ pos: pos, angle: angle });

        this.vel = new Vec2d(0, 0);
        this.acc = new Vec2d(0, 0);

        this.angleVel = 0;
        this.angleAcc = 0;
    }

    update() {
        // acceleration additions
        this.acc.x += globals.wind;
        this.acc.y += globals.gravity;
        
        // velocity
        this.vel.addMut(this.acc);
        
        // position
        this.pos.addMut(this.vel);
        
        //rotation
        this.angleVel += this.angleAcc;
        this.angle += this.angleVel;

        // nur Object 0 soll loggen
        if (this.objectId === 0 ) {
            logColor(
                `Object "${this.objectId}": angle=${formatNumber(this.angle)}, angleVel=${formatNumber(this.angleVel)}, angleAcc=${formatNumber(this.angleAcc)}`,
                { color: "#f0f" }
            );
        }
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
}