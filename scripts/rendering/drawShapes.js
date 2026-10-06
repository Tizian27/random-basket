// scripts/rendering/drawShapes.js

import { drawLine } from "./drawFunctions.js";
import { Vec2d } from "../utils/vec2d.js";

const EPS = 1e-8;

export function drawArrow(ctx, from, to, color = "#fff", lineWidth = 0.005, lengthScale = 1) {
    const dir = to.sub(from); // direction vector
    const len = dir.length();
    if (len < EPS) return;

    const u = dir.scale(1 / len); // u = normalized direction
    const scaledLen = len * lengthScale;

    const tip = from.add(u.scale(scaledLen));

    // main line
    drawLine(ctx, from, tip, color, lineWidth);

    // arrow head
    const perp = new Vec2d(-u.y, u.x);

    const headSize = 0.02;

    const left = tip
        .sub(u.scale(headSize))
        .sub(perp.scale(headSize * 0.5));

    const right = tip
        .sub(u.scale(headSize))
        .add(perp.scale(headSize * 0.5));

    drawLine(ctx, tip, left, color, lineWidth);
    drawLine(ctx, tip, right, color, lineWidth);
}

export function drawVector(ctx, from, vector, color = "#fff", lineWidth = 0.005, lengthScale = 1) {
    const to = from.add(vector.scale(lengthScale));
    drawArrow(ctx, from, to, color, lineWidth, 1);
}