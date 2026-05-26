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
    skinColor: [number, number, number];
    eyeGlow: [number, number, number];
    particleEffect?: string;
    envTint: [number, number, number];
  }
> = {
  dracor: {
    bodyType: "medium",
    height: 1.85,
    primaryColor: [0.45, 0.22, 0.08],
    secondaryColor: [1.0, 0.42, 0.0],
    emissiveColor: [1.0, 0.27, 0.0],
    skinColor: [0.6, 0.4, 0.28],
    eyeGlow: [1.0, 0.5, 0.0],
    particleEffect: "ember_sparks",
    envTint: [0.15, 0.05, 0.0],
  },
  ironborn: {
    bodyType: "heavy",
    height: 1.55,
    primaryColor: [0.35, 0.33, 0.31],
    secondaryColor: [0.8, 0.75, 0.7],
    emissiveColor: [1.0, 0.55, 0.0],
    skinColor: [0.4, 0.38, 0.36],
    eyeGlow: [1.0, 0.6, 0.0],
    particleEffect: "forge_sparks",
    envTint: [0.1, 0.05, 0.0],
  },
  sylvhari: {
    bodyType: "lean",
    height: 1.95,
    primaryColor: [0.15, 0.4, 0.25],
    secondaryColor: [0.4, 0.9, 0.5],
    emissiveColor: [0.0, 1.0, 0.5],
    skinColor: [0.7, 0.85, 0.75],
    eyeGlow: [0.3, 1.0, 0.5],
    particleEffect: "floating_leaves",
    envTint: [0.0, 0.1, 0.05],
  },
  ashwalker: {
    bodyType: "medium",
    height: 1.78,
    primaryColor: [0.4, 0.32, 0.22],
    secondaryColor: [0.7, 0.55, 0.35],
    emissiveColor: [1.0, 0.84, 0.0],
    skinColor: [0.65, 0.5, 0.38],
    eyeGlow: [0.9, 0.8, 0.4],
    envTint: [0.08, 0.06, 0.02],
  },
  voidtouched: {
    bodyType: "ethereal",
    height: 1.82,
    primaryColor: [0.12, 0.05, 0.22],
    secondaryColor: [0.5, 0.1, 0.7],
    emissiveColor: [0.61, 0.19, 1.0],
    skinColor: [0.5, 0.4, 0.6],
    eyeGlow: [0.7, 0.2, 1.0],
    particleEffect: "void_particles",
    envTint: [0.05, 0.0, 0.12],
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
    const config = RACE_CONFIGS[raceId];

    scene.clearColor = new BABYLON.Color4(0.015, 0.01, 0.025, 1);
    scene.ambientColor = new BABYLON.Color3(0.08, 0.06, 0.1);
    scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
    scene.fogDensity = 0.012;
    scene.fogColor = new BABYLON.Color3(
      0.03 + config.envTint[0],
      0.02 + config.envTint[1],
      0.05 + config.envTint[2]
    );

    // Camera
    const camera = new BABYLON.ArcRotateCamera(
      "camera",
      -Math.PI / 2,
      Math.PI / 2.3,
      4.5,
      new BABYLON.Vector3(0, 1.2, 0),
      scene
    );
    camera.lowerRadiusLimit = 2.5;
    camera.upperRadiusLimit = 7;
    camera.lowerBetaLimit = 0.4;
    camera.upperBetaLimit = Math.PI / 2.1;
    camera.wheelDeltaPercentage = 0.02;
    camera.attachControl(canvasRef.current, true);

    // Key light — warm directional
    const keyLight = new BABYLON.DirectionalLight(
      "keyLight",
      new BABYLON.Vector3(-0.8, -1.5, 0.5),
      scene
    );
    keyLight.intensity = 1.4;
    keyLight.diffuse = new BABYLON.Color3(1, 0.93, 0.85);

    // Fill — cool hemisphere
    const fillLight = new BABYLON.HemisphericLight(
      "fillLight",
      new BABYLON.Vector3(0, 1, 0),
      scene
    );
    fillLight.intensity = 0.35;
    fillLight.diffuse = new BABYLON.Color3(0.5, 0.6, 0.9);
    fillLight.groundColor = new BABYLON.Color3(0.15, 0.08, 0.05);

    // Rim light matching race color
    const rimLight = new BABYLON.PointLight(
      "rimLight",
      new BABYLON.Vector3(2, 2.5, -2.5),
      scene
    );
    rimLight.intensity = 1.2;
    rimLight.diffuse = new BABYLON.Color3(...config.emissiveColor);
    rimLight.range = 8;

    // Under-light for drama
    const underLight = new BABYLON.PointLight(
      "underLight",
      new BABYLON.Vector3(0, -0.5, 1),
      scene
    );
    underLight.intensity = 0.3;
    underLight.diffuse = new BABYLON.Color3(...config.emissiveColor);
    underLight.range = 4;

    // Build scene elements
    const characterRoot = buildDetailedCharacter(BABYLON, scene, config, raceId, weapon);
    buildRichEnvironment(BABYLON, scene, config, raceId);
    buildRuneCircle(BABYLON, scene, config);

    if (config.particleEffect) {
      buildAdvancedParticles(BABYLON, scene, config, raceId);
    }

    // Memory aura
    if (memory && MEMORY_COLORS[memory]) {
      buildMemoryAura(BABYLON, scene, MEMORY_COLORS[memory]);
    }

    // Auto-rotate with gentle bobbing camera
    if (autoRotate) {
      let time = 0;
      scene.onBeforeRenderObservable.add(() => {
        time += 0.004;
        camera.alpha = -Math.PI / 2 + Math.sin(time) * 0.25;
        camera.beta = Math.PI / 2.3 + Math.sin(time * 0.7) * 0.02;
      });
    }

    engine.runRenderLoop(() => scene.render());

    const handleResize = () => engine.resize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      engine.dispose();
    };
  }, [raceId, memory, weapon, autoRotate]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    buildScene().then((c) => { cleanup = c; });
    return () => {
      cleanup?.();
      if (engineRef.current) {
        engineRef.current.dispose();
        engineRef.current = null;
      }
    };
  }, [buildScene]);

  return (
    <div className={`relative h-full w-full ${className}`}>
      <canvas
        ref={canvasRef}
        className="h-full w-full touch-none"
        style={{ outline: "none" }}
      />
      {/* Vignette overlay */}
      <div className="pointer-events-none absolute inset-0" style={{
        background: "radial-gradient(ellipse at center, transparent 40%, rgba(2,1,5,0.7) 100%)"
      }} />
    </div>
  );
}

function buildDetailedCharacter(
  B: any, scene: any,
  config: (typeof RACE_CONFIGS)[RaceId],
  raceId: RaceId,
  weapon?: string
) {
  const scale = config.height / 1.8;
  const root = new B.TransformNode("charRoot", scene);

  // Materials
  const skinMat = new B.StandardMaterial("skinMat", scene);
  skinMat.diffuseColor = new B.Color3(...config.skinColor);
  skinMat.specularColor = new B.Color3(0.15, 0.12, 0.1);
  skinMat.specularPower = 32;

  const armorMat = new B.StandardMaterial("armorMat", scene);
  armorMat.diffuseColor = new B.Color3(...config.primaryColor);
  armorMat.specularColor = new B.Color3(0.4, 0.4, 0.4);
  armorMat.specularPower = 16;
  armorMat.emissiveColor = new B.Color3(
    config.emissiveColor[0] * 0.08,
    config.emissiveColor[1] * 0.08,
    config.emissiveColor[2] * 0.08
  );

  const accentMat = new B.StandardMaterial("accentMat", scene);
  accentMat.diffuseColor = new B.Color3(...config.secondaryColor);
  accentMat.emissiveColor = new B.Color3(
    config.emissiveColor[0] * 0.25,
    config.emissiveColor[1] * 0.25,
    config.emissiveColor[2] * 0.25
  );
  accentMat.specularColor = new B.Color3(0.6, 0.6, 0.6);
  accentMat.specularPower = 8;

  const eyeMat = new B.StandardMaterial("eyeMat", scene);
  eyeMat.diffuseColor = new B.Color3(0, 0, 0);
  eyeMat.emissiveColor = new B.Color3(...config.eyeGlow);
  eyeMat.specularColor = new B.Color3(1, 1, 1);

  // Body proportions
  let torsoW = 0.38, torsoH = 0.7, legL = 0.85, headR = 0.2, armR = 0.08, shoulderW = 0.18;
  switch (config.bodyType) {
    case "heavy": torsoW = 0.52; torsoH = 0.6; legL = 0.6; headR = 0.23; armR = 0.11; shoulderW = 0.24; break;
    case "lean": torsoW = 0.3; torsoH = 0.78; legL = 1.0; headR = 0.18; armR = 0.065; shoulderW = 0.14; break;
    case "ethereal": torsoW = 0.32; torsoH = 0.72; legL = 0.92; headR = 0.19; armR = 0.07; shoulderW = 0.15; break;
  }

  const torsoY = legL * scale + torsoH * scale;
  const headY = torsoY + torsoH * scale + headR * scale * 0.7;

  // Torso
  const torso = B.MeshBuilder.CreateCapsule("torso", { radius: torsoW * scale, height: torsoH * scale * 2.2, subdivisions: 2, tessellation: 16 }, scene);
  torso.position.y = torsoY;
  torso.material = armorMat;
  torso.parent = root;

  // Chest detail
  const chest = B.MeshBuilder.CreateSphere("chest", { diameterX: torsoW * scale * 1.6, diameterY: torsoH * scale * 0.8, diameterZ: torsoW * scale * 1.1, segments: 12 }, scene);
  chest.position.set(0, torsoY + torsoH * scale * 0.3, torsoW * scale * 0.15);
  chest.material = armorMat;
  chest.parent = root;

  // Belt
  const belt = B.MeshBuilder.CreateTorus("belt", { diameter: torsoW * scale * 2, thickness: 0.04 * scale, tessellation: 24 }, scene);
  belt.position.y = torsoY - torsoH * scale * 0.6;
  belt.rotation.x = Math.PI / 2;
  belt.material = accentMat;
  belt.parent = root;

  // Neck
  const neck = B.MeshBuilder.CreateCylinder("neck", { diameter: headR * scale * 1.2, height: 0.12 * scale, tessellation: 12 }, scene);
  neck.position.y = torsoY + torsoH * scale * 0.9;
  neck.material = skinMat;
  neck.parent = root;

  // Head
  const head = B.MeshBuilder.CreateSphere("head", { diameter: headR * scale * 2, segments: 20 }, scene);
  head.position.y = headY;
  head.material = skinMat;
  head.parent = root;

  // Eyes
  for (let i = -1; i <= 1; i += 2) {
    const eye = B.MeshBuilder.CreateSphere(`eye${i}`, { diameter: 0.035 * scale, segments: 8 }, scene);
    eye.position.set(i * headR * scale * 0.35, headY + headR * scale * 0.15, headR * scale * 0.8);
    eye.material = eyeMat;
    eye.parent = root;
  }

  // Jaw/chin definition
  const jaw = B.MeshBuilder.CreateSphere("jaw", { diameterX: headR * scale * 1.4, diameterY: headR * scale * 0.7, diameterZ: headR * scale * 1.2, segments: 8 }, scene);
  jaw.position.set(0, headY - headR * scale * 0.4, headR * scale * 0.1);
  jaw.material = skinMat;
  jaw.parent = root;

  // Legs
  for (let i = -1; i <= 1; i += 2) {
    // Upper leg
    const uLeg = B.MeshBuilder.CreateCapsule(`uLeg${i}`, { radius: 0.13 * scale, height: legL * scale * 1.0 }, scene);
    uLeg.position.set(i * torsoW * scale * 0.45, legL * scale * 0.6, 0);
    uLeg.material = armorMat;
    uLeg.parent = root;
    // Lower leg
    const lLeg = B.MeshBuilder.CreateCapsule(`lLeg${i}`, { radius: 0.1 * scale, height: legL * scale * 0.9 }, scene);
    lLeg.position.set(i * torsoW * scale * 0.45, legL * scale * 0.15, 0.02);
    lLeg.material = armorMat;
    lLeg.parent = root;
    // Knee guard
    const knee = B.MeshBuilder.CreateSphere(`knee${i}`, { diameter: 0.12 * scale, segments: 8 }, scene);
    knee.position.set(i * torsoW * scale * 0.45, legL * scale * 0.38, 0.06 * scale);
    knee.material = accentMat;
    knee.parent = root;
    // Foot
    const foot = B.MeshBuilder.CreateBox(`foot${i}`, { width: 0.12 * scale, height: 0.06 * scale, depth: 0.2 * scale }, scene);
    foot.position.set(i * torsoW * scale * 0.45, 0.03 * scale, 0.04 * scale);
    foot.material = armorMat;
    foot.parent = root;
  }

  // Arms
  for (let i = -1; i <= 1; i += 2) {
    const shoulderX = i * (torsoW * scale + 0.06 * scale);
    const shoulderY = torsoY + torsoH * scale * 0.7;

    // Shoulder pad
    const sPad = B.MeshBuilder.CreateSphere(`sPad${i}`, { diameter: shoulderW * scale * 2, segments: 10 }, scene);
    sPad.position.set(shoulderX, shoulderY, 0);
    sPad.scaling.y = 0.7;
    sPad.material = accentMat;
    sPad.parent = root;

    // Upper arm
    const uArm = B.MeshBuilder.CreateCapsule(`uArm${i}`, { radius: armR * scale, height: torsoH * scale * 0.9 }, scene);
    uArm.position.set(shoulderX * 1.1, shoulderY - torsoH * scale * 0.35, 0);
    uArm.rotation.z = i * 0.12;
    uArm.material = skinMat;
    uArm.parent = root;

    // Forearm
    const fArm = B.MeshBuilder.CreateCapsule(`fArm${i}`, { radius: armR * scale * 0.85, height: torsoH * scale * 0.8 }, scene);
    fArm.position.set(shoulderX * 1.15, shoulderY - torsoH * scale * 0.95, 0.05);
    fArm.rotation.z = i * 0.08;
    fArm.material = skinMat;
    fArm.parent = root;

    // Bracer
    const bracer = B.MeshBuilder.CreateCylinder(`bracer${i}`, { diameter: armR * scale * 2.8, height: 0.12 * scale, tessellation: 10 }, scene);
    bracer.position.set(shoulderX * 1.15, shoulderY - torsoH * scale * 0.8, 0.05);
    bracer.material = accentMat;
    bracer.parent = root;

    // Hand
    const hand = B.MeshBuilder.CreateSphere(`hand${i}`, { diameter: 0.08 * scale, segments: 8 }, scene);
    hand.position.set(shoulderX * 1.15, shoulderY - torsoH * scale * 1.3, 0.08);
    hand.material = skinMat;
    hand.parent = root;
  }

  // Weapon (right hand)
  if (weapon) {
    const weaponY = torsoY - torsoH * scale * 0.1;
    const weaponX = (torsoW * scale + 0.06 * scale) * 1.15;
    buildWeaponMesh(B, scene, weapon, weaponX, weaponY, scale, accentMat, root);
  }

  // Race-specific features
  buildRaceFeatures(B, scene, raceId, config, root, headY, headR, torsoY, torsoW, torsoH, scale, accentMat, eyeMat);

  // Idle breathing
  const breathAnim = new B.Animation("breath", "scaling.y", 30, B.Animation.ANIMATIONTYPE_FLOAT, B.Animation.ANIMATIONLOOPMODE_CYCLE);
  breathAnim.setKeys([
    { frame: 0, value: 1.0 },
    { frame: 50, value: 1.015 },
    { frame: 100, value: 1.0 },
  ]);
  torso.animations.push(breathAnim);
  scene.beginAnimation(torso, 0, 100, true);

  // Subtle sway
  const swayAnim = new B.Animation("sway", "rotation.y", 30, B.Animation.ANIMATIONTYPE_FLOAT, B.Animation.ANIMATIONLOOPMODE_CYCLE);
  swayAnim.setKeys([
    { frame: 0, value: 0 },
    { frame: 80, value: 0.02 },
    { frame: 160, value: -0.02 },
    { frame: 240, value: 0 },
  ]);
  root.animations.push(swayAnim);
  scene.beginAnimation(root, 0, 240, true);

  return root;
}

function buildWeaponMesh(B: any, scene: any, weapon: string, x: number, y: number, scale: number, mat: any, parent: any) {
  const wMat = new B.StandardMaterial("weaponMat", scene);
  wMat.diffuseColor = new B.Color3(0.5, 0.5, 0.55);
  wMat.specularColor = new B.Color3(0.8, 0.8, 0.8);
  wMat.specularPower = 8;

  if (weapon === "blade") {
    const blade = B.MeshBuilder.CreateBox("blade", { width: 0.04 * scale, height: 0.7 * scale, depth: 0.01 * scale }, scene);
    blade.position.set(x, y, 0.1);
    blade.rotation.z = -0.2;
    blade.material = wMat;
    blade.parent = parent;
    const guard = B.MeshBuilder.CreateBox("guard", { width: 0.15 * scale, height: 0.02 * scale, depth: 0.03 * scale }, scene);
    guard.position.set(x, y - 0.3 * scale, 0.1);
    guard.rotation.z = -0.2;
    guard.material = mat;
    guard.parent = parent;
  } else if (weapon === "bow") {
    const bowArc = B.MeshBuilder.CreateTorus("bow", { diameter: 0.5 * scale, thickness: 0.02 * scale, arc: 0.6, tessellation: 16 }, scene);
    bowArc.position.set(x, y, 0.15);
    bowArc.rotation.y = Math.PI / 2;
    bowArc.rotation.z = -0.2;
    bowArc.material = mat;
    bowArc.parent = parent;
  } else if (weapon === "staff") {
    const staff = B.MeshBuilder.CreateCylinder("staff", { diameterTop: 0.02 * scale, diameterBottom: 0.03 * scale, height: 1.2 * scale, tessellation: 8 }, scene);
    staff.position.set(x, y + 0.1, 0.1);
    staff.material = mat;
    staff.parent = parent;
    const orb = B.MeshBuilder.CreateSphere("orb", { diameter: 0.1 * scale, segments: 12 }, scene);
    orb.position.set(x, y + 0.7 * scale, 0.1);
    const orbMat = new B.StandardMaterial("orbMat", scene);
    orbMat.emissiveColor = new B.Color3(0.8, 0.4, 1.0);
    orbMat.alpha = 0.85;
    orb.material = orbMat;
    orb.parent = parent;
  }
}

function buildRaceFeatures(
  B: any, scene: any, raceId: RaceId, config: any, root: any,
  headY: number, headR: number, torsoY: number, torsoW: number, torsoH: number, scale: number,
  accentMat: any, eyeMat: any
) {
  if (raceId === "dracor") {
    // Horns — swept back
    for (let i = -1; i <= 1; i += 2) {
      const horn = B.MeshBuilder.CreateCylinder(`horn${i}`, { diameterTop: 0, diameterBottom: 0.055 * scale, height: 0.35 * scale, tessellation: 8 }, scene);
      horn.position.set(i * headR * scale * 0.65, headY + headR * scale * 0.4, -headR * scale * 0.2);
      horn.rotation.z = i * -0.5;
      horn.rotation.x = 0.4;
      horn.material = accentMat;
      horn.parent = root;
      // Horn glow tip
      const tip = B.MeshBuilder.CreateSphere(`hornTip${i}`, { diameter: 0.03 * scale }, scene);
      tip.position.set(i * headR * scale * 0.9, headY + headR * scale * 0.7, -headR * scale * 0.35);
      tip.material = eyeMat;
      tip.parent = root;
    }
    // Scale ridges down spine
    for (let j = 0; j < 4; j++) {
      const ridge = B.MeshBuilder.CreateBox(`ridge${j}`, { width: 0.06 * scale, height: 0.04 * scale, depth: 0.03 * scale }, scene);
      ridge.position.set(0, torsoY + torsoH * scale * (0.4 - j * 0.3), -torsoW * scale * 0.7);
      ridge.material = accentMat;
      ridge.parent = root;
    }
    // Tail hint
    const tail = B.MeshBuilder.CreateCylinder("tail", { diameterTop: 0.02 * scale, diameterBottom: 0.06 * scale, height: 0.5 * scale, tessellation: 6 }, scene);
    tail.position.set(0, torsoY - torsoH * scale * 0.9, -torsoW * scale * 0.5);
    tail.rotation.x = -0.8;
    tail.material = accentMat;
    tail.parent = root;

  } else if (raceId === "ironborn") {
    // Massive chest plate
    const plate = B.MeshBuilder.CreateBox("plate", { width: torsoW * scale * 2.0, height: torsoH * scale * 1.3, depth: 0.12 * scale }, scene);
    plate.position.set(0, torsoY + torsoH * scale * 0.1, torsoW * scale * 0.35);
    plate.material = accentMat;
    plate.parent = root;
    // Metal rivets
    for (let r = 0; r < 6; r++) {
      const rivet = B.MeshBuilder.CreateSphere(`rivet${r}`, { diameter: 0.03 * scale, segments: 6 }, scene);
      rivet.position.set((r % 2 === 0 ? -1 : 1) * torsoW * scale * 0.6, torsoY + torsoH * scale * (0.4 - Math.floor(r/2) * 0.3), torsoW * scale * 0.42);
      rivet.material = accentMat;
      rivet.parent = root;
    }
    // Helmet/brow plate
    const brow = B.MeshBuilder.CreateBox("brow", { width: headR * scale * 2.2, height: headR * scale * 0.5, depth: headR * scale * 1.5 }, scene);
    brow.position.set(0, headY + headR * scale * 0.5, 0);
    brow.material = accentMat;
    brow.parent = root;

  } else if (raceId === "sylvhari") {
    // Long pointed ears
    for (let i = -1; i <= 1; i += 2) {
      const ear = B.MeshBuilder.CreateCylinder(`ear${i}`, { diameterTop: 0, diameterBottom: 0.04 * scale, height: 0.28 * scale, tessellation: 4 }, scene);
      ear.position.set(i * headR * scale * 0.95, headY + headR * scale * 0.15, 0);
      ear.rotation.z = i * -1.0;
      ear.rotation.x = -0.1;
      ear.material = accentMat;
      ear.parent = root;
    }
    // Vine wraps around arms
    for (let i = -1; i <= 1; i += 2) {
      const vine = B.MeshBuilder.CreateTorus(`vine${i}`, { diameter: 0.14 * scale, thickness: 0.015 * scale, tessellation: 12 }, scene);
      vine.position.set(i * (torsoW * scale + 0.06) * 1.1, torsoY - torsoH * scale * 0.2, 0);
      vine.rotation.x = Math.PI / 2;
      vine.material = accentMat;
      vine.parent = root;
    }
    // Crown of leaves
    const crown = B.MeshBuilder.CreateTorus("crown", { diameter: headR * scale * 2.2, thickness: 0.025 * scale, tessellation: 20 }, scene);
    crown.position.y = headY + headR * scale * 0.6;
    crown.rotation.x = Math.PI / 2;
    crown.material = accentMat;
    crown.parent = root;
    // Bioluminescent dots
    for (let d = 0; d < 8; d++) {
      const dot = B.MeshBuilder.CreateSphere(`dot${d}`, { diameter: 0.015 * scale, segments: 6 }, scene);
      const a = (d / 8) * Math.PI * 2;
      dot.position.set(Math.cos(a) * torsoW * scale * 0.9, torsoY + torsoH * scale * (0.5 - d * 0.12), Math.sin(a) * torsoW * scale * 0.9);
      dot.material = eyeMat;
      dot.parent = root;
    }

  } else if (raceId === "ashwalker") {
    // Cloak/cape
    const cape = B.MeshBuilder.CreatePlane("cape", { width: torsoW * scale * 2.5, height: torsoH * scale * 2.8 }, scene);
    cape.position.set(0, torsoY - torsoH * scale * 0.3, -torsoW * scale * 0.55);
    const capeMat = new B.StandardMaterial("capeMat", scene);
    capeMat.diffuseColor = new B.Color3(0.25, 0.2, 0.15);
    capeMat.backFaceCulling = false;
    capeMat.alpha = 0.9;
    cape.material = capeMat;
    cape.parent = root;
    // Hood shape
    const hood = B.MeshBuilder.CreateSphere("hood", { diameter: headR * scale * 2.6, segments: 10, slice: 0.5 }, scene);
    hood.position.set(0, headY + headR * scale * 0.2, -headR * scale * 0.4);
    hood.rotation.x = -0.3;
    hood.material = capeMat;
    hood.parent = root;
    // Bandolier
    const strap = B.MeshBuilder.CreateBox("strap", { width: 0.04 * scale, height: torsoH * scale * 2.0, depth: 0.02 * scale }, scene);
    strap.position.set(torsoW * scale * 0.3, torsoY, torsoW * scale * 0.3);
    strap.rotation.z = 0.5;
    strap.material = accentMat;
    strap.parent = root;
    // Scars (thin emissive lines on face)
    const scar = B.MeshBuilder.CreateBox("scar", { width: 0.005 * scale, height: 0.08 * scale, depth: 0.005 * scale }, scene);
    scar.position.set(headR * scale * 0.3, headY, headR * scale * 0.85);
    scar.rotation.z = 0.3;
    const scarMat = new B.StandardMaterial("scarMat", scene);
    scarMat.emissiveColor = new B.Color3(0.8, 0.6, 0.3);
    scar.material = scarMat;
    scar.parent = root;

  } else if (raceId === "voidtouched") {
    // Floating crystal fragments
    for (let j = 0; j < 7; j++) {
      const frag = B.MeshBuilder.CreatePolyhedron(`frag${j}`, { size: (0.03 + Math.random() * 0.04) * scale, type: j % 4 }, scene);
      const a = (j / 7) * Math.PI * 2;
      const r = 0.5 + Math.random() * 0.3;
      frag.position.set(Math.cos(a) * r * scale, 1.0 + j * 0.2, Math.sin(a) * r * scale);
      frag.material = accentMat;
      frag.parent = root;
      // Float + rotate
      const floatA = new B.Animation(`float${j}`, "position.y", 30, B.Animation.ANIMATIONTYPE_FLOAT, B.Animation.ANIMATIONLOOPMODE_CYCLE);
      floatA.setKeys([
        { frame: 0, value: frag.position.y },
        { frame: 40 + j * 8, value: frag.position.y + 0.15 },
        { frame: 80 + j * 8, value: frag.position.y },
      ]);
      const rotA = new B.Animation(`rot${j}`, "rotation.y", 30, B.Animation.ANIMATIONTYPE_FLOAT, B.Animation.ANIMATIONLOOPMODE_CYCLE);
      rotA.setKeys([
        { frame: 0, value: 0 },
        { frame: 120, value: Math.PI * 2 },
      ]);
      frag.animations.push(floatA, rotA);
      scene.beginAnimation(frag, 0, 120, true);
    }
    // Rift halo above head
    const halo = B.MeshBuilder.CreateTorus("halo", { diameter: headR * scale * 3, thickness: 0.02 * scale, tessellation: 24 }, scene);
    halo.position.y = headY + headR * scale * 1.5;
    halo.rotation.x = Math.PI / 2;
    const haloMat = new B.StandardMaterial("haloMat", scene);
    haloMat.emissiveColor = new B.Color3(0.5, 0.1, 0.9);
    haloMat.alpha = 0.6;
    halo.material = haloMat;
    halo.parent = root;
    // Make body slightly transparent
    const bodyMeshes = root.getChildMeshes();
    bodyMeshes.forEach((m: any) => {
      if (m.material && m.name !== "halo" && !m.name.startsWith("frag")) {
        m.material.alpha = 0.88;
      }
    });
  }
}

function buildRuneCircle(B: any, scene: any, config: any) {
  // Animated ground rune
  const disc = B.MeshBuilder.CreateDisc("rune", { radius: 1.5, tessellation: 64 }, scene);
  disc.rotation.x = Math.PI / 2;
  disc.position.y = 0.02;
  const runeMat = new B.StandardMaterial("runeMat", scene);
  runeMat.diffuseColor = new B.Color3(0, 0, 0);
  runeMat.emissiveColor = new B.Color3(
    config.emissiveColor[0] * 0.12,
    config.emissiveColor[1] * 0.12,
    config.emissiveColor[2] * 0.12
  );
  runeMat.alpha = 0.5;
  disc.material = runeMat;

  // Outer ring
  const ring = B.MeshBuilder.CreateTorus("runeRing", { diameter: 3.0, thickness: 0.015, tessellation: 48 }, scene);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.03;
  const ringMat = new B.StandardMaterial("ringMat", scene);
  ringMat.emissiveColor = new B.Color3(
    config.emissiveColor[0] * 0.3,
    config.emissiveColor[1] * 0.3,
    config.emissiveColor[2] * 0.3
  );
  ringMat.diffuseColor = new B.Color3(0, 0, 0);
  ring.material = ringMat;

  // Rotate the ring
  const rotAnim = new B.Animation("ringRot", "rotation.y", 30, B.Animation.ANIMATIONTYPE_FLOAT, B.Animation.ANIMATIONLOOPMODE_CYCLE);
  rotAnim.setKeys([{ frame: 0, value: 0 }, { frame: 300, value: Math.PI * 2 }]);
  ring.animations.push(rotAnim);
  scene.beginAnimation(ring, 0, 300, true);

  // Inner ring (counter-rotate)
  const ring2 = B.MeshBuilder.CreateTorus("runeRing2", { diameter: 2.2, thickness: 0.01, tessellation: 36 }, scene);
  ring2.rotation.x = Math.PI / 2;
  ring2.position.y = 0.025;
  ring2.material = ringMat;
  const rotAnim2 = new B.Animation("ringRot2", "rotation.y", 30, B.Animation.ANIMATIONTYPE_FLOAT, B.Animation.ANIMATIONLOOPMODE_CYCLE);
  rotAnim2.setKeys([{ frame: 0, value: 0 }, { frame: 200, value: -Math.PI * 2 }]);
  ring2.animations.push(rotAnim2);
  scene.beginAnimation(ring2, 0, 200, true);
}

function buildRichEnvironment(B: any, scene: any, config: any, raceId: RaceId) {
  // Ground
  const ground = B.MeshBuilder.CreateGround("ground", { width: 30, height: 30, subdivisions: 8 }, scene);
  ground.position.y = -0.01;
  const gMat = new B.StandardMaterial("gMat", scene);
  gMat.diffuseColor = new B.Color3(0.04, 0.03, 0.05);
  gMat.specularColor = new B.Color3(0, 0, 0);
  ground.material = gMat;

  // Environment structures based on race
  const envMat = new B.StandardMaterial("envMat", scene);
  envMat.diffuseColor = new B.Color3(0.06, 0.05, 0.08);
  envMat.specularColor = new B.Color3(0, 0, 0);

  if (raceId === "dracor" || raceId === "ironborn") {
    // Volcanic rocks / forge pillars
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.random() * 0.3;
      const d = 5 + Math.random() * 4;
      const h = 2 + Math.random() * 6;
      const rock = B.MeshBuilder.CreateCylinder(`rock${i}`, {
        diameterTop: Math.random() * 0.5,
        diameterBottom: 0.6 + Math.random() * 1.5,
        height: h,
        tessellation: 5 + Math.floor(Math.random() * 3),
      }, scene);
      rock.position.set(Math.cos(a) * d, h / 2, Math.sin(a) * d);
      rock.material = envMat;
    }
    // Lava cracks (emissive ground strips)
    for (let l = 0; l < 3; l++) {
      const lava = B.MeshBuilder.CreateBox(`lava${l}`, { width: 0.08, height: 0.01, depth: 3 + Math.random() * 4 }, scene);
      lava.position.set(-3 + l * 3, 0.01, Math.random() * 4 - 2);
      lava.rotation.y = Math.random() * Math.PI;
      const lavaMat = new B.StandardMaterial(`lavaMat${l}`, scene);
      lavaMat.emissiveColor = new B.Color3(0.8, 0.2, 0.0);
      lavaMat.diffuseColor = new B.Color3(0, 0, 0);
      lavaMat.alpha = 0.6;
      lava.material = lavaMat;
    }
  } else if (raceId === "sylvhari") {
    // Tree trunks
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.2;
      const d = 5 + Math.random() * 3;
      const h = 5 + Math.random() * 4;
      const tree = B.MeshBuilder.CreateCylinder(`tree${i}`, { diameterTop: 0.15, diameterBottom: 0.3 + Math.random() * 0.3, height: h, tessellation: 6 }, scene);
      tree.position.set(Math.cos(a) * d, h / 2, Math.sin(a) * d);
      const treeMat = new B.StandardMaterial(`treeMat${i}`, scene);
      treeMat.diffuseColor = new B.Color3(0.1, 0.06, 0.03);
      treeMat.specularColor = new B.Color3(0, 0, 0);
      tree.material = treeMat;
      // Canopy
      const canopy = B.MeshBuilder.CreateSphere(`canopy${i}`, { diameter: 2 + Math.random() * 2, segments: 6 }, scene);
      canopy.position.set(Math.cos(a) * d, h * 0.8, Math.sin(a) * d);
      const canopyMat = new B.StandardMaterial(`canopyMat${i}`, scene);
      canopyMat.diffuseColor = new B.Color3(0.02, 0.08, 0.03);
      canopyMat.emissiveColor = new B.Color3(0, 0.03, 0.01);
      canopy.material = canopyMat;
    }
  } else if (raceId === "voidtouched") {
    // Floating broken platforms
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const d = 5 + Math.random() * 3;
      const plat = B.MeshBuilder.CreateBox(`plat${i}`, { width: 1 + Math.random(), height: 0.2, depth: 1 + Math.random() }, scene);
      plat.position.set(Math.cos(a) * d, 1 + Math.random() * 3, Math.sin(a) * d);
      plat.rotation.set(Math.random() * 0.3, Math.random(), Math.random() * 0.3);
      plat.material = envMat;
      // Float animation
      const fA = new B.Animation(`platFloat${i}`, "position.y", 30, B.Animation.ANIMATIONTYPE_FLOAT, B.Animation.ANIMATIONLOOPMODE_CYCLE);
      fA.setKeys([
        { frame: 0, value: plat.position.y },
        { frame: 60 + i * 15, value: plat.position.y + 0.3 },
        { frame: 120 + i * 15, value: plat.position.y },
      ]);
      plat.animations.push(fA);
      scene.beginAnimation(plat, 0, 120 + i * 15, true);
    }
  } else {
    // Ashwalker — ruins
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.4;
      const d = 6 + Math.random() * 3;
      const h = 1 + Math.random() * 4;
      const col = B.MeshBuilder.CreateCylinder(`col${i}`, { diameterTop: 0.3, diameterBottom: 0.4, height: h, tessellation: 8 }, scene);
      col.position.set(Math.cos(a) * d, h / 2, Math.sin(a) * d);
      col.material = envMat;
      // Some broken at top
      if (Math.random() > 0.5) {
        const debris = B.MeshBuilder.CreateBox(`debris${i}`, { width: 0.4, height: 0.3, depth: 0.4 }, scene);
        debris.position.set(Math.cos(a) * d + 0.3, 0.15, Math.sin(a) * d);
        debris.rotation.y = Math.random() * Math.PI;
        debris.material = envMat;
      }
    }
  }
}

function buildMemoryAura(B: any, scene: any, color: [number, number, number]) {
  const aura = B.MeshBuilder.CreateSphere("aura", { diameter: 2.5, segments: 16 }, scene);
  aura.position.y = 1.2;
  const auraMat = new B.StandardMaterial("auraMat", scene);
  auraMat.diffuseColor = new B.Color3(0, 0, 0);
  auraMat.emissiveColor = new B.Color3(color[0] * 0.15, color[1] * 0.15, color[2] * 0.15);
  auraMat.alpha = 0.08;
  auraMat.backFaceCulling = false;
  aura.material = auraMat;

  const pulseAnim = new B.Animation("auraPulse", "material.alpha", 30, B.Animation.ANIMATIONTYPE_FLOAT, B.Animation.ANIMATIONLOOPMODE_CYCLE);
  pulseAnim.setKeys([
    { frame: 0, value: 0.05 },
    { frame: 60, value: 0.12 },
    { frame: 120, value: 0.05 },
  ]);
  aura.animations.push(pulseAnim);
  scene.beginAnimation(aura, 0, 120, true);
}

function buildAdvancedParticles(B: any, scene: any, config: any, raceId: RaceId) {
  const emitter = new B.TransformNode("pEmitter", scene);
  emitter.position.y = 0.5;

  const ps = new B.ParticleSystem("ps", 80, scene);
  ps.emitter = emitter;

  if (raceId === "voidtouched") {
    ps.createSphereEmitter(1.5);
    ps.gravity = new B.Vector3(0, -0.1, 0);
  } else if (raceId === "sylvhari") {
    ps.createCylinderEmitter(1.5, 3, 0, 0);
    ps.gravity = new B.Vector3(0, -0.3, 0);
  } else {
    ps.createPointEmitter(new B.Vector3(-0.8, 0, -0.8), new B.Vector3(0.8, 1.5, 0.8));
    ps.gravity = new B.Vector3(0, 0.5, 0);
  }

  ps.minLifeTime = 1.5;
  ps.maxLifeTime = 4;
  ps.minSize = 0.015;
  ps.maxSize = 0.05;
  ps.emitRate = 20;

  ps.color1 = new B.Color4(config.emissiveColor[0], config.emissiveColor[1], config.emissiveColor[2], 1);
  ps.color2 = new B.Color4(config.secondaryColor[0], config.secondaryColor[1], config.secondaryColor[2], 0.7);
  ps.colorDead = new B.Color4(0, 0, 0, 0);

  ps.minEmitPower = 0.2;
  ps.maxEmitPower = 0.6;
  ps.blendMode = B.ParticleSystem.BLENDMODE_ADD;

  ps.particleTexture = new B.RawTexture(
    new Uint8Array([255, 255, 255, 255]),
    1, 1, B.Engine.TEXTUREFORMAT_RGBA, scene
  );

  ps.start();
}
