// /utils/mathFunctions.js


// logic functions
export function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

export function randomSign() {
    return Math.random() < 0.5 ? -1 : 1;
}

export function randomBetween(min, max) {
    return Math.random() * (max - min) + min;
}



// color functions
export function applyAlpha(hex, alpha) {
    if (hex.length === 9) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        const a = parseInt(hex.slice(7, 9), 16) / 255;

        const finalA = a * alpha;

        return `rgba(${r}, ${g}, ${b}, ${finalA})`;
    }

    // fallback (no alpha in input)
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}