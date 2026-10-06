// objects/player.js

import { globals } from "../globals.js";
import * as draw from "../rendering/drawFunctions.js";
import { Vec2d } from "../utils/vec2d.js";
import { applyBalanceImpulse, applyAngularImpulse } from "../utils/physics.js";
import { PhysicsObject } from "./physicsObjects.js";
import { clamp, randomSign, applyAlpha, randomBetween } from "../utils/mathFunctions.js";
import { Arm } from "./arm.js";
import { applyTransform } from "../rendering/drawHelpers.js";

const bodyImage = new Image();
bodyImage.src = "./assets/playerBody.png";
const armImage = new Image();
armImage.src = "./assets/playerArm.png";

// KOSC TODO: reimplement JUMP_LEAN_IMPULSE & LEAN_JUMP_PUSH
const JUMP_LEAN_IMPULSE = 0.03 // Lean-Impuls beim Absprung, skaliert mit velX (unabhängig von jumpSpeed/gravity)
const LEAN_JUMP_PUSH = 0.01   // Oberkörper-Neigung schubst beim Springen seitwärts mit
const PLAYER_JUMP_FORCE = 0.02 // unit: px/s

const PI = Math.PI;



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

const PLAYER_SPRING = 0.008           // noch weichere Feder -> spürbar längere Schwingungsdauer (Periode ~ 1/sqrt(SEGMENT_SPRING))
const PLAYER_DAMPING = 0.985          // an die längere Periode angepasst, damit weiterhin mehrere Schwingungen sichtbar ausklingen statt zu schnell zu stoppen
const MAX_ANGULAR_VEL = 0.1         // weiter gedeckelt: pro Frame noch weniger Drehung möglich -> insgesamt sanftere, langsamere Bewegung



// LAND_IMPACT_FACTOR/LAND_SWING_IMPULSE skalieren mit der Aufprall-velY, die durch die Mond-
// Gravitation jetzt ~50x kleiner ist als vorher (jumpSpeed sank von 1/15 auf 0.00135) - um 1:1
// dieselbe Wackel-/Pendel-Stärke wie vorher zu behalten, sind beide Werte um denselben Faktor
// hochskaliert.
const LAND_IMPACT_FACTOR = 1.0         // kleiner Lean-Nudge (balance) beim Landen, skaliert mit Aufprall-velY
const LAND_SWING_IMPULSE = 6         // Dreh-Impuls auf den Torso beim Landen; sättigt zuverlässig am MAX_ANGULAR_VEL, die weiche Feder sorgt für den großen, langsamen Ausschlag
// War seit der Mond-Gravitation nicht mehr neu skaliert (jumpSpeed sank von 1/15 auf 0.0014).
// Bei vollem Lean (MAX_BALANCE=1.1) jetzt ca. 6x jumpSpeed seitlich -> der Sprung geht klar
// überwiegend in die Richtung, in die gerade gependelt wird, statt nur leicht beeinflusst zu sein.
const GROUND_FRICTION = 0.1           // bremst seitliche Bewegung am Boden ab (sonst gleitet die Figur endlos)



export class Player extends PhysicsObject {
    constructor({
        pos,
        facingFlip = false,
        color = "#ffffff",
        jumpButton = "u"
    }) {
        super({ pos: pos, angle: 0 });

        this.width = 1 / 20;
        this.height = 1 / 5;

        this.onGround = true;

        this.balance = 0;          // treibt den Ziel-Winkel des Torsos (Lean nach links/rechts)
        this.balanceVel = 0;
        this.framesSinceJump = 0;  // zählt hoch, solange nicht gesprungen wird -> steuert, ob noch gewackelt wird

        this.facingFlip = facingFlip; // Sprite zeigt nativ nach rechts (angle=0 degrees) (true = gespiegelt)
        this.color = color;

        this.jumpButton = jumpButton;

        this.pivot = new Vec2d(0.5, 0.0); // bottom center

        this.feetUvPos = new Vec2d(0, 0);
        this.shoulderUvPos = new Vec2d(0, 0.75);

        this.arm = new Arm({
            parent: this,
            uvPosOnParent: this.shoulderUvPos,
            angle: 0,
        });
    }

    update() {
        super.update();

        // Spielfeldbegrenzung seitlich
        this.pos.x = Math.max(0, Math.min(1 - this.width, this.pos.x));

        
        // Ragdoll-Wobble pro Spieler (Balance-Drift + Segment-Federphysik)
        updateRagdoll(this, this.jumpButton);

        this.arm.update();
    }

    handleInput(keys) {
        if (this.onGround && keys[this.jumpButton]) {
            console.log(`player ${this.objectId} jumped!`)
            // const inertiaLean = -this.vel.x * JUMP_LEAN_IMPULSE + randomBetween(-0.005, 0.005);

            // this.vel.y = PLAYER_JUMP_FORCE; // positiv = nach oben (posY wächst nach oben)
            // this.vel.x += this.angle * LEAN_JUMP_PUSH; // Neigung des Oberkörpers schubst den Sprung seitwärts
            const jumpAngle = 0.5*PI // nach oben 
            const jumpForceX = PLAYER_JUMP_FORCE * Math.cos(this.angle + jumpAngle);
            const jumpForceY = PLAYER_JUMP_FORCE * Math.sin(this.angle + jumpAngle);
            this.acc.addMut({ x: jumpForceX, y: jumpForceY}); // jump ass acceleration (force)
            this.angleVel = 0; // reset rotation velocity to 0 - keine drehung beim sprung bis zur Landung.
            this.onGround = false;
            this.framesSinceJump = 0; // Timer neu starten -> Wackeln bleibt wieder eine Weile aktiv

            // applyBalanceImpulse(this, inertiaLean);
        }
    }

    updateWithinContainment(grassHeight) {
        if (this.pos.y <= grassHeight) {
            if (!this.onGround) {
                // Aufprall-Wobble: je härter die Landung, desto stärker der Ausschlag.
                // Direkter Dreh-Impuls auf den Torso sorgt für ein aktives Pendeln, das über
                // SEGMENT_SPRING/SEGMENT_DAMPING von selbst langsamer wird bis zum Stillstand;
                // der kleine balance-Nudge sorgt zusätzlich für einen leichten Nachlauf-Lean.
                const speed = this.vel.length();
                const dir = Math.sign(this.vel.x); // -1 (left), 0, +1 (right)
                applyAngularImpulse(this, speed * LAND_SWING_IMPULSE * -dir);
                applyBalanceImpulse(this, speed * LAND_IMPACT_FACTOR * -dir);
            }
            this.pos.y = grassHeight;
            this.vel.y = 0;
            this.onGround = true;
            this.acc.addMut({ x: -this.vel.x * GROUND_FRICTION, y: 0}); // bremst den Lean-Schub ab, statt endlos weiterzugleiten
        } else {
            // this.pos.y = Math.min(1 - this.height, this.pos.y);
        }
    }

    render(ctx) {
        // Spieler: Body-Sprite (Kopf+Torso+Beine) kippt als ein starres Ganzes von den Füßen aus,
        // der Arm ist ein zweites Sprite, das an der Schulter mitschwingt.

        ctx.save();
        applyTransform(ctx, this.pos, this.angle);
        // ab hier ist halt local drawing, also 0.0 ist player.pos, nicht welt 0,0

        // BODY
        // Shape
        draw.drawRect(ctx, {
            pos: new Vec2d(0, 0).sub(this.uvToWorldScale(this.pivot)),
            size: { x: this.width, y: this.height },
            fillColor: applyAlpha(this.color, 0.5),
            strokeColor: "#0a0a",
            lineWidth: 0.005
        });

        // Sprite
        // draw.drawImage(ctx, {
        //     image: bodyImage,
        //     pos: { x: 0, y: this.height },
        //     size: { x: this.width, y: this.height},
        //     flipX: this.facingFlip,
        // });

        ctx.restore();

        // ARM
        this.arm.render(ctx)
    }

    renderDebugging(ctx) {
        super.renderDebugging(ctx);

        draw.drawCircleF(ctx, this.uvToWorldScale(this.feetUvPos), 1/100, "#0f0a");
        draw.drawCircleF(ctx, this.uvToWorldScale(this.shoulderUvPos), 1/100, "#0ffa");
        
        // hitbox sort of
        // draw.drawRect(ctx, {
        //     pos: this.pos,
        //     size: { x: this.width, y: this.height },
        //     fillColor: null,
        //     strokeColor: "#0a0a",
        //     lineWidth: 0.005
        // });
    }
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

    // removed method since torso removal...

    // Gedämpfter Feder-Schwinger: das Segment dreht sich Richtung restAngle,
    // bestehende angleVel (z.B. aus Impulsen) klingt dabei aus statt abrupt
    // zu stoppen -> das typische "Wobble"-Überschwingen.

    let restAngle = player.balance;
    const angleError = player.angle - restAngle;
    player.angleVel += -angleError * PLAYER_SPRING;
    player.angleVel *= PLAYER_DAMPING;
    player.angleVel = clamp(player.angleVel, -MAX_ANGULAR_VEL, MAX_ANGULAR_VEL);
}