import * as draw from "./scripts/drawFunctions.js";



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

// --------------------------------
// Spieler
// --------------------------------

const player1 = {
    posX: 100,
    posY: 100,
    velY: 0,
    velX: 0,
    width: 40,
    height: 40,
    speed: 5,
    color: "dodgerblue"
};

const player2 = {
    posX: 300,
    posY: 100,
    velY: 0,
    velX: 0,
    width: 40,
    height: 40,
    speed: 5,
    color: "blue"
};

let player = [player1, player2]

const ball = {
    posX: 100,
    posY: 100,
    radius: 10,
    speed: 5,
    color: "red"
}

let physicsObjects = [player1, player2, ball]

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
        player2.posY += player2.speed
    }

    if(keys["arrowleft"]){
        player2.posX -= player2.speed
    }

    if(keys["arrowright"]){
        player2.posX += player2.speed
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

        //debugging
        if (player.includes(object)){
            console.log(`p${i} velY: ${object.velY.toFixed(4)}`);
        }
    });

    // Spielfeldbegrenzung
    player.forEach(player => {
        player.posX = Math.max(
            0,
            Math.min(canvas.width - player.width, player.posX)
        );

        player.posY = Math.max(
            0,
            Math.min(canvas.height - player.height, player.posY)
        );
    });
}

// --------------------------------
// Zeichnen
// --------------------------------

function drawFrame() {

    // Hintergrund
    draw.drawRectF(ctx, 0, 0, canvas.width, canvas.height, "#6bbfd9");
    
    const grass_height = 100
    draw.drawRectF(ctx, 0, canvas.height - grass_height, canvas.width, grass_height, "#51c468")

    // Spieler
    player.forEach(player => {
        draw.drawRectF(ctx, player.posX, player.posY, player.width, player.height, player.color)
    })

    // Spieler
    draw.drawCircleF(ctx, ball.posX, ball.posY, ball.radius, ball.color)

    // Start-Hinweis
    if (!gameRunning) {
        draw.drawText(ctx, canvas.width / 2, canvas.height / 2, "Drücke „Spiel starten“", "30px Arial", "#fff", "center")
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