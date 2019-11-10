import { mat4, vec3 } from "gl-matrix";
import * as engine from "./engine";
import { Renderer, TriangleGeometry, Material, Sprite, TetrahedronGeometry, Geometry, LineGeometry, ColorMaterial, CubeGeometry, SphereGeometry, Camera, PerspectiveCamera, radians, degrees } from "./engine";

let canvas = document.querySelector("canvas");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

function deg2rad(deg) {
    return deg / 360 * 2 * Math.PI;
}

function rad2deg(rad) {
    return rad / (2 * Math.PI) * 360;
}

function main() {
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

    let thirdPersonCameraTheta = 45;
    let thirdPersonCameraPhi = 45;
    let thirdPersonCameraRadius = 10;
    let thirdPersonCamera = new PerspectiveCamera(
        [5, 5, 5],
        [0, 0, 0],
        [0, 0, 1],
        radians(42),
        canvas.width / canvas.height,
        0.1,
        10000,
    );

    let firstPersonCamera = new Camera(mat4.create(), mat4.create());

    let freeCameraPosition = [5, 5, 5];
    let freeCameraTheta = 45;
    let freeCameraPhi = 45;
    let freeCameraRadius = 10;
    let freeCamera = new PerspectiveCamera(
        [5, 5, 5],
        [0, 0, 0],
        [0, 0, 1],
        radians(60),
        canvas.width / canvas.height,
        0.1,
        10000,
    );
    let camera = thirdPersonCamera;

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
    let body = new Sprite(new CubeGeometry(0.48, 0.24, 0.72), new ColorMaterial([0, 0.686, 0.686, 1]));
    body.material.compile(renderer);
    body.material.bindPlaceholders(renderer, {
        aVertexPosition: new Float32Array(body.geometry.vertexPositions),
    }, {});

    let headJoint = new Sprite(null, null);
    let head = new Sprite(new CubeGeometry(0.48, 0.48, 0.48), new ColorMaterial([0.702, 0.482, 0.384, 1]));
    head.material.compile(renderer);
    head.material.bindPlaceholders(renderer, {
        aVertexPosition: new Float32Array(head.geometry.vertexPositions),
    }, {});

    let larmJoint = new Sprite(null, null);
    let larm = new Sprite(new CubeGeometry(0.24, 0.24, 0.72), new ColorMaterial([0.588, 0.372, 0.255, 1]));
    larm.material.compile(renderer);
    larm.material.bindPlaceholders(renderer, {
        aVertexPosition: new Float32Array(larm.geometry.vertexPositions),
    }, {});

    // sphere on left hand
    let sphere = new Sprite(new SphereGeometry(0.15, 32, 16), new ColorMaterial([1, 0, 0, 1]));
    sphere.material.compile(renderer);
    sphere.material.bindPlaceholders(renderer, {
        aVertexPosition: new Float32Array(sphere.geometry.vertexPositions)
    }, {});
    sphere.geometry.mode = WebGL2RenderingContext.LINE_STRIP;

    let rarmJoint = new Sprite(null, null);
    let rarm = new Sprite(new CubeGeometry(0.24, 0.24, 0.72), new ColorMaterial([0.588, 0.372, 0.255, 1]));
    rarm.material.compile(renderer);
    rarm.material.bindPlaceholders(renderer, {
        aVertexPosition: new Float32Array(rarm.geometry.vertexPositions),
    }, {});

    let llegJoint = new Sprite(null, null);
    let lleg = new Sprite(new CubeGeometry(0.24, 0.24, 0.72), new ColorMaterial([0.275, 0.228, 0.647, 1]));
    lleg.material.compile(renderer);
    lleg.material.bindPlaceholders(renderer, {
        aVertexPosition: new Float32Array(lleg.geometry.vertexPositions),
    }, {});

    let rlegJoint = new Sprite(null, null);
    let rleg = new Sprite(new CubeGeometry(0.24, 0.24, 0.72), new ColorMaterial([0.275, 0.228, 0.5, 1]));
    rleg.material.compile(renderer);
    rleg.material.bindPlaceholders(renderer, {
        aVertexPosition: new Float32Array(rleg.geometry.vertexPositions),
    }, {});

    let capeJoint = new Sprite(null, null);
    let cape = new Sprite(new CubeGeometry(0.48, 0.06, 1.08), new Material(vertexShaderSource, fragmentShaderSource));
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
        uModelViewProjectionMatrix: "uModelViewProjectionMatrix"
    })

    cape.material.bindPlaceholders(renderer, {
        aVertexPosition: new Float32Array(cape.geometry.vertexPositions),
        aVertexColor: new Float32Array(capeNodePositions.map(function (nodePosition) {
            return nodePositionColorMapping[nodePosition];
        }).flat()),
    }, {});

    let angelRing = new Sprite(new engine.TorusGeometry(0.24, 0.06, 32, 32), new ColorMaterial([1, 1, 0, 1]));
    angelRing.material.compile(renderer);
    angelRing.material.bindPlaceholders(renderer, {
        aVertexPosition: new Float32Array(angelRing.geometry.vertexPositions),
    }, {});

    world.add(hip);

    mat4.translate(body.modelMatrix, body.modelMatrix, [0, 0, 0.36]);
    hip.add(bodyJoint);
    bodyJoint.add(body);

    // larm
    mat4.translate(larmJoint.modelMatrix, larmJoint.modelMatrix, [0.36, 0, 0.24]);
    mat4.translate(larm.modelMatrix, larm.modelMatrix, [0, 0, -0.24]);
    body.add(larmJoint);
    larmJoint.add(larm);

    // sphere on left hand
    mat4.translate(sphere.modelMatrix, sphere.modelMatrix, [0, -0.09, -0.45]);
    larm.add(sphere);

    // rarm
    mat4.translate(rarmJoint.modelMatrix, rarmJoint.modelMatrix, [-0.36, 0, 0.24]);
    mat4.translate(rarm.modelMatrix, rarm.modelMatrix, [0, 0, -0.24]);
    body.add(rarmJoint);
    rarmJoint.add(rarm);

    // lleg
    mat4.translate(llegJoint.modelMatrix, llegJoint.modelMatrix, [-0.12, 0, 0]);
    mat4.translate(lleg.modelMatrix, lleg.modelMatrix, [0, 0, -0.36]);
    hip.add(llegJoint);
    llegJoint.add(lleg);

    // rleg
    mat4.translate(rlegJoint.modelMatrix, rlegJoint.modelMatrix, [0.12, 0, 0]);
    mat4.translate(rleg.modelMatrix, rleg.modelMatrix, [0, 0, -0.36]);
    hip.add(rlegJoint);
    rlegJoint.add(rleg);

    // head
    mat4.translate(headJoint.modelMatrix, headJoint.modelMatrix, [0, 0, 0.36]);
    mat4.translate(head.modelMatrix, head.modelMatrix, [0, 0, 0.24]);
    body.add(headJoint);
    headJoint.add(head);

    // cape
    mat4.translate(capeJoint.modelMatrix, capeJoint.modelMatrix, [0, 0.12, 0.36]);
    //mat4.rotateX(capeJoint.modelViewMatrix,capeJoint.modelViewMatrix, -0.24);
    mat4.translate(cape.modelMatrix, cape.modelMatrix, [0, 0.03, -0.54]);
    let capeOriMat = mat4.clone(capeJoint.modelMatrix);
    body.add(capeJoint);
    capeJoint.add(cape);

    mat4.rotateX(angelRing.modelMatrix, angelRing.modelMatrix, 1.57)
    mat4.translate(angelRing.modelMatrix, angelRing.modelMatrix, [0, 0.36, 0]);
    head.add(angelRing);

    // End build steve

    // Start build cat

    let catBody = new Sprite(new CubeGeometry(0.24, 0.96, 0.36), new ColorMaterial([0.6, 0.6, 0.6, 1]));
    catBody.material.compile(renderer);
    catBody.material.bindPlaceholders(renderer, {
        aVertexPosition: new Float32Array(catBody.geometry.vertexPositions),
    }, {});

    let catHeadJoint = new Sprite(null, null);
    let catHead = new Sprite(new CubeGeometry(0.3, 0.3, 0.24), new ColorMaterial([0.6, 0.6, 0.6, 1]));
    catHead.material.compile(renderer);
    catHead.material.bindPlaceholders(renderer, {
        aVertexPosition: new Float32Array(catHead.geometry.vertexPositions),
    }, {});

    let catMouth = new Sprite(new CubeGeometry(0.18, 0.06, 0.12), new ColorMaterial([0.4, 0.4, 0.4, 1]));
    catMouth.material.compile(renderer);
    catMouth.material.bindPlaceholders(renderer, {
        aVertexPosition: new Float32Array(catMouth.geometry.vertexPositions),
    }, {});

    let catEarL = new Sprite(new CubeGeometry(0.06, 0.12, 0.06), new ColorMaterial([0.3, 0.3, 0.3, 1]));
    catEarL.material.compile(renderer);
    catEarL.material.bindPlaceholders(renderer, {
        aVertexPosition: new Float32Array(catEarL.geometry.vertexPositions),
    }, {});

    let catEarR = new Sprite(new CubeGeometry(0.06, 0.12, 0.06), new ColorMaterial([0.3, 0.3, 0.3, 1]));
    catEarR.material.compile(renderer);
    catEarR.material.bindPlaceholders(renderer, {
        aVertexPosition: new Float32Array(catEarR.geometry.vertexPositions),
    }, {});

    let catFrontFootLJoint = new Sprite(null, null);
    let catFrontFootL = new Sprite(new CubeGeometry(0.12, 0.12, 0.6), new ColorMaterial([0.6, 0.6, 0.6, 1]));
    catFrontFootL.material.compile(renderer);
    catFrontFootL.material.bindPlaceholders(renderer, {
        aVertexPosition: new Float32Array(catFrontFootL.geometry.vertexPositions),
    }, {});

    let catFrontFootRJoint = new Sprite(null, null);
    let catFrontFootR = new Sprite(new CubeGeometry(0.12, 0.12, 0.6), new ColorMaterial([0.6, 0.6, 0.6, 1]));
    catFrontFootR.material.compile(renderer);
    catFrontFootR.material.bindPlaceholders(renderer, {
        aVertexPosition: new Float32Array(catFrontFootR.geometry.vertexPositions),
    }, {});

    let catRearFootLJoint = new Sprite(null, null);
    let catRearFootL = new Sprite(new CubeGeometry(0.12, 0.12, 0.36), new ColorMaterial([0.6, 0.6, 0.6, 1]));
    catRearFootL.material.compile(renderer);
    catRearFootL.material.bindPlaceholders(renderer, {
        aVertexPosition: new Float32Array(catRearFootL.geometry.vertexPositions),
    }, {});

    let catRearFootRJoint = new Sprite(null, null);
    let catRearFootR = new Sprite(new CubeGeometry(0.12, 0.12, 0.36), new ColorMaterial([0.6, 0.6, 0.6, 1]));
    catRearFootR.material.compile(renderer);
    catRearFootR.material.bindPlaceholders(renderer, {
        aVertexPosition: new Float32Array(catRearFootR.geometry.vertexPositions),
    }, {});

    let catTailFrontJoint = new Sprite(null, null);
    let catTailFront = new Sprite(new CubeGeometry(0.06, 0.48, 0.06), new ColorMaterial([0.6, 0.6, 0.6, 1]));
    catTailFront.material.compile(renderer);
    catTailFront.material.bindPlaceholders(renderer, {
        aVertexPosition: new Float32Array(catTailFront.geometry.vertexPositions),
    }, {});

    let catTailRearJoint = new Sprite(null, null);
    let catTailRear = new Sprite(new CubeGeometry(0.06, 0.48, 0.06), new ColorMaterial([0.6, 0.6, 0.6, 1]));
    catTailRear.material.compile(renderer);
    catTailRear.material.bindPlaceholders(renderer, {
        aVertexPosition: new Float32Array(catTailRear.geometry.vertexPositions),
    }, {});


    // add cat head
    mat4.translate(catHeadJoint.modelMatrix, catHeadJoint.modelMatrix, [0, 0.48, 0.09]);
    mat4.translate(catHead.modelMatrix, catHead.modelMatrix, [0, 0.15, 0.03]);
    mat4.translate(catEarL.modelMatrix, catEarL.modelMatrix, [0.09, -0.09, 0.15]);
    mat4.translate(catEarR.modelMatrix, catEarR.modelMatrix, [-0.09, -0.09, 0.15])
    mat4.translate(catMouth.modelMatrix, catMouth.modelMatrix, [0, 0.18, -0.06]);
    catBody.add(catHeadJoint);
    catHeadJoint.add(catHead);
    catHead.add(catEarL);
    catHead.add(catEarR);
    catHead.add(catMouth);

    // add Front Left Leg;
    mat4.translate(catFrontFootLJoint.modelMatrix, catFrontFootLJoint.modelMatrix, [-0.063, 0.3, 0.12]);
    mat4.translate(catFrontFootL.modelMatrix, catFrontFootL.modelMatrix, [0, 0, -0.24]);
    catBody.add(catFrontFootLJoint);
    catFrontFootLJoint.add(catFrontFootL);

    // add Front Right Leg;
    mat4.translate(catFrontFootRJoint.modelMatrix, catFrontFootRJoint.modelMatrix, [0.063, 0.3, 0.12]);
    mat4.translate(catFrontFootR.modelMatrix, catFrontFootR.modelMatrix, [0, 0, -0.24]);
    catBody.add(catFrontFootRJoint);
    catFrontFootRJoint.add(catFrontFootR);

    // add Rear Left Leg;
    mat4.translate(catRearFootLJoint.modelMatrix, catRearFootLJoint.modelMatrix, [-0.063, -0.36, -0.12]);
    mat4.translate(catRearFootL.modelMatrix, catRearFootL.modelMatrix, [0, 0, -0.12])
    catBody.add(catRearFootLJoint);
    catRearFootLJoint.add(catRearFootL);

    // add Rear Left Leg;
    mat4.translate(catRearFootRJoint.modelMatrix, catRearFootRJoint.modelMatrix, [0.063, -0.36, -0.12]);
    mat4.translate(catRearFootR.modelMatrix, catRearFootR.modelMatrix, [0, 0, -0.12])
    catBody.add(catRearFootRJoint);
    catRearFootRJoint.add(catRearFootR);

    // add tail front
    mat4.translate(catTailFrontJoint.modelMatrix, catTailFrontJoint.modelMatrix, [0, -0.48, 0.12]);
    mat4.translate(catTailFront.modelMatrix, catTailFront.modelMatrix, [0, -0.21, 0]);
    catBody.add(catTailFrontJoint);
    catTailFrontJoint.add(catTailFront);

    // add tail Rear
    mat4.translate(catTailRearJoint.modelMatrix, catTailRearJoint.modelMatrix, [0, -0.21, 0]);
    mat4.translate(catTailRear.modelMatrix, catTailRear.modelMatrix, [0, -0.21, 0]);
    catTailFront.add(catTailRearJoint);
    catTailRearJoint.add(catTailRear);

    //End Build Cat

    let center = new Sprite(null, null);
    world.add(center);
    mat4.translate(catBody.modelMatrix, catBody.modelMatrix, [1.5, 0, -0.3]);
    center.add(catBody);

    mat4.rotateX(world.modelMatrix, world.modelMatrix, 6);
    mat4.rotateY(world.modelMatrix, world.modelMatrix, -45);

    // animations
    let walkAnimation = new engine.Animation({
        0: {
            rotation: 0,
        },
        0.25: {
            rotation: 0.8,
        },
        0.50: {
            rotation: 0,
        },
        0.75: {
            rotation: -0.8,
        },
        1: {
            rotation: 0,
        }
    }, 0.75, engine.linear, 0, Infinity);

    let jumpAnimation = new engine.Animation({
        0: {
            translate: 0,
        },
        0.5: {
            translate: 1.25219,
        },
        1: {
            translate: 0,
        },
    }, 0.3, engine.ease, 0, 1);

    let catWalkAnimation = new engine.Animation({
        0: {
            rotation: 0,
        },
        0.25: {
            rotation: 0.8,
        },
        0.50: {
            rotation: 0,
        },
        0.75: {
            rotation: -0.8,
        },
        1: {
            rotation: 0,
        }
    }, 0.5, engine.linear, 0, Infinity);

    let catTailAnimation = new engine.Animation({
        0: {
            rotation: 0,
        },
        0.25: {
            rotation: 0.8,
        },
        0.50: {
            rotation: 0,
        },
        0.75: {
            rotation: -0.8,
        },
        1: {
            rotation: 0,
        }
    }, 0.75, engine.linear, 0, Infinity);

    catWalkAnimation.start();
    catTailAnimation.start();

    // controls
    let isDragging = false;
    let lastMousePosition;
    let stevePosition = [0, 0, 0];
    let steveWalking = false;
    let steveWalkingDirection = "+y";
    let isPressed = Object();

    // start dragging
    canvas.addEventListener("mousedown", function (event) {
        lastMousePosition = [event.offsetX, event.offsetY];
        isDragging = true;
    });

    // dragging
    document.addEventListener("mousemove", function (event) {
        if (isDragging) {
            let position = [event.offsetX, event.offsetY];
            if (camera === thirdPersonCamera) {
                thirdPersonCameraTheta += - (position[0] - lastMousePosition[0]) / 2;
                thirdPersonCameraPhi += - (position[1] - lastMousePosition[1]) / 2;
                thirdPersonCameraPhi = Math.min(Math.max(thirdPersonCameraPhi, 1), 179) % 360;
            } else if (camera === freeCamera) {
                freeCameraTheta -= - (position[0] - lastMousePosition[0]) / 4;
                freeCameraPhi -= - (position[1] - lastMousePosition[1]) / 4;
                thirdPersonCameraPhi = Math.min(Math.max(thirdPersonCameraPhi, 1), 179) % 360;
            }

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
            if (camera === thirdPersonCamera) {
                thirdPersonCameraRadius *= (-0.25) * event.deltaY;
            }
        } else {
            if (camera === thirdPersonCamera) {
                thirdPersonCameraRadius /= 0.25 * event.deltaY;
            }
        }

        thirdPersonCameraRadius = Math.max(Math.min(thirdPersonCameraRadius, 20), 0.01);
    })

    // press shift to bend
    document.addEventListener("keydown", function (event) {
        isPressed[event.code] = true;
        if (event.code === "ShiftLeft") {
            if (camera === thirdPersonCamera || camera === firstPersonCamera) {
                // bend body
                mat4.identity(bodyJoint.modelMatrix);
                mat4.rotateX(bodyJoint.modelMatrix, bodyJoint.modelMatrix, -0.4);

                // bend head
                mat4.identity(headJoint.modelMatrix);
                mat4.translate(headJoint.modelMatrix, headJoint.modelMatrix, [0, 0, 0.36]);
                mat4.rotateX(headJoint.modelMatrix, headJoint.modelMatrix, 0.4);
            } else { // free camera
                // freeCameraPosition[2] += 0.1;
                // cannot do anything here, because this requires the key BEING pressed
                // move to onDraw()
            }
        } else if (event.code === "ControlLeft") {
            if (camera === freeCamera) {
                // freeCameraPosition[2] -= 0.1;
                // cannot do anything here
            }
        } else if (event.code === "KeyW" && event.repeat === false) { // it turns out that keydown is not really keydown: it triggers multiple times when you hold the key down
            if (camera === thirdPersonCamera || camera === firstPersonCamera) {
                steveWalking = true;
                steveWalkingDirection = "-y";
                walkAnimation.start();
            } else {
                //
            }
        } else if (event.code === "KeyS" && event.repeat === false) {
            if (camera === thirdPersonCamera || camera === firstPersonCamera) {
                steveWalking = true;
                steveWalkingDirection = "+y";
                walkAnimation.start();
            } else { // free camera
                // freeCameraPosition[1] -= 0.1
            }
        } else if (event.code === "Space" && event.repeat === false) {
            event.preventDefault();
            jumpAnimation.start();
        } else if (event.code === "KeyA" && event.repeat === false) {
            if (camera === thirdPersonCamera || camera === firstPersonCamera) {
                // 
            } else {
                // 
            }
        } else if (event.code === "KeyD" && event.repeat === false) {
            // 
        }
    });

    document.addEventListener("keyup", function (event) {
        isPressed[event.code] = false;
        if (event.code === "ShiftLeft") {
            mat4.identity(bodyJoint.modelMatrix);
            mat4.identity(headJoint.modelMatrix);
            mat4.translate(headJoint.modelMatrix, headJoint.modelMatrix, [0, 0, 0.36]);
        } else if (event.code === "KeyW" || event.code === "KeyS") {
            steveWalking = false;
            walkAnimation.stop();
        } else if (event.code === "KeyV") {
            if (camera === thirdPersonCamera) {
                camera = firstPersonCamera;
            } else if (camera === firstPersonCamera) {
                camera = freeCamera;
            } else {
                camera = thirdPersonCamera;
            }
        }
    });

    function onDraw() {
        // world rotation
        mat4.identity(world.modelMatrix);

        // set third person camera
        thirdPersonCamera.lookAt = stevePosition;
        thirdPersonCamera.position = PerspectiveCamera.getPositionFromSphere(
            thirdPersonCamera.lookAt,
            radians(thirdPersonCameraTheta),
            radians(thirdPersonCameraPhi),
            thirdPersonCameraRadius,
        );

        if (camera === freeCamera) {
            let facingVector = [ // lookAt - position
                freeCamera.lookAt[0] - freeCamera.position[0],
                freeCamera.lookAt[1] - freeCamera.position[1],
                freeCamera.lookAt[2] - freeCamera.position[2]
            ];
            let leftVector = vec3.create();
            vec3.cross(leftVector, [0, 0, 1], facingVector); // get a vector perpendicular to facing vector

            if (isPressed["KeyW"]) { // fly towards facing vector
                freeCameraPosition[0] += 0.04 * facingVector[0];
                freeCameraPosition[1] += 0.04 * facingVector[1];
                freeCameraPosition[2] += 0.04 * facingVector[2];
            }
            if (isPressed["KeyS"]) { // fly towards inverse facing vector
                freeCameraPosition[0] -= 0.04 * facingVector[0];
                freeCameraPosition[1] -= 0.04 * facingVector[1];
                freeCameraPosition[2] -= 0.04 * facingVector[2];
            }
            if (isPressed["KeyA"]) { // fly left, do not change height
                freeCameraPosition[0] += 0.04 * leftVector[0];
                freeCameraPosition[1] += 0.04 * leftVector[1];
                // freeCameraPosition[2] += 0.04 * facingVector[2];
            }
            if (isPressed["KeyD"]) { // fly right, do not change height
                freeCameraPosition[0] -= 0.04 * leftVector[0];
                freeCameraPosition[1] -= 0.04 * leftVector[1];
                // freeCameraPosition[2] += 0.04 * facingVector[2];
            }
            if (isPressed["ShiftLeft"]) { // fly upward
                freeCameraPosition[2] += 0.2;
            }
            if (isPressed["ControlLeft"]) { // fly downward
                freeCameraPosition[2] -= 0.2;
            }
        }

        freeCamera.position = freeCameraPosition;
        freeCamera.lookAt = PerspectiveCamera.getLookAtFromSphere(
            freeCamera.position,
            radians(freeCameraTheta),
            radians(freeCameraPhi),
            freeCameraRadius,
        );

        // body position
        if (steveWalking) {
            if (steveWalkingDirection === "-y") {
                stevePosition[1] -= 0.1;
            } else if (steveWalkingDirection === "+y") {
                stevePosition[1] += 0.1;
            }
        }

        stevePosition[2] = jumpAnimation.yield()["translate"];

        mat4.identity(hip.modelMatrix);
        mat4.translate(hip.modelMatrix, hip.modelMatrix, stevePosition);

        // arm rotation
        // let armRotation = document.querySelector("input[id=armPosition]").value / 100;
        let armRotation = walkAnimation.yield()["rotation"];
        mat4.identity(larmJoint.modelMatrix);
        mat4.translate(larmJoint.modelMatrix, larmJoint.modelMatrix, [0.36, 0, 0.24]);
        mat4.rotateX(larmJoint.modelMatrix, larmJoint.modelMatrix, armRotation);

        mat4.identity(rarmJoint.modelMatrix);
        mat4.translate(rarmJoint.modelMatrix, rarmJoint.modelMatrix, [-0.36, 0, 0.24]);
        mat4.rotateX(rarmJoint.modelMatrix, rarmJoint.modelMatrix, -armRotation);

        // leg rotation
        mat4.identity(llegJoint.modelMatrix);
        mat4.translate(llegJoint.modelMatrix, llegJoint.modelMatrix, [0.12, 0, 0]);
        mat4.rotateX(llegJoint.modelMatrix, llegJoint.modelMatrix, -armRotation);

        mat4.identity(rlegJoint.modelMatrix);
        mat4.translate(rlegJoint.modelMatrix, rlegJoint.modelMatrix, [-0.12, 0, 0]);
        mat4.rotateX(rlegJoint.modelMatrix, rlegJoint.modelMatrix, armRotation);

        // cape animation
        let angle = animateSin(0.12, 200);
        mat4.rotateX(capeJoint.modelMatrix, capeOriMat, angle);

        renderer.clear();
        renderer.render(world, camera);
        requestAnimationFrame(onDraw);

        // cat Rotation
        mat4.rotateZ(center.modelMatrix, center.modelMatrix, 0.01)

        // cat walk
        let catWalkArmRotation = catWalkAnimation.yield()["rotation"];
        mat4.identity(catFrontFootLJoint.modelMatrix);
        mat4.translate(catFrontFootLJoint.modelMatrix, catFrontFootLJoint.modelMatrix, [0, 0.3, 0.12]);
        mat4.rotateX(catFrontFootLJoint.modelMatrix, catFrontFootLJoint.modelMatrix, catWalkArmRotation);

        mat4.identity(catFrontFootRJoint.modelMatrix);
        mat4.translate(catFrontFootRJoint.modelMatrix, catFrontFootRJoint.modelMatrix, [0, 0.3, 0.12]);
        mat4.rotateX(catFrontFootRJoint.modelMatrix, catFrontFootRJoint.modelMatrix, -catWalkArmRotation);

        mat4.identity(catRearFootLJoint.modelMatrix);
        mat4.translate(catRearFootLJoint.modelMatrix, catRearFootLJoint.modelMatrix, [-0.063, -0.36, -0.12]);
        mat4.rotateX(catRearFootLJoint.modelMatrix, catRearFootLJoint.modelMatrix, -catWalkArmRotation);

        mat4.identity(catRearFootRJoint.modelMatrix);
        mat4.translate(catRearFootRJoint.modelMatrix, catRearFootRJoint.modelMatrix, [0.063, -0.36, -0.12]);
        mat4.rotateX(catRearFootRJoint.modelMatrix, catRearFootRJoint.modelMatrix, catWalkArmRotation);

        // cat tail
        let catTailRotation = catTailAnimation.yield()["rotation"];
        mat4.identity(catTailFrontJoint.modelMatrix);
        mat4.translate(catTailFrontJoint.modelMatrix, catTailFrontJoint.modelMatrix, [0, -0.48, 0.12]);
        mat4.rotateX(catTailFrontJoint.modelMatrix, catTailFrontJoint.modelMatrix, -catTailRotation);

        mat4.identity(catTailRearJoint.modelMatrix);
        mat4.translate(catTailRearJoint.modelMatrix, catTailRearJoint.modelMatrix, [0, -0.21, 0]);
        mat4.rotateX(catTailRearJoint.modelMatrix, catTailRearJoint.modelMatrix, catTailRotation);
    }

    window.addEventListener("resize", function (event) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        // reset camera aspect ratio
        thirdPersonCamera.aspectRatio = canvas.width / canvas.height;
        freeCamera.aspectRatio = canvas.width / canvas.height;

        // update gl.viewport
        renderer.viewport.width = canvas.width;
        renderer.viewport.height = canvas.height;
    });

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