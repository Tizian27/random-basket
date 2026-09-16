const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const scoreElement = document.getElementById("score");
const livesElement = document.getElementById("lives");
const startButton = document.getElementById("start-button");

let gameRunning = false;
let score = 0;
let lives = 3;

const keys = {};

// --------------------------------
// Spieler
// --------------------------------

const player = {
    x: 100,
    y: 100,

    width: 40,
    height: 40,

    speed: 5,

    color: "dodgerblue"
};

const ball = {
    x: 100,
    y: 100,

    width: 10,
    height: 10,

    speed: 5,

    color: "red"

}

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

    player.x = 100;
    player.y = 100;

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

    // Bewegung
    if (keys["w"]) {
        player.y -= player.speed;
    }

    if (keys["s"]) {
        player.y += player.speed;
    }

    if (keys["a"]) {
        player.x -= player.speed;
    }

    if (keys["d"]) {
        player.x += player.speed;
    }

    if (keys["arrowdown"]) {
        ball.y += ball.speed
    }

    if (keys["arrowup"]){
        ball.y -= ball.speed
    }

    if(keys["arrowleft"]){
        ball.x -= ball.speed
    }

    if(keys["arrowright"]){
        ball.x += ball.speed
    }

    // Spielfeldbegrenzung
    player.x = Math.max(
        0,
        Math.min(canvas.width - player.width, player.x)
    );

    player.y = Math.max(
        0,
        Math.min(canvas.height - player.height, player.y)
    );
}

// --------------------------------
// Zeichnen
// --------------------------------

function draw() {

    // Hintergrund
    ctx.fillStyle = "#222";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Spieler
    ctx.fillStyle = player.color;

    ctx.fillRect(
        player.x,
        player.y,
        player.width,
        player.height
    );

    // Spieler
    ctx.fillStyle = ball.color;

    ctx.fillRect(
        ball.x,
        ball.y,
        ball.width,
        ball.height
    );



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
