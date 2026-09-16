// drawFunctions.js
import Globals from "./globals.js";


export function drawCircleF(ctx, posX, posY, radius, color) {
    posY = Globals.canvasDimensions.height - posY // Flip Y

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(
        posX,
        posY,
        radius,
        0,
        Math.PI * 2
    );
    ctx.fill();
}

export function drawRectF(ctx, posX, posY, width, height, color){
    posY = Globals.canvasDimensions.height - posY - height // Flip Y

    ctx.fillStyle = color;
    ctx.fillRect(
        posX,
        posY,
        width,
        height
    );
}

export function drawText(ctx, posX, posY, fontHeight, text, fillStyle, fontType, textAlign) {
    posY = Globals.canvasDimensions.height - posY - fontHeight // Flip Y

    ctx.fillStyle = fillStyle;
    ctx.font = `${fontHeight}px ${fontType}`;
    ctx.textAlign = textAlign;

    ctx.fillText(
        text,
        posX,
        posY
    );
}