import { mat4 } from "gl-matrix";
import * as engine from "./engine.ts";
import { Renderer, TriangleGeometry, Material, Sprite, TetrahedronGeometry, Geometry } from "./engine";

function main() {
    let canvas = document.querySelector("canvas");
    let gl = canvas.getContext("webgl2");

    if (gl == null) {
        alert("can't get webgl context.");
        return;
    }

    let vertexShaderSource = `
        attribute vec4 aVertexPosition;
        attribute vec4 aVertexColor;

        uniform mat4 uModelViewMatrix;

        varying vec4 vVertexColor;

        void main() {
            gl_Position = uModelViewMatrix * aVertexPosition;
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
    let triangle1 = new Sprite(new TriangleGeometry(0.5, 0.5), new Material(vertexShaderSource, fragmentShaderSource));
    triangle1.material.compile(renderer, {
        aVertexPosition: "aVertexPosition",
        aVertexColor: "aVertexColor"
    }, {
        uModelViewMatrix: "uModelViewMatrix"
    });
    triangle1.material.bindPlaceholders(renderer, {
        aVertexPosition: new Float32Array(triangle1.geometry.vertexPositions),
        aVertexColor: new Float32Array([
            1, 0, 0, 1,
            0, 0, 1, 1,
            0, 1, 0, 1,
        ])
    }, {});

    let triangle2 = new Sprite(new TriangleGeometry(0.5, 0.5), new Material(vertexShaderSource, fragmentShaderSource))
    triangle2.material.compile(renderer, {
        aVertexPosition: "aVertexPosition",
        aVertexColor: "aVertexColor"
    }, {
        uModelViewMatrix: "uModelViewMatrix"
    });
    triangle2.material.bindPlaceholders(renderer, {
        aVertexPosition: new Float32Array(triangle2.geometry.vertexPositions),
        aVertexColor: new Float32Array([
            1, 0, 0, 1,
            0, 0, 1, 1,
            0, 1, 0, 1,
        ])
    }, {});

    let tetrahedron = new Sprite(new TetrahedronGeometry(0.5, 0.5, 0.5), new Material(vertexShaderSource, fragmentShaderSource));
    tetrahedron.material.compile(renderer, {
        aVertexPosition: "aVertexPosition",
        aVertexColor: "aVertexColor",
    }, {
        uModelViewMatrix: "uModelViewMatrix"
    });
    tetrahedron.material.bindPlaceholders(renderer, {
        aVertexPosition: new Float32Array(tetrahedron.geometry.vertexPositions),
        aVertexColor: new Float32Array([
            1, 0, 0, 1,
            0, 0, 1, 1,
            0, 1, 0, 1,
            1, 1, 0, 1,
            1, 0, 0, 1,
            0, 0, 1, 1,
        ])
    }, {});

    world.add(triangle1);
    world.add(triangle2);
    world.add(tetrahedron);

    renderer.render(world);

    mat4.rotateX(world.modelViewMatrix, world.modelViewMatrix, -45);
    mat4.translate(triangle1.modelViewMatrix, triangle2.modelViewMatrix, [0.5, 0.5, 0]);

    function onDraw() {
        mat4.rotateZ(world.modelViewMatrix, world.modelViewMatrix, 0.1);
        renderer.clear();
        renderer.render(world);
        requestAnimationFrame(onDraw);
    }

    // onDraw();
}

window.onload = main;