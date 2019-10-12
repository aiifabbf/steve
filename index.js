import { mat4 } from "gl-matrix";
import * as engine from "./engine.ts";
import { Renderer, TriangleGeometry, Material, Sprite, TetrahedronGeometry } from "./engine";

function main() {
    let canvas = document.querySelector("canvas");
    let gl = canvas.getContext("webgl2");

    if (gl == null) {
        alert("can't get webgl context.");
        return;
    }

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

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

    // // let vertexShader = gl.createShader(gl.VERTEX_SHADER);
    // // gl.shaderSource(vertexShader, vertexShaderSource);
    // // gl.compileShader(vertexShader);
    // // if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
    // //     alert("compiler error");
    // //     gl.deleteShader(vertexShader);
    // //     return;
    // // }

    // // let fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    // // gl.shaderSource(fragmentShader, fragmentShaderSource);
    // // gl.compileShader(fragmentShader);
    // // if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
    // //     alert("compile error");
    // //     gl.deleteShader(fragmentShader);
    // //     return;
    // // }

    // // let shaderProgram = gl.createProgram();
    // // gl.attachShader(shaderProgram, vertexShader);
    // // gl.attachShader(shaderProgram, fragmentShader);
    // // gl.linkProgram(shaderProgram);

    // // if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    // //     alert("link error");
    // //     return;
    // // }

    // // replace with engine.getShaderProgram()
    // let shaderProgram = engine.getShaderProgram(gl, vertexShaderSource, fragmentShaderSource);
    // console.log(shaderProgram);

    // // let programInfo = {
    // //     program: shaderProgram,
    // //     attributeLocations: {
    // //         vertexPosition: gl.getAttribLocation(shaderProgram, "aVertexPosition"),
    // //         vertexColor: gl.getAttribLocation(shaderProgram, "aVertexColor"),
    // //     },
    // //     uniformLocations: {
    // //         modelViewMatrix: gl.getUniformLocation(shaderProgram, "uModelViewMatrix"),
    // //     }
    // // };
    // // console.log(programInfo);

    // replace with renderer, material
    let renderer = new Renderer(canvas);
    let material = new Material(vertexShaderSource, fragmentShaderSource);
    material.compile(renderer, {
        aVertexPosition: "aVertexPosition",
        aVertexColor: "aVertexColor",
    }, {
        uModelViewMatrix: "uModelViewMatrix",
    });
    let programInfo = material.programInfo;
    // programInfo is correct

    // // replace with engine.getProgramInfo()
    // let programInfo = engine.getProgramInfo(gl, shaderProgram, {
    //     aVertexPosition: "aVertexPosition",
    //     aVertexColor: "aVertexColor"
    // }, {
    //     uModelViewMatrix: "uModelViewMatrix"
    // });
    // console.log(programInfo);

    // let vertexPositions = new Float32Array([
    //     -0.5, -0.5, 0.0, 1.0, // vertex 0
    //     0.5, -0.5, 0.0, 1.0, // vertex 1
    //     0.5, 0.5, 0.0, 1.0, // vertex 2
    // ]);

    // let vertexColors = new Float32Array([
    //     1, 0, 0, 1,
    //     0, 1, 0, 1,
    //     0, 0, 1, 1
    // ]);

    // replace with geometry
    let geometry = new TriangleGeometry(0.5, 0.5);
    let triangle = new Sprite(geometry, material);
    material.bindPlaceholders(renderer, {
        aVertexPosition: new Float32Array(geometry.vertexPositions),
        aVertexColor: new Float32Array([
            1, 0, 0, 1,
            0, 1, 0, 1,
            0, 0, 1, 1
        ])
    })

    // gl.useProgram(programInfo.program);

    // let vertexPositionBuffer = gl.createBuffer();
    // gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
    // gl.bufferData(gl.ARRAY_BUFFER, vertexPositions, gl.STATIC_DRAW);
    // gl.vertexAttribPointer(
    //     programInfo.attributeLocations.aVertexPosition,
    //     4,
    //     gl.FLOAT,
    //     false,
    //     0,
    //     0
    // );
    // gl.enableVertexAttribArray(programInfo.attributeLocations.aVertexPosition);

    // let vertexColorBuffer = gl.createBuffer();
    // gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer);
    // gl.bufferData(gl.ARRAY_BUFFER, vertexColors, gl.STATIC_DRAW);
    // gl.vertexAttribPointer(
    //     programInfo.attributeLocations.aVertexColor,
    //     4,
    //     gl.FLOAT,
    //     false,
    //     0,
    //     0
    // );
    // gl.enableVertexAttribArray(programInfo.attributeLocations.aVertexColor);

    // let modelViewMatrix = mat4.create();
    // gl.uniformMatrix4fv(
    //     programInfo.uniformLocations.uModelViewMatrix,
    //     false,
    //     modelViewMatrix
    // );
    renderer.render(triangle);

    mat4.translate(triangle.modelMatrix, triangle.modelMatrix, [-0.5, -0.5, 0, 1]);
    material.bindPlaceholders(renderer, {
        aVertexPosition: new Float32Array(triangle.geometry.vertexPositions),
        aVertexColor: new Float32Array([
            1, 0, 0, 1,
            0, 1, 0, 1,
            0, 0, 1, 1
        ])
    });
    renderer.render(triangle);

    let tetrahedron = new Sprite(new TetrahedronGeometry(0.5, 0.5, 0.5), material);
    material.bindPlaceholders(renderer, {
        aVertexPosition: new Float32Array(tetrahedron.geometry.vertexPositions),
        aVertexColor: new Float32Array([
            1, 0, 0, 1,
            0, 0, 1, 1,
            0, 1, 0, 1,
            1, 0, 1, 1,
            1, 0, 0, 1,
            0, 0, 1, 1,
        ])
    });
    renderer.render(tetrahedron);
    
    function onDraw() {
        mat4.rotateX(tetrahedron.modelMatrix, tetrahedron.modelMatrix, 0.1);
        mat4.rotateZ(tetrahedron.modelMatrix, tetrahedron.modelMatrix, 0.1);
        renderer.render(tetrahedron);

        requestAnimationFrame(onDraw);
    }

    // onDraw();

    // gl.drawArrays(gl.TRIANGLE_STRIP, 0, geometry.vertexPositions.length / 4);

    // let renderer = new Renderer(canvas);
    // let geometry = new TriangleGeometry(0.5, 0.5);
    // let material = new Material(vertexShaderSource, fragmentShaderSource);
    // let triangle = new Sprite(geometry, material);
    // renderer.render(triangle);
}

window.onload = main;