import { mat4 } from "gl-matrix";

export class Sprite {
    geometry: Geometry;
    material: Material;
    children: Array<Sprite>;
    modelMatrix: mat4;

    constructor(geometry: Geometry, material: Material) {
        this.geometry = geometry;
        this.material = material;

        this.modelMatrix = mat4.create();
    }

    draw(renderer: Renderer) {
        let gl = renderer.gl;

        gl.uniformMatrix4fv(
            this.material.programInfo.uniformLocations["uModelViewMatrix"],
            false,
            this.modelMatrix,
        );

        gl.drawArrays(this.geometry.mode, 0, this.geometry.vertexPositions.length / 4);
    }
}

export class Geometry {
    vertexPositions: Array<Number>;
    mode: number;

    constructor(vertexPositions: Array<Number>) {
        this.vertexPositions = vertexPositions;
    }
}

export class TriangleGeometry extends Geometry {
    constructor(width: number, height: number) {
        super([
            width, 0, 0, 1,
            0, height, 0, 1,
            0, 0, 0, 1,
        ]);
        this.mode = WebGL2RenderingContext.TRIANGLES;
    }
}

export class TetrahedronGeometry extends Geometry {
    constructor(width: number, height: number, depth: number) {
        super([
            0, 0, 0, 1,
            0, height, 0, 1,
            width, 0, 0, 1,
            0, 0, depth, 1,
            0, 0, 0, 1,
            0, height, 0, 1,
        ]);
        this.mode = WebGL2RenderingContext.TRIANGLE_STRIP;
    }
}

export class LineGeometry extends Geometry {
    constructor(start: Array<number>, end: Array<number>) {
        super([
            start[0], start[1], start[2], 1,
            end[0], end[1], end[2], 1
        ]);
        this.mode = WebGL2RenderingContext.LINES;
    }
}

export class Material {
    programInfo: ProgramInfo;
    vertexShaderSource: string;
    fragmentShaderSource: string;
    buffers: {
        attributes: {},
        uniforms: {}
    };

    constructor(vertexShaderSource: string, fragmentShaderSource: string) {
        this.vertexShaderSource = vertexShaderSource;
        this.fragmentShaderSource = fragmentShaderSource;
        this.buffers = {
            attributes: {},
            uniforms: {},
        };
    }

    compile(renderer: Renderer, attributePlaceholders: Object, uniformPlaceholders: Object) {
        let self = this;
        let gl = renderer.gl;
        let shaderProgram = getShaderProgram(gl, this.vertexShaderSource, this.fragmentShaderSource);
        this.programInfo = getProgramInfo(gl, shaderProgram, attributePlaceholders, uniformPlaceholders);

        Object.entries(this.programInfo.attributeLocations).forEach(function (item) {
            let k = item[0];
            let v = item[1];
            self.buffers.attributes[k] = gl.createBuffer();
        })

        Object.entries(this.programInfo.uniformLocations).forEach(function (item) {
            let k = item[0];
            let v = item[1];
            self.buffers.uniforms[k] = gl.createBuffer();
        })
    }

    bindPlaceholders(renderer: Renderer, attributePlaceholderValueMapping: Object, uniformPlaceholderValueMapping: Object) {
        let self = this;
        let gl = renderer.gl;

        gl.useProgram(this.programInfo.program);

        Object.entries(attributePlaceholderValueMapping).forEach(function (item) {
            let k = item[0];
            let v = item[1];
            gl.bindBuffer(gl.ARRAY_BUFFER, self.buffers.attributes[k]);
            gl.bufferData(gl.ARRAY_BUFFER, v, gl.STATIC_DRAW);
            gl.vertexAttribPointer(
                self.programInfo.attributeLocations[k],
                4,
                gl.FLOAT,
                false,
                0,
                0
            );
            gl.enableVertexAttribArray(self.programInfo.attributeLocations[k]);
        });

        // Object.entries(uniformPlaceholderValueMapping).forEach(function (item) {
        //     let k = item[0];
        //     let v = item[1];
        //     gl.bindBuffer(gl.ARRAY_BUFFER, self.buffers.uniforms[k]);
        //     gl.bufferData(gl.ARRAY_BUFFER, v, gl.STATIC_DRAW);
        //     gl.vertexAttribPointer(
        //         self.programInfo.uniformLocations[k],
        //         4,
        //         gl.FLOAT,
        //         false,
        //         0,
        //         0
        //     );
        //     gl.enableVertexAttribArray(self.programInfo.uniformLocations[k]);
        // });
    }
}

export class ColorMaterial extends Material {
    
}

export class Renderer {
    canvas: HTMLCanvasElement;
    gl: WebGL2RenderingContext;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;

        let gl = canvas.getContext("webgl2");

        if (gl == null) {
            throw new Error("Can't create webgl2 context");
        }

        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        this.gl = gl;
    }

    render(world: Sprite) {
        world.draw(this);
    }
}

export function getShaderProgram(gl: WebGL2RenderingContext, vertexShaderSource: string, fragmentShaderSource: string): WebGLProgram {
    let vertexShader = getShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    let fragmentShader = getShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

    let shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        throw new Error("Link error");
    }

    return shaderProgram;
}

function getShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
    let shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error("Compilation error " + gl.getShaderInfoLog(shader));
    }
    return shader;
}

interface ProgramInfo {
    program: WebGLProgram,
    attributeLocations: Object,
    uniformLocations: Object,
};

export function getProgramInfo(gl: WebGL2RenderingContext, shaderProgram: WebGLProgram, attributePlaceholders: Object, uniformPlaceholders: Object): ProgramInfo {
    let attributeLocations = {};
    Object.entries(attributePlaceholders).forEach(function (item) {
        let k = item[0];
        let v = item[1];
        attributeLocations[k] = gl.getAttribLocation(shaderProgram, v);
    });

    let uniformLocations = {};
    Object.entries(uniformPlaceholders).forEach(function (item) {
        let k = item[0];
        let v = item[1];
        uniformLocations[k] = gl.getUniformLocation(shaderProgram, v);
    });

    return {
        program: shaderProgram,
        attributeLocations: attributeLocations,
        uniformLocations: uniformLocations,
    };
}