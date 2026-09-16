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

// Variables
let gameRunning = false;
let score = 0;
let lives = 3;

const keys = {};
const wind = 0
const gravity = -1 // unit: px/s/s
const jumpSpeed = 15 // unit: px/s

// ini
Globals.canvasDimensions.width = canvas.width;
Globals.canvasDimensions.height = canvas.height;
const canvasWidth = Globals.canvasDimensions.width
const canvasHeight = Globals.canvasDimensions.height

// --------------------------------
// Spieler
// --------------------------------

const player1 = {
    posX: 3 * canvasWidth / 4,
    posY: canvasHeight / 3,
    velY: 0,
    velX: 0,
    width: 40,
    height: 40,
    speed: 5,
    color: "#4b3fd3"
};

const player2 = {
    posX: canvasWidth / 4,
    posY: canvasHeight / 3,
    velY: 0,
    velX: 0,
    width: 40,
    height: 40,
    speed: 5,
    color: "#dd5f5f"
};

let player = [player1, player2]

const basketBall = {
    posX: canvasWidth / 2,
    posY: canvasHeight / 2,
    velY: 0,
    velX: 0,
    radius: 10,
    speed: 5,
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

    player1.posX = 100;
    player1.posY = 100;

    gameRunning = true;

    updateUI();
}

// --------------------------------
// Update
// --------------------------------

function update() {
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
        object.velY = Math.max(object.velY += gravity, -10)

        object.velX += wind; //maybe wind?
        // position
        object.posY += object.velY;
        object.posX += object.velX;

        
        // Spielfeldbegrenzung
        object.posX = Math.max(0, Math.min(canvas.width - object.width, object.posX));
        object.posY = Math.max(0, Math.min(canvas.height - object.height, object.posY));

        //debugging
        if (player.includes(object)){
            // console.log(`p${i} velY: ${object.velY.toFixed(4)}`);
        }
        if (object = basketBall){
            console.log(`p${i} velX: ${object.velX.toFixed(3)}, velY: ${object.velY.toFixed(3)}`);

        }
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
    draw.drawRectF(ctx, 0, 0, canvas.width, canvas.height, "#6bbfd9");
    
    const grass_height = 100;
    draw.drawRectF(ctx, 0, 0, canvas.width, grass_height, "#51c468");

    // Spieler
    player.forEach(player => {
        draw.drawRectF(ctx, player.posX, player.posY, player.width, player.height, player.color);
    })

    // Basketball
    draw.drawCircleF(ctx, basketBall.posX, basketBall.posY, basketBall.radius, basketBall.color);
    draw.drawText(ctx, basketBall.posX, basketBall.posY, 50, "🏀", "#fff", "Arial", "center")

    // Start-Hinweis
    if (!gameRunning) {
        draw.drawText(ctx, canvas.width / 2, canvas.height / 2, 30, "Drücke „Spiel starten“", "#fff", "Arial", "center");
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