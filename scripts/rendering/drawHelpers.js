// scripts/rendering/drawFunctions.js

export function applyTransform(ctx, pos, angle = 0) {
    ctx.translate(pos.x, pos.y);
    ctx.rotate(angle);
}