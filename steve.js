import { mat4 } from "gl-matrix";
import * as engine from "./engine.ts";
import { Renderer, TriangleGeometry, Material, Sprite, TetrahedronGeometry, Geometry, LineGeometry, ColorMaterial, CubeGeometry } from "./engine";

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

    let xAxis = new Sprite(new LineGeometry([0, 0, 0], [1, 0, 0]), new ColorMaterial([1, 0, 0, 1]));
    let yAxis = new Sprite(new LineGeometry([0, 0, 0], [0, 1, 0]), new ColorMaterial([0, 1, 0, 1]));
    let zAxis = new Sprite(new LineGeometry([0, 0, 0], [0, 0, 1]), new ColorMaterial([0, 0, 1, 1]));
    [xAxis, yAxis, zAxis].forEach(function (axis) {
        axis.material.compile(renderer);
        axis.material.bindPlaceholders(renderer, {
            aVertexPosition: new Float32Array(axis.geometry.vertexPositions)
        }, {});
    });

    let cube = new Sprite(new CubeGeometry(0.16, 0.24, 0.1), new ColorMaterial([1,1,1,1]));
    cube.material.compile(renderer);
    cube.material.bindPlaceholders(renderer, {
        aVertexPosition: new Float32Array(cube.geometry.vertexPositions),
    }, {});

    world.add(cube);
    world.add(xAxis);
    world.add(yAxis);
    world.add(zAxis);

    
    mat4.rotateX(world.modelViewMatrix, world.modelViewMatrix, 45);
    mat4.rotateY(world.modelViewMatrix, world.modelViewMatrix, -45);
    renderer.render(world);

    function onDraw() {
        //mat4.rotateZ(triangle2.modelViewMatrix, triangle2.modelViewMatrix, 0.02);
        //mat4.rotateZ(tetrahedron.modelViewMatrix, tetrahedron.modelViewMatrix, 0.03);
        mat4.rotateY(world.modelViewMatrix, world.modelViewMatrix, -0.01);
        let percent = document.querySelector("input[type=range]").value / 100;
        mat4.identity(cube.modelViewMatrix);
        mat4.translate(cube.modelViewMatrix, cube.modelViewMatrix, [0, 0, percent]);
        renderer.clear();
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        renderer.render(world);
        requestAnimationFrame(onDraw);
    }

    onDraw();
}

window.onload = main;