import { vec3, mat4 } from "gl-matrix";
import { Renderer, Sprite, LineGeometry, ColorMaterial, PerspectiveCamera, radians, SphereGeometry, Animation, linear, PlaneGeometry, Light, GouraudShadingMaterial, PhongShadingMaterial } from "./engine";

let canvas = document.querySelector("canvas");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight * 0.8;

function deg2rad(deg) {
    return deg / 360 * 2 * Math.PI;
}


function getRandomNodePositionColorMapping(nodePositions) {
    let nodePositionColorMapping = {};
    nodePositions.forEach(function (nodePosition) {
        if (!(nodePosition in nodePositionColorMapping)) {
            nodePositionColorMapping[nodePosition] = [
                Math.random(),
                Math.random(),
                Math.random(),
                1,
            ];
        }
    });
    return nodePositionColorMapping;
}



function main() {

    let renderer = new Renderer(canvas);
    renderer.viewport = {
        x: 0,
        y: 0,
        width: canvas.width,
        height: canvas.height,
    }

    let world = new Sprite(null, null);

    let freeCameraPosition = [10, 10, 5];
    let freeCameraTheta = 45;
    let freeCameraPhi = 90;
    let freeCameraRadius = 10;
    let freeCamera = new PerspectiveCamera(
        [10, 10, 5],
        [0, 0, 5],
        [0, 0, 1],
        radians(30),
        canvas.width / canvas.height,
        0.1,
        100,
    );
    console.log(freeCamera);

    // how to get camera position from view matrix? it is the 4-th column of inverted view matrix.
    let a = vec3.create();
    let b = mat4.create();
    mat4.invert(b, freeCamera.viewMatrix);
    mat4.getTranslation(a, b);
    console.log(a);
    console.log(b);

    let xAxis = new Sprite(new LineGeometry([0, 0, 0], [1, 0, 0]), new ColorMaterial([1, 0, 0, 1]));
    let yAxis = new Sprite(new LineGeometry([0, 0, 0], [0, 1, 0]), new ColorMaterial([0, 1, 0, 1]));
    let zAxis = new Sprite(new LineGeometry([0, 0, 0], [0, 0, 1]), new ColorMaterial([0, 0, 1, 1]));
    [xAxis, yAxis, zAxis].forEach(function (axis) {
        axis.material.compile(renderer);
        axis.material.bindPlaceholders(renderer, {
            aVertexPosition: new Float32Array(axis.geometry.vertexPositions)
        }, {});
    });

    let plane = new Sprite(new PlaneGeometry(10, 10), new ColorMaterial([0.5, 0.5, 0.5, 1]));
    plane.material.compile(renderer, {
        aVertexPosition: "aVertexPosition",
    }, {});
    plane.material.bindPlaceholders(renderer, {
        aVertexPosition: new Float32Array(plane.geometry.vertexPositions),
    }, {});

    world.add(plane);

    world.add(xAxis);
    world.add(yAxis);
    world.add(zAxis);

    console.log(xAxis.geometry.normalVectors);

    // Start building ground grid
    let groundMaterial = new ColorMaterial([0.5, 0.5, 0.5, 1]);
    let ground = [];

    // for (let i = 0; i < 501; i++) {
    //     let xGround = new Sprite(new LineGeometry([-100, -100 + i, 0], [100, -100 + i, 0]), groundMaterial);
    //     xGround.material.compile(renderer);
    //     // xGround.material.bindPlaceholders(renderer, {
    //     //     aVertexPosition: new Float32Array(xGround.geometry.vertexPositions)
    //     // }, {});

    //     let yGround = new Sprite(new LineGeometry([-100 + i, -100, 0], [-100 + i, 100, 0]), groundMaterial);
    //     yGround.material.compile(renderer);
    //     // yGround.material.bindPlaceholders(renderer, {
    //     //     aVertexPosition: new Float32Array(yGround.geometry.vertexPositions)
    //     // }, {});

    //     world.add(xGround);
    //     world.add(yGround);

    //     ground.push(xGround);
    //     ground.push(yGround);
    // }

    let sphereContainer = new Sprite(null, null);
    let anotherSphereMaterial = new PhongShadingMaterial(
        [0.24725, 0.1995, 0.0745, 1.0],
        [0.75164, 0.60648, 0.22648, 1.0],
        [0.628281, 0.555802, 0.366065, 1.0],
        [0, 0, 0, 1],
        [51.2, 51.2, 51.2, 51.2],
        "phong",
    )
    let anotherSphere = new Sprite(new SphereGeometry(1, 32, 16), anotherSphereMaterial);
    anotherSphere.material.compile(renderer);
    anotherSphere.material.bindGeometry(anotherSphere.geometry);

    let light = new Light([1, 1, 1, 1], [1, 1, 1, 1], [1, 1, 1, 1]);
    let lightIndicator = new Sprite(new SphereGeometry(0.1, 6, 3), new ColorMaterial([1, 1, 1, 1]));
    lightIndicator.material.compile(renderer);
    lightIndicator.material.bindGeometry(lightIndicator.geometry);
    lightIndicator.add(light);

    world.add(lightIndicator);

    mat4.translate(sphereContainer.modelMatrix, sphereContainer.modelMatrix, [0, 0, 5]);
    sphereContainer.add(anotherSphere);
    world.add(sphereContainer);

    let sphereAnimation = new Animation({
        0: {
            rotation: 0,
        },
        0.5: {
            rotation: 180,
        },
        1: {
            rotation: 360,
        },
    }, 5, linear, 0, Infinity);
    sphereAnimation.start();

    // controls
    let isDragging = false;
    let lastMousePosition;
    let isPressed = Object();

    // start dragging
    canvas.addEventListener("mousedown", function (event) {
        lastMousePosition = [event.offsetX, event.offsetY];
        isDragging = true;
        isPressed[event.button] = true;
    });

    // dragging
    document.addEventListener("mousemove", function (event) {
        let position = [event.offsetX, event.offsetY];
        if (isDragging && isPressed[0]) {
            freeCameraTheta -= - (position[0] - lastMousePosition[0]) / 8;
            freeCameraPhi -= - (position[1] - lastMousePosition[1]) / 8;
            freeCameraPhi = Math.min(Math.max(freeCameraPhi, 1), 179) % 360;
        }
        lastMousePosition = position;
    });

    // prevent right mouse click menu
    canvas.addEventListener("contextmenu", function (event) {
        event.preventDefault();
        return false;
    });

    // stop dragging
    document.addEventListener("mouseup", function (event) {
        isDragging = false;
        isPressed[event.button] = false;
    });

    // press shift to bend
    document.addEventListener("keydown", function (event) {
        isPressed[event.code] = true;
    });

    document.addEventListener("keyup", function (event) {
        isPressed[event.code] = false;
    });

    function onDraw() {
        let rotation = sphereAnimation.yield()["rotation"];

        // mat4.identity(sphere.modelMatrix);
        // mat4.rotateX(sphere.modelMatrix, sphere.modelMatrix, deg2rad(rotation));

        mat4.identity(anotherSphere.modelMatrix);
        mat4.rotateY(anotherSphere.modelMatrix, anotherSphere.modelMatrix, deg2rad(rotation));

        mat4.identity(lightIndicator.modelMatrix);
        mat4.rotateZ(lightIndicator.modelMatrix, lightIndicator.modelMatrix, deg2rad(rotation));
        mat4.translate(lightIndicator.modelMatrix, lightIndicator.modelMatrix, [2, 2, 5]);

        // set free camera
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

        freeCamera.position = freeCameraPosition;
        freeCamera.lookAt = PerspectiveCamera.getLookAtFromSphere(
            freeCamera.position,
            radians(freeCameraTheta),
            radians(freeCameraPhi),
            freeCameraRadius,
        );

        renderer.clear();
        renderer.render(world, freeCamera);

        requestAnimationFrame(onDraw);
    }

    window.addEventListener("resize", function () {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight * 0.8;

        freeCamera.aspectRatio = canvas.width / canvas.height;
        // update gl.viewport
        renderer.viewport.width = canvas.width;
        renderer.viewport.height = canvas.height;
    });

    document.querySelector("#toggle-ground-plane").addEventListener("click", function () {
        if (ground[0].material === null) {
            ground.forEach(sprite => {
                sprite.material = groundMaterial;
            })
        } else {
            ground.forEach(sprite => {
                sprite.material = null;
            })
        }
    });

    document.querySelector("#toggle-sphere").addEventListener("click", function () {
        if (sphere.material === null) {
            sphere.material = sphereMaterial;
        } else {
            sphere.material = null;
        }
    });

    document.querySelector("#toggle-another-sphere").addEventListener("click", function () {
        if (anotherSphere.material === null) {
            anotherSphere.material = anotherSphereMaterial;
        } else {
            anotherSphere.material = null;
        }
    });

    onDraw();
}

window.onload = main;