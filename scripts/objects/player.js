// player.js

import { PlayerSegment } from "../playerSegment.js";

export class Player {
    constructor({
        posX,
        posY,
        facingFlip = false,
        color = "#ffffff",
    }) {
        this.posX = posX;
        this.posY = posY;

        this.velX = 0;
        this.velY = 0;

        this.width = 1 / 20;
        this.height = 1 / 5;

        this.onGround = true;

        this.balance = 0;          // treibt den Ziel-Winkel des Torsos (Lean nach links/rechts)
        this.balanceVel = 0;
        this.framesSinceJump = 0;  // zählt hoch, solange nicht gesprungen wird -> steuert, ob noch gewackelt wird

        this.facingFlip = facingFlip; // Sprite zeigt nativ nach links (true = gespiegelt)
        this.color = color;

        // Sub-Objekte
        this.torso = new PlayerSegment(Math.PI); // Ruhewinkel: aufrecht (hält angle/angularVel für Lean)
    }
}