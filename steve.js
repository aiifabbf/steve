import { mat4 } from "gl-matrix";
import * as engine from "./engine.ts";
import { Renderer, TriangleGeometry, Material, Sprite, TetrahedronGeometry, Geometry, LineGeometry, ColorMaterial, CubeGeometry } from "./engine";

// for mouse movement
var g_isDrag = false;
var g_xMclik = 0.0;	 // last mouse button-down position (in CVV coords)
var g_yMclik = 0.0;
var g_xMdragTot = 0.0;	// total (accumulated) mouse-drag amounts (in CVV coords).
var g_yMdragTot = 0.0;
let canvas = document.querySelector("canvas");

function main() {
    
    let gl = canvas.getContext("webgl2");
    let capeOriMat = null;

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

    canvas.addEventListener("mousedown", myMouseDown);
    canvas.addEventListener("mousemove", myMouseMove);
    canvas.addEventListener("mouseup", myMouseUp);

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

    let body = new Sprite(new CubeGeometry(0.16, 0.24, 0.08), new ColorMaterial([0, 0.686, 0.686, 1]));
    body.material.compile(renderer);
    body.material.bindPlaceholders(renderer, {
        aVertexPosition: new Float32Array(body.geometry.vertexPositions),
    }, {});

    let headJoint = new Sprite(null, null);
    let head = new Sprite(new CubeGeometry(0.16, 0.16, 0.16), new ColorMaterial([0.702, 0.482, 0.384, 1]));
    head.material.compile(renderer);
    head.material.bindPlaceholders(renderer, {
        aVertexPosition: new Float32Array(head.geometry.vertexPositions),
    }, {});

    let larmJoint = new Sprite(null, null);
    let larm = new Sprite(new CubeGeometry(0.08, 0.24, 0.08), new ColorMaterial([0.588, 0.372, 0.255, 1]));
    larm.material.compile(renderer);
    larm.material.bindPlaceholders(renderer, {
        aVertexPosition: new Float32Array(larm.geometry.vertexPositions),
    }, {});

    let rarmJoint = new Sprite(null, null);
    let rarm = new Sprite(new CubeGeometry(0.08, 0.24, 0.08), new ColorMaterial([0.588, 0.372, 0.255, 1]));
    rarm.material.compile(renderer);
    rarm.material.bindPlaceholders(renderer, {
        aVertexPosition: new Float32Array(rarm.geometry.vertexPositions),
    }, {});

    let llegJoint = new Sprite(null, null);
    let lleg = new Sprite(new CubeGeometry(0.08, 0.24, 0.08), new ColorMaterial([0.275, 0.228, 0.647, 1]));
    lleg.material.compile(renderer);
    lleg.material.bindPlaceholders(renderer, {
        aVertexPosition: new Float32Array(lleg.geometry.vertexPositions),
    }, {});

    let rlegJoint = new Sprite(null, null);
    let rleg = new Sprite(new CubeGeometry(0.08, 0.24, 0.08), new ColorMaterial([0.275, 0.228, 0.5, 1]));
    rleg.material.compile(renderer);
    rleg.material.bindPlaceholders(renderer, {
        aVertexPosition: new Float32Array(rleg.geometry.vertexPositions),
    }, {});

    let capeJoint = new Sprite(null, null);
    let cape = new Sprite(new CubeGeometry(0.16, 0.36, 0.02), new Material(vertexShaderSource, fragmentShaderSource));
    let nodePositionColorMapping = {}; // color for each node
    let capeNodePositions = []; // reshape vertexPositions into (-1, 4)

    for (let i = 0; i < cape.geometry.vertexPositions.length / 4; i ++) {
        let vertexPosition = cape.geometry.vertexPositions;
        capeNodePositions.push([
            vertexPosition[4 * i],
            vertexPosition[4 * i + 1],
            vertexPosition[4 * i + 2],
            vertexPosition[4 * i + 3],
        ]);
    }

    capeNodePositions.forEach(function (nodePosition) {
        if (!(nodePosition in nodePositionColorMapping)) {
            nodePositionColorMapping[nodePosition] = [
                Math.random() > 0.5 ? 1 : 0,
                Math.random() > 0.5 ? 1 : 0,
                Math.random() > 0.5 ? 1 : 0,
                1,
            ];
        }
    });

    cape.material.compile(renderer, {
        aVertexPosition: "aVertexPosition",
        aVertexColor: "aVertexColor"
    }, {
        uModelViewMatrix: "uModelViewMatrix"
    })
    cape.material.bindPlaceholders(renderer, {
        aVertexPosition: new Float32Array(cape.geometry.vertexPositions),
        aVertexColor: new Float32Array(capeNodePositions.map(function (nodePosition) {
            return nodePositionColorMapping[nodePosition];
        }).flat()),
    }, {});

    world.add(body);

    // larm
    mat4.translate(larmJoint.modelViewMatrix, larmJoint.modelViewMatrix, [0.12, 0.08, 0]);
    mat4.translate(larm.modelViewMatrix, larm.modelViewMatrix, [0, -0.08, 0]);
    body.add(larmJoint);
    larmJoint.add(larm);

    // rarm
    mat4.translate(rarmJoint.modelViewMatrix, rarmJoint.modelViewMatrix, [-0.12, 0.08, 0]);
    mat4.translate(rarm.modelViewMatrix, rarm.modelViewMatrix, [0, -0.08, 0]);
    body.add(rarmJoint);
    rarmJoint.add(rarm);

    // lleg
    mat4.translate(llegJoint.modelViewMatrix, llegJoint.modelViewMatrix, [-0.04, -0.12, 0]);
    mat4.translate(lleg.modelViewMatrix, lleg.modelViewMatrix, [0, -0.12, 0]);
    body.add(llegJoint);
    llegJoint.add(lleg);

    // rleg
    mat4.translate(rlegJoint.modelViewMatrix, rlegJoint.modelViewMatrix, [0.04, -0.12, 0]);
    mat4.translate(rleg.modelViewMatrix, rleg.modelViewMatrix, [0, -0.12, 0]);
    body.add(rlegJoint);
    rlegJoint.add(rleg);

    // head
    mat4.translate(headJoint.modelViewMatrix, headJoint.modelViewMatrix, [0, 0.12, 0]);
    mat4.translate(head.modelViewMatrix, head.modelViewMatrix, [0, 0.08, 0]);
    body.add(headJoint);
    headJoint.add(head);

    // cape
    mat4.translate(capeJoint.modelViewMatrix, capeJoint.modelViewMatrix, [0, 0.12, 0.04]);
    //mat4.rotateX(capeJoint.modelViewMatrix,capeJoint.modelViewMatrix, -0.24);
    mat4.translate(cape.modelViewMatrix, cape.modelViewMatrix, [0, -0.18, 0.01]);
    capeOriMat = mat4.clone(capeJoint.modelViewMatrix);
    body.add(capeJoint);
    capeJoint.add(cape);

    world.add(xAxis);
    world.add(yAxis);
    world.add(zAxis);

    mat4.rotateX(world.modelViewMatrix, world.modelViewMatrix, 6);
    mat4.rotateY(world.modelViewMatrix, world.modelViewMatrix, -45);
    renderer.render(world);

    function onDraw() {
        // world rotation
        mat4.rotateY(world.modelViewMatrix, world.modelViewMatrix, -g_xMdragTot);
        g_xMdragTot = 0;
        mat4.rotateX(world.modelViewMatrix,world.modelViewMatrix, -g_yMdragTot);
        g_yMdragTot = 0;
        // body position
        let percent = document.querySelector("input[id=bodyPosition]").value / 100;
        mat4.identity(body.modelViewMatrix);
        mat4.translate(body.modelViewMatrix, body.modelViewMatrix, [0, 0, percent]);

        // arm rotation
        let armRotation = document.querySelector("input[id=armPosition]").value / 100;
        mat4.identity(larmJoint.modelViewMatrix);
        mat4.translate(larmJoint.modelViewMatrix, larmJoint.modelViewMatrix, [0.12, 0.08, 0]);
        mat4.rotateX(larmJoint.modelViewMatrix, larmJoint.modelViewMatrix, armRotation);
        mat4.identity(rarmJoint.modelViewMatrix);
        mat4.translate(rarmJoint.modelViewMatrix, rarmJoint.modelViewMatrix, [-0.12, 0.08, 0]);
        mat4.rotateX(rarmJoint.modelViewMatrix, rarmJoint.modelViewMatrix, -armRotation);

        // cape animation
        let angle = animateSin(-0.12, 200);
        mat4.rotateX(capeJoint.modelViewMatrix, capeOriMat, angle);

        renderer.clear();
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        renderer.render(world);
        requestAnimationFrame(onDraw);
    }
    onDraw();
}

function animateSin(limit, speed) {
    //==============================================================================
    // Calculate the elapsed time
    var now = Date.now();

    var newAngle = limit + limit * Math.sin(now / speed);
    //if (newAngle > 180.0) newAngle = newAngle - 360.0;
    //if (newAngle < -180.0) newAngle = newAngle + 360.0;
    return newAngle;
}

function myMouseMove(ev) {

    if (g_isDrag == false) return;
    // Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
    var rect = ev.target.getBoundingClientRect();	    // get canvas corners in pixels

    var xp = ev.clientX - rect.left;					// x==0 at canvas left edge
    var yp = canvas.height - (ev.clientY - rect.top);	// y==0 at canvas bottom edge

    // Convert to Canonical View Volume (CVV) coordinates too:
    var x = (xp - canvas.width / 2) / 		// move origin to center of canvas and
        (canvas.width / 2);			// normalize canvas to -1 <= x < +1,
    var y = (yp - canvas.height / 2) /		//										 -1 <= y < +1.
        (canvas.height / 2);

    // find how far we dragged the mouse:
    g_xMdragTot += (x - g_xMclik);					// Accumulate change-in-mouse-position,&
    g_yMdragTot += (y - g_yMclik);
    // Report new mouse position & how far we moved on webpage:

    g_xMclik = x;
    g_yMclik = y;
};

function myMouseUp(ev) {
    // Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
    var rect = ev.target.getBoundingClientRect();	// get canvas corners in pixels
    var xp = ev.clientX - rect.left;				// x==0 at canvas left edge
    var yp = canvas.height - (ev.clientY - rect.top);	// y==0 at canvas bottom edge

    // Convert to Canonical View Volume (CVV) coordinates too:
    var x = (xp - canvas.width / 2) / 		// move origin to center of canvas and
        (canvas.width / 2);					// normalize canvas to -1 <= x < +1,
    var y = (yp - canvas.height / 2) /		// -1 <= y < +1.
        (canvas.height / 2);

    g_isDrag = false;	// CLEAR our mouse-dragging flag, and
    // accumulate any final bit of mouse-dragging we did:
    g_xMdragTot += (x - g_xMclik);
    g_yMdragTot += (y - g_yMclik);
};

function myMouseDown(ev) {
    // Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
    var rect = ev.target.getBoundingClientRect();	// get canvas corners in pixels
    var xp = ev.clientX - rect.left;									// x==0 at canvas left edge
    var yp = canvas.height - (ev.clientY - rect.top);	// y==0 at canvas bottom edge

    // Convert to Canonical View Volume (CVV) coordinates too:
    var x = (xp - canvas.width / 2) / 		// move origin to center of canvas and
        (canvas.width / 2);			// normalize canvas to -1 <= x < +1,
    var y = (yp - canvas.height / 2) /		//										 -1 <= y < +1.
        (canvas.height / 2);

    g_isDrag = true;	// set our mouse-dragging flag
    g_xMclik = x;		// record where mouse-dragging began
    g_yMclik = y;
};

window.onload = main;