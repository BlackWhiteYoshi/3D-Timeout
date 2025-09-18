import { Logic } from "./Logic";

export class Dialog {
    private logic: Logic;
    private dialogButton: SVGSVGElement;
    private htmlDialog: HTMLDialogElement;


    private timerInput: HTMLInputElement;
    private timerButton: HTMLButtonElement;

    private moveSpeedInput: HTMLInputElement;
    private moveSpeedLabel: HTMLLabelElement;

    private mouseSensitivtyInput: HTMLInputElement;
    private mouseSensitivtyLabel: HTMLLabelElement;

    public constructor(logic: Logic, dialogButton: SVGSVGElement, htmlDialog: HTMLDialogElement) {
        this.logic = logic;
        this.dialogButton = dialogButton;
        this.htmlDialog = htmlDialog;

        this.dialogButton.onclick = this.onDialogButton;
        this.htmlDialog.onclick = this.onDialogClicked;


        const configsDiv = this.htmlDialog.children[0].children[0];

        const timerDiv = configsDiv.children[0];
        this.timerInput = <HTMLInputElement>timerDiv.children[1];
        this.timerInput.onchange = this.onTimerChange;
        this.timerButton = <HTMLButtonElement>timerDiv.children[2];
        this.timerButton.onclick = this.onTimerButtonClicked;

        const moveSpeedDiv = configsDiv.children[1];
        this.moveSpeedInput = <HTMLInputElement>moveSpeedDiv.children[1];
        this.moveSpeedInput.oninput = this.onMoveSpeedChanged;
        this.moveSpeedLabel = <HTMLLabelElement>moveSpeedDiv.children[2];

        const mouseSensitivtyDiv = configsDiv.children[2];
        this.mouseSensitivtyInput = <HTMLInputElement>mouseSensitivtyDiv.children[1];
        this.mouseSensitivtyInput.oninput = this.onMouseSensitivtyChanged;
        this.mouseSensitivtyLabel = <HTMLLabelElement>mouseSensitivtyDiv.children[2];


        this.moveSpeedInput.value = logic.moveSpeed.toString();
        this.moveSpeedLabel.textContent = this.moveSpeedInput.value;

        this.mouseSensitivtyInput.value = logic.mouseSensitivity.toString();
        this.mouseSensitivtyLabel.textContent = this.mouseSensitivtyInput.value;
    }

    onDialogButton = (e: MouseEvent) => {
        const time = this.logic.timeout - Date.now();
        this.timerInput.value = time > 0 ? time.toString() : "0";

        this.htmlDialog.showModal();
    }

    onDialogClicked = (e: MouseEvent) => {
        const rect = this.htmlDialog.getBoundingClientRect();
        const rectBottom = rect.top + rect.height;
        const rectRight = rect.left + rect.width;
        if (e.clientY < rect.top || e.clientY > rectBottom || e.clientX < rect.left || e.clientX > rectRight)
            this.htmlDialog.close();
    }


    onTimerChange = (e: Event) => {
        if (/^\d+$/.test(this.timerInput.value))
            this.timerInput.style.borderColor = "#888";
        else
            this.timerInput.style.borderColor = "#F22";
    }

    onTimerButtonClicked = (e: MouseEvent) => {
        if (!/^\d+$/.test(this.timerInput.value))
            return;

        this.timerInput.style.borderColor = "#2F2";
        this.dialogButton.removeAttribute("timeout");

        this.logic.timeout = Date.now() + Number.parseInt(this.timerInput.value);
        localStorage.setItem("timeout", this.logic.timeout.toString());
    }

    onMoveSpeedChanged = (e: Event) => {
        const value = (<HTMLInputElement>e.target).value;

        this.moveSpeedLabel.textContent = value;
        this.logic.moveSpeed = Number.parseFloat(value);
        localStorage.setItem("moveSpeed", value);
    }

    onMouseSensitivtyChanged = (e: Event) => {
        const value = (<HTMLInputElement>e.target).value;

        this.mouseSensitivtyLabel.textContent = value;
        this.logic.mouseSensitivity = Number.parseFloat(value);
        localStorage.setItem("mouseSensitivity", value);
    }
}
