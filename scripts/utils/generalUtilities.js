// utils/generalUtilities.js


export function logColor(text, {
    color = "#fff",
    bg = null,
    bold = false,
    padding = null,
} = {}) {
    let style = `color: ${color};`;

    if (bg) style += ` background: ${bg};`;
    if (bold) style += ` font-weight: bold;`;
    if (padding) style += ` padding: ${padding}; border-radius: 4px;`;

    console.log(`%c${text}`, style);
}

export function formatNumber(n, decimals = 3, removeNegativeZero=false) {
    if (removeNegativeZero) {
        const epsilon = 0.5 * Math.pow(10, -decimals);
        if (Math.abs(n) < epsilon) n = 0;
    }

    const str = Math.abs(n).toFixed(decimals);
    const sign = n < 0 ? "-" : " ";
    return sign + str;
}