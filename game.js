/** @type {HTMLCanvasElement} */
const canvas = document.getElementById("game");

/** @type {CanvasRenderingContext2D} */
const ctx = canvas.getContext("2d");

const scoreElement = document.getElementById("score");
const livesElement = document.getElementById("lives");
const startButton = document.getElementById("start-button");

let gameRunning = false;
let score = 0;
let lives = 3;

const keys = {};
const wind = 0
const gravity = -1

// --------------------------------
// Spieler
// --------------------------------

function drawCircleF(x, y, radius, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(
        x,
        y,
        radius,
        0,
        Math.PI * 2
    );
    ctx.fill();
}

// --------------------------------
// Spieler
// --------------------------------

const player1 = {
    x: 100,
    y: 100,
    width: 40,
    height: 40,
    speed: 5,
    color: "dodgerblue"
};

const player2 = {
    x: 300,
    y: 100,
    width: 40,
    height: 40,
    speed: 5,
    color: "blue"
};

let player = [player1, player2]

const ball = {
    x: 100,
    y: 100,
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

    player1.x = 100;
    player1.y = 100;

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
    if (keys["w"]) {
        player1.y -= player1.speed;
    }

    if (keys["s"]) {
        player1.y += player1.speed;
    }

    if (keys["a"]) {
        player1.x -= player1.speed;
    }

    if (keys["d"]) {
        player1.x += player1.speed;
    }

    if (keys["arrowdown"]) {
        player2.y += player2.speed
    }

    if (keys["arrowup"]){
        player2.y -= player2.speed
    }

    if(keys["arrowleft"]){
        player2.x -= player2.speed
    }

    if(keys["arrowright"]){
        player2.x += player2.speed
    }

    // Spielfeldbegrenzung
    player.forEach(player => {
        player.x = Math.max(
            0,
            Math.min(canvas.width - player.width, player.x)
        );
        player.y = Math.max(
            0,
            Math.min(canvas.height - player.height, player.y)
        );
    });

    // PHYSICS
    physicsObjects.forEach(object => {
        object.velY += gravity;
        object.velX += wind; //maybe wind?

        object.posY += object.velY;
        object.posX += object.velX;
    });
}

// --------------------------------
// Zeichnen
// --------------------------------

function draw() {

    // Hintergrund
    ctx.fillStyle = "#6bbfd9";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    grass_height = 100
    ctx.fillStyle = "#51c468";
    ctx.fillRect(0, canvas.height - grass_height, canvas.width, grass_height);

    // Spieler
    player.forEach(player => {
    ctx.fillStyle = player.color;
        ctx.fillRect(
            player.x,
            player.y,
            player.width,
            player.height
        );
    })

    // Spieler
    drawCircleF(ball.x, ball.y, ball.radius, ball.color)

    // Start-Hinweis
    if (!gameRunning) {
        ctx.fillStyle = "white";
        ctx.font = "30px Arial";
        ctx.textAlign = "center";

        ctx.fillText(
            "Drücke „Spiel starten“",
            canvas.width / 2,
            canvas.height / 2
        );
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
    draw();

    requestAnimationFrame(gameLoop);
}

gameLoop();
