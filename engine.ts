import { mat4 } from "gl-matrix";

export class Sprite {
    vertices: Float32Array;
    modelMatrix: mat4;
    shaderProgram: WebGLProgram;

    constructor(vertices, modelMatrix, children, shaderProgram) {
        this.vertices = vertices;
        this.modelMatrix = modelMatrix;
        this.shaderProgram = shaderProgram;
    }

    draw(gl: WebGL2RenderingContext) {
        gl.useProgram(this.shaderProgram);
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
        alert("link error");
        return;
    }

    return shaderProgram;
}

function getShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
    let shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.log("Compilation error " + gl.getShaderInfoLog(shader));
        return null;
    }
    return shader;
}

interface ProgramInfo {
    program: WebGLProgram,
    attributeLocations: Object,
    uniformLocations: Object,
};

export function getProgramInfo(gl: WebGL2RenderingContext, shaderProgram: WebGLProgram, attributePlaceholders: Array<string>, uniformPlaceholders: Array<string>): ProgramInfo {
    let attributeLocations = {};
    attributePlaceholders.forEach(function (v) {
        attributeLocations[v] = gl.getAttribLocation(shaderProgram, v);
    });

    let uniformLocations = {};
    uniformPlaceholders.forEach(function (v) {
        uniformLocations[v] = gl.getUniformLocation(shaderProgram, v);
    });

    return {
        program: shaderProgram,
        attributeLocations: attributeLocations,
        uniformLocations: uniformLocations,
    };
}