// drawFunctions.js
import Globals from "./globals.js";


export function drawCircleF(ctx, posX, posY, radius, color) {
    posY = 1 - posY // Flip Y

    // apply un-normalising
    posX *= Globals.canvasDimensions.width
    posY *= Globals.canvasDimensions.height
    radius *= Globals.canvasDimensions.height

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
    posY = 1 - posY - height // Flip Y

    // apply un-normalising
    posX *= Globals.canvasDimensions.width
    posY *= Globals.canvasDimensions.height
    width *= Globals.canvasDimensions.width
    height *= Globals.canvasDimensions.height

    ctx.fillStyle = color;
    ctx.fillRect(
        posX,
        posY,
        width,
        height
    );
}

export function drawText(ctx, posX, posY, fontHeight, text, fillStyle, fontType, textAlign) {
    posY = 1 - posY - fontHeight // Flip Y

    // apply un-normalising
    posX *= Globals.canvasDimensions.width
    posY *= Globals.canvasDimensions.height
    fontHeight *= Globals.canvasDimensions.height

    ctx.fillStyle = fillStyle;
    ctx.font = `${fontHeight}px ${fontType}`;
    ctx.textAlign = textAlign;

    ctx.fillText(
        text,
        posX,
        posY
    );
}