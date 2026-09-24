/**
 * @typedef {Object} GlobalsType
 * @property {{ width: number, height: number }} canvasDimensions
 * @property {number} gravity
 * @property {number} wind
 * @property {number} grassHeight
 * @property {boolean} DRAW_DEBUGGING
*/

/** @type {GlobalsType} */
export const globals = {
    canvasDimensions: {
        width: 1600,
        height: 900,
    },
    gravity: -0.0010, // unit: px/s/s,
    wind: 0,
    grassHeight: 1 / 4,
    DRAW_DEBUGGING: true,
};

// wg Gravity:
// Viel Airtime bei geringer Sprunghöhe (nur Gravitation zu senken macht Sprünge sowohl höher als
// auch länger, das Absenken beider Werte zusammen hält die Höhe niedrig, streckt aber die Zeit).
// Ausgelegt auf ~0.06 Sprunghöhe (rechnerisch: jumpSpeed²/(2*|gravity|)) bei ~180 Frames
// (~3s bei 60fps) Gesamt-Flugzeit (rechnerisch: 2*jumpSpeed/|gravity|).



// ENUMS

export const ETextAnchor = Object.freeze({
    TL: "TopLeft",
    TC: "TopCenter",
    TR: "TopRight",

    CL: "CenterLeft",
    C:  "Center",
    CR: "CenterRight",

    BL: "BottomLeft",
    BC: "BottomCenter",
    BR: "BottomRight",
});