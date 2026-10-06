// objects/arena.js

import { globals, ETextAnchor } from "../globals.js";
import * as draw from "../rendering/drawFunctions.js";
import * as shape from "../rendering/drawShapes.js";
import { Vec2d } from "../utils/vec2d.js";
import { PhysicsObject } from "./physicsObjects.js";
import { Player } from "./player.js";
import { Ball } from "./ball.js";
import { resolveCollisions } from "../utils/physics.js";

export class Arena{
    constructor({
        name = "name"
    }) {
        this.name = name;
        this.grassHeight = 1 / 4,

        // objects (lists)
        this.physicsObjects = [];
        this.players = [];
        this.balls = [];
    }

    addPlayer({
        pos = new Vec2d(0,0),
        facingFlip = false,
        color = "#4b3fd3",
        jumpButton = "w",
    }){
        const newPlayer = new Player({
            pos: pos,
            facingFlip: facingFlip,
            color: color,
            jumpButton: jumpButton,
        });
        this.physicsObjects.push(newPlayer);
        this.players.push(newPlayer);

        return newPlayer;
    }

    addBall({
        pos = new Vec2d(0, 0),
        radius = 1 / 25,
        color = "#ff9d13",
    }) {
        const newBall = new Ball({
            pos,
            radius,
            color,
        });

        this.physicsObjects.push(newBall);
        this.balls.push(newBall);

        return newBall;
    }

    update(keys) {
        let debugText = ""
        
        // CONTROLS + COLLISIONS
        this.players.forEach(player => {
            player.updateWithinContainment(this.grassHeight);
            player.handleInput(keys)
        });
    
        // Kollisionen: Spieler <-> Spieler und Spieler <-> Ball lösen Wackel-Impulse aus
        resolveCollisions(this.players, this.balls);
    
        // PHYSICS
        this.physicsObjects.forEach((object, i) => {
            object.update();
    
            //debugging
            if (this.players.includes(object)){
                debugText += `\nplayer ${i} - pos: (${object.pos.x.toFixed(4)}, ${object.pos.y.toFixed(4)}) | vel: (${object.vel.x.toFixed(4)}, ${object.vel.y.toFixed(4)})`;
            }
            if (this.balls.includes(object)){
                debugText += `\nBall ${i} - pos: (${object.pos.x.toFixed(4)}, ${object.pos.y.toFixed(4)}) | vel: (${object.vel.x.toFixed(4)}, ${object.vel.y.toFixed(4)})`;
            }
            object.angleAcc = 0; // reset forces after every iteration
            object.acc.set(0, 0); // reset forces after every iteration
        });

        return debugText
    }

    render(ctx) {
        // Hintergrund
        draw.drawRect(ctx, {
            pos: { x: 0, y: 0 },
            size: { x: 1, y: 1 },
            fillColor: "#6bbfd9"
        });

        draw.drawRect(ctx, {
            pos: { x: 0, y: 0 },
            size: { x: 1, y: this.grassHeight },
            fillColor: "#51c468"
        });
    
        // Spieler
        this.players.forEach(player => {
            player.render(ctx);
        })
    
        // Basketball
        this.balls.forEach(ball => {
            ball.render(ctx);
        })
    
        // Debugging Rendering
        if (globals.DRAW_DEBUGGING) {    
            this.physicsObjects.forEach(phobject => {
                phobject.renderDebugging(ctx);
            })
        }
    }



    // JUST FOR FUN
    spawnExtraTill({
        totalPlayersCount = 0,
        totalBallsCount = 0,
        control1 = "w",
        control2 = "arrowup",
        ballSize = 1 / 20
    }) {
        const remainingPlayers = totalPlayersCount - this.players.length;
        const remainingBalls = totalBallsCount - this.balls.length;
        const half = Math.floor(remainingPlayers / 2);

        // first half players
        for (let i = 0; i < half; i++) {
            this.addPlayer({
                pos: new Vec2d(Math.random(), this.grassHeight),
                facingFlip: false,
                color: "#4b3fd3",
                jumpButton: control1
            });
        }

        // second half players
        for (let i = half; i < remainingPlayers; i++) {
            this.addPlayer({
                pos: new Vec2d(Math.random(), this.grassHeight),
                facingFlip: true,
                color: "#dd5f5f",
                jumpButton: control2
            });
        }

        // balls
        for (let i = 0; i < remainingBalls; i++) {
            const randomColor = `hsl(${Math.random() * 360}, 80%, 50%)`;

            this.addBall({
                pos: new Vec2d(Math.random(), Math.random() * 0.5 + 0.5),
                radius: ballSize,
                color: randomColor
            });
        }
    }
}