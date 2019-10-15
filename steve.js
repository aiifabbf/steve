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

    let body = new Sprite(new CubeGeometry(0.16, 0.24, 0.08), new ColorMaterial([1,1,1,1]));
    body.material.compile(renderer);
    body.material.bindPlaceholders(renderer, {
        aVertexPosition: new Float32Array(body.geometry.vertexPositions),
    }, {});
    
    let head = new Sprite(new CubeGeometry(0.16, 0.16, 0.16), new ColorMaterial([1,1,1,1]));
    head.material.compile(renderer);
    head.material.bindPlaceholders(renderer, {
        aVertexPosition: new Float32Array(head.geometry.vertexPositions),
    }, {});

    let larm = new Sprite(new CubeGeometry(0.08, 0.24, 0.08), new ColorMaterial([1,1,1,1]));
    larm.material.compile(renderer);
    larm.material.bindPlaceholders(renderer, {
        aVertexPosition: new Float32Array(larm.geometry.vertexPositions),
    }, {});

    let rarm = new Sprite(new CubeGeometry(0.08, 0.24, 0.08), new ColorMaterial([1,1,1,1]));
    rarm.material.compile(renderer);
    rarm.material.bindPlaceholders(renderer, {
        aVertexPosition: new Float32Array(rarm.geometry.vertexPositions),
    }, {});

    let lleg = new Sprite(new CubeGeometry(0.08, 0.24, 0.08), new ColorMaterial([1,1,1,1]));
    lleg.material.compile(renderer);
    lleg.material.bindPlaceholders(renderer, {
        aVertexPosition: new Float32Array(lleg.geometry.vertexPositions),
    }, {});

    let rleg = new Sprite(new CubeGeometry(0.08, 0.24, 0.08), new ColorMaterial([1,1,1,1]));
    rleg.material.compile(renderer);
    rleg.material.bindPlaceholders(renderer, {
        aVertexPosition: new Float32Array(rleg.geometry.vertexPositions),
    }, {});

    //world.add(body);
    mat4.translate(larm.modelViewMatrix, larm.modelViewMatrix, [0.12,0,0]);
    mat4.translate(rarm.modelViewMatrix, rarm.modelViewMatrix, [-0.12,0,0]);
    mat4.translate(lleg.modelViewMatrix, lleg.modelViewMatrix, [-0.04,-0.24,0]);
    mat4.translate(rleg.modelViewMatrix, rleg.modelViewMatrix, [0.04,-0.24,0]);
    mat4.translate(head.modelViewMatrix, head.modelViewMatrix, [0,0.2,0]);
    world.add(body);
    body.add(larm);
    body.add(rarm);
    body.add(head);
    body.add(lleg);
    body.add(rleg);
    world.add(xAxis);
    world.add(yAxis);
    world.add(zAxis);
    
    mat4.rotateX(world.modelViewMatrix, world.modelViewMatrix, 6);
    mat4.rotateY(world.modelViewMatrix, world.modelViewMatrix, -45);
    renderer.render(world);

    function onDraw() {
        // world rotation
        mat4.rotateY(world.modelViewMatrix, world.modelViewMatrix, -0.01);
        
        // body position
        let percent = document.querySelector("input[id=bodyPosition]").value / 100;
        mat4.identity(body.modelViewMatrix);
        mat4.translate(body.modelViewMatrix, body.modelViewMatrix, [0, 0, percent]);
        
        renderer.clear();
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        renderer.render(world);
        requestAnimationFrame(onDraw);
    }

    onDraw();
}

window.onload = main;