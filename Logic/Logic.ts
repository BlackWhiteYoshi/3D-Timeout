import { Renderer } from "../Rendering/Renderer";
import { Mesh } from "../Rendering/Mesh";
import { BoxCollider } from "./BoxCollider";
import { Mat4, mat4, Vec3, vec3 } from "wgpu-matrix";

export class Logic {
    static SPEED_MULTIPLIER = 5;


    private renderer: Renderer;
    private htmlCanvas: HTMLCanvasElement;
    private dialogButton: SVGSVGElement;

    private stateHasChanged: boolean = false;

    private modelBuffer: Float32Array = new Float32Array(Renderer.OBJECT_BUFFER_SIZE * 16);
    private modelBufferCount: number = 0;
    private boxColliderBuffer: BoxCollider[] = new Array<BoxCollider>(Renderer.OBJECT_BUFFER_SIZE);
    private boxColliderCount: number = 0;

    private viewPos: Vec3;
    private viewRotation: Vec3;
    private view: Mat4;

    private projectionFieldOfView: number = 1.0;
    private projection: Mat4;

    private brightnessTimer: number = 0.0;
    private colorTimer: number = 0.0;
    private lightDirectionTimer: number = 0.0;

    // configs
    public timeout: number;
    public moveSpeed: number;
    public mouseSensitivity: number;


    public constructor(renderer: Renderer, htmlCanvas: HTMLCanvasElement, dialogButton: SVGSVGElement) {
        this.renderer = renderer;
        this.htmlCanvas = htmlCanvas;
        this.dialogButton = dialogButton;

        for (let i = 0; i < this.boxColliderBuffer.length; i++)
            this.boxColliderBuffer[i] = new BoxCollider(0.0, 0.0, 0.0, 0.0, 0.0, 0.0);

        this.view = mat4.identity();
        this.viewPos = vec3.zero();
        this.viewPos[2] = -3;
        this.viewRotation = vec3.zero();

        this.projection = mat4.create();
        this.zoomCamera(0);

        this.renderer.view = this.view;
        this.renderer.projection = this.projection;

        // configs
        const timeoutValue = localStorage.getItem("timeout");
        if (timeoutValue !== null)
            this.timeout = Number.parseInt(timeoutValue);
        else
            this.timeout = Date.now() + 10 * 60 * 1000;

        const moveSpeedValue = localStorage.getItem("moveSpeed");
        if (moveSpeedValue !== null)
            this.moveSpeed = Number.parseFloat(moveSpeedValue);
        else
            this.moveSpeed = 1;

        const mouseSensitivityValue = localStorage.getItem("mouseSensitivity");
        if (mouseSensitivityValue !== null)
            this.mouseSensitivity = Number.parseFloat(mouseSensitivityValue);
        else
            this.mouseSensitivity = 1;

        this.physicsLoop();
        window.setInterval(this.physicsLoop, 1000.0 / 120.0);
        this.renderLoop();
    }

    physicsLoop = () => {
        this.stateHasChanged = true;

        // creates also the digits BoxColliders
        this.createDigitModels();

        // camera movement
        {
            const speed = this.moveFast ? Logic.SPEED_MULTIPLIER * 0.1 * this.moveSpeed : 0.1 * this.moveSpeed;
            const xMovement = -Math.sin(this.viewRotation[0]) * speed;
            const zMovement = Math.cos(this.viewRotation[0]) * speed;

            if (this.moveForward) {
                this.viewPos[0] += xMovement;
                this.viewPos[2] += zMovement;
            }
            if (this.moveBackward) {
                this.viewPos[0] -= xMovement;
                this.viewPos[2] -= zMovement;
            }
            if (this.moveLeft) {
                this.viewPos[0] += zMovement;
                this.viewPos[2] -= xMovement;
            }
            if (this.moveRight) {
                this.viewPos[0] -= zMovement;
                this.viewPos[2] += xMovement;
            }
            if (this.moveUp)
                this.viewPos[1] -= speed;
            if (this.moveDown)
                this.viewPos[1] += speed;

            this.handleCameraCollision();

            mat4.identity(this.view);
            mat4.rotateX(this.view, this.viewRotation[1], this.view);
            mat4.rotateY(this.view, this.viewRotation[0], this.view);
            mat4.translate(this.view, this.viewPos, this.view);
        }

        this.renderer.view = this.view;
        this.renderer.projection = this.projection;


        // uniforms

        this.brightnessTimer += 0.005;
        if (this.brightnessTimer > 2.0 * Math.PI)
            this.brightnessTimer -= 2.0 * Math.PI;
        const brightness = Math.sin(this.brightnessTimer) / 4.0 + 0.75;
        this.renderer.brightness = brightness;

        this.colorTimer += 0.001;
        if (this.colorTimer > 1.0)
            this.colorTimer -= 1.0
        this.renderer.colorRotate = this.colorTimer;

        this.lightDirectionTimer += 0.002;
        if (this.lightDirectionTimer > 2.0 * Math.PI)
            this.lightDirectionTimer -= 2.0 * Math.PI;
        const lightDirectionY = 0.25 + Math.cos(this.lightDirectionTimer) / 8.0;
        const sinY = Math.sin(Math.acos(lightDirectionY));
        const lightDirectionX = Math.cos(this.lightDirectionTimer) * sinY;
        const lightDirectionZ = Math.sin(this.lightDirectionTimer) * sinY;
        this.renderer.lightDirection = vec3.create(lightDirectionX, lightDirectionY, lightDirectionZ);
    }

    renderLoop = () => {
        try {
            if (this.windowResized) {
                this.renderer.renewRenderTextures();
                this.windowResized = false;
            }
            else if (!this.stateHasChanged)
                return;

            this.renderer.renderStart();
            {
                this.renderer.setObjectShader();
                {
                    this.renderer.renderLittleSphere();
                    this.renderer.renderSphereCubes();
                    this.renderer.renderDigits(this.modelBuffer.subarray(0, this.modelBufferCount).buffer);
                }

                this.renderer.setBackgroundShader();
                {
                    this.renderer.renderBeckgound();
                }
            }
            this.renderer.renderEnd();
        }
        finally {
            this.stateHasChanged = false;
            requestAnimationFrame(this.renderLoop);
        }
    }

    handleCameraCollision() {
        if (   -25 < this.viewPos[1] && this.viewPos[1] < 25
            && 198 < this.viewPos[2] && this.viewPos[2] < 202) {
            // digits area

            const cameraCollider = BoxCollider.create(this.viewPos, 0.5);
            for (let i = 0; i < this.boxColliderCount; i++) {
                const digitCollider = this.boxColliderBuffer[i];
                if (digitCollider.hasCollision(cameraCollider)) {
                    const pushAmount: Vec3 = digitCollider.handleCollision(cameraCollider);
                    this.viewPos[0] += pushAmount[0];
                    this.viewPos[1] += pushAmount[1];
                    this.viewPos[2] += pushAmount[2];
                    return;
                }
            }

            return;
        }

        if (   -202 < this.viewPos[0] && this.viewPos[0] < 202
            && -202 < this.viewPos[1] && this.viewPos[1] < 202
            &&  298 < this.viewPos[2] && this.viewPos[2] < 702) {
            // little sphere and sphere cubes area

            const cameraCollider = BoxCollider.create(this.viewPos, 0.5);
            const sphereBoxCollider = BoxCollider.create(vec3.create(0.0, 0.0, 500.0), 20.0);
            if (sphereBoxCollider.hasCollision(cameraCollider)) {
                // camera and little sphere are both sphere colliders at this point
                const lengthX = this.viewPos[0] - 0.0;
                const lengthY = this.viewPos[1] - 0.0;
                const lengthZ = this.viewPos[2] - 500.0;
                const distance = Math.sqrt(lengthX * lengthX + lengthY * lengthY + lengthZ * lengthZ);

                const radius: number = 20.0;
                const otherRadius: number = 1.0;

                const minDistance = radius + otherRadius;
                const distanceDif = minDistance - distance;
                if (distanceDif <= 0)
                    return;


                this.viewPos[0] += lengthX / distance * distanceDif;
                this.viewPos[1] += lengthY / distance * distanceDif;
                this.viewPos[2] += lengthZ / distance * distanceDif;

                return;
            }

            // sphere cubes
            for (let i = 0; i < Mesh.sphere.vertixCount; i++) {
                const cubeCollider = BoxCollider.create(vec3.create(Mesh.sphere.vertices[8 * i] * -200, Mesh.sphere.vertices[8 * i + 1] * -200, Mesh.sphere.vertices[8 * i + 2] * -200 + 500), 0.5);
                if (cubeCollider.hasCollision(cameraCollider)) {
                    const pushAmount: Vec3 = cubeCollider.handleCollision(cameraCollider);
                    this.viewPos[0] += pushAmount[0];
                    this.viewPos[1] += pushAmount[1];
                    this.viewPos[2] += pushAmount[2];
                    return;
                }
            }

            return;
        }
    }


    createDigitModels(): void {
        const DIGIT_LINE = 10.0;
        const SPACING = 40.0;

        const reset = (model: Mat4, translateX: number) => {
            mat4.identity(model);
            mat4.translate(model, [translateX, 0, -200], model);
            return model;
        }


        const topBar = (model: Mat4) => {
            mat4.translate(model, [0.0, 2.0 * DIGIT_LINE + 2.0, 0.0], model);
            mat4.scale(model, [DIGIT_LINE, 1.0, 1.0], model);

            const boxCollider = this.boxColliderBuffer[this.boxColliderCount++];
            boxCollider.ax = -model[12] - DIGIT_LINE;
            boxCollider.bx = -model[12] + DIGIT_LINE;
            boxCollider.ay = -model[13] - 1.0;
            boxCollider.by = -model[13] + 1.0;
            boxCollider.az = -model[14] - 1.0;
            boxCollider.bz = -model[14] + 1.0;

            return model;
        }

        const middleBar = (model: Mat4) => {
            mat4.scale(model, [DIGIT_LINE, 1.0, 1.0], model);

            const boxCollider = this.boxColliderBuffer[this.boxColliderCount++];
            boxCollider.ax = -model[12] - DIGIT_LINE;
            boxCollider.bx = -model[12] + DIGIT_LINE;
            boxCollider.ay = -model[13] - 1.0;
            boxCollider.by = -model[13] + 1.0;
            boxCollider.az = -model[14] - 1.0;
            boxCollider.bz = -model[14] + 1.0;

            return model;
        }

        const bottomBar = (model: Mat4) => {
            mat4.translate(model, [0.0, -2.0 * DIGIT_LINE - 2.0, 0.0], model);
            mat4.scale(model, [DIGIT_LINE, 1.0, 1.0], model);

            const boxCollider = this.boxColliderBuffer[this.boxColliderCount++];
            boxCollider.ax = -model[12] - DIGIT_LINE;
            boxCollider.bx = -model[12] + DIGIT_LINE;
            boxCollider.ay = -model[13] - 1.0;
            boxCollider.by = -model[13] + 1.0;
            boxCollider.az = -model[14] - 1.0;
            boxCollider.bz = -model[14] + 1.0;

            return model;
        }

        const upperLeftBar = (model: Mat4) => {
            mat4.translate(model, [-DIGIT_LINE - 1.0, DIGIT_LINE + 1.0, 0.0], model);
            mat4.scale(model, [1.0, DIGIT_LINE, 1.0], model);

            const boxCollider = this.boxColliderBuffer[this.boxColliderCount++];
            boxCollider.ax = -model[12] - 1.0;
            boxCollider.bx = -model[12] + 1.0;
            boxCollider.ay = -model[13] - DIGIT_LINE;
            boxCollider.by = -model[13] + DIGIT_LINE;
            boxCollider.az = -model[14] - 1.0;
            boxCollider.bz = -model[14] + 1.0;

            return model;
        }

        const upperRightBar = (model: Mat4) => {
            mat4.translate(model, [DIGIT_LINE + 1.0, DIGIT_LINE + 1.0, 0.0], model);
            mat4.scale(model, [1.0, DIGIT_LINE, 1.0], model);

            const boxCollider = this.boxColliderBuffer[this.boxColliderCount++];
            boxCollider.ax = -model[12] - 1.0;
            boxCollider.bx = -model[12] + 1.0;
            boxCollider.ay = -model[13] - DIGIT_LINE;
            boxCollider.by = -model[13] + DIGIT_LINE;
            boxCollider.az = -model[14] - 1.0;
            boxCollider.bz = -model[14] + 1.0;

            return model;
        }

        const lowerLeftBar = (model: Mat4) => {
            mat4.translate(model, [-DIGIT_LINE - 1.0, -DIGIT_LINE - 1.0, 0.0], model);
            mat4.scale(model, [1.0, DIGIT_LINE, 1.0], model);

            const boxCollider = this.boxColliderBuffer[this.boxColliderCount++];
            boxCollider.ax = -model[12] - 1.0;
            boxCollider.bx = -model[12] + 1.0;
            boxCollider.ay = -model[13] - DIGIT_LINE;
            boxCollider.by = -model[13] + DIGIT_LINE;
            boxCollider.az = -model[14] - 1.0;
            boxCollider.bz = -model[14] + 1.0;

            return model;
        }

        const lowerRightBar = (model: Mat4) => {
            mat4.translate(model, [DIGIT_LINE + 1.0, -DIGIT_LINE - 1.0, 0.0], model);
            mat4.scale(model, [1.0, DIGIT_LINE, 1.0], model);

            const boxCollider = this.boxColliderBuffer[this.boxColliderCount++];
            boxCollider.ax = -model[12] - 1.0;
            boxCollider.bx = -model[12] + 1.0;
            boxCollider.ay = -model[13] - DIGIT_LINE;
            boxCollider.by = -model[13] + DIGIT_LINE;
            boxCollider.az = -model[14] - 1.0;
            boxCollider.bz = -model[14] + 1.0;

            return model;
        }


        this.boxColliderCount = 0;
        let time = this.timeout - Date.now();
        if (time < 0) {
            this.modelBufferCount = 6 * 16;
            const model = mat4.create();

            this.modelBuffer.set(topBar(reset(model, 0)), 0);
            this.modelBuffer.set(bottomBar(reset(model, 0)), 1 * 16);
            this.modelBuffer.set(upperLeftBar(reset(model, 0)), 2 * 16);
            this.modelBuffer.set(upperRightBar(reset(model, 0)), 3 * 16);
            this.modelBuffer.set(lowerLeftBar(reset(model, 0)), 4 * 16);
            this.modelBuffer.set(lowerRightBar(reset(model, 0)), 5 * 16);

            // dialog button timeout animation
            this.dialogButton.setAttribute("timeout", "");
        }

        const digits: number[] = [];
        let barCount = 0;
        do {
            const digit = time % 10;
            digits.push(digit);
            switch(digit) {
                case 0: barCount += 6; break;
                case 1: barCount += 2; break;
                case 2: barCount += 5; break;
                case 3: barCount += 5; break;
                case 4: barCount += 4; break;
                case 5: barCount += 5; break;
                case 6: barCount += 6; break;
                case 7: barCount += 3; break;
                case 8: barCount += 7; break;
                case 9: barCount += 6; break;
            }

            time = Math.floor(time / 10);
        } while (time > 0);


        this.modelBufferCount = barCount * 16;
        const model = mat4.create();
        const spaceOffset = (digits.length - 1) / 2;
        let resultIndex = -16;
        for (let i = 0; i < digits.length; i++) {
            const position = (spaceOffset - i) * SPACING;
            switch(digits[i]) {
                case 0:
                    this.modelBuffer.set(topBar(reset(model, position)), resultIndex += 16);
                    this.modelBuffer.set(bottomBar(reset(model, position)), resultIndex += 16);
                    this.modelBuffer.set(upperLeftBar(reset(model, position)), resultIndex += 16);
                    this.modelBuffer.set(upperRightBar(reset(model, position)), resultIndex += 16);
                    this.modelBuffer.set(lowerLeftBar(reset(model, position)), resultIndex += 16);
                    this.modelBuffer.set(lowerRightBar(reset(model, position)), resultIndex += 16);
                    break;

                case 1:
                    this.modelBuffer.set(upperRightBar(reset(model, position)), resultIndex += 16);
                    this.modelBuffer.set(lowerRightBar(reset(model, position)), resultIndex += 16);
                    break;

                case 2:
                    this.modelBuffer.set(topBar(reset(model, position)), resultIndex += 16);
                    this.modelBuffer.set(middleBar(reset(model, position)), resultIndex += 16);
                    this.modelBuffer.set(bottomBar(reset(model, position)), resultIndex += 16);
                    this.modelBuffer.set(upperRightBar(reset(model, position)), resultIndex += 16);
                    this.modelBuffer.set(lowerLeftBar(reset(model, position)), resultIndex += 16);
                    break;

                case 3:
                    this.modelBuffer.set(topBar(reset(model, position)), resultIndex += 16);
                    this.modelBuffer.set(middleBar(reset(model, position)), resultIndex += 16);
                    this.modelBuffer.set(bottomBar(reset(model, position)), resultIndex += 16);
                    this.modelBuffer.set(upperRightBar(reset(model, position)), resultIndex += 16);
                    this.modelBuffer.set(lowerRightBar(reset(model, position)), resultIndex += 16);
                    break;

                case 4:
                    this.modelBuffer.set(middleBar(reset(model, position)), resultIndex += 16);
                    this.modelBuffer.set(upperLeftBar(reset(model, position)), resultIndex += 16);
                    this.modelBuffer.set(upperRightBar(reset(model, position)), resultIndex += 16);
                    this.modelBuffer.set(lowerRightBar(reset(model, position)), resultIndex += 16);
                    break;

                case 5:
                    this.modelBuffer.set(topBar(reset(model, position)), resultIndex += 16);
                    this.modelBuffer.set(middleBar(reset(model, position)), resultIndex += 16);
                    this.modelBuffer.set(bottomBar(reset(model, position)), resultIndex += 16);
                    this.modelBuffer.set(upperLeftBar(reset(model, position)), resultIndex += 16);
                    this.modelBuffer.set(lowerRightBar(reset(model, position)), resultIndex += 16);
                    break;

                case 6:
                    this.modelBuffer.set(topBar(reset(model, position)), resultIndex += 16);
                    this.modelBuffer.set(middleBar(reset(model, position)), resultIndex += 16);
                    this.modelBuffer.set(bottomBar(reset(model, position)), resultIndex += 16);
                    this.modelBuffer.set(upperLeftBar(reset(model, position)), resultIndex += 16);
                    this.modelBuffer.set(lowerLeftBar(reset(model, position)), resultIndex += 16);
                    this.modelBuffer.set(lowerRightBar(reset(model, position)), resultIndex += 16);
                    break;

                case 7:
                    this.modelBuffer.set(topBar(reset(model, position)), resultIndex += 16);
                    this.modelBuffer.set(upperRightBar(reset(model, position)), resultIndex += 16);
                    this.modelBuffer.set(lowerRightBar(reset(model, position)), resultIndex += 16);
                    break;

                case 8:
                    this.modelBuffer.set(topBar(reset(model, position)), resultIndex += 16);
                    this.modelBuffer.set(middleBar(reset(model, position)), resultIndex += 16);
                    this.modelBuffer.set(bottomBar(reset(model, position)), resultIndex += 16);
                    this.modelBuffer.set(upperLeftBar(reset(model, position)), resultIndex += 16);
                    this.modelBuffer.set(upperRightBar(reset(model, position)), resultIndex += 16);
                    this.modelBuffer.set(lowerLeftBar(reset(model, position)), resultIndex += 16);
                    this.modelBuffer.set(lowerRightBar(reset(model, position)), resultIndex += 16);
                    break;

                case 9:
                    this.modelBuffer.set(topBar(reset(model, position)), resultIndex += 16);
                    this.modelBuffer.set(middleBar(reset(model, position)), resultIndex += 16);
                    this.modelBuffer.set(bottomBar(reset(model, position)), resultIndex += 16);
                    this.modelBuffer.set(upperLeftBar(reset(model, position)), resultIndex += 16);
                    this.modelBuffer.set(upperRightBar(reset(model, position)), resultIndex += 16);
                    this.modelBuffer.set(lowerRightBar(reset(model, position)), resultIndex += 16);
                    break;
            }
        }
    }


    // controller inputs

    public moveForward: boolean = false;
    public moveBackward: boolean = false;
    public moveLeft: boolean = false;
    public moveRight: boolean = false;
    public moveUp: boolean = false;
    public moveDown: boolean = false;
    public moveFast: boolean = false;

    private windowResized: boolean = false;
    public setWindowResized() { this.windowResized = true; }

    public rotateCamera(yaw: number, pitch: number) {
        const sensitivity = 0.001 * this.mouseSensitivity;

        this.viewRotation[0] += sensitivity * yaw;
        if (this.viewRotation[0] < 0)
            this.viewRotation[0] += 2 * Math.PI;
        else if (this.viewRotation[0] > 2 * Math.PI)
            this.viewRotation[0] -= 2 * Math.PI;

        this.viewRotation[1] += sensitivity * pitch;
        if (this.viewRotation[1] < -Math.PI / 2)
            this.viewRotation[1] = -Math.PI / 2;
        else if (this.viewRotation[1] > Math.PI / 2)
            this.viewRotation[1] = Math.PI / 2;
    }

    public zoomCamera(zoom: number) {
        this.projectionFieldOfView += 0.01 * zoom;
        if (this.projectionFieldOfView < 0.3)
            this.projectionFieldOfView = 0.3;
        else if (this.projectionFieldOfView > 1.6)
            this.projectionFieldOfView = 1.6;

        mat4.perspective(this.projectionFieldOfView, this.htmlCanvas.width / this.htmlCanvas.height, 0.1, 500.0, this.projection);
    }
}
