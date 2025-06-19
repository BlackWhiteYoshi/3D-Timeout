import { Renderer } from "./Rendering/Renderer";
import { Logic } from "./Logic/Logic";
import { Controller } from "./Controller/Controller";
import { Dialog } from "./Logic/Dialog";

main();

async function main() {
    const theCanvas = document.querySelector("canvas")!;
    const dialogButton = document.querySelector("svg")!;
    const htmlDialog = document.querySelector("dialog")!;

    const renderer = await Renderer.create(theCanvas);
    const logic = new Logic(renderer, theCanvas, dialogButton);
    new Controller(logic, theCanvas);
    new Dialog(logic, dialogButton, htmlDialog);
}
