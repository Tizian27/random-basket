import * as draw from "./scripts/drawFunctions.js";
import { globals, ETextAnchor } from "./scripts/globals.js";

import { resolveCollisions, updateBall, updateRagdoll, applyBalanceImpulse, applyAngularImpulse } from "./scripts/physics.js";
import { randomSign, randomBetween } from "./scripts/utils/mathFunctions.js";
import { Player } from "./scripts/objects/player.js";
import { Ball } from "./scripts/objects/ball.js";
import { Vec2d } from "./scripts/utils/vec2d.js";

const DRAW_DEBUGGING = true



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

// --------------------------------
// Sprites
// --------------------------------
// Beide Spieler nutzen aktuell dieselben Sprites (nur ein Farb-Set geliefert) - sie sehen
// dadurch optisch identisch aus, nur an unterschiedlicher Position.
const bodyImage = new Image();
bodyImage.src = "./assets/playerBody.png";
const armImage = new Image();
armImage.src = "./assets/playerArm.png";
const BallImage = new Image();
BallImage.src = "./assets/Basketball.png";

// Variables
let gameRunning = false;
let score = 0;
let lives = 3;
let debugText = ""

const keys = {};

// ini
globals.canvasDimensions.width = canvas.width;
globals.canvasDimensions.height = canvas.height;

const grassHeight = 1 / 4

// --------------------------------
// Spieler
// --------------------------------



// Spieler-Maße: normalisiert (0..1). playerWidth/playerHeight sind die Kollisions-Boundingbox
// (für Kollisionen/Bodenkontakt); bodyDisplayHeight ist die sichtbare Sprite-Größe (bewusst
// gleich playerHeight, damit Hitbox und Optik zusammenpassen). Kopf, Torso UND Beine stecken
// jetzt fest im Body-Sprite (assets/playerBody.png) - das kippt beim Wackeln als ein starres
// Ganzes. Nur der Arm (assets/playerArm.png) ist ein zweites, separat rotiertes Sprite.
const playerWidth = 1 / 20
const playerHeight = 1 / 5
const bodyDisplayHeight = playerHeight
const armDisplayHeight = bodyDisplayHeight * 0.5   // Arm ca. halb so hoch wie der Körper (Vorlage-Proportion)
const armShoulderFrac = 0.78                       // Anteil von bodyDisplayHeight, wo die Schulter sitzt
const armSideOffset = bodyDisplayHeight * -0.1     // seitlicher Versatz des Arms vom Körperzentrum

const player1 = new Player({
    pos: new Vec2d(3/4, grassHeight - 1/8),
    facingFlip: false,
    color: "#4b3fd3",
    jumpButton: "w",
});

const player2 = new Player({
    pos: new Vec2d(1/4, grassHeight),
    facingFlip: true,
    color: "#dd5f5f",
    jumpButton: "arrowup",
});

let players = [player1, player2];

const basketBall = new Ball({
    pos: new Vec2d(1/2, 1/2),
    radius: 1/25,
    color: "#ff9d13"
});

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

    player1.pos.set(randomBetween(1/8, 3/8), grassHeight);
    player1.vel.set(0, 0);

    player2.pos.set(randomBetween(5/8, 7/8), grassHeight);
    player2.vel.set(0, 0);

    players.forEach(p => {
        p.onGround = true;
        p.balance = 0;
        p.balanceVel = 0;
        p.framesSinceJump = 0;

        p.torso.angle = Math.PI;
        p.torso.angularVel = 0;
    });

    basketBall.pos.set(1/2, 1/2);
    basketBall.vel.set(0, 0);

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
    });

    // DebugText unter dem spiel canvas
    debugTextElement.textContent = debugText;

    // Boden: Spieler stehen auf der Wiesenoberkante (nicht am Canvas-Rand)
    players.forEach(p => {
        const wasAirborne = !p.onGround;

        if (p.pos.y <= grassHeight) {
            if (wasAirborne) {
                // Aufprall-Wobble: je härter die Landung, desto stärker der Ausschlag.
                // Direkter Dreh-Impuls auf den Torso sorgt für ein aktives Pendeln, das über
                // SEGMENT_SPRING/SEGMENT_DAMPING von selbst langsamer wird bis zum Stillstand;
                // der kleine balance-Nudge sorgt zusätzlich für einen leichten Nachlauf-Lean.
                applyAngularImpulse(p.torso, randomSign() * p.vel.y * LAND_SWING_IMPULSE);
                applyBalanceImpulse(p, randomSign() * p.vel.y * LAND_IMPACT_FACTOR);
            }
            p.pos.y = grassHeight;
            p.vel.y = 0;
            p.onGround = true;
            p.vel.x *= GROUND_FRICTION; // bremst den Lean-Schub ab, statt endlos weiterzugleiten
        } else {
            p.pos.y = Math.min(1 - p.height, p.pos.y);
        }
    });

    // Kollisionen: Spieler<->Spieler und Spieler<->Ball lösen Wackel-Impulse aus
    resolveCollisions(player1, player2, basketBall);
    updateBall(basketBall, grassHeight);

    // Ragdoll-Wobble pro Spieler (Balance-Drift + Segment-Federphysik)
    updateRagdoll(player1, player1.jumpButton);
    updateRagdoll(player2, player2.jumpButton);
}

// Füße sind der feste Ankerpunkt (player.pos.y = Unterkante, siehe drawRectF-Konvention) - das
// Body-Sprite (Kopf+Torso+Beine in einem Bild) dreht sich starr darum. "lean" ist die Abweichung
// von der Senkrechten (torso.angle - Math.PI), 0 = aufrecht. Für den Arm wird zusätzlich der
// Schulterpunkt berechnet: ein Stück "lean"-Richtung nach oben + seitlich versetzt vom Körper.
function getBodyPose(player) {
    const feetX = player.pos.x + player.width / 2;
    const feetY = player.pos.y;
    const lean = player.torso.angle - Math.PI;

    // "Nach oben"-Richtung des Körpers bei aktueller Neigung (0 = senkrecht)
    const upX = Math.sin(lean);
    const upY = Math.cos(lean);
    // Bei gespiegelten Spielern (facingFlip) muss der Arm auf die andere Seite wandern,
    // sonst löst er sich optisch vom gespiegelten Körper.
    const side = player.facingFlip ? -1 : 1;
    const rightX = upY * side;
    const rightY = -upX * side;

    const shoulderX = feetX + upX * bodyDisplayHeight * armShoulderFrac + rightX * armSideOffset;
    const shoulderY = feetY + upY * bodyDisplayHeight * armShoulderFrac + rightY * armSideOffset;

    return { feetX, feetY, lean, shoulderX, shoulderY };
}

// --------------------------------
// Zeichnen
// --------------------------------

function drawFrame() {
    // Global Canvas Update
    globals.canvasDimensions.width = canvas.width;
    globals.canvasDimensions.height = canvas.height;
    
    // Hintergrund
    draw.drawRectF(ctx, 0, 0, 1, 1, "#6bbfd9");
    draw.drawRectF(ctx, 0, 0, 1, grassHeight, "#51c468");

    // Spieler: Body-Sprite (Kopf+Torso+Beine) kippt als ein starres Ganzes von den Füßen aus,
    // der Arm ist ein zweites Sprite, das an der Schulter mitschwingt.
    players.forEach(player => {
        const pose = getBodyPose(player);

        draw.drawSpriteF(ctx, bodyImage, pose.feetX, pose.feetY, pose.lean, bodyDisplayHeight, 1, player.facingFlip)
        draw.drawSpriteF(ctx, armImage, pose.shoulderX, pose.shoulderY, pose.lean, armDisplayHeight, 0, player.facingFlip)
    })

    // Basketball
    draw.drawText(ctx, basketBall.pos.x, basketBall.pos.y, basketBall.radius * 2.4, "🏀", "#fff", "Arial", "center", ETextAnchor.C);
    draw.drawSpriteF(ctx, BallImage, basketBall.pos.x, basketBall.pos.y, basketBall.angle, basketBall.radius * 2, 0, false);
    if (DRAW_DEBUGGING) {
        draw.drawCircleF(ctx, basketBall.pos.x, basketBall.pos.y, basketBall.radius, basketBall.color);
    }

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
    drawFrame();

    requestAnimationFrame(gameLoop);
}

gameLoop();
startGame();