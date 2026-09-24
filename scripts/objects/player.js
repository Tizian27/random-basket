// player.js

import { globals } from "../globals.js";
import * as draw from "../drawFunctions.js";
import { PlayerSegment } from "../playerSegment.js";
import { Vec2d } from "../utils/vec2d.js";
import { applyBalanceImpulse, applyAngularImpulse } from "../physics.js";
import { PhysicsObject } from "./physicsObjects.js";

const bodyImage = new Image();
bodyImage.src = "./assets/playerBody.png";
const armImage = new Image();
armImage.src = "./assets/playerArm.png";

const JUMP_LEAN_IMPULSE = 0.03 // Lean-Impuls beim Absprung, skaliert mit velX (unabhängig von jumpSpeed/gravity)
const LEAN_JUMP_PUSH = 0.007   // Oberkörper-Neigung schubst beim Springen seitwärts mit
const PLAYER_JUMP_FORCE = 0.02 // unit: px/s

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

export class Player extends PhysicsObject {
    constructor({
        pos,
        facingFlip = false,
        color = "#ffffff",
        jumpButton = "u"
    }) {
        super({ pos });

        this.width = 1 / 20;
        this.height = 1 / 5;

        this.onGround = true;

        this.balance = 0;          // treibt den Ziel-Winkel des Torsos (Lean nach links/rechts)
        this.balanceVel = 0;
        this.framesSinceJump = 0;  // zählt hoch, solange nicht gesprungen wird -> steuert, ob noch gewackelt wird

        this.facingFlip = facingFlip; // Sprite zeigt nativ nach links (true = gespiegelt)
        this.color = color;

        this.jumpButton = jumpButton;
        
        this.onGround = 0;
        this.balance = 0;
        this.balanceVel = 0;
        this.framesSinceJump = 0;

        // Sub-Objekte
        this.torso = new PlayerSegment(Math.PI); // Ruhewinkel: aufrecht (hält angle/angularVel für Lean)
    }

    update() {
        super.update();

        // Spielfeldbegrenzung seitlich (Boden wird unten pro Objekttyp behandelt)
        this.pos.x = Math.max(0, Math.min(1 - this.width, this.pos.x));
    }

    handleInput(keys) {
        if (keys[this.jumpButton] && this.onGround) {
            const inertiaLean =
                -this.vel.x * JUMP_LEAN_IMPULSE +
                (Math.random() - 0.5) * 0.1;

            this.vel.y = PLAYER_JUMP_FORCE; // positiv = nach oben (posY wächst nach oben)
            this.vel.x += this.balance * LEAN_JUMP_PUSH; // Neigung des Oberkörpers schubst den Sprung seitwärts
            this.onGround = false;
            this.framesSinceJump = 0; // Timer neu starten -> Wackeln bleibt wieder eine Weile aktiv

            applyBalanceImpulse(this, inertiaLean);
        }
    }

    render(ctx) {
        const pose = getBodyPose(this);
        draw.drawSpriteF(ctx, bodyImage, pose.feetX, pose.feetY, pose.lean, bodyDisplayHeight, 1, this.facingFlip)
        draw.drawSpriteF(ctx, armImage, pose.shoulderX, pose.shoulderY, pose.lean, armDisplayHeight, 0, this.facingFlip)
        
        if (globals.DRAW_DEBUGGING) {
            draw.drawCircleF(ctx, this.pos.x, this.pos.y, 1/50, "#f0fa");
            draw.drawCircleF(ctx, pose.feetX, pose.feetY, 1/50, "#0f0a");
        }
    }
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