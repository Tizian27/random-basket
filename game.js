import * as draw from "./scripts/drawFunctions.js";
import Globals from "./scripts/globals.js";

import { PlayerSegment } from "./scripts/playerSegment.js";


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
const gravity = -0.000010 // unit: px/s/s
const jumpSpeed = 0.00140 // unit: px/s

// ini
Globals.canvasDimensions.width = canvas.width;
Globals.canvasDimensions.height = canvas.height;

const grassHeight = 1 / 4

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

// --------------------------------
// Ragdoll-Wobble (Balance + Segment-Federphysik)
// --------------------------------
// Keine echte Rigid-Body-Engine: jedes Segment ist ein gedämpfter Feder-Schwinger,
// der zu einem Ziel-Winkel zurückfedert. "balance" ist ein pro Spieler treibender
// Wert, der diesen Ziel-Winkel des Torsos vorgibt und ohne aktive Steuerung leicht
// zufällig driftet -> komödiantisches Dauerwackeln statt stabilem Stehen.
const BALANCE_NOISE = 0.015            // zufälliges "Zittern" pro Frame (nur solange IDLE_SETTLE_FRAMES nicht überschritten ist)
const BALANCE_CORRECTION_ACTIVE = 0.12 // Rückstellkraft bei aktiver Steuerung
const BALANCE_CORRECTION_IDLE = 0.02   // Rückstellkraft im Leerlauf (schwach -> Drift, solange noch "kürzlich" gesprungen wurde)
const BALANCE_DAMPING = 0.92
const MAX_BALANCE = 1.1                // rad, harte Grenze bevor die Figur "umkippt"
const MAX_BALANCE_VEL = 0.3
const IDLE_SETTLE_FRAMES = 180         // ~3s bei 60fps: so lange nach dem letzten Sprung wird noch gewackelt/gedriftet, danach komplett still

const SEGMENT_SPRING = 0.008           // noch weichere Feder -> spürbar längere Schwingungsdauer (Periode ~ 1/sqrt(SEGMENT_SPRING))
const SEGMENT_DAMPING = 0.985          // an die längere Periode angepasst, damit weiterhin mehrere Schwingungen sichtbar ausklingen statt zu schnell zu stoppen
const MAX_ANGULAR_VEL = 0.05         // weiter gedeckelt: pro Frame noch weniger Drehung möglich -> insgesamt sanftere, langsamere Bewegung

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

const PLAYER_BUMP_IMPULSE = 0.35       // Basis-Wackel-Impuls bei Spieler-Kollision (Winkel, unabhängig vom Koordinatensystem)
const BALL_BUMP_IMPULSE = 0.15         // Wackel-Impuls beim Ballkontakt

const BALL_BOUNCE_SPEED = 0.07         // Abprallgeschwindigkeit des Balls bei Treffer (normalisierte Einheiten)
const BALL_BOUNCE_LIFT = 0.02          // kleiner Extra-Lift nach oben beim Treffer
const BALL_GROUND_RESTITUTION = 0.6
const BALL_WALL_RESTITUTION = 0.7
const BALL_GROUND_FRICTION = 0.9       // bremst den Ball seitlich ab, während er auf dem Boden liegt
const BALL_MAX_SPEED = 0.12            // harte Obergrenze für die Ballgeschwindigkeit (sonst kein Max bei mehreren Treffern hintereinander)

function randomSign() {
    return Math.random() < 0.5 ? -1 : 1;
}

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
    resolvePlayerCollision(player1, player2);
    resolveBallCollision(player1, basketBall);
    resolveBallCollision(player2, basketBall);
    updateBallBounds();
    clampBallSpeed();

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
// Ragdoll-Physik
// --------------------------------

function applyBalanceImpulse(player, amount) {
    player.balanceVel += amount;
}

function applyAngularImpulse(segment, amount) {
    segment.angularVel += amount;
}

// Balance ist der treibende Wert für den Ziel-Winkel des Torsos. Ohne aktive
// Steuerung ("activeInput") ist die Rückstellkraft schwach -> die Figur driftet spürbar statt
// kerzengerade stehenzubleiben - aber nur eine Weile nach dem letzten Sprung (IDLE_SETTLE_FRAMES),
// danach hört das Rauschen ganz auf und Feder+Dämpfung bringen die Figur komplett zur Ruhe.
function updateBalance(player, activeInput) {
    player.framesSinceJump++;

    if (player.framesSinceJump < IDLE_SETTLE_FRAMES) {
        player.balanceVel += (Math.random() - 0.5) * BALANCE_NOISE;
    }

    const correction = activeInput ? BALANCE_CORRECTION_ACTIVE : BALANCE_CORRECTION_IDLE;
    player.balanceVel += -player.balance * correction;

    player.balanceVel *= BALANCE_DAMPING;
    player.balanceVel = clamp(player.balanceVel, -MAX_BALANCE_VEL, MAX_BALANCE_VEL);

    player.balance += player.balanceVel;
    player.balance = clamp(player.balance, -MAX_BALANCE, MAX_BALANCE);
}

// Gedämpfter Feder-Schwinger: das Segment dreht sich Richtung restAngle,
// bestehende angularVel (z.B. aus Impulsen) klingt dabei aus statt abrupt
// zu stoppen -> das typische "Wobble"-Überschwingen.
function updateSegmentPhysics(segment, restAngle) {
    const angleError = segment.angle - restAngle;
    segment.angularVel += -angleError * SEGMENT_SPRING;
    segment.angularVel *= SEGMENT_DAMPING;
    segment.angularVel = clamp(segment.angularVel, -MAX_ANGULAR_VEL, MAX_ANGULAR_VEL);

    segment.angle += segment.angularVel;
}

function updateRagdoll(player, activeInput) {
    // In der Luft kein Pendeln: Winkel/Balance bleiben eingefroren, wie sie beim Absprung waren,
    // und laufen erst beim nächsten Bodenkontakt (Landungs-Impuls) wieder weiter.
    if (!player.onGround) {
        return;
    }

    updateBalance(player, activeInput);

    // Torso zeigt in Ruhe nach oben (Math.PI) und kippt um "balance" aus der Hüfte aus.
    // Beine und Arm haben keine eigene Federphysik mehr - sie werden in syncRagdoll starr
    // aus der aktuellen Torso-Neigung abgeleitet (kein unabhängiges Wackeln).
    updateSegmentPhysics(player.torso, Math.PI + player.balance);
}

// Einfache AABB-Trennung + Wackel-Impuls, keine echte Rigid-Body-Auflösung
function resolvePlayerCollision(a, b) {
    const overlapX = Math.min(a.posX + a.width, b.posX + b.width) - Math.max(a.posX, b.posX);
    const overlapY = Math.min(a.posY + a.height, b.posY + b.height) - Math.max(a.posY, b.posY);

    if (overlapX <= 0 || overlapY <= 0) {
        return;
    }

    const pushDir = a.posX <= b.posX ? -1 : 1; // a nach links, b nach rechts (oder umgekehrt)
    const separation = overlapX / 2;
    a.posX += pushDir * separation;
    b.posX -= pushDir * separation;

    const relSpeed = Math.abs(a.velX - b.velX) + Math.abs(a.velY - b.velY);
    const impulse = PLAYER_BUMP_IMPULSE + relSpeed * 0.05;

    applyBalanceImpulse(a, -pushDir * impulse);
    applyBalanceImpulse(b, pushDir * impulse);
    applyAngularImpulse(a.torso, -pushDir * impulse * 0.5);
    applyAngularImpulse(b.torso, pushDir * impulse * 0.5);
}

// Kreis-Distanz-Check (Ball) gegen die Bounding-Box-Mitte des Spielers
function resolveBallCollision(player, ball) {
    const centerX = player.posX + player.width / 2;
    const centerY = player.posY + player.height / 2;

    const dx = ball.posX - centerX;
    const dy = ball.posY - centerY;
    const dist = Math.hypot(dx, dy) || 0.0001; // Division durch 0 vermeiden
    const collisionRange = ball.radius + player.width;

    if (dist >= collisionRange) {
        return;
    }

    const nx = dx / dist;
    const ny = dy / dist;

    // Ball wegstoßen, mit etwas Schwung vom Spieler
    ball.velX = nx * BALL_BOUNCE_SPEED + player.velX * 0.4;
    ball.velY = ny * BALL_BOUNCE_SPEED + player.velY * 0.4 + BALL_BOUNCE_LIFT;

    // aus der Überlappung herausschieben, damit der Ball nicht "klebt"
    const pushOut = collisionRange - dist;
    ball.posX += nx * pushOut;
    ball.posY += ny * pushOut;

    // leichter Ausweich-Wobble beim Spieler
    applyBalanceImpulse(player, -nx * BALL_BUMP_IMPULSE);
    applyAngularImpulse(player.torso, -nx * BALL_BUMP_IMPULSE);
}

// Ball an Seitenwänden und auf der Wiesenoberkante abprallen lassen (mit Energieverlust).
// Läuft im selben normalisierten Modellraum (0..1, posY wächst nach oben) wie die Spieler.
function updateBallBounds() {
    if (basketBall.posX - basketBall.radius < 0) {
        basketBall.posX = basketBall.radius;
        basketBall.velX = Math.abs(basketBall.velX) * BALL_WALL_RESTITUTION;
    } else if (basketBall.posX + basketBall.radius > 1) {
        basketBall.posX = 1 - basketBall.radius;
        basketBall.velX = -Math.abs(basketBall.velX) * BALL_WALL_RESTITUTION;
    }

    const minBallY = grassHeight + basketBall.radius;
    if (basketBall.posY < minBallY) {
        basketBall.posY = minBallY;
        basketBall.velY = Math.abs(basketBall.velY) * BALL_GROUND_RESTITUTION;
        basketBall.velX *= BALL_GROUND_FRICTION; // bremst seitlich ab, statt endlos weiterzurollen
    }
}

// Harte Obergrenze für die Ballgeschwindigkeit. Anders als bei Boden-/Wandprall (Restitution < 1,
// verliert automatisch Energie) setzt eine Spielerkollision die Geschwindigkeit einfach neu -
// ohne diesen Clamp gäbe es keinen Deckel, falls mehrere Treffer kurz hintereinander passieren.
function clampBallSpeed() {
    const speed = Math.hypot(basketBall.velX, basketBall.velY);
    if (speed > BALL_MAX_SPEED) {
        const scale = BALL_MAX_SPEED / speed;
        basketBall.velX *= scale;
        basketBall.velY *= scale;
    }
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