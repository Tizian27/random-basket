// objects/arm.js

import { globals, ETextAnchor } from "../globals.js";
import * as draw from "../rendering/drawFunctions.js";
import { applyTransform } from "../rendering/drawHelpers.js";
import * as shape from "../rendering/drawShapes.js";
import { Vec2d } from "../utils/vec2d.js";
import { GameObject } from "./gameObject.js";
import { PhysicsObject } from "./physicsObjects.js";

export class Arm extends GameObject { // so yes, not a physicsObject, but a GameObject for the shared uv functions
    constructor({
        parent,
        uvPosOnParent = new Vec2d(0, 0),
        angle = 0
    }) {
        // const 
        super({ pos: parent.pos.add(uvPosOnParent), angle: angle });

        this.width = 1 / 100;
        this.height = 1 / 20;

        this.parent = parent;

        this.uvPosOnParent = uvPosOnParent;
        this.pivot = new Vec2d(0.5, 0.0); // bottom center
    }

    update() {
        // super.update();
        this.pos = this.parent.pos.add(this.parent.uvToWorldScale(this.uvPosOnParent));
        this.angle += 0.01;
    }

    render(ctx) {
    
        ctx.save();
        applyTransform(ctx, this.pos, this.angle);
        // ab hier ist halt local drawing, also 0.0 ist player.pos, nicht welt 0,0

        draw.drawCircleF(ctx, { x: 0, y: 0 }, 1/100, "#00fa");

        // Shape
        draw.drawRect(ctx, {
            pos: new Vec2d(0, 0).sub(this.uvToWorldScale(this.pivot)),
            size: { x: this.width, y: this.height },
            fillColor: "rgb(150, 136, 106)",
            strokeColor: "rgb(212, 193, 150)",
            lineWidth: 0.005
        });

        // Sprite
        // draw.drawImage(ctx, {
        //     image: armImage,
        //     pos: {
        //         x: this.arm.x,
        //         y: this.arm.y
        //     },
        //     size: {
        //         x: this.arm.width,
        //         y: this.arm.height
        //     },
        //     rotation: this.angle + this.armRotation,
        //     pivot: { x: 0.5, y: 0 }, // top = shoulder
        //     flipX: this.facingFlip
        // });

        ctx.restore();
    }

    renderDebugging(ctx) {
        super.renderDebugging(ctx);
        
        draw.drawCircleF(ctx, this.uvToWorldScale(this.feetUvPos), 1/100, "#f0fa");
    }
}