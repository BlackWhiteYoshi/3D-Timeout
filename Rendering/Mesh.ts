export class Mesh {
    vertices: Float32Array;
    indices: Uint16Array;
    vertixCount: number;
    triangleCount: number;

    private constructor(vertices: Float32Array, indices: Uint16Array) {
        this.vertices = vertices;
        this.indices = indices;
        this.vertixCount = vertices.length / 8;
        this.triangleCount = indices.length / 3;
    }


    public static cube: Mesh = new Mesh(
        new Float32Array([
            // position          // normal          // texturePosition
            
            // front
            1.0,  1.0,  1.0,     0.0, 0.0, 1.0,     1.0, 1.0,  // 0  right-top-front
            1.0, -1.0,  1.0,     0.0, 0.0, 1.0,     1.0, 0.0,  // 1  right-bottom-front
            -1.0, -1.0,  1.0,    0.0, 0.0, 1.0,     0.0, 0.0,  // 2  left-bottom-front
            -1.0, 1.0,  1.0,     0.0, 0.0, 1.0,     0.0, 1.0,  // 3  left-top-front
            
            // top
            1.0,  1.0, -1.0,     0.0, 1.0, 0.0,     1.0, 1.0,  // 4  right-top-back
            1.0,  1.0,  1.0,     0.0, 1.0, 0.0,     1.0, 0.0,  // 5  right-top-front
            -1.0,  1.0,  1.0,    0.0, 1.0, 0.0,     0.0, 0.0, // 6  left-top-front
            -1.0,  1.0, -1.0,    0.0, 1.0, 0.0,     0.0, 1.0, // 7  left-top-back
            
            // bottom
            1.0, -1.0, 1.0,      0.0, -1.0, 0.0,    1.0, 1.0,   // 8  right-bottom-front
            1.0, -1.0, -1.0,     0.0, -1.0, 0.0,    1.0, 0.0,  // 9  right-bottom-back
            -1.0, -1.0, -1.0,    0.0, -1.0, 0.0,    0.0, 0.0, // 10 left-bottom-back
            -1.0, -1.0, 1.0,     0.0, -1.0, 0.0,    0.0, 1.0,  // 11 left-bottom-front
            
            // left
            -1.0, 1.0, 1.0,      -1.0, 0.0, 0.0,    1.0, 1.0, // 12 left-top-front
            -1.0, -1.0, 1.0,     -1.0, 0.0, 0.0,    1.0, 0.0, // 13 left-bottom-front
            -1.0, -1.0, -1.0,    -1.0, 0.0, 0.0,    0.0, 0.0, // 14 left-bottom-back
            -1.0, 1.0, -1.0,     -1.0, 0.0, 0.0,    0.0, 1.0, // 15 left-top-back
            
            // right
            1.0, 1.0, -1.0,      1.0, 0.0, 0.0,     1.0, 1.0, // 16 right-top-back
            1.0, -1.0, -1.0,     1.0, 0.0, 0.0,     1.0, 0.0, // 17 right-bottom-back
            1.0, -1.0, 1.0,      1.0, 0.0, 0.0,     0.0, 0.0, // 18 right-bottom-front
            1.0, 1.0, 1.0,       1.0, 0.0, 0.0,     0.0, 1.0, // 19 right-top-front
            
            // back
            -1.0, 1.0, -1.0,     0.0, 0.0, -1.0,    1.0, 1.0, // 20 left-top-back
            -1.0, -1.0, -1.0,    0.0, 0.0, -1.0,    1.0, 0.0, // 21 left-bottom-back
            1.0, -1.0, -1.0,     0.0, 0.0, -1.0,    0.0, 0.0, // 22 right-bottom-back
            1.0, 1.0, -1.0,      0.0, 0.0, -1.0,    0.0, 1.0  // 23 right-top-back
        ]),
        new Uint16Array([
            // front square
            0, 1, 3,
            1, 2, 3,
            // top square
            4, 5, 7,
            5, 6, 7,
            // bottom square
            8, 9, 11,
            9, 10, 11,
            // left square
            12, 13, 15,
            13, 14, 15,
            // right square
            16, 17, 19,
            17, 18, 19,
            // back square
            20, 21, 23,
            21, 22, 23,
        ])
    );


    static #sphere: Mesh | null = null;
    public static get sphere(): Mesh {
        if (this.#sphere === null)
            this.#sphere = Mesh.createSphere();

        return this.#sphere;
    }
    
    private static createSphere(): Mesh {
        // number of vertices
        const size = 10;
        const longitude = size;
        const latitude = size;

        const circle45 = Math.sin(Math.PI / 4);


        // angles

        let horizintalAngles: {cos: number, sin: number}[] = new Array(longitude);
        {
            const hStep = Math.PI / (4 * (longitude + 1)); // PI/4 == 45°
            let currentStep = hStep;
            for (let i = 0; i < longitude; i++, currentStep += hStep)
                horizintalAngles[i] = {cos: Math.cos(currentStep), sin: Math.sin(currentStep)};
        }

        let verticalAngles: {cos: number, sin: number}[];
        if (longitude == latitude)
            verticalAngles = horizintalAngles;
        else {
            verticalAngles = new Array(latitude);
            {
                const vStep = Math.PI / (4 * (latitude + 1)); // PI/4 == 45°
                let currentStep = vStep;
                for (let i = 0; i < latitude; i++, currentStep += vStep)
                    verticalAngles[i] = {cos: Math.cos(currentStep), sin: Math.sin(currentStep)};
            }
        }


        
        // vertexPos array

        const horizontalLength = 8 * longitude + 9;
        const verticalLength = 4 * latitude + 3;

        const vertexPos: {x: number, y: number, z: number}[][] = new Array(verticalLength);
        for (let i = 0; i < verticalLength; i++)
            vertexPos[i] = new Array(horizontalLength);

        const middle = 2 * latitude + 1;
        {
            // horizontal coordinates
            const top = 2 * longitude + 2;
            const left = 4 * longitude + 4;
            const bottom = 6 * longitude + 6;
            const right = 8 * longitude + 8;

            vertexPos[middle][0] = {x: 1.0, y: 0.0, z: 0.0};                                      // right (start)
            vertexPos[middle][0 + longitude + 1] = {x: circle45, y: 0.0, z: circle45};            // right-top
            vertexPos[middle][top] = {x: 0.0, y: 0.0, z: 1.0};                                    // top
            vertexPos[middle][top + longitude + 1] = {x: -circle45, y: 0.0, z: circle45};         // top-left
            vertexPos[middle][left] = {x: -1.0, y: 0.0, z: 0.0};                                  // left
            vertexPos[middle][left + longitude + 1] = {x: -circle45, y: 0.0, z: -circle45};       // left-bottom
            vertexPos[middle][bottom] = {x: 0.0, y: 0.0, z: -1.0};                                // bottom
            vertexPos[middle][bottom + longitude + 1] = {x: circle45, y: 0.0, z: -circle45};      // bottom-right
            vertexPos[middle][right] = {x: 1.0, y: 0.0, z: 0.0};                                  // right (end)

            for (let i = 1; i <= longitude; i++) {
                const x = horizintalAngles[i - 1].cos;
                const z = horizintalAngles[i - 1].sin;

                vertexPos[middle][i] = {x: x, y: 0.0, z: z};
                vertexPos[middle][top - i] = {x: z, y: 0.0, z: x};
                vertexPos[middle][top + i] = {x: -z, y: 0.0, z: x};
                vertexPos[middle][left - i] = {x: -x, y: 0.0, z: z};
                vertexPos[middle][left + i] = {x: -x, y: 0.0, z: -z};
                vertexPos[middle][bottom - i] = {x: -z, y: 0.0, z: -x};
                vertexPos[middle][bottom + i] = {x: z, y: 0.0, z: -x};
                vertexPos[middle][right - i] = {x: x, y: 0.0, z: -z};
            }
        }

        const top45 = middle - latitude - 1;
        const bottom45 = middle + latitude + 1;
        for (let i = 0; i < horizontalLength; i++) {
            const x = vertexPos[middle][i].x * circle45;
            const z = vertexPos[middle][i].z * circle45;

            vertexPos[top45][i] = {x: x, y: circle45, z: z};
            vertexPos[bottom45][i] = {x: x, y: -circle45, z: z};
        }

        for (let i = 1; i <= latitude; i++) {
            const y = verticalAngles[i - 1].cos;
            const x = verticalAngles[i - 1].sin;

            for (let j = 0; j < horizontalLength; j++) {
                const xx = vertexPos[middle][j].x * x;
                const zx = vertexPos[middle][j].z * x;
                const xy = vertexPos[middle][j].x * y;
                const zy = vertexPos[middle][j].z * y;
                vertexPos[i - 1][j] = {x: xx, y: y, z: zx};
                vertexPos[middle - i][j] = {x: xy, y: x, z: zy};
                vertexPos[middle + i][j] = {x: xy, y: -x, z: zy};
                vertexPos[verticalLength - i][j] = {x: xx, y: -y, z: zx};
            }
        }



        // vertex array

        const vertices: number[] = new Array(vertexPos.length * 8);
        {
            let index = 0;
            
            const horizontalStep = 1.0 / (horizontalLength - 1.0);
            const verticalStep = 1.0 / (verticalLength + 1.0);
            
            // top vertices
            {
                let step = horizontalStep / 2.0;
                for (let i = 0; i < horizontalLength - 1; i++) {
                    vertices[index++] = 0.0;
                    vertices[index++] = 1.0;
                    vertices[index++] = 0.0;
                    
                    vertices[index++] = 0.0;
                    vertices[index++] = 1.0;
                    vertices[index++] = 0.0;
                    
                    vertices[index++] = step;
                    vertices[index++] = 1.0;
                    
                    step += horizontalStep;
                }
            }
            
            // middle vertices
            {
                let vStep = 1 - verticalStep;
                for (let i = 0; i < verticalLength; i++) {
                    let hStep = 0.0;
                    for (let j = 0; j < horizontalLength; j++) {
                        vertices[index++] = vertexPos[i][j].x;
                        vertices[index++] = vertexPos[i][j].y;
                        vertices[index++] = vertexPos[i][j].z;
                        
                        vertices[index++] = vertexPos[i][j].x;
                        vertices[index++] = vertexPos[i][j].y;
                        vertices[index++] = vertexPos[i][j].z;
                        
                        vertices[index++] = hStep;
                        vertices[index++] = vStep;
                        
                        hStep += horizontalStep;
                    }
                    vStep -= verticalStep;
                }
            }
            
            // bottom vertices
            {
                let step = horizontalStep / 2.0;
                for (let i = 0; i < horizontalLength - 1; i++) {
                    vertices[index++] = 0.0;
                    vertices[index++] = -1.0;
                    vertices[index++] = 0.0;
                    
                    vertices[index++] = 0.0;
                    vertices[index++] = -1.0;
                    vertices[index++] = 0.0;
                    
                    vertices[index++] = step;
                    vertices[index++] = 0.0;
                    
                    step += horizontalStep;
                }
            }
        }



        // indices array

        const offset = horizontalLength - 1;
        const indices: number[] = new Array(3 * (2 * offset + 2 * (verticalLength - 1) * (horizontalLength - 1)));
        {
            let index = 0;
            
            // top triangles
            for (let i = 0; i < offset; i++) {
                indices[index++] = i;
                indices[index++] = offset + i;
                indices[index++] = offset + i + 1;
            }

            // middle squares
            for (let i = 0; i < verticalLength - 1; i++)
                for (let j = 0; j < horizontalLength - 1; j++) {
                    const topLeft = offset + horizontalLength * i + j;
                    const topRight = offset + horizontalLength * i + j + 1;
                    const bottomLeft = offset + horizontalLength * (i + 1) + j;
                    const bottomRight = offset + horizontalLength * (i + 1) + j + 1;
                    
                    indices[index++] = topRight;
                    indices[index++] = topLeft;
                    indices[index++] = bottomRight;

                    indices[index++] = bottomRight;
                    indices[index++] = topLeft;
                    indices[index++] = bottomLeft;
                }
        
            // bottom triangles
            const totalLength = horizontalLength * verticalLength;
            const bottomStart = offset + totalLength;
            const lastArray = offset + totalLength - horizontalLength;
            for (let i = 0; i < offset; i++) {
                indices[index++] = lastArray + i;
                indices[index++] = bottomStart + i;
                indices[index++] = lastArray + i + 1;
            }
        }
        
        return new Mesh(new Float32Array(vertices), new Uint16Array(indices));
    }
}
