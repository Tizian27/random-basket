import { globals, ETextAnchor } from "./scripts/globals.js";
import * as draw from "./scripts/drawFunctions.js";

import { resolveCollisions, applyBalanceImpulse, applyAngularImpulse } from "./scripts/physics.js";
import { randomSign, randomBetween } from "./scripts/utils/mathFunctions.js";
import { Player } from "./scripts/objects/player.js";
import { Ball } from "./scripts/objects/ball.js";
import { Vec2d } from "./scripts/utils/vec2d.js";



// LAND_IMPACT_FACTOR/LAND_SWING_IMPULSE skalieren mit der Aufprall-velY, die durch die Mond-
// Gravitation jetzt ~50x kleiner ist als vorher (jumpSpeed sank von 1/15 auf 0.00135) - um 1:1
// dieselbe Wackel-/Pendel-Stärke wie vorher zu behalten, sind beide Werte um denselben Faktor
// hochskaliert.
const LAND_IMPACT_FACTOR = 1.0         // kleiner Lean-Nudge (balance) beim Landen, skaliert mit Aufprall-velY
const LAND_SWING_IMPULSE = 600         // Dreh-Impuls auf den Torso beim Landen; sättigt zuverlässig am MAX_ANGULAR_VEL, die weiche Feder sorgt für den großen, langsamen Ausschlag
// War seit der Mond-Gravitation nicht mehr neu skaliert (jumpSpeed sank von 1/15 auf 0.0014).
// Bei vollem Lean (MAX_BALANCE=1.1) jetzt ca. 6x jumpSpeed seitlich -> der Sprung geht klar
// überwiegend in die Richtung, in die gerade gependelt wird, statt nur leicht beeinflusst zu sein.
const GROUND_FRICTION = 0.85           // bremst seitliche Bewegung am Boden ab (sonst gleitet die Figur endlos)


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

// Variables
let gameRunning = false;
let score = 0;
let lives = 3;
let debugText = ""

const keys = {};

// ini
globals.canvasDimensions.width = canvas.width;
globals.canvasDimensions.height = canvas.height;

// --------------------------------
// Spieler
// --------------------------------

const player1a = new Player({
    pos: new Vec2d(0,0),
    facingFlip: false,
    color: "#4b3fd3",
    jumpButton: "w",
});
const player1b = new Player({
    pos: new Vec2d(0,0),
    facingFlip: false,
    color: "#4b3fd3",
    jumpButton: "w",
});

const player2a = new Player({
    pos: new Vec2d(0,0),
    facingFlip: true,
    color: "#dd5f5f",
    jumpButton: "arrowup",
});
const player2b = new Player({
    pos: new Vec2d(0,0),
    facingFlip: true,
    color: "#dd5f5f",
    jumpButton: "arrowup",
});

let players = [player1a, player1b, player2a, player2b];

const basketBall = new Ball({
    pos: new Vec2d(0,0),
    radius: 1/50,
    color: "#ff9d13"
});

const basketBall2 = new Ball({
    pos: new Vec2d(0,0),
    radius: 1/50,
    color: "#a1ff13"
});

let balls = [basketBall, basketBall2];

let physicsObjects = [...players, ...balls];



// JUST FOR FUN
spawnExtraTill(players, balls, 4, 2, "w", "arrowup"); // LOL, chaos :)
// globals.DRAW_DEBUGGING = false;



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

    player1a.pos.set(randomBetween(1/8, 2/8), globals.grassHeight);
    player1a.vel.set(0, 0);

    player1b.pos.set(randomBetween(2/8, 3/8), globals.grassHeight);
    player1b.vel.set(0, 0);

    player2a.pos.set(randomBetween(5/8, 6/8), globals.grassHeight);
    player2a.vel.set(0, 0);

    player2b.pos.set(randomBetween(6/8, 7/8), globals.grassHeight);
    player2b.vel.set(0, 0);

    players.forEach(p => {
        p.onGround = true;
        p.balance = 0;
        p.balanceVel = 0;
        p.framesSinceJump = 0;

        p.torso.angle = Math.PI;
        p.torso.angularVel = 0;
    });

    basketBall.pos.set(1/2, 1/2);
    basketBall2.pos.set(3/4, 3/4);

    gameRunning = true;

    // updateUI();
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
    players.forEach(player => {
        player.handleInput(keys)
    });

    // PHYSICS
    physicsObjects.forEach((object, i) => {
        object.update();

        //debugging
        if (players.includes(object)){
            debugText += `\nplayer ${i} - pos: (${object.pos.x.toFixed(4)}, ${object.pos.y.toFixed(4)}) | vel: (${object.vel.x.toFixed(4)}, ${object.vel.y.toFixed(4)})`;
        }
        if (balls.includes(object)){
            debugText += `\nBall ${i} - pos: (${object.pos.x.toFixed(4)}, ${object.pos.y.toFixed(4)}) | vel: (${object.vel.x.toFixed(4)}, ${object.vel.y.toFixed(4)})`;
        }
    });


    // DebugText unter dem spiel canvas
    debugTextElement.textContent = debugText;

    // Boden: Spieler stehen auf der Wiesenoberkante (nicht am Canvas-Rand)
    players.forEach(p => {
        const wasAirborne = !p.onGround;

        if (p.pos.y <= globals.grassHeight) {
            if (wasAirborne) {
                // Aufprall-Wobble: je härter die Landung, desto stärker der Ausschlag.
                // Direkter Dreh-Impuls auf den Torso sorgt für ein aktives Pendeln, das über
                // SEGMENT_SPRING/SEGMENT_DAMPING von selbst langsamer wird bis zum Stillstand;
                // der kleine balance-Nudge sorgt zusätzlich für einen leichten Nachlauf-Lean.
                applyAngularImpulse(p.torso, randomSign() * p.vel.y * LAND_SWING_IMPULSE);
                applyBalanceImpulse(p, randomSign() * p.vel.y * LAND_IMPACT_FACTOR);
            }
            p.pos.y = globals.grassHeight;
            p.vel.y = 0;
            p.onGround = true;
            p.vel.x *= GROUND_FRICTION; // bremst den Lean-Schub ab, statt endlos weiterzugleiten
        } else {
            p.pos.y = Math.min(1 - p.height, p.pos.y);
        }
    });

    // Kollisionen: Spieler<->Spieler und Spieler<->Ball lösen Wackel-Impulse aus
    resolveCollisions(players, balls);
}

// --------------------------------
// Zeichnen
// --------------------------------

function drawFrame(ctx) {
    // Global Canvas Update
    globals.canvasDimensions.width = canvas.width;
    globals.canvasDimensions.height = canvas.height;
    
    // Hintergrund
    draw.drawRect(ctx, {x:0,y:0}, {x:1,y:1}, "#6bbfd9");
    draw.drawRect(ctx, {x:0,y:0}, {x:1,y:globals.grassHeight}, "#51c468");

    // Spieler
    players.forEach(player => {
        player.render(ctx);
    })

    // Basketball
    balls.forEach(ball => {
        ball.render(ctx);
    })

    // Start-Hinweis
    if (!gameRunning) {
        draw.drawText(ctx, 1/2, 1/2, 1/8, "Drücke „Spiel starten“", "#fff", "Arial", "center", ETextAnchor.C);
    }
}

// --------------------------------
// Game Loop
// --------------------------------

function gameLoop() {
    update();
    drawFrame(ctx);

    requestAnimationFrame(gameLoop);
}

gameLoop();
startGame();





// JUST FOR FUN

function spawnExtraTill(existingPlayers, existingBalls, playersCount = 0, ballsCount = 0, control1 = "w", control2 = "arrowup") {

    const remainingPlayers = playersCount - existingPlayers.length;
    const remainingBalls = ballsCount - existingBalls.length;
    const half = Math.floor(remainingPlayers / 2);

    // first half players
    for (let i = 0; i < half; i++) {
        players.push(new Player({
            pos: new Vec2d(Math.random(), globals.grassHeight),
            facingFlip: false,
            color: "#4b3fd3",
            jumpButton: control1
        }));
    }

    // second half players
    for (let i = half; i < remainingPlayers; i++) {
        players.push(new Player({
            pos: new Vec2d(Math.random(), globals.grassHeight),
            facingFlip: true,
            color: "#dd5f5f",
            jumpButton: control2
        }));
    }

    // balls
    for (let i = 0; i < remainingBalls; i++) {
        const randomColor = `hsl(${Math.random() * 360}, 80%, 50%)`;

        balls.push(new Ball({
            pos: new Vec2d(Math.random(), Math.random()*0.5 + 0.5),
            radius: 1 / 20,
            color: randomColor
        }));
    }

    // update physics list
    physicsObjects = [...players, ...balls];
}