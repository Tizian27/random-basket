// drawFunctions.js
import { globals } from "./globals.js";
import { ETextAnchor } from "./globals.js";
import { Vec2d } from "./utils/vec2d.js";



export function drawLine(ctx, pos1, pos2, color = "#ffffff", thickness = 1) {

    // Flip Y
    pos1 = new Vec2d(pos1.x, 1 - pos1.y);
    pos2 = new Vec2d(pos2.x, 1 - pos2.y);

    // un-normalise
    const x1 = pos1.x * globals.canvasDimensions.width;
    const y1 = pos1.y * globals.canvasDimensions.height;

    const x2 = pos2.x * globals.canvasDimensions.width;
    const y2 = pos2.y * globals.canvasDimensions.height;

    ctx.strokeStyle = color;
    ctx.lineWidth = thickness;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
}

export function drawCircleF(ctx, posX, posY, radius, color) {
    posY = 1 - posY // Flip Y

    // apply un-normalising
    posX *= globals.canvasDimensions.width
    posY *= globals.canvasDimensions.height
    radius *= globals.canvasDimensions.height

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
    posX *= globals.canvasDimensions.width
    posY *= globals.canvasDimensions.height
    width *= globals.canvasDimensions.width
    height *= globals.canvasDimensions.height

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

    const pixelX = posX * globals.canvasDimensions.width;
    const pixelY = (1 - posY) * globals.canvasDimensions.height;
    const pixelHeight = displayHeight * globals.canvasDimensions.height;
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
    posX -= offset.x * (ctx.measureText(text).width / globals.canvasDimensions.width);
    posY -= offset.y * (fontHeight);
    
    // apply un-normalising
    posX *= globals.canvasDimensions.width;
    posY *= globals.canvasDimensions.height;
    fontHeight *= globals.canvasDimensions.height;

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