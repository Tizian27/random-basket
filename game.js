import { globals, ETextAnchor } from "./scripts/globals.js";
import * as draw from "./scripts/rendering/drawFunctions.js";

import { randomSign, randomBetween } from "./scripts/utils/mathFunctions.js";
import { Vec2d } from "./scripts/utils/vec2d.js";
import { Arena } from "./scripts/objects/arena.js";



// --------------------------------
// Elements
// --------------------------------

/** @type {HTMLCanvasElement} */
const canvas = document.getElementById("game");

/** @type {CanvasRenderingContext2D} */
const ctx = canvas.getContext("2d");

const scoreElement = document.getElementById("score");
const livesElement = document.getElementById("lives");
const startButton = document.getElementById("start-button");
const debugTextElement = document.getElementById("debuggingText");



// --------------------------------
// Eingabe
// --------------------------------
const used_keys = ["arrowup", "w"]
const prevent_default_keys = ["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "w", "a", "s", "d"]

document.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    // block default browser keydown-behavior for game keys
    if (prevent_default_keys.includes(key)) {
        event.preventDefault();
    }

    if (used_keys.includes(key)) {
        keys[key] = true;
    }
});

document.addEventListener("keyup", (event) => {
    const key = event.key.toLowerCase();

    // block default browser keyup-behavior for game keys
    if (prevent_default_keys.includes(key)) {
        event.preventDefault();
    }
    if (used_keys.includes(key)) {
        keys[key] = false;
    }
});



// Variables
let gameRunning = false;
let debugText = ""

const keys = {};

// ini
globals.canvasDimensions.width = canvas.width;
globals.canvasDimensions.height = canvas.height;
// globals.DRAW_DEBUGGING = false;



// --------------------------------
// Spiel starten
// --------------------------------

const arena = new Arena("arena1");

function startGame() {
    globals.score = {left: 0, right: 0};

    arena.addPlayer({
        pos: new Vec2d(randomBetween(1/8, 2/8), arena.grassHeight),
        facingFlip: false,
        color: "#4b3fd3",
        jumpButton: "w",
    });

    // arena.addPlayer({
    //     pos: new Vec2d(randomBetween(2/8, 3/8), arena.grassHeight),
    //     facingFlip: false,
    //     color: "#4b3fd3",
    //     jumpButton: "w",
    // });

    // arena.addPlayer({
    //     pos: new Vec2d(randomBetween(5/8, 6/8), arena.grassHeight),
    //     facingFlip: true,
    //     color: "#dd5f5f",
    //     jumpButton: "arrowup",
    // });

    // arena.addPlayer({
    //     pos: new Vec2d(randomBetween(6/8, 7/8), arena.grassHeight),
    //     facingFlip: true,
    //     color: "#dd5f5f",
    //     jumpButton: "arrowup",
    // });

    // arena.addBall({
    //     pos: new Vec2d(1/2, 1/2),
    //     radius: 1/50,
    //     color: "#ff9d13"
    // });

    // JUST FOR FUN LOL, chaos :)
    arena.spawnExtraTill({
        totalPlayersCount: 0, // only gets more if this number is greater than already exisiting ones!
        totalBallsCount: 0,   // only gets more if this number is greater than already exisiting ones!
        control1: "w",
        control2: "arrowup",
        ballSize: 1 / 40
    });

    gameRunning = true;

    // updateUI();
}

startButton.addEventListener("click", startGame);

// --------------------------------
// Update
// --------------------------------

function update(arena, keys) {
    debugText = "";

    if (!gameRunning) {
        return;
    }

    debugText += arena.update(keys);

    // DebugText unter dem spiel canvas
    debugTextElement.textContent = debugText;
}

// --------------------------------
// Zeichnen
// --------------------------------

function drawFrame(ctx) {
    // Global Canvas Update
    globals.canvasDimensions.width = canvas.width;
    globals.canvasDimensions.height = canvas.height;

    // Globales World Transform
    ctx.setTransform(
        globals.canvasDimensions.width, 0,
        0, -globals.canvasDimensions.height,
        0, globals.canvasDimensions.height
    );

    ctx.clearRect(0, 0, 1, 1);

    // Arena
    arena.render(ctx);
    
    // Start-Hinweis
    if (!gameRunning) {
        draw.drawText(ctx, { x: 1/2, y: 1/2}, 1/8, "Drücke „Spiel starten“", "#fff", "Arial", "center", ETextAnchor.C);
    }
}

// --------------------------------
// Game Loop
// --------------------------------

// hard fps cap limit (switch to delta frame time in other branchw)
let lastTime = 0;
const fps = 60;
const frameTime = 1000 / fps;
const currentlySelectArena = arena;

function gameLoop(currentTime) {
    if (currentTime - lastTime < frameTime) {
        // skip frame -> go to next
        requestAnimationFrame(gameLoop);
        return;
    }
    
    update(currentlySelectArena, keys);
    drawFrame(ctx);
    
    lastTime = currentTime;
    requestAnimationFrame(gameLoop);
}

gameLoop();
startGame();