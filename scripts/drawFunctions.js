// drawFunctions.js
import Globals from "./globals.js";
import { ETextAnchor } from "./globals.js";



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

// Zeichnet ein rotiertes Sprite. (x, y) ist der Drehpunkt im normalisierten Modellraum,
// "angle" wird direkt an ctx.rotate() übergeben (0 = Sprite unverändert/aufrecht). x/y sind
// Punkt-Koordinaten wie bei drawText (kein Höhen-Offset). pivotFracY bestimmt, welcher Punkt
// im Bild auf (x, y) sitzt: 1 = Bildunterkante (z.B. Füße), 0 = Bildoberkante (z.B. Schulter,
// an der ein Arm hängt). Breite wird aus dem Seitenverhältnis des Bildes abgeleitet, damit es
// nicht verzerrt. flipX spiegelt das Sprite horizontal (z.B. damit zwei Spieler einander
// zugewandt sind statt in dieselbe Richtung zu schauen).
export function drawSpriteF(ctx, image, posX, posY, angle, displayHeight, pivotFracY = 1, flipX = false) {
    if (!image.complete || !image.naturalWidth) return; // Bild noch nicht geladen

    const pixelX = posX * Globals.canvasDimensions.width;
    const pixelY = (1 - posY) * Globals.canvasDimensions.height;
    const pixelHeight = displayHeight * Globals.canvasDimensions.height;
    const pixelWidth = pixelHeight * (image.naturalWidth / image.naturalHeight);

    ctx.save();
    ctx.translate(pixelX, pixelY);
    ctx.rotate(angle);
    if (flipX) {
        ctx.scale(-1, 1);
    }
    ctx.imageSmoothingEnabled = false; // Pixel-Art scharf halten, nicht weichzeichnen

    ctx.drawImage(image, -pixelWidth / 2, -pixelHeight * pivotFracY, pixelWidth, pixelHeight);

    ctx.restore();
}

const anchorOffset = {
    // x: 0 = left, 0.5 = center, 1 = right
    // y: 0 = top, 0.5 = center, 1 = bottom
    [ETextAnchor.TL]: { x: 0,   y: 0   },
    [ETextAnchor.TC]: { x: 0.5, y: 0   },
    [ETextAnchor.TR]: { x: 1,   y: 0   },

    [ETextAnchor.CL]: { x: 0,   y: 0.5 },
    [ETextAnchor.C]:  { x: 0.5, y: 0.5 },
    [ETextAnchor.CR]: { x: 1,   y: 0.5 },

    [ETextAnchor.BL]: { x: 0,   y: 1   },
    [ETextAnchor.BC]: { x: 0.5, y: 1   },
    [ETextAnchor.BR]: { x: 1,   y: 1   },
};

export function drawText(ctx, posX, posY, fontHeight, text, fillStyle, fontType, textAlign, anchor) {
    const offset = anchorOffset[anchor];

    // flip Y
    posY = 1 - posY;

    // apply anchor offsets
    posX -= offset.x * (ctx.measureText(text).width / Globals.canvasDimensions.width);
    posY -= offset.y * (fontHeight);
    
    // apply un-normalising
    posX *= Globals.canvasDimensions.width;
    posY *= Globals.canvasDimensions.height;
    fontHeight *= Globals.canvasDimensions.height;

    ctx.fillStyle = fillStyle;
    ctx.font = `${fontHeight}px ${fontType}`;
    ctx.textAlign = textAlign;
    ctx.textBaseline = "middle";

    ctx.fillText(
        text,
        posX,
        posY
    );
}