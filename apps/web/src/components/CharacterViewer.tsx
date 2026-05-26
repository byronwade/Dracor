"use client";

import { useEffect, useRef, useCallback } from "react";
import type { RaceId } from "@dracor/shared";

interface CharacterViewerProps {
  raceId: RaceId;
  appearance?: {
    eyeColor?: string;
    skinTone?: string;
    marking?: string;
    uniqueFeature?: string;
  };
  weapon?: "blade" | "bow" | "staff";
  memory?: "ember" | "stone" | "storm";
  autoRotate?: boolean;
  className?: string;
}

const RACE_CONFIGS: Record<
  RaceId,
  {
    bodyType: "heavy" | "medium" | "lean" | "ethereal";
    height: number;
    primaryColor: [number, number, number];
    secondaryColor: [number, number, number];
    emissiveColor: [number, number, number];
    particleEffect?: string;
  }
> = {
  dracor: {
    bodyType: "medium",
    height: 1.85,
    primaryColor: [0.55, 0.27, 0.07],
    secondaryColor: [1.0, 0.42, 0.0],
    emissiveColor: [1.0, 0.27, 0.0],
    particleEffect: "ember_sparks",
  },
  ironborn: {
    bodyType: "heavy",
    height: 1.55,
    primaryColor: [0.29, 0.29, 0.29],
    secondaryColor: [0.75, 0.75, 0.75],
    emissiveColor: [1.0, 0.55, 0.0],
    particleEffect: "forge_sparks",
  },
  sylvhari: {
    bodyType: "lean",
    height: 1.95,
    primaryColor: [0.18, 0.55, 0.34],
    secondaryColor: [0.6, 0.98, 0.6],
    emissiveColor: [0.0, 1.0, 0.5],
    particleEffect: "floating_leaves",
  },
  ashwalker: {
    bodyType: "medium",
    height: 1.78,
    primaryColor: [0.55, 0.45, 0.33],
    secondaryColor: [0.82, 0.71, 0.55],
    emissiveColor: [1.0, 0.84, 0.0],
  },
  voidtouched: {
    bodyType: "ethereal",
    height: 1.82,
    primaryColor: [0.1, 0.0, 0.2],
    secondaryColor: [0.42, 0.0, 0.5],
    emissiveColor: [0.61, 0.19, 1.0],
    particleEffect: "void_particles",
  },
};

const MEMORY_COLORS: Record<string, [number, number, number]> = {
  ember: [1.0, 0.3, 0.0],
  stone: [0.6, 0.5, 0.2],
  storm: [0.2, 0.6, 1.0],
};

export function CharacterViewer({
  raceId,
  appearance,
  weapon,
  memory,
  autoRotate = true,
  className = "",
}: CharacterViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<any>(null);
  const sceneRef = useRef<any>(null);
  const frameRef = useRef<number>(0);

  const buildScene = useCallback(async () => {
    if (!canvasRef.current) return;

    const BABYLON = await import("@babylonjs/core");

    if (engineRef.current) {
      engineRef.current.dispose();
    }

    const engine = new BABYLON.Engine(canvasRef.current, true, {
      preserveDrawingBuffer: true,
      stencil: true,
      antialias: true,
    });
    engineRef.current = engine;

    const scene = new BABYLON.Scene(engine);
    sceneRef.current = scene;

    scene.clearColor = new BABYLON.Color4(0.02, 0.01, 0.03, 1);
    scene.ambientColor = new BABYLON.Color3(0.1, 0.08, 0.12);
    scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
    scene.fogDensity = 0.015;
    scene.fogColor = new BABYLON.Color3(0.05, 0.03, 0.08);

    const camera = new BABYLON.ArcRotateCamera(
      "camera",
      -Math.PI / 2,
      Math.PI / 2.5,
      5,
      new BABYLON.Vector3(0, 1, 0),
      scene
    );
    camera.lowerRadiusLimit = 3;
    camera.upperRadiusLimit = 8;
    camera.lowerBetaLimit = 0.5;
    camera.upperBetaLimit = Math.PI / 2;
    camera.attachControl(canvasRef.current, true);

    const mainLight = new BABYLON.DirectionalLight(
      "mainLight",
      new BABYLON.Vector3(-1, -2, 1),
      scene
    );
    mainLight.intensity = 1.2;
    mainLight.diffuse = new BABYLON.Color3(1, 0.95, 0.9);

    const fillLight = new BABYLON.HemisphericLight(
      "fillLight",
      new BABYLON.Vector3(0, 1, 0),
      scene
    );
    fillLight.intensity = 0.4;
    fillLight.diffuse = new BABYLON.Color3(0.6, 0.7, 1.0);
    fillLight.groundColor = new BABYLON.Color3(0.2, 0.1, 0.05);

    const rimLight = new BABYLON.PointLight(
      "rimLight",
      new BABYLON.Vector3(2, 2, -3),
      scene
    );
    rimLight.intensity = 0.8;
    const config = RACE_CONFIGS[raceId];
    rimLight.diffuse = new BABYLON.Color3(...config.emissiveColor);

    buildCharacterModel(BABYLON, scene, config, raceId);
    buildEnvironment(BABYLON, scene, raceId);

    if (config.particleEffect) {
      buildParticles(BABYLON, scene, config);
    }

    if (memory && MEMORY_COLORS[memory]) {
      const memoryLight = new BABYLON.PointLight(
        "memoryLight",
        new BABYLON.Vector3(0, 2.5, 0),
        scene
      );
      memoryLight.intensity = 0.5;
      memoryLight.diffuse = new BABYLON.Color3(...MEMORY_COLORS[memory]);
    }

    if (autoRotate) {
      let angle = 0;
      scene.onBeforeRenderObservable.add(() => {
        angle += 0.003;
        camera.alpha = -Math.PI / 2 + Math.sin(angle) * 0.3;
      });
    }

    engine.runRenderLoop(() => {
      scene.render();
    });

    const handleResize = () => engine.resize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      engine.dispose();
    };
  }, [raceId, memory, autoRotate]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    buildScene().then((c) => {
      cleanup = c;
    });
    return () => {
      cleanup?.();
      if (engineRef.current) {
        engineRef.current.dispose();
        engineRef.current = null;
      }
    };
  }, [buildScene]);

  return (
    <canvas
      ref={canvasRef}
      className={`h-full w-full touch-none ${className}`}
      style={{ outline: "none" }}
    />
  );
}

function buildCharacterModel(
  BABYLON: any,
  scene: any,
  config: (typeof RACE_CONFIGS)[RaceId],
  raceId: RaceId
) {
  const bodyMat = new BABYLON.StandardMaterial("bodyMat", scene);
  bodyMat.diffuseColor = new BABYLON.Color3(...config.primaryColor);
  bodyMat.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);
  bodyMat.emissiveColor = new BABYLON.Color3(
    config.emissiveColor[0] * 0.1,
    config.emissiveColor[1] * 0.1,
    config.emissiveColor[2] * 0.1
  );

  const accentMat = new BABYLON.StandardMaterial("accentMat", scene);
  accentMat.diffuseColor = new BABYLON.Color3(...config.secondaryColor);
  accentMat.emissiveColor = new BABYLON.Color3(
    config.emissiveColor[0] * 0.3,
    config.emissiveColor[1] * 0.3,
    config.emissiveColor[2] * 0.3
  );
  accentMat.specularColor = new BABYLON.Color3(0.5, 0.5, 0.5);

  const scale = config.height / 1.8;
  let torsoWidth = 0.4;
  let torsoHeight = 0.7;
  let legLength = 0.8;
  let headSize = 0.25;

  switch (config.bodyType) {
    case "heavy":
      torsoWidth = 0.55;
      torsoHeight = 0.6;
      legLength = 0.6;
      headSize = 0.28;
      break;
    case "lean":
      torsoWidth = 0.32;
      torsoHeight = 0.8;
      legLength = 1.0;
      headSize = 0.22;
      break;
    case "ethereal":
      torsoWidth = 0.35;
      torsoHeight = 0.75;
      legLength = 0.9;
      headSize = 0.24;
      break;
  }

  const root = new BABYLON.TransformNode("characterRoot", scene);

  // Torso
  const torso = BABYLON.MeshBuilder.CreateCapsule(
    "torso",
    { radius: torsoWidth * scale, height: torsoHeight * scale * 2 },
    scene
  );
  torso.position.y = legLength * scale + torsoHeight * scale;
  torso.material = bodyMat;
  torso.parent = root;

  // Head
  const head = BABYLON.MeshBuilder.CreateSphere(
    "head",
    { diameter: headSize * scale * 2, segments: 16 },
    scene
  );
  head.position.y =
    legLength * scale + torsoHeight * scale * 2 + headSize * scale * 0.8;
  head.material = bodyMat;
  head.parent = root;

  // Legs
  for (let i = -1; i <= 1; i += 2) {
    const leg = BABYLON.MeshBuilder.CreateCapsule(
      `leg_${i}`,
      { radius: 0.12 * scale, height: legLength * scale * 1.8 },
      scene
    );
    leg.position.set(i * torsoWidth * scale * 0.5, legLength * scale * 0.5, 0);
    leg.material = bodyMat;
    leg.parent = root;
  }

  // Arms
  for (let i = -1; i <= 1; i += 2) {
    const arm = BABYLON.MeshBuilder.CreateCapsule(
      `arm_${i}`,
      { radius: 0.09 * scale, height: torsoHeight * scale * 1.6 },
      scene
    );
    arm.position.set(
      i * (torsoWidth * scale + 0.12 * scale),
      legLength * scale + torsoHeight * scale,
      0
    );
    arm.rotation.z = i * 0.15;
    arm.material = bodyMat;
    arm.parent = root;
  }

  // Shoulders
  for (let i = -1; i <= 1; i += 2) {
    const shoulder = BABYLON.MeshBuilder.CreateSphere(
      `shoulder_${i}`,
      { diameter: 0.2 * scale, segments: 8 },
      scene
    );
    shoulder.position.set(
      i * (torsoWidth * scale + 0.05),
      legLength * scale + torsoHeight * scale * 1.7,
      0
    );
    shoulder.material = accentMat;
    shoulder.parent = root;
  }

  // Race-specific features
  if (raceId === "dracor") {
    for (let i = -1; i <= 1; i += 2) {
      const horn = BABYLON.MeshBuilder.CreateCylinder(
        `horn_${i}`,
        {
          diameterTop: 0,
          diameterBottom: 0.06 * scale,
          height: 0.3 * scale,
          tessellation: 8,
        },
        scene
      );
      horn.position.set(
        i * headSize * scale * 0.6,
        head.position.y + headSize * scale * 0.5,
        0
      );
      horn.rotation.z = i * -0.4;
      horn.material = accentMat;
      horn.parent = root;
    }
  } else if (raceId === "ironborn") {
    const chestPlate = BABYLON.MeshBuilder.CreateBox(
      "chestPlate",
      {
        width: torsoWidth * scale * 1.8,
        height: torsoHeight * scale * 1.2,
        depth: 0.15 * scale,
      },
      scene
    );
    chestPlate.position.set(0, torso.position.y, torsoWidth * scale * 0.4);
    chestPlate.material = accentMat;
    chestPlate.parent = root;
  } else if (raceId === "sylvhari") {
    for (let i = -1; i <= 1; i += 2) {
      const ear = BABYLON.MeshBuilder.CreateCylinder(
        `ear_${i}`,
        {
          diameterTop: 0,
          diameterBottom: 0.04 * scale,
          height: 0.2 * scale,
          tessellation: 4,
        },
        scene
      );
      ear.position.set(
        i * headSize * scale * 0.9,
        head.position.y + headSize * scale * 0.3,
        0
      );
      ear.rotation.z = i * -0.8;
      ear.material = accentMat;
      ear.parent = root;
    }
    // Vine markings as thin torus
    const vine = BABYLON.MeshBuilder.CreateTorus(
      "vine",
      { diameter: torsoWidth * scale * 1.5, thickness: 0.02 * scale },
      scene
    );
    vine.position.y = torso.position.y;
    vine.material = accentMat;
    vine.parent = root;
  } else if (raceId === "voidtouched") {
    // Floating fragments
    for (let j = 0; j < 5; j++) {
      const fragment = BABYLON.MeshBuilder.CreatePolyhedron(
        `fragment_${j}`,
        { size: 0.05 * scale, type: Math.floor(Math.random() * 3) },
        scene
      );
      const angle = (j / 5) * Math.PI * 2;
      fragment.position.set(
        Math.cos(angle) * 0.6 * scale,
        1.5 + Math.sin(j) * 0.3,
        Math.sin(angle) * 0.6 * scale
      );
      fragment.material = accentMat;
      fragment.parent = root;

      // Float animation
      const anim = new BABYLON.Animation(
        `floatAnim_${j}`,
        "position.y",
        30,
        BABYLON.Animation.ANIMATIONTYPE_FLOAT,
        BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
      );
      anim.setKeys([
        { frame: 0, value: fragment.position.y },
        { frame: 30 + j * 5, value: fragment.position.y + 0.2 },
        { frame: 60 + j * 5, value: fragment.position.y },
      ]);
      fragment.animations.push(anim);
      scene.beginAnimation(fragment, 0, 60 + j * 5, true);
    }
  } else if (raceId === "ashwalker") {
    // Cape/cloak
    const cape = BABYLON.MeshBuilder.CreatePlane(
      "cape",
      { width: torsoWidth * scale * 1.5, height: torsoHeight * scale * 2 },
      scene
    );
    cape.position.set(0, torso.position.y - 0.2, -torsoWidth * scale * 0.5);
    const capeMat = new BABYLON.StandardMaterial("capeMat", scene);
    capeMat.diffuseColor = new BABYLON.Color3(0.3, 0.25, 0.2);
    capeMat.backFaceCulling = false;
    cape.material = capeMat;
    cape.parent = root;
  }

  // Ground disc
  const ground = BABYLON.MeshBuilder.CreateDisc(
    "groundDisc",
    { radius: 1.2, tessellation: 32 },
    scene
  );
  ground.rotation.x = Math.PI / 2;
  ground.position.y = 0.01;
  const groundMat = new BABYLON.StandardMaterial("groundMat", scene);
  groundMat.diffuseColor = new BABYLON.Color3(0.1, 0.08, 0.12);
  groundMat.emissiveColor = new BABYLON.Color3(
    config.emissiveColor[0] * 0.05,
    config.emissiveColor[1] * 0.05,
    config.emissiveColor[2] * 0.05
  );
  groundMat.alpha = 0.8;
  ground.material = groundMat;
  ground.parent = root;

  // Breathing animation on torso
  const breathAnim = new BABYLON.Animation(
    "breathAnim",
    "scaling.y",
    30,
    BABYLON.Animation.ANIMATIONTYPE_FLOAT,
    BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
  );
  breathAnim.setKeys([
    { frame: 0, value: 1.0 },
    { frame: 45, value: 1.02 },
    { frame: 90, value: 1.0 },
  ]);
  torso.animations.push(breathAnim);
  scene.beginAnimation(torso, 0, 90, true);

  return root;
}

function buildEnvironment(BABYLON: any, scene: any, raceId: RaceId) {
  // Ground plane
  const ground = BABYLON.MeshBuilder.CreateGround(
    "envGround",
    { width: 20, height: 20, subdivisions: 4 },
    scene
  );
  ground.position.y = -0.01;
  const groundMat = new BABYLON.StandardMaterial("envGroundMat", scene);
  groundMat.diffuseColor = new BABYLON.Color3(0.05, 0.04, 0.06);
  groundMat.specularColor = new BABYLON.Color3(0, 0, 0);
  ground.material = groundMat;
  ground.receiveShadows = true;

  // Background mountains/pillars based on race
  const pillarMat = new BABYLON.StandardMaterial("pillarMat", scene);
  pillarMat.diffuseColor = new BABYLON.Color3(0.08, 0.06, 0.1);
  pillarMat.specularColor = new BABYLON.Color3(0, 0, 0);

  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const dist = 6 + Math.random() * 3;
    const height = 3 + Math.random() * 5;

    const pillar = BABYLON.MeshBuilder.CreateCylinder(
      `pillar_${i}`,
      {
        diameterTop: 0.2 + Math.random() * 0.5,
        diameterBottom: 0.8 + Math.random() * 1.2,
        height: height,
        tessellation: 6 + Math.floor(Math.random() * 4),
      },
      scene
    );
    pillar.position.set(
      Math.cos(angle) * dist,
      height / 2,
      Math.sin(angle) * dist
    );
    pillar.material = pillarMat;
  }
}

function buildParticles(
  BABYLON: any,
  scene: any,
  config: (typeof RACE_CONFIGS)[RaceId]
) {
  const emitter = new BABYLON.TransformNode("particleEmitter", scene);
  emitter.position.y = 1;

  const ps = new BABYLON.ParticleSystem("particles", 50, scene);
  ps.emitter = emitter;
  ps.createPointEmitter(
    new BABYLON.Vector3(-0.5, 0, -0.5),
    new BABYLON.Vector3(0.5, 1, 0.5)
  );

  ps.minLifeTime = 1;
  ps.maxLifeTime = 3;
  ps.minSize = 0.02;
  ps.maxSize = 0.06;
  ps.emitRate = 15;

  ps.color1 = new BABYLON.Color4(
    config.emissiveColor[0],
    config.emissiveColor[1],
    config.emissiveColor[2],
    1
  );
  ps.color2 = new BABYLON.Color4(
    config.secondaryColor[0],
    config.secondaryColor[1],
    config.secondaryColor[2],
    0.8
  );
  ps.colorDead = new BABYLON.Color4(0, 0, 0, 0);

  ps.minEmitPower = 0.3;
  ps.maxEmitPower = 0.8;
  ps.gravity = new BABYLON.Vector3(0, 0.2, 0);

  ps.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;

  // Use a procedural texture for particles
  ps.particleTexture = new BABYLON.RawTexture(
    new Uint8Array([255, 255, 255, 255]),
    1,
    1,
    BABYLON.Engine.TEXTUREFORMAT_RGBA,
    scene
  );

  ps.start();
}
