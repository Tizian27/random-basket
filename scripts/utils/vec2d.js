// utils/Vec2d.js

export class Vec2d {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    // returns result 
    add(v) {
        return new Vec2d(this.x + v.x, this.y + v.y);
    }

    sub(v) {
        return new Vec2d(this.x - v.x, this.y - v.y);
    }

    scale(s) {
        return new Vec2d(this.x * s, this.y * s);
    }

    normalized() {
        const len = this.length();
        return len === 0 ? new Vec2d(0, 0) : this.scale(1 / len);
    }

    // mutable - changes this vector2d and returns
    addMut(v) {
        this.x += v.x;
        this.y += v.y;
        return this;
    }

    subMut(v) {
        this.x -= v.x;
        this.y -= v.y;
        return this;
    }

    scaleMut(s) {
        this.x *= s;
        this.y *= s;
        return this;
    }

    set(x, y) {
        this.x = x;
        this.y = y;
        return this;
    }

    // -------- utils --------
    length() {
        return Math.hypot(this.x, this.y);
    }

    lengthSq() {
        return this.x * this.x + this.y * this.y;
    }

    dot(v) {
        return this.x * v.x + this.y * v.y;
    }

    clone() {
        return new Vec2d(this.x, this.y);
    }

    static zero() {
        return new Vec2d(0, 0);
    }
}