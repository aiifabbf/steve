// engine.ts: a simple wrapper around WebGL's drawing primitives
import { mat4, vec3, vec4 } from "gl-matrix";

// Sprite class
// A Sprite represents some object that can be painted in the scene, or an invisible or visible container that contains other Sprites.
// A Sprite's absolute transform is calculated cumulatively along the path from root (world sprite that contains everything) to this Sprite.
export class Sprite {
    geometry: Geometry; // holds geometric information
    material: Material; // holds material information
    children: Array<Sprite>;
    modelMatrix: mat4; // transform relative to parent

    // for abstract containers, set geometry and material to null
    constructor(geometry: Geometry, material: Material) {
        this.geometry = geometry;
        this.material = material;

        this.children = new Array();
        this.modelMatrix = mat4.create();
    }

    // attach a child Sprite to this Sprite
    add(child: Sprite) {
        this.children.push(child);
    }
}

// Light base class
// Light is a Sprite. This means you can attach a Light to any other Sprite in the scene, just like attaching a Sprite to another Sprite
// Renderer.render() will later scan through the scene tree, find all Lights and calculate their absolute positions, and transfer Light properties like Ia, Id, Is into shader programs
export class Light extends Sprite {
    ia: Array<number>; // ambient light density for r, g, b, a
    id: Array<number>; // diffuse light density for r, g, b, a
    is: Array<number>; // specular light density for r, g, b, a

    constructor(ia: Array<number>, id: Array<number>, is: Array<number>) {
        super(null, null);
        this.ia = ia;
        this.id = id;
        this.is = is;
    }
}

// AmbientLight only cares about ambient term
// Realist lights do not have ambient term. That is why here I choose to separate ambient light and point light
export class AmbientLight extends Light {
    constructor(ia: Array<number>) {
        super(ia, [0, 0, 0, 0], [0, 0, 0, 0]);
    }
}

// PointLight only cares about diffuse term and specular term
export class PointLight extends Light {
    constructor(id: Array<number>, is: Array<number>) {
        super([0, 0, 0, 0], id, is);
    }
}

// Geometry class
// A Geometry instance holds purely geometric information, e.g. vertex positions, normal vectors at each vertex, that is independent of material, sprite or rendering context.
// A Sprite, at initialization, will refer to some Geometry instance to represent its geometric structure.
export class Geometry {
    readonly vertexPositions: Array<number>; // vertex positions once set, can no longer be changed any more, for efficiency reason
    mode: number; // drawing mode, e.g. TRIANGLE_STRIP, TRIANGLES, LINES

    cachedNormalVectors: Array<Array<number>>; // avoid duplicate computation
    cachedNodePositions: Array<Array<number>>; // avoid duplicate computation

    constructor(vertexPositions: Array<number>) {
        this.vertexPositions = vertexPositions;
    }

    // get vertex positions in Array<vec4>-like form. Equivalent to reshaping vertexPositions to (-1, 4)
    get nodePositions(): Array<Array<number>> {
        if (this.cachedNodePositions) {
            return this.cachedNodePositions;
        }
        this.cachedNodePositions = [];

        for (let i = 0; i < this.vertexPositions.length / 4; i++) {
            this.cachedNodePositions.push([
                this.vertexPositions[i * 4 + 0],
                this.vertexPositions[i * 4 + 1],
                this.vertexPositions[i * 4 + 2],
                this.vertexPositions[i * 4 + 3],
            ]);
        }

        return this.cachedNodePositions;
    }

    // compute normalized, normal vector in Array<vec4>-like form for every node
    // sub-types can have their own specialized, more accurate normal vectors.
    get normalVectors(): Array<Array<number>> {
        if (this.cachedNormalVectors) {
            return this.cachedNormalVectors;
        }
        let nodePositions = this.nodePositions;
        let normalVectors: Array<Array<number>> = [];
        let normalVector = vec3.create();

        if (this.mode === WebGL2RenderingContext.TRIANGLE_STRIP) { // if drawing mode is TRIANGLE_STRIP

            for (let i = 0; i < nodePositions.length - 2; i++) {
                let a = nodePositions[i];
                let b = nodePositions[i + 1];
                let c = nodePositions[i + 2];

                let ab = vec3.create();
                vec3.subtract(ab, b, a); // ab = b - a

                let bc = vec3.create();
                vec3.subtract(bc, c, b); // bc = c - b
                if (i % 2 == 0) {
                    vec3.cross(normalVector, bc, ab); // for even-indexed triangles, surface normal vector is bc x ab
                } else {
                    vec3.cross(normalVector, ab, bc); // for odd-indexed triangles, surface normal vector is ab x bc
                }
                vec3.normalize(normalVector, normalVector);
                normalVectors.push([normalVector[0], normalVector[1], normalVector[2], 0]);
            }

            normalVectors.push([normalVector[0], normalVector[1], normalVector[2], 0]);
            normalVectors.push([normalVector[0], normalVector[1], normalVector[2], 0]);
        } else if (this.mode === WebGL2RenderingContext.TRIANGLES) { // if drawing mode is TRIANGLES

            for (let i = 0; i < nodePositions.length; i += 3) {
                let a = nodePositions[i];
                let b = nodePositions[i + 1];
                let c = nodePositions[i + 2];

                let ab = vec3.create();
                vec3.subtract(ab, b, a); // ab = b - a

                let bc = vec3.create();
                vec3.subtract(bc, c, b); // bc = c - b
                vec3.cross(normalVector, ab, bc);
                vec3.normalize(normalVector, normalVector);

                for (let _ = 0; _ < 3; _++) {
                    normalVectors.push([normalVector[0], normalVector[1], normalVector[2], 0]);
                }
            }
        }
        this.cachedNormalVectors = normalVectors;

        return normalVectors;
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
            - width / 2, - height / 2, 0, 1,
            width / 2, - height / 2, 0, 1,
            width / 2, height / 2, 0, 1,
            - width / 2, - height / 2, 0, 1,
            width / 2, height / 2, 0, 1,
            - width / 2, height / 2, 0, 1,
        ])
        this.mode = WebGL2RenderingContext.TRIANGLES;
        this.width = width;
        this.height = height;
    }

    get normalVectors() {
        if (this.cachedNormalVectors) {
            return this.cachedNormalVectors;
        }
        this.cachedNormalVectors = [
            [0, 1, 0, 0],
            [0, 1, 0, 0],
            [0, 1, 0, 0],
            [0, 1, 0, 0],
            [0, 1, 0, 0],
            [0, 1, 0, 0]
        ];
        return this.cachedNormalVectors;
    }
}

export class RingGeometry extends Geometry {
    innerRadius: number;
    outerRadius: number;
    height: number;

    constructor(innerRadius = 16, outerRadius = 18, height = 1, segment = 16) {
        let vertexPositions = [];
        let deltaTheta = 2 * Math.PI / segment;
        for (let h = -height / 2; h <= height / 2; h += height) {
            for (let thetaIndex = 0; thetaIndex <= segment; thetaIndex++) {
                let a = [
                    innerRadius * Math.cos(thetaIndex * deltaTheta),
                    innerRadius * Math.sin(thetaIndex * deltaTheta),
                    h,
                    1
                ]
                let b = [
                    outerRadius * Math.cos(thetaIndex * deltaTheta),
                    outerRadius * Math.sin(thetaIndex * deltaTheta),
                    h,
                    1
                ]
                vertexPositions = vertexPositions.concat(a).concat(b);
            }
        }
        for (let r = innerRadius; r <= outerRadius; r += outerRadius - innerRadius) {
            // console.log(r);
            for (let thetaIndex = 0; thetaIndex <= segment; thetaIndex++) {
                let a = [
                    r * Math.cos(thetaIndex * deltaTheta),
                    r * Math.sin(thetaIndex * deltaTheta),
                    - height / 2,
                    1
                ]
                let b = [
                    r * Math.cos(thetaIndex * deltaTheta),
                    r * Math.sin(thetaIndex * deltaTheta),
                    height / 2,
                    1
                ]
                vertexPositions = vertexPositions.concat(a).concat(b);
            }
        }
        super(vertexPositions);
        this.mode = WebGL2RenderingContext.TRIANGLE_STRIP;
        this.innerRadius = innerRadius;
        this.outerRadius = outerRadius;
        this.height = height;
    }
}

export class CylinderGeometry extends Geometry {
    radius: number;
    height: number;
    segment: number;

    constructor(radius = 1, height = 1, segment = 16) {
        let vertexPositions = [];
        let deltaTheta = 2 * Math.PI / segment;

        for (let thetaIndex = 0; thetaIndex <= segment; thetaIndex++) {
            let a = [
                radius * Math.cos(thetaIndex * deltaTheta),
                radius * Math.sin(thetaIndex * deltaTheta),
                - height / 2,
                1
            ]
            let b = [
                radius * Math.cos(thetaIndex * deltaTheta),
                radius * Math.sin(thetaIndex * deltaTheta),
                height / 2,
                1
            ]
            vertexPositions = vertexPositions.concat(a).concat(b);
        }
        for (let h = -height / 2; h <= height / 2; h += height) {
            for (let thetaIndex = 0; thetaIndex <= segment; thetaIndex++) {
                let a = [
                    radius * Math.cos(thetaIndex * deltaTheta),
                    radius * Math.sin(thetaIndex * deltaTheta),
                    h,
                    1
                ]
                let b = [0, 0, h, 1]
                vertexPositions = vertexPositions.concat(a).concat(b);
            }
        }
        super(vertexPositions);
        this.mode = WebGL2RenderingContext.TRIANGLE_STRIP;
        this.radius = radius;
        this.segment = segment;
        this.height = height;
    }

}

// Geometry that comes from rotating some cross section surface around Z axis
export class RotationGeometry extends Geometry {
    constructor(height = 1, segment = 16, define = []) {
        let vertexPositions = [];
        let deltaTheta = 2 * Math.PI / segment;
        let total = define.length;
        let totalHeight = 0;

        // bottom face
        for (let thetaIndex = 0; thetaIndex <= segment; thetaIndex++) {
            vertexPositions.push(
                0, 0, 0, 1, // b
                define[0] * Math.cos((thetaIndex + 1) * deltaTheta), define[0] * Math.sin((thetaIndex + 1) * deltaTheta), 0, 1, // a
                define[0] * Math.cos(thetaIndex * deltaTheta), define[0] * Math.sin(thetaIndex * deltaTheta), 0, 1, // c
            );
        }

        // side face
        for (let i = 1; i < total; i++) {
            for (let thetaIndex = 0; thetaIndex <= segment; thetaIndex++) {
                vertexPositions.push(
                    define[i - 1] * Math.cos(thetaIndex * deltaTheta), define[i - 1] * Math.sin(thetaIndex * deltaTheta), totalHeight, 1, // b
                    define[i - 1] * Math.cos((thetaIndex + 1) * deltaTheta), define[i - 1] * Math.sin((thetaIndex + 1) * deltaTheta), totalHeight, 1, // a
                    define[i] * Math.cos((thetaIndex + 1) * deltaTheta), define[i] * Math.sin((thetaIndex + 1) * deltaTheta), totalHeight + height, 1, // d
                    define[i - 1] * Math.cos(thetaIndex * deltaTheta), define[i - 1] * Math.sin(thetaIndex * deltaTheta), totalHeight, 1, // a
                    define[i] * Math.cos((thetaIndex + 1) * deltaTheta), define[i] * Math.sin((thetaIndex + 1) * deltaTheta), totalHeight + height, 1, // c
                    define[i] * Math.cos(thetaIndex * deltaTheta), define[i] * Math.sin(thetaIndex * deltaTheta), totalHeight + height, 1, // c
                );
            }
            totalHeight += height;
        }

        // top face
        for (let thetaIndex = 0; thetaIndex <= segment; thetaIndex++) {
            vertexPositions.push(
                0, 0, totalHeight, 1, // b
                define[define.length - 1] * Math.cos(thetaIndex * deltaTheta), define[define.length - 1] * Math.sin(thetaIndex * deltaTheta), totalHeight, 1, // c
                define[define.length - 1] * Math.cos((thetaIndex + 1) * deltaTheta), define[define.length - 1] * Math.sin((1 + thetaIndex) * deltaTheta), totalHeight, 1, // a
            );
        }

        super(vertexPositions);
        this.mode = WebGL2RenderingContext.TRIANGLES;
    }
}

export class SphereGeometry extends Geometry {
    radius: number;
    horizontalSegmentCount: number; // how many line segments to simulate horizontal circle
    verticalSegmentCount: number; // how many line segments to simulate vertical semi-circle
    maxTheta: number;
    maxPhi: number;

    cachedNormalVectors: Array<Array<number>>;

    constructor(radius: number = 1, horizontalSegmentCount: number = 16, verticalSegmentCount: number = 32, maxTheta: number = 2 * Math.PI, maxPhi: number = Math.PI) {
        let vertexPositions = [];
        let deltaPhi = maxPhi / verticalSegmentCount;
        let deltaTheta = maxTheta / horizontalSegmentCount;

        for (let phiIndex = 0; phiIndex <= verticalSegmentCount - 1; phiIndex++) {

            for (let thetaIndex = 0; thetaIndex <= horizontalSegmentCount; thetaIndex++) {
                let b = [
                    radius * Math.cos(thetaIndex * deltaTheta) * Math.sin(phiIndex * deltaPhi),
                    radius * Math.cos(phiIndex * deltaPhi),
                    radius * Math.sin(thetaIndex * deltaTheta) * Math.sin(phiIndex * deltaPhi),
                    1,
                ];
                let a = [
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
        this.maxTheta = maxTheta;
        this.maxPhi = maxPhi;
    }

    // override Geometry.normalVectors. This is more accurate, because we already know what the normal vector should be precisely on every point.
    get normalVectors() {
        if (this.cachedNormalVectors) {
            return this.cachedNormalVectors;
        }
        this.cachedNormalVectors = this.nodePositions.map(v => {
            let normalVector = vec4.create();
            vec4.normalize(normalVector, [v[0], v[1], v[2], 0]);
            return Array.from(normalVector);
        }).flat();

        return this.cachedNormalVectors;
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

    cachedNormalVectors: Array<Array<number>>;

    constructor(width: number, height: number, depth: number) {
        let rightTopFront = [width / 2, height / 2, depth / 2, 1];
        let rightTopBack = [width / 2, height / 2, - depth / 2, 1];
        let leftTopFront = [- width / 2, height / 2, depth / 2, 1];
        let leftTopBack = [- width / 2, height / 2, - depth / 2, 1];
        let rightBottomFront = [width / 2, - height / 2, depth / 2, 1];
        let rightBottomBack = [width / 2, - height / 2, - depth / 2, 1];
        let leftBottomFront = [- width / 2, - height / 2, depth / 2, 1];
        let leftBottomBack = [- width / 2, - height / 2, - depth / 2, 1];

        super([
            rightTopFront, leftTopFront, leftBottomFront, leftBottomFront, rightBottomFront, rightTopFront, // front face
            rightTopBack, rightTopFront, rightBottomFront, rightBottomFront, rightBottomBack, rightTopBack, // right face
            leftTopBack, rightTopBack, rightBottomBack, rightBottomBack, leftBottomBack, leftTopBack, // back face
            leftTopFront, leftTopBack, leftBottomBack, leftBottomBack, leftBottomFront, leftTopFront, // left face
            leftTopBack, leftTopFront, rightTopBack, rightTopBack, leftTopFront, rightTopFront,
            leftBottomBack, rightBottomBack, rightBottomFront, rightBottomFront, leftBottomFront, leftBottomBack, // bottom face
        ].flat());

        this.mode = WebGL2RenderingContext.TRIANGLES; // use TRIANGLES, life becomes easier
        this.width = width;
        this.height = height;
        this.depth = depth;
    }
}

// frustum centered at origin
export class FrustumGeometry extends Geometry {
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

// Material class
// A Material instance holds information about the look and feel of an object's surface, independent of what shape or geometry the object has.
// It is essentially a wrapper around WebGL shader programs.
export class Material {
    programInfo: ProgramInfo; // shader program objects, attribute name to attribute name in shader source mapping, uniform name to uniform name in shader source mapping
    vertexShaderSource: string;
    fragmentShaderSource: string;
    buffers: {
        attributes: {},
        uniforms: {},
    }; // buffers for all attributes and uniforms
    placeholderValueMapping: {
        attributes: {},
        uniforms: {},
    }; // attribute to real data mapping, uniform to real data mapping

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

    // compile the Material, make it usable in rendering. Requiring a WebGL rendering context, hence the Renderer object here
    // attributePlaceholders is a mapping, from attribute names used in JS (like vertexPositions, for JS naming conventions) to attribute names actually used in shader source (like aVertexPositions, for GLSL naming conventions). You can make them the same.
    compile(renderer: Renderer, attributePlaceholders?: Object, uniformPlaceholders?: Object) {
        let self = this;
        let gl = renderer.gl;
        if (this.vertexShaderSource && this.fragmentShaderSource) {
            let shaderProgram = getShaderProgram(gl, this.vertexShaderSource, this.fragmentShaderSource);
            this.programInfo = getProgramInfo(gl, shaderProgram, attributePlaceholders, uniformPlaceholders);
        } else {
            throw new Error("No vertex shader source or fragment shader source.");
        }

        // create a buffer for each attribute
        Object.entries(this.programInfo.attributeLocations).forEach(function (item) {
            let k = item[0];
            let v = item[1];
            self.buffers.attributes[k] = gl.createBuffer();
        })

        // create a buffer for each uniform
        Object.entries(this.programInfo.uniformLocations).forEach(function (item) {
            let k = item[0];
            let v = item[1];
            self.buffers.uniforms[k] = gl.createBuffer();
        })
    }

    // transfer real data to each attribute and uniform
    // Material will remember the data bound to it last time it is being used when rendering. But calling this method will override the previous data. Be sure to provide every data available. Do not provide partial data.
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
            gl.uniform4fv(self.programInfo.uniformLocations[k], v);
        });
    }

    // abstract method for sub-classes to implement
    // 2 advantages to have this method:
    // - essentially free writers from having to call Material.compile() and Material.bindPlaceholders() every time, for every Sprite. 
    // - enable Material re-use (and literally shader program re-use). Multiple Sprite objects can have the same Material.
    // This method will be called automatically, by Renderer, on every non-light Sprite when rendering, to align geometry information with material information
    bindGeometry(geometry: Geometry) { }
}

// One color everywhere
export class ColorMaterial extends Material {
    color: Array<number>;

    constructor(color: Array<number>) {
        super(`
            attribute vec4 aVertexPosition;

            uniform mat4 uModelMatrix;
            uniform mat4 uViewMatrix;
            uniform mat4 uProjectionMatrix;

            void main() {
                gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * aVertexPosition;
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
            uModelMatrix: "uModelMatrix",
            uViewMatrix: "uViewMatrix",
            uProjectionMatrix: "uProjectionMatrix",
        });
    }

    bindGeometry(geometry: Geometry) {
        this.placeholderValueMapping.attributes["aVertexPosition"] = new Float32Array(geometry.vertexPositions);
    }
}

// ReflectiveMaterial interface
// Every reflective material should at least have Ka, Kd, Ks, Ke, Se defined, for each RGBA channel
export interface ReflectiveMaterial {
    ka: Array<Number>; // ambient reflectance
    kd: Array<Number>; // diffuse reflectance
    ks: Array<Number>; // specular reflectance
    ke: Array<Number>; // emissive term
    se: Array<Number>; // shininess, specular exponent
}

export class ReflectiveMaterial extends Material {
    constructor(vertexShaderSource: string, fragmentShaderSource: string) {
        super(vertexShaderSource, fragmentShaderSource);
    }

    compile(renderer: Renderer, attributePlaceholders?: Object, uniformPlaceholders?: Object) {
        super.compile(renderer, {
            aVertexPosition: "aVertexPosition",
            aVertexNormal: "aVertexNormal",
        }, {
            uModelMatrix: "uModelMatrix",
            uModelMatrixInvertedTransposed: "uModelMatrixInvertedTransposed",
            uViewMatrix: "uViewMatrix",
            uViewMatrixInverted: "uViewMatrixInverted",
            uProjectionMatrix: "uProjectionMatrix",
            uLightAbsolutePositions: "uLightAbsolutePositions",
            uLightIas: "uLightIas",
            uLightIds: "uLightIds",
            uLightIss: "uLightIss",
            uMaterialKa: "uMaterialKa",
            uMaterialKd: "uMaterialKd",
            uMaterialKs: "uMaterialKs",
            uMaterialKe: "uMaterialKe",
            uMaterialSe: "uMaterialSe",
        });
    }

    bindGeometry(geometry: Geometry) {
        this.placeholderValueMapping.attributes["aVertexPosition"] = new Float32Array(geometry.vertexPositions);
        this.placeholderValueMapping.attributes["aVertexNormal"] = new Float32Array(geometry.normalVectors.flat());

        this.placeholderValueMapping.uniforms["uMaterialKa"] = new Float32Array(this.ka);
        this.placeholderValueMapping.uniforms["uMaterialKd"] = new Float32Array(this.kd);
        this.placeholderValueMapping.uniforms["uMaterialKs"] = new Float32Array(this.ks);
        this.placeholderValueMapping.uniforms["uMaterialKe"] = new Float32Array(this.ke);
        this.placeholderValueMapping.uniforms["uMaterialSe"] = new Float32Array(this.se);
    }
}

export class GouraudShadingMaterial extends ReflectiveMaterial implements ReflectiveMaterial {
    ka: Array<Number>; // ambient reflectance
    kd: Array<Number>; // diffuse reflectance
    ks: Array<Number>; // specular reflectance
    ke: Array<Number>; // emissive term
    se: Array<Number>; // shininess, specular exponent

    constructor(ka: Array<Number>, kd: Array<Number>, ks: Array<Number>, ke: Array<Number>, se: Array<Number>, lighting: string = "phong") {
        let specularTemplate: string;
        if (lighting.toLowerCase() === "phong") {
            specularTemplate = `
                float specularColorR = lightIs.x * uMaterialKs.x * pow(max(0.0, dot(reflectedLightVector, viewVector)), uMaterialSe.x);
                float specularColorG = lightIs.y * uMaterialKs.y * pow(max(0.0, dot(reflectedLightVector, viewVector)), uMaterialSe.y);
                float specularColorB = lightIs.z * uMaterialKs.z * pow(max(0.0, dot(reflectedLightVector, viewVector)), uMaterialSe.z);
                float specularColorA = lightIs.w * uMaterialKs.w * pow(max(0.0, dot(reflectedLightVector, viewVector)), uMaterialSe.w);
            `
        } else if (lighting.toLowerCase() === "blinn-phong") {
            specularTemplate = `
                vec4 halfVector = normalize(lightVector + normalVector);

                float specularColorR = lightIs.x * uMaterialKs.x * pow(max(0.0, dot(halfVector, normalVector)), uMaterialSe.x);
                float specularColorG = lightIs.y * uMaterialKs.y * pow(max(0.0, dot(halfVector, normalVector)), uMaterialSe.y);
                float specularColorB = lightIs.z * uMaterialKs.z * pow(max(0.0, dot(halfVector, normalVector)), uMaterialSe.z);
                float specularColorA = lightIs.w * uMaterialKs.w * pow(max(0.0, dot(halfVector, normalVector)), uMaterialSe.w);
            `
        } else {
            throw new Error("Lighting method not supported. Should be 'Phong' or 'Blinn-Phong'.");
        }
        super(`
            attribute vec4 aVertexPosition;
            attribute vec4 aVertexNormal;

            uniform mat4 uModelMatrix;
            uniform mat4 uModelMatrixInvertedTransposed;
            uniform mat4 uViewMatrix;
            uniform mat4 uViewMatrixInverted;
            uniform mat4 uProjectionMatrix;

            uniform vec4 uLightAbsolutePositions[32];
            uniform vec4 uLightIas[32];
            uniform vec4 uLightIds[32];
            uniform vec4 uLightIss[32];

            uniform vec4 uMaterialKa;
            uniform vec4 uMaterialKd;
            uniform vec4 uMaterialKs;
            uniform vec4 uMaterialKe;
            uniform vec4 uMaterialSe;

            varying vec4 vVertexColor;

            void main() {
                vec4 absoluteVertexPosition = uModelMatrix * aVertexPosition;
                vec4 absoluteCameraPosition = vec4(uViewMatrixInverted[3].xyz, 1.0);

                vVertexColor = vec4(0.0, 0.0, 0.0, 0.0);

                for (int i = 0; i < 32; i++) {
                    vec4 lightAbsolutePosition = uLightAbsolutePositions[i];
                    vec4 lightIa = uLightIas[i];
                    vec4 lightId = uLightIds[i];
                    vec4 lightIs = uLightIss[i];

                    vec4 lightVector = vec4(normalize(lightAbsolutePosition.xyz - absoluteVertexPosition.xyz), 0.0);
                    vec4 normalVector = vec4(normalize((uModelMatrixInvertedTransposed * aVertexNormal).xyz), 0.0);
                    vec4 viewVector = vec4(normalize(absoluteCameraPosition.xyz - absoluteVertexPosition.xyz), 0.0);
                    vec4 reflectedLightVector = reflect(-lightVector, normalVector);
        
                    vec4 ambientColor = lightIa * uMaterialKa;
                    vec4 diffuseColor = lightId * uMaterialKd * max(0.0, dot(normalVector, lightVector));
        ` + specularTemplate + `
                    vec4 specularColor = vec4(specularColorR, specularColorG, specularColorB, specularColorA);
        
                    vec4 emissiveColor = uMaterialKe;

                    vVertexColor += ambientColor + (diffuseColor + specularColor) / length(vec3(lightAbsolutePosition.xyz - absoluteVertexPosition.xyz)) + emissiveColor;
                }

                gl_Position = uProjectionMatrix * uViewMatrix * absoluteVertexPosition;
            }
        `, `
            precision mediump float;

            varying vec4 vVertexColor;

            void main() {
                gl_FragColor = vVertexColor;
            }
        `);
        // extract camera position from view matrix <https://community.khronos.org/t/extracting-camera-position-from-a-modelview-matrix/68031>
        // camera position is the 4-th column of inverted view matrix
        // This is incorrect! <https://stackoverflow.com/questions/46637247/is-4th-row-in-model-view-projection-the-viewing-position>

        this.ka = ka;
        this.kd = kd;
        this.ks = ks;
        this.ke = ke;
        this.se = se;
    }
}

export class GouraudShadingPhongLightingMaterial extends GouraudShadingMaterial {
    constructor(ka: Array<Number>, kd: Array<Number>, ks: Array<Number>, ke: Array<Number>, se: Array<Number>) {
        super(ka, kd, ks, ke, se, "phong");
    }
}

export class GouraudShadingBlinnPhongLightingMaterial extends GouraudShadingMaterial {
    constructor(ka: Array<Number>, kd: Array<Number>, ks: Array<Number>, ke: Array<Number>, se: Array<Number>) {
        super(ka, kd, ks, ke, se, "blinn-phong");
    }
}

export class PhongShadingMaterial extends ReflectiveMaterial {
    ka: Array<Number>; // ambient reflectance
    kd: Array<Number>; // diffuse reflectance
    ks: Array<Number>; // specular reflectance
    ke: Array<Number>; // emissive term
    se: Array<Number>; // shininess, specular exponent

    constructor(ka: Array<Number>, kd: Array<Number>, ks: Array<Number>, ke: Array<Number>, se: Array<Number>, lighting: string = "phong") {
        let specularTemplate: string;
        if (lighting.toLowerCase() === "phong") {
            specularTemplate = `
                float specularColorR = lightIs.x * uMaterialKs.x * pow(max(0.0, dot(reflectedLightVector, viewVector)), uMaterialSe.x);
                float specularColorG = lightIs.y * uMaterialKs.y * pow(max(0.0, dot(reflectedLightVector, viewVector)), uMaterialSe.y);
                float specularColorB = lightIs.z * uMaterialKs.z * pow(max(0.0, dot(reflectedLightVector, viewVector)), uMaterialSe.z);
                float specularColorA = lightIs.w * uMaterialKs.w * pow(max(0.0, dot(reflectedLightVector, viewVector)), uMaterialSe.w);
            `
        } else if (lighting.toLowerCase() === "blinn-phong") {
            specularTemplate = `
                vec4 halfVector = normalize(lightVector + normalVector);

                float specularColorR = lightIs.x * uMaterialKs.x * pow(max(0.0, dot(halfVector, normalVector)), uMaterialSe.x);
                float specularColorG = lightIs.y * uMaterialKs.y * pow(max(0.0, dot(halfVector, normalVector)), uMaterialSe.y);
                float specularColorB = lightIs.z * uMaterialKs.z * pow(max(0.0, dot(halfVector, normalVector)), uMaterialSe.z);
                float specularColorA = lightIs.w * uMaterialKs.w * pow(max(0.0, dot(halfVector, normalVector)), uMaterialSe.w);
            `
        } else {
            throw new Error("Lighting method not supported. Should be 'Phong' or 'Blinn-Phong'.");
        }
        super(`
            attribute vec4 aVertexPosition;
            attribute vec4 aVertexNormal;

            uniform mat4 uModelMatrix;
            uniform mat4 uModelMatrixInvertedTransposed;
            uniform mat4 uViewMatrix;
            uniform mat4 uViewMatrixInverted;
            uniform mat4 uProjectionMatrix;

            uniform vec4 uLightAbsolutePositions[6];

            varying vec4 vLightVector[6];
            varying vec4 vNormalVector[6];
            varying vec4 vViewVector[6];

            varying float vDistance[6];

            void main() {
                vec4 absoluteVertexPosition = uModelMatrix * aVertexPosition;
                vec4 absoluteCameraPosition = vec4(uViewMatrixInverted[3].xyz, 1.0);

                for (int i = 0; i < 6; i++) {
                    vec4 lightAbsolutePosition = uLightAbsolutePositions[i];

                    vec4 lightVector = vec4(normalize(lightAbsolutePosition.xyz - absoluteVertexPosition.xyz), 0.0);
                    vec4 normalVector = vec4(normalize((uModelMatrixInvertedTransposed * aVertexNormal).xyz), 0.0);
                    vec4 viewVector = vec4(normalize(absoluteCameraPosition.xyz - absoluteVertexPosition.xyz), 0.0);

                    vLightVector[i] = lightVector;
                    vNormalVector[i] = normalVector;
                    vViewVector[i] = viewVector;

                    vDistance[i] = length(lightAbsolutePosition.xyz - absoluteVertexPosition.xyz);
                }

                gl_Position = uProjectionMatrix * uViewMatrix * absoluteVertexPosition;
            }
        `, `
            precision mediump float;

            uniform vec4 uLightIas[6];
            uniform vec4 uLightIds[6];
            uniform vec4 uLightIss[6];

            uniform vec4 uMaterialKa;
            uniform vec4 uMaterialKd;
            uniform vec4 uMaterialKs;
            uniform vec4 uMaterialKe;
            uniform vec4 uMaterialSe;

            varying vec4 vLightVector[6];
            varying vec4 vNormalVector[6];
            varying vec4 vViewVector[6];

            varying float vDistance[6];

            void main() {
                vec4 fragmentColor;
                fragmentColor = vec4(0.0, 0.0, 0.0, 0.0);

                for (int i = 0; i < 6; i++) {
                    vec4 lightIa = uLightIas[i];
                    vec4 lightId = uLightIds[i];
                    vec4 lightIs = uLightIss[i];

                    vec4 lightVector = normalize(vLightVector[i]);
                    vec4 normalVector = normalize(vNormalVector[i]);
                    vec4 viewVector = normalize(vViewVector[i]);
                    vec4 reflectedLightVector = reflect(-lightVector, normalVector);

                    vec4 ambientColor = lightIa * uMaterialKa;
                    vec4 diffuseColor = lightId * uMaterialKd * max(0.0, dot(normalVector, lightVector));
        ` + specularTemplate + `
                    vec4 specularColor = vec4(specularColorR, specularColorG, specularColorB, specularColorA);
        
                    vec4 emissiveColor = uMaterialKe;

                    fragmentColor += ambientColor + (diffuseColor + specularColor) / vDistance[i] + emissiveColor;
                }

                gl_FragColor = fragmentColor;
            }
        `);

        this.ka = ka;
        this.kd = kd;
        this.ks = ks;
        this.ke = ke;
        this.se = se;
    }
}

export class PhongShadingBlinnPhongLightingMaterial extends PhongShadingMaterial {
    constructor(ka: Array<Number>, kd: Array<Number>, ks: Array<Number>, ke: Array<Number>, se: Array<Number>) {
        super(ka, kd, ks, ke, se, "blinn-phong");
    }
}

export class PhongShadingPhongLightingMaterial extends PhongShadingMaterial {
    constructor(ka: Array<Number>, kd: Array<Number>, ks: Array<Number>, ke: Array<Number>, se: Array<Number>) {
        super(ka, kd, ks, ke, se, "phong");
    }
}

// Dynamically choose between different materials
// Every time it is being asked for some property, it will call nameCallback() to get a string, and use that string as a key to find the right Material from nameMaterialMapping
// This is how multiple shading, lighting method switching is implemented in Steve
export class MaterialMultiplexer extends Material {
    nameMaterialMapping: Map<any, Material>;
    nameCallback: () => string;

    constructor(nameMaterialMapping: Map<any, Material>, nameCallback: () => string) {
        super(null, null);
        this.nameMaterialMapping = nameMaterialMapping;
        this.nameCallback = nameCallback;
    }

    compile(renderer: Renderer, attributeLocations?: Object, uniformLocations?: Object) {
        return this.nameMaterialMapping[this.nameCallback()].compile(renderer, attributeLocations, uniformLocations);
    }

    bindGeometry(geometry: Geometry) {
        return this.nameMaterialMapping[this.nameCallback()].bindGeometry(geometry);
    }

    bindPlaceholders(renderer: Renderer, attributePlaceholderValueMapping?: Object, uniformPlaceholderValueMapping?: Object) {
        return this.nameMaterialMapping[this.nameCallback()].bindPlaceholders(renderer, attributePlaceholderValueMapping, uniformPlaceholderValueMapping);
    }

    get programInfo() {
        return this.nameMaterialMapping[this.nameCallback()].programInfo;
    }

    get buffers() {
        return this.nameMaterialMapping[this.nameCallback()].buffers;
    }

    get placeholderValueMapping() {
        return this.nameMaterialMapping[this.nameCallback()].placeholderValueMapping;
    }
}

export interface Camera {
    viewMatrix: mat4;
    projectionMatrix: mat4;
}

export class Camera implements Camera {
    viewMatrix: mat4;
    projectionMatrix: mat4;

    constructor(viewMatrix: mat4, projectionMatrix: mat4) {
        this.viewMatrix = viewMatrix;
        this.projectionMatrix = projectionMatrix;
    }
}

export class PerspectiveCamera implements Camera {
    position: Array<number>;
    lookAt: Array<number>;
    upVector: Array<number>;
    fieldOfView: number;
    aspectRatio: number;
    zNear: number;
    zFar: number;

    constructor(position: Array<number>, lookAt: Array<number>, upVector: Array<number>, fieldOfView: number, aspectRatio: number, zNear: number, zFar: number) {
        // super(mat4.create(), mat4.create());
        this.position = position;
        this.lookAt = lookAt;
        this.upVector = upVector;
        this.fieldOfView = fieldOfView;
        this.aspectRatio = aspectRatio;
        this.zNear = zNear;
        this.zFar = zFar;
    }

    get viewMatrix() {
        let viewMatrix = mat4.create();
        mat4.lookAt(viewMatrix, this.position, this.lookAt, this.upVector);
        return viewMatrix;
    }

    get projectionMatrix() {
        let projectionMatrix = mat4.create();
        mat4.perspective(projectionMatrix, this.fieldOfView, this.aspectRatio, this.zNear, this.zFar);
        return projectionMatrix;
    }

    // get camera position from look-at vector and spherical parameters
    // theta is radians on xy plane, from +x axis
    // phi is radians from +z axis
    static getPositionFromSphere(lookAt: Array<number>, theta: number, phi: number, radius: number) {
        let position = [0, 0, 0];
        position[0] = lookAt[0] + radius * Math.sin(phi) * Math.cos(theta);
        position[1] = lookAt[1] + radius * Math.sin(phi) * Math.sin(theta);
        position[2] = lookAt[2] + radius * Math.cos(phi);
        return position;
    }

    static getLookAtFromSphere(position: Array<number>, theta: number, phi: number, radius: number) {
        let lookAt = [0, 0, 0];
        lookAt[0] = position[0] - radius * Math.sin(phi) * Math.cos(theta);
        lookAt[1] = position[1] - radius * Math.sin(phi) * Math.sin(theta);
        lookAt[2] = position[2] - radius * Math.cos(phi);
        return lookAt;
    }
}

export class OrthogonalCamera implements Camera {
    position: Array<number>;
    lookAt: Array<number>;
    upVector: Array<number>;
    left: number;
    right: number;
    bottom: number;
    top: number;
    near: number;
    far: number;

    constructor(position: Array<number>, lookAt: Array<number>, upVector: Array<number>, left: number, right: number, bottom: number, top: number, near: number, far: number) {
        this.position = position;
        this.lookAt = lookAt;
        this.upVector = upVector;
        this.left = left;
        this.right = right;
        this.bottom = bottom;
        this.top = top;
        this.near = near;
        this.far = far;
    }

    get viewMatrix() {
        let viewMatrix = mat4.create();
        mat4.lookAt(viewMatrix, this.position, this.lookAt, this.upVector);
        return viewMatrix;
    }

    get projectionMatrix() {
        let projectionMatrix = mat4.create();
        mat4.ortho(projectionMatrix, this.left, this.right, this.bottom, this.top, this.near, this.far);
        return projectionMatrix;
    }
}

// Renderer class
// This is essentially a wrapper around WebGL rendering context, providing viewport control, canvas binding and rendering.
export class Renderer {
    canvas: HTMLCanvasElement;
    gl: WebGL2RenderingContext;
    viewport: {
        x: number,
        y: number,
        width: number,
        height: number,
    }

    private lightPositionMapping: Map<Light, Array<number>>; // record all Lights in the scene

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

        this.viewport = {
            x: 0,
            y: 0,
            width: canvas.width,
            height: canvas.height,
        }; // viewport is the whole canvas by default

        this.lightPositionMapping = new Map();
    }

    // clear canvas with a color
    clear(color = [0, 0, 0, 1]) {
        let gl = this.gl;
        gl.clearColor(color[0], color[1], color[2], color[3]);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    }

    // render the whole scene to canvas from the Camera's view
    render(world: Sprite, camera: Camera) {
        this.gl.viewport(this.viewport.x, this.viewport.y, this.viewport.width, this.viewport.height); // set viewport

        // In shader program, we need to know the absolute position of every light.
        // so update light list here
        this.lightPositionMapping.clear();
        this.updateLightPositionMapping(world, mat4.create());

        // do the real rendering
        this.renderWithMatrices(world, mat4.create(), camera.viewMatrix, camera.projectionMatrix);
    }

    // recursively find all Lights in the scene, while updating their absolute positions, because lighting shaders will use them
    private updateLightPositionMapping(sprite: Sprite, modelMatrix: mat4) {
        let self = this;
        let realMatrix = mat4.create();
        mat4.multiply(realMatrix, modelMatrix, sprite.modelMatrix);

        if (sprite instanceof Light) {
            let lightAbsolutePosition = vec3.create();
            mat4.getTranslation(lightAbsolutePosition, realMatrix);
            this.lightPositionMapping.set(sprite, [
                lightAbsolutePosition[0],
                lightAbsolutePosition[1],
                lightAbsolutePosition[2],
                1,
            ]);
        }

        sprite.children.forEach(function (child) {
            self.updateLightPositionMapping(child, realMatrix);
        })
    }

    // recursively draw all non-light Sprite objects onto the canvas
    renderWithMatrices(sprite: Sprite, modelMatrix: mat4, viewMatrix: mat4, projectionMatrix: mat4) {
        let self = this;
        let gl = this.gl;
        let realMatrix = mat4.create();
        mat4.multiply(realMatrix, modelMatrix, sprite.modelMatrix);

        if (sprite.material) {
            if (sprite.material.programInfo === undefined) { // if material has not been compiled
                sprite.material.compile(this);
            }
            gl.useProgram(sprite.material.programInfo.program);
            // sprite.material.placeholderValueMapping.attributes.aVertexPosition = new Float32Array(sprite.geometry.vertexPositions);
            // sprite.material.placeholderValueMapping.attributes.aVertexNormal = new Float32Array(sprite.geometry.normalVectors.flat());
            sprite.material.bindGeometry(sprite.geometry); // automatically bind geometry
            sprite.material.bindPlaceholders(self, sprite.material.placeholderValueMapping.attributes, sprite.material.placeholderValueMapping.uniforms); // transfer real data
            gl.uniformMatrix4fv(
                sprite.material.programInfo.uniformLocations["uModelMatrix"],
                false,
                realMatrix,
            );
            let modelMatrixInvertedTransposed = mat4.create();
            mat4.invert(modelMatrixInvertedTransposed, realMatrix);
            mat4.transpose(modelMatrixInvertedTransposed, modelMatrixInvertedTransposed);
            gl.uniformMatrix4fv(
                sprite.material.programInfo.uniformLocations["uModelMatrixInvertedTransposed"],
                false,
                modelMatrixInvertedTransposed,
            );
            gl.uniformMatrix4fv(
                sprite.material.programInfo.uniformLocations["uViewMatrix"],
                false,
                viewMatrix,
            );
            let viewMatrixInverted = mat4.create();
            mat4.invert(viewMatrixInverted, viewMatrix);
            gl.uniformMatrix4fv(
                sprite.material.programInfo.uniformLocations["uViewMatrixInverted"],
                false,
                viewMatrixInverted,
            );
            gl.uniformMatrix4fv(
                sprite.material.programInfo.uniformLocations["uProjectionMatrix"],
                false,
                projectionMatrix,
            );

            // uLightAbsolutePositions: "uLightAbsolutePositions",
            // uLightIas: "uLightIas",
            // uLightIds: "uLightIds",
            // uLightIss: "uLightIss",

            let lightAbsolutePositions: Array<Array<number>> = [];
            let lightIas: Array<Array<number>> = [];
            let lightIds: Array<Array<number>> = [];
            let lightIss: Array<Array<number>> = [];

            this.lightPositionMapping.forEach(function (v, k) {
                lightAbsolutePositions.push(v);
                lightIas.push(k.ia);
                lightIds.push(k.id);
                lightIss.push(k.is);
            })

            gl.uniform4fv(
                sprite.material.programInfo.uniformLocations["uLightAbsolutePositions"],
                new Float32Array(lightAbsolutePositions.flat()),
            );

            gl.uniform4fv(
                sprite.material.programInfo.uniformLocations["uLightIas"],
                new Float32Array(lightIas.flat()),
            );

            gl.uniform4fv(
                sprite.material.programInfo.uniformLocations["uLightIds"],
                new Float32Array(lightIds.flat()),
            );

            gl.uniform4fv(
                sprite.material.programInfo.uniformLocations["uLightIss"],
                new Float32Array(lightIss.flat()),
            );
        }

        if (sprite.geometry) { // if Sprite has real geometry (not an abstract container)
            gl.drawArrays(sprite.geometry.mode, 0, sprite.geometry.vertexPositions.length / 4); // draw the Sprite according to its geometry's drawing mode
        }

        // recursively draw all children
        sprite.children.forEach(function (child) {
            self.renderWithMatrices(child, realMatrix, viewMatrix, projectionMatrix);
        })
    }
}

export interface CurveFunction {
    (percent: number): number;
}

// Simple timestamp-determined animation.
// Define keyframes like in CSS, call start() to start animations (actually nothing happens here), and call yield() at some time in your requestAnimationFrame(), then it will calculate in-between frames absolute to the timestamp when it is being called.
// This helps create smooth animations independent of frame rate, which is determined by your PC's hardware.
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

    // All magic happens here
    // This method will calculate the interpolated value for each parameter in keyframe definition, for the timestamp it is being called
    yield() {
        if (this.playing) {
            let currentTime = Date.now() / 1000;
            if (currentTime - this.startTime < this.delay) {
                return this.keyframes[0];
            } else {
                let currentFrame = deepCopy(this.keyframes[0]);
                if (currentTime < this.startTime + this.delay + this.count * this.duration) {
                    let timePercentage = (currentTime - this.startTime - this.delay) % this.duration / this.duration;
                    let index: number;

                    // find between which 2 keyframes current frame should be
                    for (index = 1; index < this.keyframePercents.length; index++) {
                        if (timePercentage < Number(this.keyframePercents[index])) {
                            index = index - 1;
                            break;
                        }
                    }

                    // find how much percentage current frame is between the neighboring two keyframes, and then call curve function to get curved interpolated value
                    let x = (timePercentage - this.keyframePercents[index]) / (this.keyframePercents[Number(index) + 1] - this.keyframePercents[index]);
                    let y = this.curve(x);

                    for (let [k, v] of Object.entries(this.keyframes[0])) {
                        let a = this.keyframes[this.keyframePercents[index]][k];
                        let b = this.keyframes[this.keyframePercents[Number(index) + 1]][k];
                        currentFrame[k] = (b - a) * y + a;
                    }
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

// Linear curve function.　Just give x and it returns x
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
        throw new Error("Link error: " + gl.getProgramInfoLog(shaderProgram));
        // displaying link error log is helpful. I used this to find that no more than 8 varying arrays are allowed on my computer
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