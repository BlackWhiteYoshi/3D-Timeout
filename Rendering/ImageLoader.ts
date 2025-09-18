export class ImageLoader {
    private canvas: HTMLCanvasElement = document.createElement("canvas");
    private context: CanvasRenderingContext2D = this.canvas.getContext("2d")!;
    private image: HTMLImageElement = new Image();


    async loadPng(url: string): Promise<ImageBitmap> {
        const blob = await this.fetchImage(url);
        return await createImageBitmap(blob);
    }

    async loadSvg(url: string, width: number, height: number): Promise<ImageBitmap> {
        const svgBlob = await this.fetchImage(url);
        const pngBlob = await this.svgToPng(svgBlob, width, height);
        return await createImageBitmap(pngBlob);
    }

    async loadSvgMipmaps(url: string, width: number, height: number, mipLevelCount: number): Promise<ImageBitmap[]> {
        const svgBlob = await this.fetchImage(url);

        const result = Array<ImageBitmap>(mipLevelCount);
        for (let i = 0; i < mipLevelCount; i++) {
            const pngBlob = await this.svgToPng(svgBlob, width, height);
            result[i] = await createImageBitmap(pngBlob);
            width >>= 1;
            height >>= 1;
        }

        return result;
    }


    private async fetchImage(url: string): Promise<Blob> {
        const response = await fetch(url);
        if (!response.ok)
            throw new Error(`fetch error '${url}': ${response.status}`);

        return await response.blob();
    }

    private async svgToPng(svgBlob: Blob, width: number, height: number) {
        return await new Promise<Blob>((resolve, reject) => {
            this.image.onload = () => {
                this.canvas.width = width;
                this.canvas.height = height;
                this.context.drawImage(this.image, 0, 0, this.canvas.width, this.canvas.height);
                URL.revokeObjectURL(this.image.src);
                this.canvas.toBlob((blob) => blob !== null ? resolve(blob) : reject("'canvas.toBlob(...)' failed: it returned null"));
            }
            this.image.src = URL.createObjectURL(svgBlob);
        });
    }
}
