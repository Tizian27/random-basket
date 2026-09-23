// player.js

import { PlayerSegment } from "../playerSegment.js";
import { Vec2d } from "../utils/vec2d.js";
import { applyBalanceImpulse, applyAngularImpulse } from "../physics.js";
import { PhysicsObject } from "./physicsObjects.js";


const JUMP_LEAN_IMPULSE = 0.03 // Lean-Impuls beim Absprung, skaliert mit velX (unabhängig von jumpSpeed/gravity)
const LEAN_JUMP_PUSH = 0.007   // Oberkörper-Neigung schubst beim Springen seitwärts mit
const PLAYER_JUMP_FORCE = 0.02 // unit: px/s

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
}