import { Vec3, vec3 } from "wgpu-matrix";

export class BoxCollider {
    public ax: number;
    public bx: number;

    public ay: number;
    public by: number;

    public az: number;
    public bz: number;

    public constructor(ax: number, bx: number, ay: number, by: number, az: number, bz: number) {
        this.ax = ax;
        this.bx = bx;
        this.ay = ay;
        this.by = by;
        this.az = az;
        this.bz = bz;
    }

    public static create(position: Vec3, radius: number) {
        return new BoxCollider(position[0] - radius, position[0] + radius, position[1] - radius, position[1] + radius, position[2] - radius, position[2] + radius);
    }


    private isAx: boolean;
    private isBx: boolean;

    private isAy: boolean;
    private isBy: boolean;

    private isAz: boolean;
    private isBz: boolean;

    /** aabb testing */
    public hasCollision(otherCollider: BoxCollider): boolean {
        // x-coordinate   ax <---> bx
        this.isAx = this.ax < otherCollider.ax && otherCollider.ax < this.bx;
        this.isBx = this.ax < otherCollider.bx && otherCollider.bx < this.bx;
        const noneX = otherCollider.ax <= this.ax && this.bx <= otherCollider.bx;
        if (!this.isAx && !this.isBx && !noneX)
            return false;

        // y-coordinate   ay <---> by
        this.isAy = this.ay < otherCollider.ay && otherCollider.ay < this.by;
        this.isBy = this.ay < otherCollider.by && otherCollider.by < this.by;
        const noneY = otherCollider.ay <= this.ay && this.by <= otherCollider.by;
        if (!this.isAy && !this.isBy && !noneY)
            return false;

        // z-coordinate   az <---> bz
        this.isAz = this.az < otherCollider.az && otherCollider.az < this.bz;
        this.isBz = this.az < otherCollider.bz && otherCollider.bz < this.bz;
        const noneZ = otherCollider.az <= this.az && this.bz <= otherCollider.bz;
        if (!this.isAz && !this.isBz && !noneZ)
            return false;

        return true;
    }


    public handleCollision(otherCollider: BoxCollider): Vec3 {
        function MinDistance(isA: boolean, isB: boolean, a: number, b: number, otherA: number, otherB: number): number {
            if (isA && !isB)
                return b - otherA;
            else if (!isA && isB)
                return a - otherB;
            else {
                const da = otherB - a;
                const db = b - otherA;
                if (da < db)
                    return -da;
                else
                    return db;
            }
        }

        const dx = MinDistance(this.isAx, this.isBx, this.ax, this.bx, otherCollider.ax, otherCollider.bx);
        const dy = MinDistance(this.isAy, this.isBy, this.ay, this.by, otherCollider.ay, otherCollider.by);
        const dz = MinDistance(this.isAz, this.isBz, this.az, this.bz, otherCollider.az, otherCollider.bz);

        if (Math.abs(dx) < Math.abs(dy))
            if (Math.abs(dx) < Math.abs(dz))
                return vec3.create(dx, 0.0, 0.0);
            else
                return vec3.create(0.0, 0.0, dz);
        else
            if (Math.abs(dy) < Math.abs(dz))
                return vec3.create(0.0, dy, 0.0);
            else
                return vec3.create(0.0, 0.0, dz);
    }
}
