// scripts/drawShapes.js

import { drawLine } from "./drawFunctions.js";

const EPS = 1e-8;

export function drawArrow(ctx, from, to, color = "#fff", thickness = 1, lengthScale = 1) {

    // main line
    drawLine(ctx, from, to, color, thickness);

    const dx = to.x - from.x;
    const dy = to.y - from.y;

    const len = Math.hypot(dx, dy) * lengthScale;

    if (len < EPS) return;

    const ux = dx / len;
    const uy = dy / len;

    const headSize = 0.02;

    // perpendicular vector
    const px = -uy;
    const py = ux;

    const tip = to;

    const left = {
        x: tip.x - ux * headSize - px * headSize * 0.5,
        y: tip.y - uy * headSize - py * headSize * 0.5
    };

    const right = {
        x: tip.x - ux * headSize + px * headSize * 0.5,
        y: tip.y - uy * headSize + py * headSize * 0.5
    };

    drawLine(ctx, tip, left, color, thickness);
    drawLine(ctx, tip, right, color, thickness);
}