import * as draw from "./scripts/drawFunctions.js";
import Globals from "./scripts/globals.js";



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
let debugText = ""

// Variables
let gameRunning = false;
let score = 0;
let lives = 3;

const keys = {};
const wind = 0
const gravity = -1/150 // unit: px/s/s
const jumpSpeed = 1/15 // unit: px/s

// ini
Globals.canvasDimensions.width = canvas.width;
Globals.canvasDimensions.height = canvas.height;

// --------------------------------
// Spieler
// --------------------------------

const player1 = {
    posX: 3/4,
    posY: 1/3,
    velY: 0,
    velX: 0,
    width: 1/8,
    height: 1/8,
    speed: 1/40,
    color: "#4b3fd3"
};

const player2 = {
    posX: 1/4,
    posY: 1/3,
    velY: 0,
    velX: 0,
    width: 1/8,
    height: 1/8,
    speed: 1/40,
    color: "#dd5f5f"
};

let player = [player1, player2]

const basketBall = {
    posX: 1/2,
    posY: 1/2,
    velY: 0,
    velX: 0,
    radius: 1/16,
    color: "#ff9d13",

    get width() {
        return this.radius * 2;
    },
    get height() {
        return this.radius * 2;
    }
}

let physicsObjects = [player1, player2, basketBall]

// --------------------------------
// Eingabe
// --------------------------------

document.addEventListener("keydown", (event) => {
    keys[event.key.toLowerCase()] = true;
});

document.addEventListener("keyup", (event) => {
    keys[event.key.toLowerCase()] = false;
});

// --------------------------------
// Spiel starten
// --------------------------------

startButton.addEventListener("click", startGame);

function startGame() {
    score = 0;
    lives = 3;

    player1.posX = 1/4;
    player1.posY = 1/3;
    player2.posX = 3/4;
    player2.posY = 1/3;

    gameRunning = true;

    updateUI();
}

// --------------------------------
// Update
// --------------------------------

function update() {
    debugText = "";

    if (!gameRunning) {
        return;
    }

    // CONTROLS
    // player1
    if (keys["w"]) {
        player1.velY = jumpSpeed;
    }

    if (keys["s"]) {
        player1.posY += player1.speed;
    }

    if (keys["a"]) {
        player1.posX -= player1.speed;
    }

    if (keys["d"]) {
        player1.posX += player1.speed;
    }

    // player2
    if (keys["arrowup"]){
        player2.velY = jumpSpeed;
    }

    if (keys["arrowdown"]) {
        player2.posY += player2.speed;
    }

    if(keys["arrowleft"]){
        player2.posX -= player2.speed;
    }

    if(keys["arrowright"]){
        player2.posX += player2.speed;
    }

    // PHYSICS
    physicsObjects.forEach((object, i) => {

        // acceleration
        // not yet - later with physics

        // velocity
        object.velY = Math.max(object.velY += gravity, -1/20)

        object.velX += wind; //maybe wind?
        // position
        object.posY += object.velY;
        object.posX += object.velX;

        
        // Spielfeldbegrenzung
        object.posX = Math.max(0, Math.min(1 - object.width, object.posX));
        object.posY = Math.max(0, Math.min(1 - object.height, object.posY));

        //debugging
        if (player.includes(object)){
            debugText += `\nplayer ${i} - pos: (${object.posX.toFixed(4)}, ${object.posY.toFixed(4)}) | vel: (${object.velX.toFixed(4)}, ${object.velY.toFixed(4)})`;
            // console.log(`p${i} pos: (${object.posX.toFixed(4)}, ${object.posY.toFixed(4)}) | vel: (${object.velX.toFixed(4)}, ${object.velY.toFixed(4)})`);
        }
        if (object == basketBall){
            // console.log(`ball: velX: ${object.velX.toFixed(3)}, velY: ${object.velY.toFixed(3)}`);

        }

        debugTextElement.textContent = debugText
    });
}

// --------------------------------
// Zeichnen
// --------------------------------

function drawFrame() {
    // Global Canvas Update
    Globals.canvasDimensions.width = canvas.width;
    Globals.canvasDimensions.height = canvas.height;
    
    // Hintergrund
    draw.drawRectF(ctx, 0, 0, 1, 1, "#6bbfd9");
    
    const grass_height = 1/4;
    draw.drawRectF(ctx, 0, 0, 1, grass_height, "#51c468");

    // Spieler
    player.forEach(player => {
        draw.drawRectF(ctx, player.posX, player.posY, player.width, player.height, player.color);
    })

    // Basketball
    draw.drawCircleF(ctx, basketBall.posX, basketBall.posY, basketBall.radius, basketBall.color);
    draw.drawText(ctx, basketBall.posX, basketBall.posY, 1/8, "🏀", "#fff", "Arial", "center")

    // Start-Hinweis
    if (!gameRunning) {
        draw.drawText(ctx, 1/2, 1/2, 1/8, "Drücke „Spiel starten“", "#fff", "Arial", "center");
    }
}

// --------------------------------
// UI
// --------------------------------

function updateUI() {
    scoreElement.textContent = score;
    livesElement.textContent = lives;
}

// --------------------------------
// Game Loop
// --------------------------------

function gameLoop() {
    update();
    drawFrame();

    requestAnimationFrame(gameLoop);
}

gameLoop();
startGame();