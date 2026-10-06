// scripts/rendering/drawFunctions.js
import { globals, ETextAnchor } from "../globals.js";
import { Vec2d } from "../utils/vec2d.js";



export function drawLine(ctx, pos1, pos2, color = "#ffffff", lineWidth = 0.01) {
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;

    ctx.beginPath();
    ctx.moveTo(pos1.x, pos1.y);
    ctx.lineTo(pos2.x, pos2.y);
    ctx.stroke();
}

export function drawCircleF(ctx, pos, radius, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    ctx.fill();
}

export function drawRect(ctx, {
    pos,
    size,
    fillColor = null,
    strokeColor = null,
    lineWidth = 0.005,
}) {
    if (fillColor) {
        ctx.fillStyle = fillColor;
        ctx.fillRect(pos.x, pos.y, size.x, size.y);
    }

    if (strokeColor) {
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = lineWidth;
        ctx.strokeRect(pos.x, pos.y, size.x, size.y);
    }
}

export function drawRectR(ctx, {
    pos,
    size,
    rotation = 0,
    pivot = { x: 0.5, y: 0.5 }, // pivot from 0 to 1 from bottom left corner
    fillColor = null,
    strokeColor = null,
    lineWidth = 0.005,
}) {

    // FAST PATH
    if (rotation === 0) {
        if (fillColor) {
            ctx.fillStyle = fillColor;
            ctx.fillRect(pos.x, pos.y, size.x, size.y);
        }
        if (strokeColor) {
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = lineWidth;
            ctx.strokeRect(pos.x, pos.y, size.x, size.y);
        }
        return;
    }

    // pivot point inside rect
    const px = pos.x + size.x * pivot.x;
    const py = pos.y + size.y * (1 - pivot.y);

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(-rotation);

    const dx = -size.x * pivot.x;
    const dy = -size.y * pivot.y;

    if (fillColor) {
        ctx.fillStyle = fillColor;
        ctx.fillRect(dx, dy, size.x, size.y);
    }

    if (strokeColor) {
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = lineWidth;
        ctx.strokeRect(dx, dy, size.x, size.y);
    }

    ctx.restore();
}

// Zeichnet ein rotiertes Sprite. (x, y) ist der Drehpunkt im normalisierten Modellraum,
// "angle" wird direkt an ctx.rotate() übergeben (0 = Sprite unverändert/aufrecht). x/y sind
// Punkt-Koordinaten wie bei drawText (kein Höhen-Offset). pivotFracY bestimmt, welcher Punkt
// im Bild auf (x, y) sitzt: 1 = Bildunterkante (z.B. Füße), 0 = Bildoberkante (z.B. Schulter,
// an der ein Arm hängt). Breite wird aus dem Seitenverhältnis des Bildes abgeleitet, damit es
// nicht verzerrt. flipX spiegelt das Sprite horizontal (z.B. damit zwei Spieler einander
// zugewandt sind statt in dieselbe Richtung zu schauen).
export function drawSpriteF(ctx, image, pos, angle, displayHeight, pivotFracY = 1, flipX = false, smoothing=true) {
    if (!image.complete || !image.naturalWidth) return; // Bild noch nicht geladen

    const pixelHeight = displayHeight;
    const pixelWidth = pixelHeight * (image.naturalWidth / image.naturalHeight);

    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(-angle);
    if (flipX) {
        ctx.scale(-1, 1);
    }
    ctx.imageSmoothingEnabled = smoothing;

    ctx.drawImage(image, -pixelWidth / 2, -pixelHeight * pivotFracY, pixelWidth, pixelHeight);

    ctx.restore();
}

export function drawImage(ctx, {
    image,
    pos,
    size,
    flipX = false,
    smoothing = true
}) {
    if (!image.complete || !image.naturalWidth) return;

    ctx.save();
    ctx.imageSmoothingEnabled = smoothing;

    // 👉 Y-Fix (WICHTIG)
    ctx.scale(1, -1);

    if (flipX) {
        ctx.scale(-1, 1);
        ctx.drawImage(
            image,
            -pos.x - size.x,
            -pos.y,
            size.x,
            size.y
        );
    } else {
        ctx.drawImage(
            image,
            pos.x,
            -pos.y,
            size.x,
            size.y
        );
    }

    ctx.restore();
}

export function drawImageRotated(ctx, {
    image,
    pos,
    size,
    flipX = false,
    smoothing = true
}) {
    if (!image.complete || !image.naturalWidth) return;

    ctx.save();
    ctx.imageSmoothingEnabled = smoothing;

    if (flipX) {
        ctx.translate(pos.x + size.x, pos.y); // spiegeln um linke kante
        ctx.scale(-1, 1);
        ctx.drawImage(image, 0, 0, size.x, size.y);
    } else {
        ctx.drawImage(image, pos.x, pos.y, size.x, size.y);
    }

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

export function drawText(ctx, pos, fontHeight, text, fillStyle, fontType, textAlign, anchor) {
    const offset = anchorOffset[anchor];
    
    // Local transform to counter Global transform. (text flipping/scaling)
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // World → Pixel
    let x = pos.x * globals.canvasDimensions.width;
    let y = (1 - pos.y) * globals.canvasDimensions.height;
    const pixelFontHeight = fontHeight * globals.canvasDimensions.height;

    ctx.font = `${pixelFontHeight}px ${fontType}`;
    ctx.fillStyle = fillStyle;
    ctx.textAlign = textAlign;
    ctx.textBaseline = "middle";

    const textWidth = ctx.measureText(text).width;

    // Apply Anchor anwenden
    x -= offset.x * textWidth;
    y -= offset.y * pixelFontHeight;

    ctx.fillText(text, x, y);

    ctx.restore();
}