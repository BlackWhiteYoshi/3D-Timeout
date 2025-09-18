import SHADER_CODE from "./Shader/shaders.wgsl";
import { Mesh } from "./Mesh";
import { ImageLoader } from "./ImageLoader";
import { Mat4, mat4, Vec3, vec3 } from "wgpu-matrix";

export class Renderer {
    private static COLOR_FORMAT: GPUTextureFormat = "bgra8unorm";
    private static DEPTH_FORMAT: GPUTextureFormat = "depth24plus-stencil8";
    private static SAMPLE_COUNT: number = 4;
    public static OBJECT_BUFFER_SIZE = 512;

    // environment/window
    private htmlCanvas: HTMLCanvasElement;
    private canvasContext: GPUCanvasContext;
    private gpuAdapter: GPUAdapter;
    private device: GPUDevice;

    // pipeline
    private gpuBindGroup: GPUBindGroup;
    private objectRenderPipeline: GPURenderPipeline;
    private backgroundRenderPipeline: GPURenderPipeline;
    private renderPassDescriptor: GPURenderPassDescriptor;

    // gpu buffers
    private cubeVertexBuffer: GPUBuffer;
    private cubeIndexBuffer: GPUBuffer;
    private sphereVertexBuffer: GPUBuffer;
    private sphereIndexBuffer: GPUBuffer;

    // gpu texture
    private texture: GPUTexture;
    private textureSampler: GPUSampler;

    // gpu model matrices buffer
    private modelMatrices: GPUBuffer;

    // gpu uniforms
    private transformationUniform: GPUBuffer;
    private brightnessUniform: GPUBuffer;
    private colorRotateUnifrom: GPUBuffer;
    private lightDirectionUniform: GPUBuffer;


    public static async create(canvas: HTMLCanvasElement): Promise<Renderer> {
        // browser support
        if (navigator.gpu === undefined)
            throw new Error("WebGPU is not supported/enabled in your browser");

        // gpu device
        const gpuAdapter = (await navigator.gpu.requestAdapter())!;
        const device = await gpuAdapter.requestDevice();

        // compile shader module
        const shaderModule = device.createShaderModule({code: SHADER_CODE});
        {
            const compilationInfo = await shaderModule.getCompilationInfo();
            for (const message of compilationInfo.messages)
                if (message.type === "error")
                    throw new Error("aborted => shader module compilation error(s)");
        }

        // textures
        const imageLoader = new ImageLoader();
        const bitmaps = await imageLoader.loadSvgMipmaps("img/rose.svg", 4096, 4096, 6);

        return new Renderer(canvas, gpuAdapter, device, shaderModule, bitmaps);
    }

    private constructor(canvas: HTMLCanvasElement, gpuAdapter: GPUAdapter, device: GPUDevice, shaderModule: GPUShaderModule, bitmaps: ImageBitmap[]) {
        this.htmlCanvas = canvas;
        this.gpuAdapter = gpuAdapter;
        this.device = device;

        this.canvasContext = this.htmlCanvas.getContext("webgpu")!;
        this.canvasContext.configure({
            device: this.device,
            format: Renderer.COLOR_FORMAT,
            usage: GPUTextureUsage.RENDER_ATTACHMENT
        });

        this.renderPassDescriptor = {
            colorAttachments: <Iterable<GPURenderPassColorAttachment>>[{
                view: this.createMultisampleTexture(),
                resolveTarget: null,
                loadOp: "clear",
                clearValue: [0.3, 0.3, 0.3, 1],
                storeOp: "store",
            }],
            depthStencilAttachment: {
                view: this.createDepthStencilView(),
                depthLoadOp: "clear",
                depthClearValue: 1.0,
                depthStoreOp: "store",
                stencilLoadOp: "clear",
                stencilClearValue: 0,
                stencilStoreOp: "store"
            }
        };


        // create gpu buffers

        // cube
        this.cubeVertexBuffer = this.device.createBuffer({
            size: Mesh.cube.vertices.byteLength,
            usage: GPUBufferUsage.VERTEX,
            mappedAtCreation: true
        });
        new Float32Array(this.cubeVertexBuffer.getMappedRange()).set(Mesh.cube.vertices);
        this.cubeVertexBuffer.unmap();

        this.cubeIndexBuffer = this.device.createBuffer({
            size: Mesh.cube.indices.byteLength,
            usage: GPUBufferUsage.INDEX,
            mappedAtCreation: true
        });
        new Uint16Array(this.cubeIndexBuffer.getMappedRange()).set(Mesh.cube.indices);
        this.cubeIndexBuffer.unmap();

        // sphere
        this.sphereVertexBuffer = this.device.createBuffer({
            size: Mesh.sphere.vertices.byteLength,
            usage: GPUBufferUsage.VERTEX,
            mappedAtCreation: true
        });
        new Float32Array(this.sphereVertexBuffer.getMappedRange()).set(Mesh.sphere.vertices);
        this.sphereVertexBuffer.unmap();

        this.sphereIndexBuffer = this.device.createBuffer({
            size: Mesh.sphere.indices.byteLength,
            usage: GPUBufferUsage.INDEX,
            mappedAtCreation: true
        });
        new Uint16Array(this.sphereIndexBuffer.getMappedRange()).set(Mesh.sphere.indices);
        this.sphereIndexBuffer.unmap();

        // texture
        const textureDescriptor: GPUTextureDescriptor = {
            size: {
                width: bitmaps[0].width,
                height: bitmaps[0].height
            },
            format: Renderer.COLOR_FORMAT,
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
            mipLevelCount: bitmaps.length
        };
        this.texture = this.device.createTexture(textureDescriptor);
        for (let i = 0; i < bitmaps.length; i++)
            this.device.queue.copyExternalImageToTexture({source: bitmaps[i]}, {texture: this.texture, mipLevel: i}, {width: bitmaps[i].width, height: bitmaps[i].height});

        this.textureSampler = this.device.createSampler({
            addressModeU: "clamp-to-edge",
            addressModeV: "clamp-to-edge",
            magFilter: "nearest",
            minFilter: "nearest",
            mipmapFilter: "nearest",
            maxAnisotropy: 1
        });

        // model matrices
        const modelArray = new Float32Array((1 + Mesh.sphere.vertixCount) * 16); // (little sphere + sphere cubes + dynamic digits buffer) * matrix size
        {
            const temp = mat4.identity();
            // little sphere
            mat4.translate(temp, [0.0, 0.0, -500.0], temp);
            mat4.scale(temp, [20.0, 20.0, 20.0], temp)
            modelArray.set(temp, 0);
            // sphere cubes
            for (let i = 0; i < Mesh.sphere.vertixCount; i++) {
                mat4.identity(temp);
                mat4.translate(temp, [Mesh.sphere.vertices[8 * i] * 200, Mesh.sphere.vertices[8 * i + 1] * 200, Mesh.sphere.vertices[8 * i + 2] * 200 - 500], temp);
                mat4.scale(temp, [0.5, 0.5, 0.5], temp);
                modelArray.set(temp, (i + 1) * 16);
            }
        }
        this.modelMatrices = this.device.createBuffer({
            size: (1 + Mesh.sphere.vertixCount + Renderer.OBJECT_BUFFER_SIZE) * 16 * 4, // (little sphere + sphere cubes + dynamic digits buffer) * matrix size
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true
        });
        new Float32Array(this.modelMatrices.getMappedRange()).set(modelArray);
        this.modelMatrices.unmap();

        // uniforms
        this.transformationUniform = device.createBuffer({
            size: 2 * 16 * 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        this.brightnessUniform = device.createBuffer({
            size: 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        this.colorRotateUnifrom = device.createBuffer({
            size: 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        this.lightDirectionUniform = device.createBuffer({
            size: 3 * 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });


        // create render pipeline

        const bindGroupLayout = this.device.createBindGroupLayout({
            entries: [
                {   // textrue
                    binding: 0,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: {}
                },
                {   // sampler
                    binding: 1,
                    visibility: GPUShaderStage.FRAGMENT,
                    sampler: {}
                },
                {   // modelMatrices
                    binding: 2,
                    visibility: GPUShaderStage.VERTEX,
                    buffer: {
                        type: "read-only-storage",
                        hasDynamicOffset: false
                    }
                },
                {   // transformation
                    binding: 3,
                    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                    buffer: {}
                },
                {   // brightness
                    binding: 4,
                    visibility: GPUShaderStage.FRAGMENT,
                    buffer: {}
                },
                {   // colorRotate
                    binding: 5,
                    visibility: GPUShaderStage.FRAGMENT,
                    buffer: {}
                },
                {   // lightDirection
                    binding: 6,
                    visibility: GPUShaderStage.FRAGMENT,
                    buffer: {}
                }
            ]
        });
        this.gpuBindGroup = this.device.createBindGroup({
            layout: bindGroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: this.texture.createView({
                        format: Renderer.COLOR_FORMAT,
                        dimension: "2d",
                        aspect: "all",
                        baseMipLevel: 0,
                        mipLevelCount: 1,
                        baseArrayLayer: 0,
                        arrayLayerCount: 1
                    })
                },
                {
                    binding: 1,
                    resource: this.textureSampler
                },
                {
                    binding: 2,
                    resource: { buffer: this.modelMatrices }
                },
                {
                    binding: 3,
                    resource: { buffer: this.transformationUniform }
                },
                {
                    binding: 4,
                    resource: { buffer: this.brightnessUniform }
                },
                {
                    binding: 5,
                    resource: { buffer: this.colorRotateUnifrom }
                },
                {
                    binding: 6,
                    resource: { buffer: this.lightDirectionUniform }
                }
            ]
        });

        const vertexLayout: GPUVertexBufferLayout = {
            arrayStride: 8 * 4,
            attributes: [
                { format: "float32x3", shaderLocation: 0, offset: 0 },
                { format: "float32x3", shaderLocation: 1, offset: 3 * 4 },
                { format: "float32x2", shaderLocation: 2, offset: 6 * 4 }
            ]
        };
        this.objectRenderPipeline = this.device.createRenderPipeline({
            layout: this.device.createPipelineLayout({
                bindGroupLayouts: [bindGroupLayout]
            }),
            vertex: {
                module: shaderModule,
                entryPoint: "vertex_main",
                buffers: [vertexLayout]
            },
            fragment: {
                module: shaderModule,
                entryPoint: "fragment_main",
                targets: [{ format: Renderer.COLOR_FORMAT }]
            },
            depthStencil: {
                format: Renderer.DEPTH_FORMAT,
                depthWriteEnabled: true,
                depthCompare: "less"
            },
            primitive: {
                topology: "triangle-list",
                cullMode: "back",
                frontFace: "cw"
            },
            multisample: {
                count: Renderer.SAMPLE_COUNT
            }
        });
        this.backgroundRenderPipeline = this.device.createRenderPipeline({
            layout: this.device.createPipelineLayout({
                bindGroupLayouts: [bindGroupLayout]
            }),
            vertex: {
                module: shaderModule,
                entryPoint: "background_vertex_main",
                buffers: [vertexLayout]
            },
            fragment: {
                module: shaderModule,
                entryPoint: "background_fragment_main",
                targets: [{ format: Renderer.COLOR_FORMAT }]
            },
            depthStencil: {
                format: Renderer.DEPTH_FORMAT,
                depthWriteEnabled: true,
                depthCompare: "less-equal"
            },
            primitive: {
                topology: "triangle-list",
                cullMode: "back",
                frontFace: "ccw"
            },
            multisample: {
                count: Renderer.SAMPLE_COUNT
            }
        });
    }


    private commandEncoder: GPUCommandEncoder;
    public renderPassEncoder: GPURenderPassEncoder;

    public renderStart() {
        (<GPURenderPassColorAttachment[]>this.renderPassDescriptor.colorAttachments)[0].resolveTarget = this.canvasContext.getCurrentTexture().createView();
        this.commandEncoder = this.device.createCommandEncoder();
        this.renderPassEncoder = this.commandEncoder.beginRenderPass(this.renderPassDescriptor);
        this.renderPassEncoder.setBindGroup(0, this.gpuBindGroup);
    }

    public setObjectShader() {
        this.renderPassEncoder.setPipeline(this.objectRenderPipeline);
    }

    public renderLittleSphere() {
        this.renderPassEncoder.setVertexBuffer(0, this.sphereVertexBuffer);
        this.renderPassEncoder.setIndexBuffer(this.sphereIndexBuffer, "uint16");
        this.renderPassEncoder.drawIndexed(Mesh.sphere.indices.length, 1);
    }

    public renderSphereCubes() {
        this.renderPassEncoder.setVertexBuffer(0, this.cubeVertexBuffer);
        this.renderPassEncoder.setIndexBuffer(this.cubeIndexBuffer, "uint16");
        this.renderPassEncoder.drawIndexed(Mesh.cube.indices.length, Mesh.sphere.vertixCount, 0, 0, 1);
    }

    public renderDigits(modelsOfDigits: GPUAllowSharedBufferSource) {
        this.device.queue.writeBuffer(this.modelMatrices, (1 + Mesh.sphere.vertixCount) * 16 * 4, modelsOfDigits);

        this.renderPassEncoder.setVertexBuffer(0, this.cubeVertexBuffer);
        this.renderPassEncoder.setIndexBuffer(this.cubeIndexBuffer, "uint16");
        this.renderPassEncoder.drawIndexed(Mesh.cube.indices.length, modelsOfDigits.byteLength / (16 * 4), 0, 0, 1 + Mesh.sphere.vertixCount);
    }

    public setBackgroundShader() {
        this.renderPassEncoder.setPipeline(this.backgroundRenderPipeline);
    }

    public renderBeckgound() {
        this.renderPassEncoder.setVertexBuffer(0, this.sphereVertexBuffer);
        this.renderPassEncoder.setIndexBuffer(this.sphereIndexBuffer, "uint16");
        this.renderPassEncoder.drawIndexed(Mesh.sphere.indices.length, 1);
    }

    public renderEnd() {
        this.renderPassEncoder.end();
        this.device.queue.submit([this.commandEncoder.finish()]);
    }



    public set view(view: Mat4) { this.device.queue.writeBuffer(this.transformationUniform, 0 * 64, <GPUAllowSharedBufferSource>view); }

    public set projection(projection: Mat4) { this.device.queue.writeBuffer(this.transformationUniform, 1 * 64, <GPUAllowSharedBufferSource>projection); }

    public set brightness(brightness: number) { this.device.queue.writeBuffer(this.brightnessUniform, 0, new Float32Array([brightness])); }

    public set colorRotate(colorRotate: number) { this.device.queue.writeBuffer(this.colorRotateUnifrom, 0, new Float32Array([colorRotate])); }

    public set lightDirection(lightDirection: Vec3) { this.device.queue.writeBuffer(this.lightDirectionUniform, 0, <GPUAllowSharedBufferSource>lightDirection); }



    public renewRenderTextures() {
        this.renderPassDescriptor.depthStencilAttachment!.view = this.createDepthStencilView();
        (<GPURenderPassColorAttachment[]>this.renderPassDescriptor.colorAttachments)[0].view = this.createMultisampleTexture();
    }

    private createDepthStencilView(): GPUTextureView {
        return this.device.createTexture({
            size: {
                width: this.htmlCanvas.width,
                height: this.htmlCanvas.height,
                depthOrArrayLayers: 1
            },
            format: Renderer.DEPTH_FORMAT,
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
            sampleCount: Renderer.SAMPLE_COUNT
        }).createView();
    }

    private createMultisampleTexture(): GPUTextureView {
        return this.device.createTexture({
            size: {
                width: this.htmlCanvas.width,
                height: this.htmlCanvas.height,
                depthOrArrayLayers: 1,
            },
            format: Renderer.COLOR_FORMAT,
            // @ts-ignore
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.SAMPLED,
            sampleCount: Renderer.SAMPLE_COUNT
        }).createView();
    }
}
