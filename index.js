import { mat4 } from "gl-matrix";
import { Renderer, TriangleGeometry, Material, Sprite, TetrahedronGeometry, Geometry, LineGeometry, ColorMaterial, CubeGeometry, TorusGeometry, SphereGeometry, PerspectiveCamera, radians, Animation, linear, Frustum } from "./engine";

function main() {
    let canvas = document.querySelector("canvas");

    let vertexShaderSource = `
        attribute vec4 aVertexPosition;
        attribute vec4 aVertexColor;

        uniform mat4 uModelViewProjectionMatrix;

        varying vec4 vVertexColor;

        void main() {
            gl_Position = uModelViewProjectionMatrix * aVertexPosition;
            vVertexColor = aVertexColor;
        }
    `;
    let fragmentShaderSource = `
        precision mediump float;

        varying vec4 vVertexColor;

        void main() {
            gl_FragColor = vVertexColor;
        }
    `;

    let renderer = new Renderer(canvas);
    let world = new Sprite(null, null);
    let camera = new PerspectiveCamera([5, 5, 3], [-1, -2, -0.5], [0, 0, 1], radians(42), 1, 1, 1000);

    let torus = new Sprite(new TorusGeometry(0.25, 0.125, 16, 16), new Material(vertexShaderSource, fragmentShaderSource));
    torus.material.compile(renderer, {
        aVertexPosition: "aVertexPosition",
        aVertexColor: "aVertexColor",
    }, {
        uModelViewProjectionMatrix: "uModelViewProjectionMatrix"
    });
    torus.material.bindPlaceholders(renderer, {
        aVertexPosition: new Float32Array(torus.geometry.vertexPositions),
        aVertexColor: new Float32Array(torus.geometry.nodePositions.map(function (v) {
            return [Math.random(), Math.random(), Math.random(), 1];
        }).flat())
    }, {});
    // torus.geometry.mode = WebGL2RenderingContext.LINE_STRIP;

    let torusContainer = new Sprite(null, null);
    torusContainer.add(torus);

    let sphere = new Sprite(new SphereGeometry(0.25, 32, 16), new Material(vertexShaderSource, fragmentShaderSource));
    sphere.material.compile(renderer, {
        aVertexPosition: "aVertexPosition",
        aVertexColor: "aVertexColor",
    }, {
        uModelViewProjectionMatrix: "uModelViewProjectionMatrix",
    });
    sphere.material.bindPlaceholders(renderer, {
        aVertexPosition: new Float32Array(sphere.geometry.vertexPositions),
        aVertexColor: new Float32Array(sphere.geometry.nodePositions.map(function (v) {
            return [Math.random(), Math.random(), Math.random(), 1];
        }).flat())
    }, {});
    // sphere.geometry.mode = WebGL2RenderingContext.LINE_STRIP;

    let sphereContainer = new Sprite(null, null);
    sphereContainer.add(sphere);

    let frustum = new Sprite(new Frustum(0.25, 0.1675, 0.25, 32), new Material(vertexShaderSource, fragmentShaderSource));
    frustum.material.compile(renderer, {
        aVertexPosition: "aVertexPosition",
        aVertexColor: "aVertexColor",
    }, {
        uModelViewProjectionMatrix: "uModelViewProjectionMatrix",
    });
    frustum.material.bindPlaceholders(renderer, {
        aVertexPosition: new Float32Array(frustum.geometry.vertexPositions),
        aVertexColor: new Float32Array(frustum.geometry.nodePositions.map(function (v) {
            if (v[1] < 0) {
                return [0.5, 0.5, 1, 1];
            } else {
                if (v[0] == 0 && v[2] == 0) {
                    return [0, 0, 0, 1];
                } else {
                    return [0.4, 0.7, 0.4, 1];
                }
            }
        }).flat())
    }, {});

    let frustumContainer = new Sprite(null, null);
    frustumContainer.add(frustum);

    mat4.translate(torusContainer.modelMatrix, torusContainer.modelMatrix, [-0.5, 0.5, 0]);
    mat4.translate(sphereContainer.modelMatrix, sphereContainer.modelMatrix, [0.5, 0.5, 0]);
    mat4.translate(frustumContainer.modelMatrix, frustumContainer.modelMatrix, [-0.5, -0.5, 0]);
    world.add(torusContainer);
    world.add(sphereContainer);
    world.add(frustumContainer);

    let xAxis = new Sprite(new LineGeometry([0, 0, 0], [1, 0, 0]), new ColorMaterial([1, 0, 0, 1]));
    let yAxis = new Sprite(new LineGeometry([0, 0, 0], [0, 1, 0]), new ColorMaterial([0, 1, 0, 1]));
    let zAxis = new Sprite(new LineGeometry([0, 0, 0], [0, 0, 1]), new ColorMaterial([0, 0, 1, 1]));
    [xAxis, yAxis, zAxis].forEach(function (axis) {
        axis.material.compile(renderer);
    });

    world.add(xAxis);
    world.add(yAxis);
    world.add(zAxis);

    let horizontalLines = []
    let verticalLines = []

    let horizontalLineMaterial = new ColorMaterial([1, 1, 0.3, 1])
    horizontalLineMaterial.compile(renderer);
    let verticalLineMaterial = new ColorMaterial([0.5, 1, 0.5, 1]);
    verticalLineMaterial.compile(renderer);

    for (let i = 0; i < 501; i++) {
        let line = new Sprite(new LineGeometry([-50, 100 / 501 * i - 50, 0], [50, 100 / 501 * i - 50, 0]), horizontalLineMaterial);
        horizontalLines.push(line);
    }

    for (let i = 0; i < 501; i++) {
        let line = new Sprite(new LineGeometry([100 / 501 * i - 50, -50, 0], [100 / 501 * i - 50, 50, 0]), verticalLineMaterial);
        verticalLines.push(line);
    }

    horizontalLines.map(v => world.add(v));
    verticalLines.map(v => world.add(v));

    let rotation = new Animation({
        0: {
            "rotationX": 0,
            "rotationY": 0,
            "rotationZ": 0,
        },
        1: {
            "rotationX": 360,
            "rotationY": 360,
            "rotationZ": 360
        }
    }, 5, linear, 0, Infinity);
    rotation.start();

    let running = true;

    function onDraw() {
        let frame = rotation.yield();

        mat4.identity(torus.modelMatrix);
        mat4.rotateX(torus.modelMatrix, torus.modelMatrix, radians(frame.rotationX));
        mat4.rotateY(torus.modelMatrix, torus.modelMatrix, radians(frame.rotationY));

        mat4.identity(sphere.modelMatrix);
        mat4.rotateY(sphere.modelMatrix, sphere.modelMatrix, radians(frame.rotationX));
        mat4.rotateZ(sphere.modelMatrix, sphere.modelMatrix, radians(frame.rotationZ));

        mat4.identity(frustum.modelMatrix);
        mat4.rotateX(frustum.modelMatrix, frustum.modelMatrix, radians(frame.rotationX));

        renderer.clear();
        renderer.render(world, camera);

        if (running) {
            requestAnimationFrame(onDraw);
        }
    }

    document.querySelector("#speed-up").addEventListener("click", e => {
        rotation.duration *= 0.9;
    });

    document.querySelector("#speed-down").addEventListener("click", e => {
        rotation.duration /= 0.9;
    });

    document.querySelector("#run-stop").addEventListener("click", e => {
        if (running) {
            running = false;
        } else {
            running = true;
            onDraw();
        }
    });

    onDraw();
}

window.onload = main;