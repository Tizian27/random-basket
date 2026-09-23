// objects/ball.js

export class Ball {
    constructor({
        posX,
        posY,
        radius = 1 / 25,
        color = "#ff9d13",
    }) {
        this.posX = posX;
        this.posY = posY;

        this.velX = 0;
        this.velY = 0;

        this.angle = 0;

        this.radius = radius;
        this.color = color;
    }

    get width() {
        return this.radius * 2;
    }

    get height() {
        return this.radius * 2;
    }
}