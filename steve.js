import { mat4 } from "gl-matrix";
import * as engine from "./engine.ts";
import { Renderer, TriangleGeometry, Material, Sprite, TetrahedronGeometry, Geometry, LineGeometry, ColorMaterial, CubeGeometry, SphereGeometry } from "./engine";

// for Mouth movement
var g_isDrag = false;
var g_xMclik = 0.0;	 // last Mouth button-down position (in CVV coords)
var g_yMclik = 0.0;
var g_xMdragTot = 0.0;	// total (accumulated) Mouth-drag amounts (in CVV coords).
var g_yMdragTot = 0.0;
let canvas = document.querySelector("canvas");

function deg2rad(deg) {
    return deg / 360 * 2 * Math.PI;
}

function rad2deg(rad) {
    return rad / (2 * Math.PI) * 360;
}

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

    world.add(xAxis);
    world.add(yAxis);
    world.add(zAxis);

    // Start building steve
    let hip = new Sprite(null, null);

    let bodyJoint = new Sprite(null, null);
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

    // sphere on left hand
    let sphere = new Sprite(new SphereGeometry(0.05, 32, 16), new ColorMaterial([1, 0, 0, 1]));
    sphere.material.compile(renderer);
    sphere.material.bindPlaceholders(renderer, {
        aVertexPosition: new Float32Array(sphere.geometry.vertexPositions)
    }, {});
    sphere.geometry.mode = WebGL2RenderingContext.LINE_STRIP;

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

    for (let i = 0; i < cape.geometry.vertexPositions.length / 4; i++) {
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

    world.add(hip);

    mat4.translate(body.modelViewMatrix, body.modelViewMatrix, [0, 0.12, 0]);
    hip.add(bodyJoint);
    bodyJoint.add(body);

    // larm
    mat4.translate(larmJoint.modelViewMatrix, larmJoint.modelViewMatrix, [0.12, 0.08, 0]);
    mat4.translate(larm.modelViewMatrix, larm.modelViewMatrix, [0, -0.08, 0]);
    body.add(larmJoint);
    larmJoint.add(larm);

    // sphere on left hand
    mat4.translate(sphere.modelViewMatrix, sphere.modelViewMatrix, [0, -0.15, -0.03]);
    larm.add(sphere);

    // rarm
    mat4.translate(rarmJoint.modelViewMatrix, rarmJoint.modelViewMatrix, [-0.12, 0.08, 0]);
    mat4.translate(rarm.modelViewMatrix, rarm.modelViewMatrix, [0, -0.08, 0]);
    body.add(rarmJoint);
    rarmJoint.add(rarm);

    // lleg
    mat4.translate(llegJoint.modelViewMatrix, llegJoint.modelViewMatrix, [-0.04, 0, 0]);
    mat4.translate(lleg.modelViewMatrix, lleg.modelViewMatrix, [0, -0.12, 0]);
    hip.add(llegJoint);
    llegJoint.add(lleg);

    // rleg
    mat4.translate(rlegJoint.modelViewMatrix, rlegJoint.modelViewMatrix, [0.04, 0, 0]);
    mat4.translate(rleg.modelViewMatrix, rleg.modelViewMatrix, [0, -0.12, 0]);
    hip.add(rlegJoint);
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

    // End build steve

    // Start build cat

    let catBody = new Sprite(new CubeGeometry(0.08, 0.12, 0.32), new ColorMaterial([0.6, 0.6, 0.6, 1]));
    catBody.material.compile(renderer);
    catBody.material.bindPlaceholders(renderer, {
        aVertexPosition: new Float32Array(catBody.geometry.vertexPositions),
    }, {});

    let catHeadJoint = new Sprite(null, null);
    let catHead = new Sprite(new CubeGeometry(0.1, 0.08, 0.1), new ColorMaterial([0.6, 0.6, 0.6, 1]));
    catHead.material.compile(renderer);
    catHead.material.bindPlaceholders(renderer, {
        aVertexPosition: new Float32Array(catHead.geometry.vertexPositions),
    }, {});

    let catMouth = new Sprite(new CubeGeometry(0.06, 0.04, 0.02), new ColorMaterial([0.4, 0.4, 0.4, 1]));
    catMouth.material.compile(renderer);
    catMouth.material.bindPlaceholders(renderer, {
        aVertexPosition: new Float32Array(catMouth.geometry.vertexPositions),
    }, {});

    let catEarL = new Sprite(new CubeGeometry(0.02, 0.02, 0.04), new ColorMaterial([0.3, 0.3, 0.3, 1]));
    catEarL.material.compile(renderer);
    catEarL.material.bindPlaceholders(renderer, {
        aVertexPosition: new Float32Array(catEarL.geometry.vertexPositions),
    }, {});

    let catEarR = new Sprite(new CubeGeometry(0.02, 0.02, 0.04), new ColorMaterial([0.3, 0.3, 0.3, 1]));
    catEarR.material.compile(renderer);
    catEarR.material.bindPlaceholders(renderer, {
        aVertexPosition: new Float32Array(catEarR.geometry.vertexPositions),
    }, {});

    let catFrontFootLJoint = new Sprite(null, null);
    let catFrontFootL = new Sprite(new CubeGeometry(0.04, 0.2, 0.04), new ColorMaterial([0.6, 0.6, 0.6, 1]));
    catFrontFootL.material.compile(renderer);
    catFrontFootL.material.bindPlaceholders(renderer, {
        aVertexPosition: new Float32Array(catFrontFootL.geometry.vertexPositions),
    }, {});

    let catFrontFootRJoint = new Sprite(null, null);
    let catFrontFootR = new Sprite(new CubeGeometry(0.04, 0.2, 0.04), new ColorMaterial([0.6, 0.6, 0.6, 1]));
    catFrontFootR.material.compile(renderer);
    catFrontFootR.material.bindPlaceholders(renderer, {
        aVertexPosition: new Float32Array(catFrontFootR.geometry.vertexPositions),
    }, {});

    let catRearFootLJoint = new Sprite(null, null);
    let catRearFootL = new Sprite(new CubeGeometry(0.04, 0.12, 0.04), new ColorMaterial([0.6, 0.6, 0.6, 1]));
    catRearFootL.material.compile(renderer);
    catRearFootL.material.bindPlaceholders(renderer, {
        aVertexPosition: new Float32Array(catRearFootL.geometry.vertexPositions),
    }, {});

    let catRearFootRJoint = new Sprite(null, null);
    let catRearFootR = new Sprite(new CubeGeometry(0.04, 0.12, 0.04), new ColorMaterial([0.6, 0.6, 0.6, 1]));
    catRearFootR.material.compile(renderer);
    catRearFootR.material.bindPlaceholders(renderer, {
        aVertexPosition: new Float32Array(catRearFootR.geometry.vertexPositions),
    }, {});

    let catTailFrontJoint = new Sprite(null, null);
    let catTailFront = new Sprite(new CubeGeometry(0.02, 0.02, 0.16), new ColorMaterial([0.6, 0.6, 0.6, 1]));
    catTailFront.material.compile(renderer);
    catTailFront.material.bindPlaceholders(renderer, {
        aVertexPosition: new Float32Array(catTailFront.geometry.vertexPositions),
    }, {});

    let catTailRearJoint = new Sprite(null, null);
    let catTailRear = new Sprite(new CubeGeometry(0.02, 0.02, 0.16), new ColorMaterial([0.6, 0.6, 0.6, 1]));
    catTailRear.material.compile(renderer);
    catTailRear.material.bindPlaceholders(renderer, {
        aVertexPosition: new Float32Array(catTailRear.geometry.vertexPositions),
    }, {});


    // add cat head
    mat4.translate(catHeadJoint.modelViewMatrix, catHeadJoint.modelViewMatrix, [0, 0.03, 0.16]);
    mat4.translate(catHead.modelViewMatrix, catHead.modelViewMatrix, [0, 0.01, 0.05]);
    mat4.translate(catEarL.modelViewMatrix, catEarL.modelViewMatrix, [0.03, 0.05, -0.03]);
    mat4.translate(catEarR.modelViewMatrix, catEarR.modelViewMatrix, [-0.03, 0.05, -0.03])
    mat4.translate(catMouth.modelViewMatrix, catMouth.modelViewMatrix, [0, -0.02, 0.06]);
    catBody.add(catHeadJoint);
    catHeadJoint.add(catHead);
    catHead.add(catEarL);
    catHead.add(catEarR);
    catHead.add(catMouth);

    // add Front Left Leg;
    mat4.translate(catFrontFootLJoint.modelViewMatrix, catFrontFootLJoint.modelViewMatrix, [0, 0.04, 0.1]);
    mat4.translate(catFrontFootL.modelViewMatrix, catFrontFootL.modelViewMatrix, [-0.021,-0.08, 0]);
    catBody.add(catFrontFootLJoint);
    catFrontFootLJoint.add(catFrontFootL);

    // add Front Right Leg;
    mat4.translate(catFrontFootRJoint.modelViewMatrix, catFrontFootRJoint.modelViewMatrix, [0, 0.04, 0.1]);
    mat4.translate(catFrontFootR.modelViewMatrix, catFrontFootR.modelViewMatrix, [0.021,-0.08, 0]);
    catBody.add(catFrontFootRJoint);
    catFrontFootRJoint.add(catFrontFootR);

    // add Rear Left Leg;
    mat4.translate(catRearFootLJoint.modelViewMatrix, catRearFootLJoint.modelViewMatrix, [-0.021,-0.04,-0.12]);
    mat4.translate(catRearFootL.modelViewMatrix, catRearFootL.modelViewMatrix, [0,-0.04,0])
    catBody.add(catRearFootLJoint);
    catRearFootLJoint.add(catRearFootL);

    // add Rear Left Leg;
    mat4.translate(catRearFootRJoint.modelViewMatrix, catRearFootRJoint.modelViewMatrix, [0.021,-0.04,-0.12]);
    mat4.translate(catRearFootR.modelViewMatrix, catRearFootR.modelViewMatrix, [0,-0.04,0])
    catBody.add(catRearFootRJoint);
    catRearFootRJoint.add(catRearFootR);

    // add tail front
    mat4.translate(catTailFrontJoint.modelViewMatrix, catTailFrontJoint.modelViewMatrix, [0,0.04,-0.16]);
    mat4.rotateX(catTailFrontJoint.modelViewMatrix, catTailFrontJoint.modelViewMatrix, -0.5);
    mat4.translate(catTailFront.modelViewMatrix, catTailFront.modelViewMatrix, [0, 0, -0.07]);
    catBody.add(catTailFrontJoint);
    catTailFrontJoint.add(catTailFront);

    // add tail Read
    mat4.translate(catTailRearJoint.modelViewMatrix, catTailRearJoint.modelViewMatrix, [0,0,-0.07]);
    mat4.rotateX(catTailRearJoint.modelViewMatrix, catTailRearJoint.modelViewMatrix, 0.5);
    mat4.translate(catTailRear.modelViewMatrix, catTailRear.modelViewMatrix,[0,0,-0.07]);
    catTailFront.add(catTailRearJoint);
    catTailRearJoint.add(catTailRear);

    //End Build Cat

    let center = new Sprite(null, null);
    world.add(center);
    mat4.translate(catBody.modelViewMatrix, catBody.modelViewMatrix,[0.5,-0.1,0]);
    center.add(catBody);


    mat4.rotateX(world.modelViewMatrix, world.modelViewMatrix, 6);
    mat4.rotateY(world.modelViewMatrix, world.modelViewMatrix, -45);
    renderer.render(world);

    // controls
    let isDragging = false;
    let worldRotationY = -45; // deg
    let worldRotationX = -45; // deg
    let worldScale = 1;
    let lastMousePosition;

    // start dragging
    canvas.addEventListener("mousedown", function (event) {
        lastMousePosition = [event.offsetX, event.offsetY];
        isDragging = true;
    });

    // dragging
    document.addEventListener("mousemove", function (event) {
        if (isDragging) {
            let position = [event.offsetX, event.offsetY];
            worldRotationY += - (position[0] - lastMousePosition[0]) / 2;
            worldRotationX += - (position[1] - lastMousePosition[1]) / 2;
            lastMousePosition = position;
        }
    });

    // stop dragging
    document.addEventListener("mouseup", function (event) {
        isDragging = false;
    });

    // mouse wheel to scale
    canvas.addEventListener("wheel", function (event) {
        event.preventDefault();

        if (event.deltaY < 0) {
            worldScale *= (-0.5) * event.deltaY;
        } else {
            worldScale /= 0.5 * event.deltaY;
        }
    })

    // press shift to bend
    document.addEventListener("keydown", function (event) {
        if (event.code === "ShiftLeft") {
            // bend body
            mat4.identity(bodyJoint.modelViewMatrix);
            mat4.rotateX(bodyJoint.modelViewMatrix, bodyJoint.modelViewMatrix, -0.4);

            // bend head
            mat4.identity(headJoint.modelViewMatrix);
            mat4.translate(headJoint.modelViewMatrix, headJoint.modelViewMatrix, [0, 0.12, 0]);
            mat4.rotateX(headJoint.modelViewMatrix, headJoint.modelViewMatrix, 0.4);
        }
    });

    document.addEventListener("keyup", function (event) {
        if (event.code === "ShiftLeft") {
            mat4.identity(bodyJoint.modelViewMatrix);
            mat4.identity(headJoint.modelViewMatrix);
            mat4.translate(headJoint.modelViewMatrix, headJoint.modelViewMatrix, [0, 0.12, 0]);
        }
    })

    function onDraw() {
        // world rotation
        mat4.identity(world.modelViewMatrix);
        mat4.rotateX(world.modelViewMatrix, world.modelViewMatrix, deg2rad(worldRotationX));
        mat4.rotateY(world.modelViewMatrix, world.modelViewMatrix, deg2rad(worldRotationY));

        // world scale
        mat4.scale(world.modelViewMatrix, world.modelViewMatrix, [worldScale, worldScale, worldScale]);

        // body position
        let percent = document.querySelector("input[id=bodyPosition]").value / 100;
        mat4.identity(hip.modelViewMatrix);
        mat4.translate(hip.modelViewMatrix, hip.modelViewMatrix, [0, 0, percent]);

        // arm rotation
        let armRotation = document.querySelector("input[id=armPosition]").value / 100;
        mat4.identity(larmJoint.modelViewMatrix);
        mat4.translate(larmJoint.modelViewMatrix, larmJoint.modelViewMatrix, [0.12, 0.08, 0]);
        mat4.rotateX(larmJoint.modelViewMatrix, larmJoint.modelViewMatrix, armRotation);
        mat4.identity(rarmJoint.modelViewMatrix);
        mat4.translate(rarmJoint.modelViewMatrix, rarmJoint.modelViewMatrix, [-0.12, 0.08, 0]);
        mat4.rotateX(rarmJoint.modelViewMatrix, rarmJoint.modelViewMatrix, -armRotation);

        // leg rotation
        mat4.identity(llegJoint.modelViewMatrix);
        mat4.translate(llegJoint.modelViewMatrix, llegJoint.modelViewMatrix, [0.04, 0, 0]);
        mat4.rotateX(llegJoint.modelViewMatrix, llegJoint.modelViewMatrix, -armRotation);
        mat4.identity(rlegJoint.modelViewMatrix);
        mat4.translate(rlegJoint.modelViewMatrix, rlegJoint.modelViewMatrix, [-0.04, 0, 0]);
        mat4.rotateX(rlegJoint.modelViewMatrix, rlegJoint.modelViewMatrix, armRotation);

        // cape animation
        let angle = animateSin(-0.12, 200);
        mat4.rotateX(capeJoint.modelViewMatrix, capeOriMat, angle);

        renderer.clear();
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        renderer.render(world);
        requestAnimationFrame(onDraw);

        // cat Rotation
        mat4.rotateY(center.modelViewMatrix, center.modelViewMatrix, -0.01)

        // cat walk
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

window.onload = main;