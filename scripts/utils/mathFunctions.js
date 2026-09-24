// mathFunctions.js



export function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

export function randomSign() {
    return Math.random() < 0.5 ? -1 : 1;
}

export function randomBetween(min, max) {
    return Math.random() * (max - min) + min;
}



// color
// soon