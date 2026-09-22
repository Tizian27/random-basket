import * as draw from "./scripts/drawFunctions.js";
import Globals from "./scripts/globals.js";

import { PlayerSegment } from "./scripts/playerSegment.js";
import { resolveCollisions, updateBall, updateRagdoll, applyBalanceImpulse, applyAngularImpulse } from "./scripts/physics.js";
import { randomSign } from "./scripts/mathFunctions.js";


const JUMP_LEAN_IMPULSE = 0.03         // Lean-Impuls beim Absprung, skaliert mit velX (unabhängig von jumpSpeed/gravity)
// LAND_IMPACT_FACTOR/LAND_SWING_IMPULSE skalieren mit der Aufprall-velY, die durch die Mond-
// Gravitation jetzt ~50x kleiner ist als vorher (jumpSpeed sank von 1/15 auf 0.00135) - um 1:1
// dieselbe Wackel-/Pendel-Stärke wie vorher zu behalten, sind beide Werte um denselben Faktor
// hochskaliert.
const LAND_IMPACT_FACTOR = 1.0         // kleiner Lean-Nudge (balance) beim Landen, skaliert mit Aufprall-velY
const LAND_SWING_IMPULSE = 600         // Dreh-Impuls auf den Torso beim Landen; sättigt zuverlässig am MAX_ANGULAR_VEL, die weiche Feder sorgt für den großen, langsamen Ausschlag
// War seit der Mond-Gravitation nicht mehr neu skaliert (jumpSpeed sank von 1/15 auf 0.0014).
// Bei vollem Lean (MAX_BALANCE=1.1) jetzt ca. 6x jumpSpeed seitlich -> der Sprung geht klar
// überwiegend in die Richtung, in die gerade gependelt wird, statt nur leicht beeinflusst zu sein.
const LEAN_JUMP_PUSH = 0.007           // Oberkörper-Neigung schubst beim Springen seitwärts mit
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

// Variables
let gameRunning = false;
let score = 0;
let lives = 3;
let debugText = ""

const keys = {};
const wind = 0

// viel Airtime bei geringer Sprunghöhe (nur Gravitation zu senken macht Sprünge sowohl höher als
// auch länger, das Absenken beider Werte zusammen hält die Höhe niedrig, streckt aber die Zeit).
// Ausgelegt auf ~0.06 Sprunghöhe (rechnerisch: jumpSpeed²/(2*|gravity|)) bei ~180 Frames
// (~3s bei 60fps) Gesamt-Flugzeit (rechnerisch: 2*jumpSpeed/|gravity|).
const gravity = -0.0010 // unit: px/s/s
const jumpSpeed = 0.0070 // unit: px/s

// ini
Globals.canvasDimensions.width = canvas.width;
Globals.canvasDimensions.height = canvas.height;

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
const playerHeight = 2 / 15
const bodyDisplayHeight = playerHeight
const armDisplayHeight = bodyDisplayHeight * 0.5   // Arm ca. halb so hoch wie der Körper (Vorlage-Proportion)
const armShoulderFrac = 0.78                        // Anteil von bodyDisplayHeight, wo die Schulter sitzt
const armSideOffset = bodyDisplayHeight * -0.1      // seitlicher Versatz des Arms vom Körperzentrum

const player1 = {
    posX: 3/4,
    posY: grassHeight,
    velY: 0,
    velX: 0,
    width: playerWidth,
    height: playerHeight,
    onGround: true,
    balance: 0,     // treibt den Ziel-Winkel des Torsos (Lean nach links/rechts)
    balanceVel: 0,
    framesSinceJump: 0, // zählt hoch, solange nicht gesprungen wird -> steuert, ob noch gewackelt wird
    facingFlip: false // Sprite zeigt nativ nach links
};

// torso hält nur noch die Lean-Winkel-Physik (angle/angularVel).
player1.torso = new PlayerSegment(Math.PI); // Ruhewinkel: aufrecht

const player2 = {
    posX: 1/4,
    posY: grassHeight,
    velY: 0,
    velX: 0,
    width: playerWidth,
    height: playerHeight,
    onGround: true,
    balance: 0,
    balanceVel: 0,
    framesSinceJump: 0,
    facingFlip: true // gespiegelt, damit Spieler 2 in die andere Richtung schaut als Spieler 1
};

player2.torso = new PlayerSegment(Math.PI);

let player = [player1, player2]

const basketBall = {
    posX: 1/2,
    posY: 1/2,
    velY: 0,
    velX: 0,
    radius: 1/50,

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
    player1.posY = grassHeight;
    player1.velX = 0;
    player1.velY = 0;

    player2.posX = 3/4;
    player2.posY = grassHeight;
    player2.velX = 0;
    player2.velY = 0;

    player.forEach(p => {
        p.onGround = true;
        p.balance = 0;
        p.balanceVel = 0;
        p.framesSinceJump = 0;
        p.torso.angle = Math.PI;
        p.torso.angularVel = 0;
        // Arm braucht keinen Reset - seine Pose wird jeden Frame in getBodyPose() starr
        // aus der aktuellen Torso-Neigung abgeleitet.
    });

    basketBall.posX = 1/2;
    basketBall.posY = 1/2;
    basketBall.velX = 0;
    basketBall.velY = 0;

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

    const player1Active = keys["w"];
    const player2Active = keys["arrowup"];

    // CONTROLS
    // player1
    if (keys["w"] && player1.onGround) {
        const inertiaLean = -player1.velX * JUMP_LEAN_IMPULSE + (Math.random() - 0.5) * 0.1;

        player1.velY = jumpSpeed; // positiv = nach oben (posY wächst nach oben)
        player1.velX += player1.balance * LEAN_JUMP_PUSH; // Neigung des Oberkörpers schubst den Sprung seitwärts
        player1.onGround = false;
        player1.framesSinceJump = 0; // Timer neu starten -> Wackeln bleibt wieder eine Weile aktiv

        applyBalanceImpulse(player1, inertiaLean);
    }

    // player2
    if (keys["arrowup"] && player2.onGround) {
        const inertiaLean = -player2.velX * JUMP_LEAN_IMPULSE + (Math.random() - 0.5) * 0.1;

        player2.velY = jumpSpeed;
        player2.velX += player2.balance * LEAN_JUMP_PUSH;
        player2.onGround = false;
        player2.framesSinceJump = 0;

        applyBalanceImpulse(player2, inertiaLean);
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

        // Spielfeldbegrenzung seitlich (Boden wird unten pro Objekttyp behandelt)
        object.posX = Math.max(0, Math.min(1 - object.width, object.posX));

        //debugging
        if (player.includes(object)){
            debugText += `\nplayer ${i} - pos: (${object.posX.toFixed(4)}, ${object.posY.toFixed(4)}) | vel: (${object.velX.toFixed(4)}, ${object.velY.toFixed(4)})`;
        }
    });

    // DebugText unter dem spiel canvas
    debugTextElement.textContent = debugText;

    // Boden: Spieler stehen auf der Wiesenoberkante (nicht am Canvas-Rand)
    player.forEach(p => {
        const wasAirborne = !p.onGround;

        if (p.posY <= grassHeight) {
            if (wasAirborne) {
                // Aufprall-Wobble: je härter die Landung, desto stärker der Ausschlag.
                // Direkter Dreh-Impuls auf den Torso sorgt für ein aktives Pendeln, das über
                // SEGMENT_SPRING/SEGMENT_DAMPING von selbst langsamer wird bis zum Stillstand;
                // der kleine balance-Nudge sorgt zusätzlich für einen leichten Nachlauf-Lean.
                applyAngularImpulse(p.torso, randomSign() * p.velY * LAND_SWING_IMPULSE);
                applyBalanceImpulse(p, randomSign() * p.velY * LAND_IMPACT_FACTOR);
            }
            p.posY = grassHeight;
            p.velY = 0;
            p.onGround = true;
            p.velX *= GROUND_FRICTION; // bremst den Lean-Schub ab, statt endlos weiterzugleiten
        } else {
            p.posY = Math.min(1 - p.height, p.posY);
        }
    });

    // Kollisionen: Spieler<->Spieler und Spieler<->Ball lösen Wackel-Impulse aus
    resolveCollisions(player1, player2, basketBall);
    updateBall(basketBall, grassHeight);

    // Ragdoll-Wobble pro Spieler (Balance-Drift + Segment-Federphysik)
    updateRagdoll(player1, player1Active);
    updateRagdoll(player2, player2Active);
}

// Füße sind der feste Ankerpunkt (player.posY = Unterkante, siehe drawRectF-Konvention) - das
// Body-Sprite (Kopf+Torso+Beine in einem Bild) dreht sich starr darum. "lean" ist die Abweichung
// von der Senkrechten (torso.angle - Math.PI), 0 = aufrecht. Für den Arm wird zusätzlich der
// Schulterpunkt berechnet: ein Stück "lean"-Richtung nach oben + seitlich versetzt vom Körper.
function getBodyPose(player) {
    const feetX = player.posX + player.width / 2;
    const feetY = player.posY;
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
    Globals.canvasDimensions.width = canvas.width;
    Globals.canvasDimensions.height = canvas.height;
    
    // Hintergrund
    draw.drawRectF(ctx, 0, 0, 1, 1, "#6bbfd9");
    
    draw.drawRectF(ctx, 0, 0, 1, grassHeight, "#51c468");

    // Spieler: Body-Sprite (Kopf+Torso+Beine) kippt als ein starres Ganzes von den Füßen aus,
    // der Arm ist ein zweites Sprite, das an der Schulter mitschwingt.
    player.forEach(player => {
        const pose = getBodyPose(player);

        draw.drawSpriteF(ctx, bodyImage, pose.feetX, pose.feetY, pose.lean, bodyDisplayHeight, 1, player.facingFlip)
        draw.drawSpriteF(ctx, armImage, pose.shoulderX, pose.shoulderY, pose.lean, armDisplayHeight, 0, player.facingFlip)
    })

    // Basketball (nur das Emoji - vorher wurde zusätzlich ein einfacher Kreis darunter
    // gezeichnet, das sah wie zwei Bälle an leicht versetzter Position aus)
    draw.drawText(ctx, basketBall.posX, basketBall.posY, basketBall.radius * 2.4, "🏀", "#fff", "Arial", "center")

    // Start-Hinweis
    if (!gameRunning) {
        draw.drawText(ctx, 1/2, 1/2, 1/8, "Drücke „Spiel starten“", "#fff", "Arial", "center");
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