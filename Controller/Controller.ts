import { Logic } from "../Logic/Logic";

export class Controller {
    private logic: Logic;
    private htmlCanvas: HTMLCanvasElement;

    public constructor(logic: Logic, htmlCanvas: HTMLCanvasElement) {
        this.logic = logic;
        this.htmlCanvas = htmlCanvas;

        this.htmlCanvas.onresize = () => this.logic.setWindowResized();
        
        this.htmlCanvas.onclick = () => this.htmlCanvas.requestPointerLock();
        
        this.htmlCanvas.onmousemove = this.onMouseMove;
        document.onwheel = this.onMouseWheel;

        document.onkeydown = this.onKeyPressed;
        document.onkeyup = this.onKeyReleased;
    }


    private onMouseMove = (e: MouseEvent) => {
        if (document.pointerLockElement !== this.htmlCanvas)
            return;

        this.logic.rotateCamera(e.movementX, e.movementY);
    }

    private onMouseWheel = (e: WheelEvent) => {
        this.logic.zoomCamera(e.deltaY);
    }
    

    private ctrlPressed: boolean;
    private altPressed: boolean;
    
    private onKeyPressed = (e: KeyboardEvent) => { this.onKeyTriggered(true, e); }

    private onKeyReleased = (e: KeyboardEvent) => { this.onKeyTriggered(false, e); }

    private onKeyTriggered(pressed: boolean, e: KeyboardEvent) {
        switch (e.code) {
            case "KeyW": this.logic.moveForward = pressed; e.preventDefault(); break;
            case "KeyS": this.logic.moveBackward = pressed; e.preventDefault(); break;
            case "KeyA": this.logic.moveLeft = pressed; e.preventDefault(); break;
            case "KeyD": this.logic.moveRight = pressed; e.preventDefault(); break;
            case "Space": this.logic.moveUp = pressed; e.preventDefault(); break;
            case "ShiftLeft": this.logic.moveDown = pressed; e.preventDefault(); break;
            case "ControlLeft": this.logic.moveFast = (this.ctrlPressed = pressed) || this.altPressed; e.preventDefault(); break;
            case "AltLeft": this.logic.moveFast = (this.altPressed = pressed) || this.ctrlPressed; e.preventDefault(); break;
        }
    }
}
