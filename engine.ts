import { mat4 } from "gl-matrix";

export class Sprite {
    geometry: Geometry;
    material: Material;
    children: Array<Sprite>;
    modelMatrix: mat4;

    constructor(geometry: Geometry, material: Material) {
        this.geometry = geometry;
        this.material = material;

        this.children = new Array();
        this.modelMatrix = mat4.create();
    }

    add(child: Sprite) {
        this.children.push(child);
    }
}

export class Geometry {
    vertexPositions: Array<Number>;
    mode: number;

    constructor(vertexPositions: Array<Number>) {
        this.vertexPositions = vertexPositions;
    }

    get nodePositions(): Array<Array<number>> {
        let nodePositions = [];

        for (let i = 0; i < this.vertexPositions.length / 4; i++) {
            nodePositions.push([
                this.vertexPositions[i * 4 + 0],
                this.vertexPositions[i * 4 + 1],
                this.vertexPositions[i * 4 + 2],
                this.vertexPositions[i * 4 + 3],
            ]);
        }

        return nodePositions;
    }
}

export class TriangleGeometry extends Geometry {
    point1: Array<number>;
    point2: Array<number>;
    point3: Array<number>;

    constructor(point1: Array<number>, point2: Array<number>, point3: Array<number>) {
        super([
            point1[0], point1[1], point1[2], 1,
            point2[0], point2[1], point2[2], 1,
            point3[0], point3[1], point3[2], 1,
        ]);
        this.mode = WebGL2RenderingContext.TRIANGLES;
        this.point1 = point1;
        this.point2 = point2;
        this.point3 = point3;
    }
}

export class TetrahedronGeometry extends Geometry {
    width: number;
    height: number;
    depth: number;

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
        this.width = width;
        this.height = height;
        this.depth = depth;
    }
}

export class LineGeometry extends Geometry {
    start: Array<number>;
    end: Array<number>;

    constructor(start: Array<number>, end: Array<number>) {
        super([
            start[0], start[1], start[2], 1,
            end[0], end[1], end[2], 1
        ]);
        this.mode = WebGL2RenderingContext.LINES;
        this.start = start;
        this.end = end;
    }
}

// plane centered at origin
export class PlaneGeometry extends Geometry {
    width: number;
    height: number;

    constructor(width: number, height: number) {
        super([
            - width / 2, height / 2, 0, 1,
            width / 2, height / 2, 0, 1,
            - width / 2, - height / 2, 0, 1,
            width / 2, - height / 2, 0, 1
        ])
        this.mode = WebGL2RenderingContext.TRIANGLE_STRIP;
        this.width = width;
        this.height = height;
    }
}

export class SphereGeometry extends Geometry {
    radius: number;
    horizontalSegmentCount: number; // how many line segments to simulate horizontal circle
    verticalSegmentCount: number; // how many line segments to simulate vertical semi-circle

    constructor(radius: number = 1, horizontalSegmentCount: number = 16, verticalSegmentCount: number = 32) {
        let vertexPositions = [];
        let deltaPhi = Math.PI / verticalSegmentCount;
        let deltaTheta = 2 * Math.PI / horizontalSegmentCount;

        for (let phiIndex = 0; phiIndex <= verticalSegmentCount - 1; phiIndex++) {

            for (let thetaIndex = 0; thetaIndex <= horizontalSegmentCount; thetaIndex++) {
                let a = [
                    radius * Math.cos(thetaIndex * deltaTheta) * Math.sin(phiIndex * deltaPhi),
                    radius * Math.cos(phiIndex * deltaPhi),
                    radius * Math.sin(thetaIndex * deltaTheta) * Math.sin(phiIndex * deltaPhi),
                    1,
                ];
                let b = [
                    radius * Math.cos(thetaIndex * deltaTheta) * Math.sin((phiIndex + 1) * deltaPhi),
                    radius * Math.cos((phiIndex + 1) * deltaPhi),
                    radius * Math.sin(thetaIndex * deltaTheta) * Math.sin((phiIndex + 1) * deltaPhi),
                    1,
                ];
                vertexPositions = vertexPositions.concat(a).concat(b);
            }

        }

        super(vertexPositions);
        this.mode = WebGL2RenderingContext.TRIANGLE_STRIP;

        this.radius = radius;
        this.horizontalSegmentCount = horizontalSegmentCount;
        this.verticalSegmentCount = verticalSegmentCount;
    }
}

export class TorusGeometry extends Geometry {
    radius: number; // toroidal (outer circle) radius
    radius2: number; // poloidal (inner circle) radius
    horizontalSegmentCount: number; // how many line segments to simulate the outer circle
    verticalSegmentCount: number; // how many line segments to simulate the inner circle

    constructor(radius: number, radius2: number, horizontalSegmentCount: number, verticalSegmentCount: number) {
        let vertexPositions = [];

        let deltaTheta = 2 * Math.PI / horizontalSegmentCount;
        let deltaPhi = 2 * Math.PI / verticalSegmentCount;

        for (let phiIndex = 0; phiIndex <= verticalSegmentCount; phiIndex++) {

            for (let thetaIndex = 0; thetaIndex <= horizontalSegmentCount; thetaIndex++) {
                let theta = thetaIndex * deltaTheta;
                let phi = phiIndex * deltaPhi;
                let centerPoint = [
                    radius * Math.cos(theta),
                    0,
                    radius * Math.sin(theta),
                    1,
                ];
                let a = [
                    centerPoint[0] + radius2 * Math.sin(phi) * Math.cos(theta),
                    centerPoint[1] + radius2 * Math.cos(phi),
                    centerPoint[2] + radius2 * Math.sin(phi) * Math.sin(theta),
                    1,
                ];

                theta = (thetaIndex - 1) * deltaTheta;
                phi = (phiIndex - 1) * deltaPhi;
                centerPoint = [
                    radius * Math.cos(theta),
                    0,
                    radius * Math.sin(theta),
                    1,
                ];
                let b = [
                    centerPoint[0] + radius2 * Math.sin(phi) * Math.cos(theta),
                    centerPoint[1] + radius2 * Math.cos(phi),
                    centerPoint[2] + radius2 * Math.sin(phi) * Math.sin(theta),
                    1,
                ];
                vertexPositions = vertexPositions.concat(a).concat(b);
            }
        }

        super(vertexPositions);
        this.mode = WebGL2RenderingContext.TRIANGLE_STRIP;

        this.radius = radius;
        this.radius2 = radius2;
        this.horizontalSegmentCount = horizontalSegmentCount;
        this.verticalSegmentCount = verticalSegmentCount;
    }
}

// cube centered at origin
export class CubeGeometry extends Geometry {
    width: number;
    height: number;
    depth: number;

    constructor(width: number, height: number, depth: number) {
        let upperA = [width / 2, height / 2, depth / 2];
        let upperB = [width / 2, height / 2, - depth / 2];
        let upperC = [- width / 2, height / 2, - depth / 2];
        let upperD = [- width / 2, height / 2, depth / 2];
        let lowerA = [width / 2, - height / 2, depth / 2];
        let lowerB = [width / 2, - height / 2, - depth / 2];
        let lowerC = [- width / 2, - height / 2, - depth / 2];
        let lowerD = [- width / 2, - height / 2, depth / 2];

        super([
            upperC[0], upperC[1], upperC[2], 1,
            upperB[0], upperB[1], upperB[2], 1,
            upperD[0], upperD[1], upperD[2], 1,
            upperA[0], upperA[1], upperA[2], 1,
            lowerD[0], lowerD[1], lowerD[2], 1,
            lowerA[0], lowerA[1], lowerA[2], 1,
            lowerC[0], lowerC[1], lowerC[2], 1,
            lowerB[0], lowerB[1], lowerB[2], 1,
            lowerA[0], lowerA[1], lowerA[2], 1,
            upperA[0], upperA[1], upperA[2], 1,
            lowerB[0], lowerB[1], lowerB[2], 1,
            upperB[0], upperB[1], upperB[2], 1,
            lowerC[0], lowerC[1], lowerC[2], 1,
            upperC[0], upperC[1], upperC[2], 1,
            lowerD[0], lowerD[1], lowerD[2], 1,
            upperD[0], upperD[1], upperD[2], 1,
        ]);
        this.mode = WebGL2RenderingContext.TRIANGLE_STRIP;
        this.width = width;
        this.height = height;
        this.depth = depth;
    }
}

// frustum centered at origin
export class Frustum extends Geometry {
    radius1: number; // bottom circle radius
    radius2: number; // top circle radius
    height: number; // height
    horizontalSegmentCount: number;

    constructor(radius1: number, radius2: number, height: number, horizontalSegmentCount: number) {
        let vertexPositions = [];

        let deltaTheta = 2 * Math.PI / horizontalSegmentCount;

        for (let thetaIndex = 0; thetaIndex <= horizontalSegmentCount; thetaIndex++) { // bottom circle
            let a = [
                0,
                - height / 2,
                0,
                1,
            ];
            let b = [
                radius1 * Math.cos(thetaIndex * deltaTheta),
                - height / 2,
                radius1 * Math.sin(thetaIndex * deltaTheta),
                1,
            ];
            vertexPositions = vertexPositions.concat(a).concat(b);
        }

        for (let thetaIndex = 0; thetaIndex <= horizontalSegmentCount; thetaIndex++) { // side surface between top circle and bottom circle
            let a = [
                radius1 * Math.cos(thetaIndex * deltaTheta),
                - height / 2,
                radius1 * Math.sin(thetaIndex * deltaTheta),
                1,
            ];
            let b = [
                radius2 * Math.cos((thetaIndex) * deltaTheta),
                + height / 2,
                radius2 * Math.sin((thetaIndex) * deltaTheta),
                1,
            ];
            vertexPositions = vertexPositions.concat(a).concat(b);
        }

        for (let thetaIndex = 0; thetaIndex <= horizontalSegmentCount; thetaIndex++) { // top circle
            let a = [
                radius2 * Math.cos(thetaIndex * deltaTheta),
                height / 2,
                radius2 * Math.sin(thetaIndex * deltaTheta),
                1,
            ];
            let b = [
                0,
                height / 2,
                0,
                1,
            ];
            vertexPositions = vertexPositions.concat(a).concat(b);
        }

        super(vertexPositions);
        this.mode = WebGL2RenderingContext.TRIANGLE_STRIP;

        this.radius1 = radius1;
        this.radius2 = radius2;
        this.height = height;
        this.horizontalSegmentCount = horizontalSegmentCount;
    }
}

export class Material {
    programInfo: ProgramInfo;
    vertexShaderSource: string;
    fragmentShaderSource: string;
    buffers: {
        attributes: {},
        uniforms: {},
    };
    placeholderValueMapping: {
        attributes: {},
        uniforms: {},
    };

    constructor(vertexShaderSource: string, fragmentShaderSource: string) {
        this.vertexShaderSource = vertexShaderSource;
        this.fragmentShaderSource = fragmentShaderSource;

        this.buffers = {
            attributes: {},
            uniforms: {},
        };
        this.placeholderValueMapping = {
            attributes: {},
            uniforms: {},
        };
    }

    compile(renderer: Renderer, attributePlaceholders: Object, uniformPlaceholders: Object) {
        let self = this;
        let gl = renderer.gl;
        if (this.vertexShaderSource && this.fragmentShaderSource) {
            let shaderProgram = getShaderProgram(gl, this.vertexShaderSource, this.fragmentShaderSource);
            this.programInfo = getProgramInfo(gl, shaderProgram, attributePlaceholders, uniformPlaceholders);
        } else {
            throw new Error("No vertex shader source or fragment shader source.");
        }

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
        this.placeholderValueMapping.attributes = attributePlaceholderValueMapping;
        this.placeholderValueMapping.uniforms = uniformPlaceholderValueMapping;

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

        Object.entries(uniformPlaceholderValueMapping).forEach(function (item) {
            let k = item[0];
            let v = item[1];
            gl.bindBuffer(gl.ARRAY_BUFFER, self.buffers.uniforms[k]);
            gl.bufferData(gl.ARRAY_BUFFER, v, gl.STATIC_DRAW);
            gl.vertexAttribPointer(
                self.programInfo.uniformLocations[k],
                4,
                gl.FLOAT,
                false,
                0,
                0
            );
            gl.enableVertexAttribArray(self.programInfo.uniformLocations[k]);
        });
    }
}

export class ColorMaterial extends Material {
    color: Array<number>;

    constructor(color: Array<number>) {
        super(`
            attribute vec4 aVertexPosition;

            uniform mat4 uModelViewProjectionMatrix;

            void main() {
                gl_Position = uModelViewProjectionMatrix * aVertexPosition;
            }
        `, `
            precision mediump float;

            void main() {
                gl_FragColor = vec4(${color[0]}, ${color[1]}, ${color[2]}, ${color[3]});
            }
        `);
        this.color = color;
    }

    compile(renderer: Renderer, attributePlaceholders: Object, uniformPlaceholders: Object) {
        super.compile(renderer, {
            aVertexPosition: "aVertexPosition"
        }, {
            uModelViewProjectionMatrix: "uModelViewProjectionMatrix"
        });
    }
}

export class Camera {
    viewMatrix: mat4;
    projectionMatrix: mat4;

    constructor(viewMatrix: mat4, projectionMatrix: mat4) {
        this.viewMatrix = viewMatrix;
        this.projectionMatrix = projectionMatrix;
    }
}

export class PerspectiveCamera extends Camera {
    position: Array<number>;
    lookAt: Array<number>;
    upVector: Array<number>;
    fieldOfView: number;
    aspectRatio: number;
    zNear: number;
    zFar: number;

    constructor(position: Array<number>, lookAt: Array<number>, upVector: Array<number>, fieldOfView: number, aspectRatio: number, zNear: number, zFar: number) {
        let viewMatrix = mat4.create();
        mat4.lookAt(viewMatrix, position, lookAt, upVector);

        let projectionMatrix = mat4.create();
        mat4.perspective(projectionMatrix, fieldOfView, aspectRatio, zNear, zFar);

        super(viewMatrix, projectionMatrix);

        this.position = position;
        this.lookAt = lookAt;
        this.upVector = upVector;
        this.fieldOfView = fieldOfView;
        this.aspectRatio = aspectRatio;
        this.zNear = zNear;
        this.zFar = zFar;
    }
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
        this.gl = gl;

        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);
        // gl.cullFace(gl.FRONT_AND_BACK);

        this.clear();
    }

    clear(color = [0, 0, 0, 1]) {
        let gl = this.gl
        gl.clearColor(color[0], color[1], color[2], color[3]);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    }

    render(world: Sprite, camera: Camera) {
        let rootMatrix = mat4.create();
        mat4.multiply(rootMatrix, camera.viewMatrix, rootMatrix);
        mat4.multiply(rootMatrix, camera.projectionMatrix, rootMatrix);
        this.renderWithMatrix(world, rootMatrix);
    }

    renderWithMatrix(sprite: Sprite, matrix: mat4) {
        let self = this;
        let gl = this.gl;
        let realMatrix = mat4.create();
        mat4.multiply(realMatrix, matrix, sprite.modelMatrix);

        if (sprite.material) {
            gl.useProgram(sprite.material.programInfo.program);
            sprite.material.placeholderValueMapping.attributes.aVertexPosition = new Float32Array(sprite.geometry.vertexPositions);
            sprite.material.bindPlaceholders(self, sprite.material.placeholderValueMapping.attributes, sprite.material.placeholderValueMapping.uniforms);
            gl.uniformMatrix4fv(
                sprite.material.programInfo.uniformLocations["uModelViewProjectionMatrix"],
                false,
                realMatrix,
            );
        }

        if (sprite.geometry) {
            gl.drawArrays(sprite.geometry.mode, 0, sprite.geometry.vertexPositions.length / 4);
        }

        sprite.children.forEach(function (child) {
            self.renderWithMatrix(child, realMatrix);
        })
    }
}

export interface CurveFunction {
    (percent: number): number;
}

export class Animation {
    keyframes: {
        number: {
            T: number
        }
    };
    // `keyframes` looks like CSS @keyframes
    // {
    //     0: {
    //         rotationX: 45,
    //     },
    //     100: {
    //         rotationX: 360,
    //     },
    // }
    duration: number;
    curve: CurveFunction;
    delay: number;
    count: number;
    keyframePercents: Array<number>;

    private startTime: number;
    private playing: boolean;

    constructor(keyframes: { number: { T: number } }, duration: number, curve: CurveFunction, delay: number, count: number) {
        this.keyframes = keyframes;
        this.duration = duration;
        this.curve = curve;
        this.delay = delay;
        this.count = count;

        this.startTime = null;
        this.playing = false;

        this.keyframePercents = Object.keys(keyframes).map(Number).sort(function (a, b) { return Number(a) - Number(b) });
    }

    start() {
        this.startTime = Date.now() / 1000;
        this.playing = true;
    }

    yield() {
        if (this.playing) {
            let currentTime = Date.now() / 1000;
            if (currentTime - this.startTime < this.delay) {
                return this.keyframes[0];
            } else {
                let currentFrame = deepCopy(this.keyframes[0]);
                if (currentTime < this.startTime + this.delay + this.count * this.duration) {
                    let timePercentage = (currentTime - this.startTime - this.delay) % this.duration / this.duration;
                    let index;

                    for (index = 1; index < this.keyframePercents.length; index++) {
                        if (timePercentage < Number(this.keyframePercents[index])) {
                            index = index - 1;
                            break;
                        }
                    }

                    let x = (timePercentage - this.keyframePercents[index]) / (this.keyframePercents[Number(index) + 1] - this.keyframePercents[index]);
                    let y = this.curve(x);
                    // console.log(y);

                    for (let [k, v] of Object.entries(this.keyframes[0])) {
                        let a = this.keyframes[this.keyframePercents[index]][k];
                        let b = this.keyframes[this.keyframePercents[Number(index) + 1]][k];
                        // console.log([timePercentage, index, a, b, x, y]);
                        currentFrame[k] = (b - a) * y + a;
                    }
                    // console.log(currentFrame);
                    return currentFrame;
                } else {
                    return this.keyframes[0];
                }
            }
        } else {
            return this.keyframes[0];
        }
    }

    stop() { // stop right away, no matter if the animation is underway
        this.playing = false;
    }
}

export function linear(percent: number) {
    return percent;
}

export function sin(percent: number) {
    return Math.sin(Math.PI * percent);
}

// generate a cubic Bezier curve function
export function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
    return function (percent: number) {
        let x = percent;
        let t = -(-6 * x1 + 3 * x2) / (3 * (3 * x1 - 3 * x2 + 1)) - (-9 * x1 / (3 * x1 - 3 * x2 + 1) + (-6 * x1 + 3 * x2) ** 2 / (3 * x1 - 3 * x2 + 1) ** 2) / (3 * (-27 * x / (2 * (3 * x1 - 3 * x2 + 1)) - 27 * x1 * (-6 * x1 + 3 * x2) / (2 * (3 * x1 - 3 * x2 + 1) ** 2) + (-6 * x1 + 3 * x2) ** 3 / (3 * x1 - 3 * x2 + 1) ** 3 + Math.sqrt(-4 * (-9 * x1 / (3 * x1 - 3 * x2 + 1) + (-6 * x1 + 3 * x2) ** 2 / (3 * x1 - 3 * x2 + 1) ** 2) ** 3 + (-27 * x / (3 * x1 - 3 * x2 + 1) - 27 * x1 * (-6 * x1 + 3 * x2) / (3 * x1 - 3 * x2 + 1) ** 2 + 2 * (-6 * x1 + 3 * x2) ** 3 / (3 * x1 - 3 * x2 + 1) ** 3) ** 2) / 2) ** (1 / 3)) - (-27 * x / (2 * (3 * x1 - 3 * x2 + 1)) - 27 * x1 * (-6 * x1 + 3 * x2) / (2 * (3 * x1 - 3 * x2 + 1) ** 2) + (-6 * x1 + 3 * x2) ** 3 / (3 * x1 - 3 * x2 + 1) ** 3 + Math.sqrt(-4 * (-9 * x1 / (3 * x1 - 3 * x2 + 1) + (-6 * x1 + 3 * x2) ** 2 / (3 * x1 - 3 * x2 + 1) ** 2) ** 3 + (-27 * x / (3 * x1 - 3 * x2 + 1) - 27 * x1 * (-6 * x1 + 3 * x2) / (3 * x1 - 3 * x2 + 1) ** 2 + 2 * (-6 * x1 + 3 * x2) ** 3 / (3 * x1 - 3 * x2 + 1) ** 3) ** 2) / 2) ** (1 / 3) / 3
        // this crazy equation is done by solving the equation for t with respect to x
        // 3 (1 - t)^2 t x_1 + 3 (1 - t) t^2 x_2 + t^3 = x
        // it has 3 roots, choose the root that makes y(t) a real number, and this is that root.

        return 3 * (1 - t) ** 2 * t * y1 + 3 * (1 - t) * t ** 2 * y2 + t ** 3;
    };
}
// see also https://en.wikipedia.org/wiki/Cubic_equation#General_cubic_formula

// some convenient aliases
export let ease = cubicBezier(0.25, 0.1, 0.25, 1.0);
export let easeIn = cubicBezier(0.42, 0, 1.0, 1.0);
export let easeOut = cubicBezier(0, 0, 0.58, 1.0);
export let easeInOut = cubicBezier(0.42, 0, 0.58, 1.0);

// see also https://drafts.csswg.org/css-easing-1/#cubic-bzier-easing-function

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

export function deepCopy(x: Object): Object {
    return JSON.parse(JSON.stringify(x));
}

export function radians(degree: number): number {
    return degree * 2 * Math.PI / 360;
}

export function degrees(radians: number): number {
    return radians * 360 / (2 * Math.PI);
}