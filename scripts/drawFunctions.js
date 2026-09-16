// drawFunctions.js

export function drawCircleF(ctx, x, y, radius, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(
        x,
        y,
        radius,
        0,
        Math.PI * 2
    );
    ctx.fill();
}

export function drawRectF(ctx, posX, posY, width, height, color){
    ctx.fillStyle = color;
    ctx.fillRect(
        posX,
        posY,
        width,
        height
    );
}

export function drawText(ctx, posX, posY, text, font, fillStyle, textAlign) {
    ctx.fillStyle = fillStyle;
    ctx.font = font;
    ctx.textAlign = textAlign;

    ctx.fillText(
        text,
        posX,
        posY
    );
}