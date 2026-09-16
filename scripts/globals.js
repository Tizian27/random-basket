/**
 * @typedef {Object} GlobalsType
 * @property {{ posX: number, posY: number, width: number, height: number }} canvasDimensions
 * @property {{ player1: number, player2: number }} score
 */

/** @type {GlobalsType} */
const Globals = {
    canvasDimensions: {
        width: 1600,
        height: 900,
    },
    score: {
        player1: 0,
        player2: 0,
    }
};

export default Globals;