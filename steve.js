import { mat4, vec3, quat } from "gl-matrix";
import { Light, Renderer, Material, Sprite, LineGeometry, ColorMaterial, CubeGeometry, RotationGeometry, RingGeometry, CylinderGeometry, SphereGeometry, PerspectiveCamera, OrthogonalCamera, radians, deepCopy, FrustumGeometry, PhongShadingMaterial, GouraudShadingMaterial, Animation, easeInOut, AmbientLight, PointLight, PhongShadingPhongLightingMaterial, PhongShadingBlinnPhongLightingMaterial, GouraudShadingPhongLightingMaterial, GouraudShadingBlinnPhongLightingMaterial, MaterialMultiplexer } from "./engine";
import * as engine from "./engine.ts";

let canvas = document.querySelector("canvas");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight * 0.8;

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

function getRandomColors(nodePositions) {
    let nodePositionColorMapping = getRandomNodePositionColorMapping(nodePositions);
    return nodePositions.map(function (nodePosition) {
        return nodePositionColorMapping[nodePosition];
    });
}

let defaultAttributePlaceholders = {
    aVertexPosition: "aVertexPosition",
    aVertexColor: "aVertexColor",
};
let defaultUniformPlaceholders = {
    uModelViewProjectionMatrix: "uModelViewProjectionMatrix",
};

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
    renderer.viewport = {
        x: 0,
        y: 0,
        width: canvas.width,
        height: canvas.height,
    };

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
        1000,
    );

    let firstPersonCameraTheta = 90;
    let firstPersonCameraPhi = 90;
    let firstPersonCameraRadius = 10;
    let firstPersonCamera = new PerspectiveCamera(
        [5, 5, 5],
        [0, 0, 0],
        [0, 0, 1],
        radians(42),
        canvas.width / canvas.height,
        0.1,
        100,
    );

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
        100,
    );
    let camera = thirdPersonCamera;

    // initial shading method set to gouraud
    let shadingMethod = "gouraud";
    // initial lighting method set to phong
    let lightingMethod = "phong"

    // callback for material multiplexer
    function whichMaterial() {
        // choose shading and lighting method
        if (shadingMethod === "gouraud" && lightingMethod === "phong") {
            return "gouraudShadingPhongLighting";
        } else if (shadingMethod === "gouraud" && lightingMethod === "blinn-phong") {
            return "gouraudShadingBlinnPhongLighting";
        } else if (shadingMethod === "phong" && lightingMethod === "phong") {
            return "phongShadingPhongLighting";
        } else {
            return "phongShadingBlinnPhongLighting";
        }
    }

    // materials
    let goldMaterials = {
        phongShadingPhongLighting: new PhongShadingPhongLightingMaterial(
            [0.35, 0.24, 0.19, 1.0],
            [0.702, 0.482, 0.384, 1],
            [0.628281, 0.555802, 0.366065, 1.0],
            [0, 0, 0, 1],
            [51.2, 51.2, 51.2, 51.2],
        ),
        phongShadingBlinnPhongLighting: new PhongShadingBlinnPhongLightingMaterial(
            [0.35, 0.24, 0.19, 1.0],
            [0.702, 0.482, 0.384, 1],
            [0.628281, 0.555802, 0.366065, 1.0],
            [0, 0, 0, 1],
            [51.2, 51.2, 51.2, 51.2],
        ),
        gouraudShadingPhongLighting: new GouraudShadingPhongLightingMaterial(
            [0.35, 0.24, 0.19, 1.0],
            [0.702, 0.482, 0.384, 1],
            [0.628281, 0.555802, 0.366065, 1.0],
            [0, 0, 0, 1],
            [51.2, 51.2, 51.2, 51.2],
        ),
        gouraudShadingBlinnPhongLighting: new GouraudShadingBlinnPhongLightingMaterial(
            [0.35, 0.24, 0.19, 1.0],
            [0.702, 0.482, 0.384, 1],
            [0.628281, 0.555802, 0.366065, 1.0],
            [0, 0, 0, 1],
            [51.2, 51.2, 51.2, 51.2],
        ),
    };

    let skinMaterials = {
        phongShadingPhongLighting: new PhongShadingPhongLightingMaterial(
            [0.2125, 0.1275, 0.054, 1.0],
            [0.714, 0.4284, 0.18144, 1.0],
            [0.393548, 0.271906, 0.166721, 1.0],
            [0.0, 0.0, 0.0, 1.0],
            [25.6, 25.6, 25.6, 25.6],
        ),
        phongShadingBlinnPhongLighting: new PhongShadingBlinnPhongLightingMaterial(
            [0.2125, 0.1275, 0.054, 1.0],
            [0.714, 0.4284, 0.18144, 1.0],
            [0.393548, 0.271906, 0.166721, 1.0],
            [0.0, 0.0, 0.0, 1.0],
            [25.6, 25.6, 25.6, 25.6],
        ),
        gouraudShadingPhongLighting: new GouraudShadingPhongLightingMaterial(
            [0.2125, 0.1275, 0.054, 1.0],
            [0.714, 0.4284, 0.18144, 1.0],
            [0.393548, 0.271906, 0.166721, 1.0],
            [0.0, 0.0, 0.0, 1.0],
            [25.6, 25.6, 25.6, 25.6],
        ),
        gouraudShadingBlinnPhongLighting: new GouraudShadingBlinnPhongLightingMaterial(
            [0.2125, 0.1275, 0.054, 1.0],
            [0.714, 0.4284, 0.18144, 1.0],
            [0.393548, 0.271906, 0.166721, 1.0],
            [0.0, 0.0, 0.0, 1.0],
            [25.6, 25.6, 25.6, 25.6],
        ),
    };

    let clothMaterials = {
        phongShadingPhongLighting: new PhongShadingPhongLightingMaterial(
            [0.05, 0.05, 0.05, 1.0],
            [0.0, 0.2, 0.6, 1.0],
            [0.1, 0.2, 0.3, 1.0],
            [0.0, 0.0, 0.0, 1.0],
            [5, 5, 5, 5],
        ),
        phongShadingBlinnPhongLighting: new PhongShadingBlinnPhongLightingMaterial(
            [0.05, 0.05, 0.05, 1.0],
            [0.0, 0.2, 0.6, 1.0],
            [0.1, 0.2, 0.3, 1.0],
            [0.0, 0.0, 0.0, 1.0],
            [5, 5, 5, 5],
        ),
        gouraudShadingPhongLighting: new GouraudShadingPhongLightingMaterial(
            [0.05, 0.05, 0.05, 1.0],
            [0.0, 0.2, 0.6, 1.0],
            [0.1, 0.2, 0.3, 1.0],
            [0.0, 0.0, 0.0, 1.0],
            [5, 5, 5, 5],
        ),
        gouraudShadingBlinnPhongLighting: new GouraudShadingBlinnPhongLightingMaterial(
            [0.05, 0.05, 0.05, 1.0],
            [0.0, 0.2, 0.6, 1.0],
            [0.1, 0.2, 0.3, 1.0],
            [0.0, 0.0, 0.0, 1.0],
            [5, 5, 5, 5],
        ),
    };

    let trousersMaterials = {
        phongShadingPhongLighting: new PhongShadingPhongLightingMaterial(
            [0.1, 0.1, 0.1, 1.0],
            [0.6, 0.0, 0.0, 1.0],
            [0.6, 0.6, 0.6, 1.0],
            [0.0, 0.0, 0.0, 1.0],
            [100, 100, 100, 100],
        ),
        phongShadingBlinnPhongLighting: new PhongShadingBlinnPhongLightingMaterial(
            [0.1, 0.1, 0.1, 1.0],
            [0.6, 0.0, 0.0, 1.0],
            [0.6, 0.6, 0.6, 1.0],
            [0.0, 0.0, 0.0, 1.0],
            [100, 100, 100, 100],
        ),
        gouraudShadingPhongLighting: new GouraudShadingPhongLightingMaterial(
            [0.1, 0.1, 0.1, 1.0],
            [0.6, 0.0, 0.0, 1.0],
            [0.6, 0.6, 0.6, 1.0],
            [0.0, 0.0, 0.0, 1.0],
            [100, 100, 100, 100],
        ),
        gouraudShadingBlinnPhongLighting: new GouraudShadingBlinnPhongLightingMaterial(
            [0.1, 0.1, 0.1, 1.0],
            [0.6, 0.0, 0.0, 1.0],
            [0.6, 0.6, 0.6, 1.0],
            [0.0, 0.0, 0.0, 1.0],
            [100, 100, 100, 100],
        ),
    };

    let catMaterials = {
        phongShadingPhongLighting: new PhongShadingPhongLightingMaterial(
            [0.19225, 0.19225, 0.19225, 1.0],
            [0.50754, 0.50754, 0.50754, 1.0],
            [0.508273, 0.508273, 0.508273, 1.0],
            [0.0, 0.0, 0.0, 1.0],
            [51.2, 51.2, 51.2, 51.2],
        ),
        phongShadingBlinnPhongLighting: new PhongShadingBlinnPhongLightingMaterial(
            [0.19225, 0.19225, 0.19225, 1.0],
            [0.50754, 0.50754, 0.50754, 1.0],
            [0.508273, 0.508273, 0.508273, 1.0],
            [0.0, 0.0, 0.0, 1.0],
            [51.2, 51.2, 51.2, 51.2],
        ),
        gouraudShadingPhongLighting: new GouraudShadingPhongLightingMaterial(
            [0.19225, 0.19225, 0.19225, 1.0],
            [0.50754, 0.50754, 0.50754, 1.0],
            [0.508273, 0.508273, 0.508273, 1.0],
            [0.0, 0.0, 0.0, 1.0],
            [51.2, 51.2, 51.2, 51.2],
        ),
        gouraudShadingBlinnPhongLighting: new GouraudShadingBlinnPhongLightingMaterial(
            [0.19225, 0.19225, 0.19225, 1.0],
            [0.50754, 0.50754, 0.50754, 1.0],
            [0.508273, 0.508273, 0.508273, 1.0],
            [0.0, 0.0, 0.0, 1.0],
            [51.2, 51.2, 51.2, 51.2],
        ),
    };

    let catSecondMaterials = {
        phongShadingPhongLighting: new PhongShadingPhongLightingMaterial(
            [0.1745, 0.01175, 0.01175, 0.55],
            [0.61424, 0.04136, 0.04136, 0.55],
            [0.727811, 0.626959, 0.626959, 0.55],
            [0.0, 0.0, 0.0, 1.0],
            [76.8, 76.8, 76.8, 76.8],
        ),
        phongShadingBlinnPhongLighting: new PhongShadingBlinnPhongLightingMaterial(
            [0.1745, 0.01175, 0.01175, 0.55],
            [0.61424, 0.04136, 0.04136, 0.55],
            [0.727811, 0.626959, 0.626959, 0.55],
            [0.0, 0.0, 0.0, 1.0],
            [76.8, 76.8, 76.8, 76.8],
        ),
        gouraudShadingPhongLighting: new GouraudShadingPhongLightingMaterial(
            [0.1745, 0.01175, 0.01175, 0.55],
            [0.61424, 0.04136, 0.04136, 0.55],
            [0.727811, 0.626959, 0.626959, 0.55],
            [0.0, 0.0, 0.0, 1.0],
            [76.8, 76.8, 76.8, 76.8],
        ),
        gouraudShadingBlinnPhongLighting: new GouraudShadingBlinnPhongLightingMaterial(
            [0.1745, 0.01175, 0.01175, 0.55],
            [0.61424, 0.04136, 0.04136, 0.55],
            [0.727811, 0.626959, 0.626959, 0.55],
            [0.0, 0.0, 0.0, 1.0],
            [76.8, 76.8, 76.8, 76.8],
        ),
    };

    let chromeMaterials = {
        phongShadingPhongLighting: new PhongShadingPhongLightingMaterial(
            [0.25, 0.25, 0.25, 1.0],
            [0.4, 0.4, 0.4, 1.0],
            [0.774597, 0.774597, 0.774597, 1.0],
            [0.0, 0.0, 0.0, 1.0],
            [76.8, 76.8, 76.8, 76.8],
        ),
        phongShadingBlinnPhongLighting: new PhongShadingBlinnPhongLightingMaterial(
            [0.25, 0.25, 0.25, 1.0],
            [0.4, 0.4, 0.4, 1.0],
            [0.774597, 0.774597, 0.774597, 1.0],
            [0.0, 0.0, 0.0, 1.0],
            [76.8, 76.8, 76.8, 76.8],
        ),
        gouraudShadingPhongLighting: new GouraudShadingPhongLightingMaterial(
            [0.25, 0.25, 0.25, 1.0],
            [0.4, 0.4, 0.4, 1.0],
            [0.774597, 0.774597, 0.774597, 1.0],
            [0.0, 0.0, 0.0, 1.0],
            [76.8, 76.8, 76.8, 76.8],
        ),
        gouraudShadingBlinnPhongLighting: new GouraudShadingBlinnPhongLightingMaterial(
            [0.25, 0.25, 0.25, 1.0],
            [0.4, 0.4, 0.4, 1.0],
            [0.774597, 0.774597, 0.774597, 1.0],
            [0.0, 0.0, 0.0, 1.0],
            [76.8, 76.8, 76.8, 76.8],
        ),
    };
    let goldMaterial = new MaterialMultiplexer(goldMaterials, whichMaterial);
    let skinMaterial = new MaterialMultiplexer(skinMaterials, whichMaterial);
    let clothMaterial = new MaterialMultiplexer(clothMaterials, whichMaterial);
    let trousersMaterial = new MaterialMultiplexer(trousersMaterials, whichMaterial);
    let catMaterial = new MaterialMultiplexer(catMaterials, whichMaterial);
    let catSecondMaterial = new MaterialMultiplexer(catSecondMaterials, whichMaterial);
    let chromeMaterial = new MaterialMultiplexer(chromeMaterials, whichMaterial);

    let xAxis = new Sprite(new LineGeometry([0, 0, 0], [1, 0, 0]), new ColorMaterial([1, 0, 0, 1]));
    let yAxis = new Sprite(new LineGeometry([0, 0, 0], [0, 1, 0]), new ColorMaterial([0, 1, 0, 1]));
    let zAxis = new Sprite(new LineGeometry([0, 0, 0], [0, 0, 1]), new ColorMaterial([0, 0, 1, 1]));

    world.add(xAxis);
    world.add(yAxis);
    world.add(zAxis);

    // reference ball
    let ball = new Sprite(new SphereGeometry(2, 32, 32), goldMaterial);
    mat4.translate(ball.modelMatrix, ball.modelMatrix, [0, 0, 5]);
    world.add(ball);

    // // Start building ground plain
    // for (let i = 0; i < 20; i++) {
    //     for (let j = 0; j < 20; j++) {
    //         let ground = new Sprite(new CubeGeometry(1,1, 0.1), chromeMaterial);
    //         mat4.translate(ground.modelMatrix, ground.modelMatrix, [-10.5 + i, -10.5 + j, 0.5]);
    //         world.add(ground);
    //     }
    // }

    // tree
    let tree = new Sprite(new RotationGeometry(0.2, 16, [0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4]), chromeMaterial);
    mat4.translate(tree.modelMatrix, tree.modelMatrix, [0, 10, 0]);
    world.add(tree);

    let gyro = new Sprite(new RotationGeometry(0.2, 20, [0.01, 0.2, 0.4, 0.6, 0.8, 0.6, 0.4, 0.2, 0.1, 0.09, 0.08, 0.07, 0.06, 0.05, 0.04].map(v => 2 * v)), goldMaterial);
    let gyroTranslationMatrix = mat4.create();
    mat4.fromTranslation(gyroTranslationMatrix, [0, -10, 0]);
    world.add(gyro);
    console.log(gyro);

    // ambient light
    let ambientLight = new AmbientLight([0.1, 0.1, 0.1, 1]);
    world.add(ambientLight);

    let light = new PointLight([3, 3, 0, 1], [3, 3, 0, 1]);
    let lightIndicator = new Sprite(new SphereGeometry(0.1, 6, 3), new ColorMaterial([1, 1, 1, 1]));
    lightIndicator.add(light);

    let skyLight1 = new PointLight([5, 5, 5, 1], [5, 5, 5, 1]);
    let skyLight2 = new PointLight([5, 5, 5, 1], [5, 5, 5, 1]);
    let skyLightIndecator1 = new Sprite(new SphereGeometry(0.1, 6, 3), new ColorMaterial([1, 1, 1, 1]));
    let skyLightIndecator2 = new Sprite(new SphereGeometry(0.1, 6, 3), new ColorMaterial([1, 1, 1, 1]));
    skyLightIndecator1.add(skyLight1);
    skyLightIndecator2.add(skyLight2);
    mat4.translate(skyLightIndecator1.modelMatrix, skyLightIndecator1.modelMatrix, [5, 0, 0]);
    mat4.translate(skyLightIndecator2.modelMatrix, skyLightIndecator2.modelMatrix, [-5, 0, 0]);
    let lightCenter = new Sprite(null, null);
    mat4.translate(lightCenter.modelMatrix, lightCenter.modelMatrix, [0, 0, 5]);
    lightCenter.add(skyLightIndecator1);
    lightCenter.add(skyLightIndecator2);
    world.add(lightCenter);

    // camera light
    // let cameraLight = new PointLight([5, 5, 5, 1], [5, 5, 5, 1]);
    // world.add(cameraLight);


    // random grass block

    for (let i = 0; i < 20; i++) {
        for (let j = 0; j < 20; j++) {
            let random = Math.floor(Math.random() * 10);
            if (i < 9 || i > 11) {
                if (random < 3) {
                    // let grass = new Sprite(new CubeGeometry(1, 1, 1), new ColorMaterial([0.702, 0.482, 0.384, 1]));
                    let grass = new Sprite(new CubeGeometry(1, 1, 1), goldMaterial);
                    mat4.translate(grass.modelMatrix, grass.modelMatrix, [-10.5 + i, -10.5 + j, 0.5]);
                    world.add(grass);
                    if (random < 2) {
                        let grass2 = new Sprite(new CubeGeometry(1, 1, 1), goldMaterial);
                        mat4.translate(grass2.modelMatrix, grass2.modelMatrix, [-10.5 + i, -10.5 + j, 1.5]);
                        world.add(grass2);
                    }
                }
            }
        }
    }

    // random cloud
    let clouds = [];
    let cloudAnimations = [];
    let cloudMaterial = new ColorMaterial([1, 1, 1, 1])

    // for (let i = 0; i < 100; i++) {
    //     for (let j = 0; j < 100; j++) {
    //         let random = Math.floor(Math.random() * 70);
    //         if (i < 9 || i > 11) {
    //             if (random < 1) {
    //                 let w = Math.floor(1 + Math.random() * 8);
    //                 let l = Math.floor(1 + Math.random() * 8);
    //                 let cloud = new Sprite(new CubeGeometry(w, l, 1), cloudMaterial);
    //                 mat4.translate(cloud.modelMatrix, cloud.modelMatrix, [-49.5 + i, -49.5 + j, 10]);
    //                 world.add(cloud);
    //                 clouds.push(cloud);
    //                 let cloudAnimation = new engine.Animation(
    //                     {
    //                         0: {
    //                             translateX: -49.5 + i,
    //                         },
    //                         0.5: {
    //                             translateX: -49.5 + i + 100,
    //                         },
    //                         0.5000000001: { // go back to start point immediately
    //                             translateX: -49.5 + i - 100,
    //                         },
    //                         1.0: {
    //                             translateX: -49.5 + i,
    //                         }
    //                     }, 50 / Math.random(), engine.linear, 0, Infinity
    //                 );
    //                 cloudAnimation.start();
    //                 cloudAnimations.push(cloudAnimation);
    //             }
    //         }
    //     }
    // }

    // Start building steve
    let hip = new Sprite(null, null);

    let bodyJoint = new Sprite(null, null);
    let body = new Sprite(new CubeGeometry(0.48, 0.24, 0.72), clothMaterial);

    let headJoint = new Sprite(null, null);
    let head = new Sprite(new CubeGeometry(0.48, 0.48, 0.48), skinMaterial);

    let larmJoint = new Sprite(null, null);
    let larm = new Sprite(new CubeGeometry(0.24, 0.24, 0.72), skinMaterial);

    let armxAxis = new Sprite(new LineGeometry([0, 0, 0], [0.5, 0, 0]), new ColorMaterial([1, 0, 0, 1]));
    let armyAxis = new Sprite(new LineGeometry([0, 0, 0], [0, 0.5, 0]), new ColorMaterial([0, 1, 0, 1]));
    let armzAxis = new Sprite(new LineGeometry([0, 0, 0], [0, 0, 0.5]), new ColorMaterial([0, 0, 1, 1]));
    [armxAxis, armyAxis, armzAxis].forEach(function (axis) {
        larmJoint.add(axis);
    });
    // sphere on left hand
    // let sphere = new Sprite(new SphereGeometry(0.15, 32, 16), new ColorMaterial([1, 0, 0, 1]));
    // sphere.material.compile(renderer);
    // sphere.material.bindPlaceholders(renderer, {
    //     aVertexPosition: new Float32Array(sphere.geometry.vertexPositions)
    // }, {});
    // sphere.geometry.mode = WebGL2RenderingContext.LINE_STRIP;

    // sword on left hand
    let torch = new Sprite(new RotationGeometry(0.5, 20, [0.05, 0.10]), goldMaterial);
    mat4.rotateX(torch.modelMatrix, torch.modelMatrix, 1.57);
    mat4.translate(torch.modelMatrix, torch.modelMatrix, [0, -0.24, 0]);
    larm.add(torch);

    mat4.translate(lightIndicator.modelMatrix, lightIndicator.modelMatrix, [0, 0, 0.5]);
    torch.add(lightIndicator);

    let rarmJoint = new Sprite(null, null);
    let rarm = new Sprite(new CubeGeometry(0.24, 0.24, 0.72), skinMaterial);

    // shield on right hand
    let shield = new Sprite(new SphereGeometry(0.5, 16, 8, 2 * Math.PI, Math.PI / 3), chromeMaterial);
    shield.material.compile(renderer, defaultAttributePlaceholders, defaultUniformPlaceholders);
    shield.material.bindPlaceholders(renderer, {
        aVertexPosition: new Float32Array(shield.geometry.vertexPositions),
        aVertexColor: new Float32Array(getRandomColors(shield.geometry.nodePositions).flat()),
    }, {});

    let llegJoint = new Sprite(null, null);
    let lleg = new Sprite(new CubeGeometry(0.24, 0.24, 0.72), trousersMaterial);

    let rlegJoint = new Sprite(null, null);
    let rleg = new Sprite(new CubeGeometry(0.24, 0.24, 0.72), trousersMaterial);

    let capeJoint = new Sprite(null, null);
    let cape = new Sprite(new CubeGeometry(0.48, 0.06, 1.08), trousersMaterial);
    let nodePositionColorMapping = {}; // color for each node


    let angelRing = new Sprite(new engine.TorusGeometry(0.24, 0.06, 32, 32), new ColorMaterial([1, 1, 0, 1]));

    mat4.translate(hip.modelMatrix, hip.modelMatrix, [0, 0, 0.72]);
    world.add(hip);

    mat4.translate(body.modelMatrix, body.modelMatrix, [0, 0, 0.36]);
    hip.add(bodyJoint);
    bodyJoint.add(body);

    // larm
    mat4.translate(larmJoint.modelMatrix, larmJoint.modelMatrix, [0.36, 0, 0.24]);
    mat4.translate(larm.modelMatrix, larm.modelMatrix, [0, 0, -0.24]);
    body.add(larmJoint);
    larmJoint.add(larm);

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

    let catBody = new Sprite(new CubeGeometry(0.24, 0.96, 0.36), catMaterial);

    let catxAxis = new Sprite(new LineGeometry([0, 0, 0], [0.5, 0, 0]), new ColorMaterial([1, 0, 0, 1]));
    let catyAxis = new Sprite(new LineGeometry([0, 0, 0], [0, 2, 0]), new ColorMaterial([0, 1, 0, 1]));
    let catzAxis = new Sprite(new LineGeometry([0, 0, 0], [0, 0, 0.5]), new ColorMaterial([0, 0, 1, 1]));
    [catxAxis, catyAxis, catzAxis].forEach(function (axis) {
        catBody.add(axis);
    });

    let catHeadJoint = new Sprite(null, null);
    let catHead = new Sprite(new CubeGeometry(0.3, 0.3, 0.24), catMaterial);

    let catMouth = new Sprite(new CubeGeometry(0.18, 0.06, 0.12), catSecondMaterial);

    let catEarL = new Sprite(new CubeGeometry(0.06, 0.12, 0.06), catSecondMaterial);

    let catEarR = new Sprite(new CubeGeometry(0.06, 0.12, 0.06), catSecondMaterial);

    let catFrontFootLJoint = new Sprite(null, null);
    let catFrontFootL = new Sprite(new CubeGeometry(0.12, 0.12, 0.6), catMaterial);

    let catFrontFootRJoint = new Sprite(null, null);
    let catFrontFootR = new Sprite(new CubeGeometry(0.12, 0.12, 0.6), catMaterial);

    let catRearFootLJoint = new Sprite(null, null);
    let catRearFootL = new Sprite(new CubeGeometry(0.12, 0.12, 0.36), catMaterial);

    let catRearFootRJoint = new Sprite(null, null);
    let catRearFootR = new Sprite(new CubeGeometry(0.12, 0.12, 0.36), catMaterial);

    let catTailFrontJoint = new Sprite(null, null);
    let catTailFront = new Sprite(new CubeGeometry(0.06, 0.48, 0.06), catMaterial);

    let catTailRearJoint = new Sprite(null, null);
    let catTailRear = new Sprite(new CubeGeometry(0.06, 0.48, 0.06), catMaterial);

    mat4.translate(catBody.modelMatrix, catBody.modelMatrix, [0, 0, 0.7]);
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
            translate: 0.72,
        },
        0.5: {
            translate: 1.25219 + 0.72,
        },
        1: {
            translate: 0.72,
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
    let steveBending = false;
    let steveWalkingDirection = "+y";
    let isPressed = Object();
    let gyroQuaternion = quat.create();

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
            if (camera === thirdPersonCamera) {
                thirdPersonCameraTheta += - (position[0] - lastMousePosition[0]) / 2;
                thirdPersonCameraPhi += - (position[1] - lastMousePosition[1]) / 2;
                thirdPersonCameraPhi = Math.min(Math.max(thirdPersonCameraPhi, 1), 179) % 360;
            } else if (camera === freeCamera) {
                freeCameraTheta -= - (position[0] - lastMousePosition[0]) / 8;
                freeCameraPhi -= - (position[1] - lastMousePosition[1]) / 8;
                freeCameraPhi = Math.min(Math.max(freeCameraPhi, 1), 179) % 360;
            } else if (camera === firstPersonCamera) {
                firstPersonCameraTheta -= - (position[0] - lastMousePosition[0]) / 8;
                firstPersonCameraPhi -= - (position[1] - lastMousePosition[1]) / 8;
                firstPersonCameraPhi = Math.min(Math.max(firstPersonCameraPhi, 1), 179) % 360;
                firstPersonCameraTheta = Math.min(Math.max(firstPersonCameraTheta, 1), 179) % 360;
            }

        } else if (isDragging && isPressed[2]) {
            // quaternion-based rotation
            let upVector = vec3.fromValues(
                camera.upVector[0],
                camera.upVector[1],
                camera.upVector[2],
            );
            vec3.normalize(upVector, upVector);

            let viewVector = vec3.fromValues(
                camera.lookAt[0] - camera.position[0],
                camera.lookAt[1] - camera.position[1],
                camera.lookAt[2] - camera.position[2],
            );
            vec3.normalize(viewVector, viewVector);

            let rightVector = vec3.create();
            vec3.cross(rightVector, viewVector, upVector);

            let deltaQuaternion = quat.create();

            quat.setAxisAngle(deltaQuaternion, rightVector, radians(position[1] - lastMousePosition[1]) / 2);
            quat.multiply(gyroQuaternion, deltaQuaternion, gyroQuaternion);

            quat.setAxisAngle(deltaQuaternion, upVector, radians(position[0] - lastMousePosition[0]) / 2);
            quat.multiply(gyroQuaternion, deltaQuaternion, gyroQuaternion)
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
                steveBending = true;
                // bend body
                mat4.identity(bodyJoint.modelMatrix);
                mat4.rotateX(bodyJoint.modelMatrix, bodyJoint.modelMatrix, 0.4);

                // bend head
                mat4.identity(headJoint.modelMatrix);
                mat4.translate(headJoint.modelMatrix, headJoint.modelMatrix, [0, 0, 0.36]);
                mat4.rotateX(headJoint.modelMatrix, headJoint.modelMatrix, -0.4);
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
            steveBending = false;
            mat4.identity(bodyJoint.modelMatrix);
            mat4.identity(headJoint.modelMatrix);
            mat4.translate(headJoint.modelMatrix, headJoint.modelMatrix, [0, 0, 0.36]);
        } else if (event.code === "KeyW" || event.code === "KeyS") {
            steveWalking = false;
            walkAnimation.stop();
        } else if (event.code === "KeyV") {
            if (camera === thirdPersonCamera) {
                camera = firstPersonCamera;
                document.querySelector("#which-camera").textContent = "first person";
            } else if (camera === firstPersonCamera) {
                camera = freeCamera;
                document.querySelector("#which-camera").textContent = "free fly";
            } else {
                camera = thirdPersonCamera;
                document.querySelector("#which-camera").textContent = "third person";
            }
        }
    });

    function onDraw() {
        // body position
        stevePosition[2] = jumpAnimation.yield()["translate"];
        if (steveWalking) {
            if (steveWalkingDirection === "-y") {
                stevePosition[1] -= 0.1;
            } else if (steveWalkingDirection === "+y") {
                stevePosition[1] += 0.1;
            }
        }

        // world rotation
        mat4.identity(world.modelMatrix);

        // set third person camera
        thirdPersonCamera.lookAt = deepCopy(stevePosition);
        thirdPersonCamera.position = PerspectiveCamera.getPositionFromSphere(
            thirdPersonCamera.lookAt,
            radians(thirdPersonCameraTheta),
            radians(thirdPersonCameraPhi),
            thirdPersonCameraRadius,
        );

        // set first person camera
        if (!steveBending) {
            firstPersonCamera.position[0] = stevePosition[0];
            firstPersonCamera.position[1] = stevePosition[1] - 0.3;
            firstPersonCamera.position[2] = stevePosition[2] - 0.72 + 1.7;
        } else {
            firstPersonCamera.position[0] = stevePosition[0];
            firstPersonCamera.position[1] = stevePosition[1] - 0.3 - 0.3;
            firstPersonCamera.position[2] = stevePosition[2] - 0.72 + 1.7 - 0.1;
        }

        firstPersonCamera.lookAt = PerspectiveCamera.getLookAtFromSphere(
            firstPersonCamera.position,
            radians(firstPersonCameraTheta),
            radians(firstPersonCameraPhi),
            firstPersonCameraRadius,
        );

        // set free camera
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

        // set camera light position
        // mat4.identity(cameraLight.modelMatrix);
        // mat4.translate(cameraLight.modelMatrix, cameraLight.modelMatrix, camera.position);

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

        // cloud animation
        for (let cloudIndex = 0; cloudIndex < clouds.length; cloudIndex++) {
            let cloud = clouds[cloudIndex];
            let cloudPosition = vec3.create();
            mat4.getTranslation(cloudPosition, cloud.modelMatrix);
            mat4.identity(cloud.modelMatrix);
            mat4.translate(cloud.modelMatrix, cloud.modelMatrix, [cloudAnimations[cloudIndex].yield()["translateX"], cloudPosition[1], cloudPosition[2]]);
        }

        // light animation
        //mat4.identity(lightIndicator.modelMatrix);
        //mat4.translate(lightIndicator.modelMatrix, lightIndicator.modelMatrix, [0, 0, lightAnimation.yield()["translate"]]);
        mat4.rotateZ(lightCenter.modelMatrix, lightCenter.modelMatrix, 0.01);

        renderer.clear([0, 0, 0, 1]);
        renderer.render(world, camera);

        requestAnimationFrame(onDraw);

        // cat Rotation
        mat4.rotateZ(center.modelMatrix, center.modelMatrix, 0.02);

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

        // gyro
        let gyroRotationMatrix = mat4.create();
        mat4.fromQuat(gyroRotationMatrix, gyroQuaternion);
        let axis = quat.create();
        let rotationAngle = quat.getAxisAngle(axis, gyroQuaternion);
        mat4.fromRotation(gyroRotationMatrix, rotationAngle, axis);

        mat4.multiply(gyro.modelMatrix, gyroTranslationMatrix, gyroRotationMatrix);
    }

    window.addEventListener("resize", function () {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight * 0.8;

        // reset camera aspect ratio
        thirdPersonCamera.aspectRatio = canvas.width / canvas.height;
        freeCamera.aspectRatio = canvas.width / canvas.height;
        firstPersonCamera.aspectRatio = canvas.width / canvas.height;

        // update gl.viewport
        renderer.viewport.width = canvas.width;
        renderer.viewport.height = canvas.height;
    });

    // reset shading method and lighting method
    document.querySelector("#shading-method-gouraud").click();
    document.querySelector("#lighting-method-phong").click();

    // handlers for changing shading and lighting methods
    document.querySelector("#shading-method-phong").addEventListener("click", function (event) {
        shadingMethod = "phong";
    });

    document.querySelector("#shading-method-gouraud").addEventListener("click", function (event) {
        shadingMethod = "gouraud";
    });

    document.querySelector("#lighting-method-phong").addEventListener("click", function (event) {
        lightingMethod = "phong";
    });

    document.querySelector("#lighting-method-blinn-phong").addEventListener("click", function (event) {
        lightingMethod = "blinn-phong";
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