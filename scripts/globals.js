/**
 * @typedef {Object} GlobalsType
 * @property {{ width: number, height: number }} canvasDimensions
 */

/** @type {GlobalsType} */
const Globals = {
    canvasDimensions: {
        width: 1600,
        height: 900,
    }
};

export default Globals;



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