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
    skin: [number, number, number];
    armor: [number, number, number];
    accent: [number, number, number];
    eyeGlow: [number, number, number];
  }
> = {
  dracor: {
    bodyType: "medium",
    height: 1.85,
    skin: [0.55, 0.38, 0.25],
    armor: [0.35, 0.18, 0.08],
    accent: [0.85, 0.45, 0.1],
    eyeGlow: [1.0, 0.5, 0.0],
  },
  ironborn: {
    bodyType: "heavy",
    height: 1.55,
    skin: [0.42, 0.4, 0.38],
    armor: [0.3, 0.28, 0.26],
    accent: [0.7, 0.65, 0.55],
    eyeGlow: [1.0, 0.6, 0.0],
  },
  sylvhari: {
    bodyType: "lean",
    height: 1.95,
    skin: [0.65, 0.8, 0.65],
    armor: [0.18, 0.35, 0.2],
    accent: [0.4, 0.8, 0.45],
    eyeGlow: [0.3, 1.0, 0.5],
  },
  ashwalker: {
    bodyType: "medium",
    height: 1.78,
    skin: [0.6, 0.48, 0.35],
    armor: [0.35, 0.28, 0.2],
    accent: [0.65, 0.5, 0.3],
    eyeGlow: [0.9, 0.8, 0.4],
  },
  voidtouched: {
    bodyType: "ethereal",
    height: 1.82,
    skin: [0.48, 0.38, 0.55],
    armor: [0.15, 0.08, 0.25],
    accent: [0.5, 0.2, 0.7],
    eyeGlow: [0.7, 0.2, 1.0],
  },
  bloodfane: {
    bodyType: "lean",
    height: 1.92,
    skin: [0.9, 0.82, 0.78],
    armor: [0.3, 0.0, 0.0],
    accent: [0.8, 0.0, 0.15],
    eyeGlow: [1.0, 0.0, 0.2],
  },
  stoneguard: {
    bodyType: "heavy",
    height: 1.4,
    skin: [0.45, 0.42, 0.4],
    armor: [0.25, 0.25, 0.25],
    accent: [0.83, 0.63, 0.09],
    eyeGlow: [0.83, 0.63, 0.09],
  },
  grukhar: {
    bodyType: "heavy",
    height: 2.1,
    skin: [0.35, 0.42, 0.22],
    armor: [0.3, 0.22, 0.1],
    accent: [0.55, 0.41, 0.08],
    eyeGlow: [0.8, 0.2, 0.0],
  },
  skrix: {
    bodyType: "lean",
    height: 1.2,
    skin: [0.4, 0.48, 0.3],
    armor: [0.3, 0.35, 0.2],
    accent: [0.53, 0.67, 0.0],
    eyeGlow: [0.7, 0.8, 0.0],
  },
};

export function CharacterViewer({
  raceId,
  weapon,
  memory,
  autoRotate = true,
  className = "",
}: CharacterViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<any>(null);

  const buildScene = useCallback(async () => {
    if (!canvasRef.current) return;

    const B = await import("@babylonjs/core");

    if (engineRef.current) {
      engineRef.current.dispose();
    }

    const engine = new B.Engine(canvasRef.current, true, {
      preserveDrawingBuffer: true,
      stencil: true,
      antialias: true,
    });
    engineRef.current = engine;

    const scene = new B.Scene(engine);
    const config = RACE_CONFIGS[raceId];

    scene.clearColor = new B.Color4(0.02, 0.015, 0.03, 1);
    scene.ambientColor = new B.Color3(0.05, 0.04, 0.06);

    // Camera — front-facing, user can freely orbit
    const targetY = config.height * 0.55;
    const camera = new B.ArcRotateCamera(
      "camera",
      0,
      Math.PI / 2.4,
      4.0,
      new B.Vector3(0, targetY, 0),
      scene
    );
    camera.lowerRadiusLimit = 2.0;
    camera.upperRadiusLimit = 8;
    camera.lowerBetaLimit = 0.3;
    camera.upperBetaLimit = Math.PI / 1.9;
    camera.wheelDeltaPercentage = 0.01;
    camera.panningSensibility = 0;
    camera.inertia = 0.85;
    camera.angularSensibilityX = 800;
    camera.angularSensibilityY = 800;
    camera.attachControl(canvasRef.current, true);

    // Idle sway — pauses when user is interacting
    let idleTime = 0;
    let userInteracting = false;
    let interactTimeout: ReturnType<typeof setTimeout> | null = null;
    const baseAlpha = 0;

    const onPointerDown = () => {
      userInteracting = true;
      if (interactTimeout) clearTimeout(interactTimeout);
    };
    const onPointerUp = () => {
      if (interactTimeout) clearTimeout(interactTimeout);
      interactTimeout = setTimeout(() => { userInteracting = false; }, 2000);
    };
    canvasRef.current!.addEventListener("pointerdown", onPointerDown);
    canvasRef.current!.addEventListener("pointerup", onPointerUp);

    scene.onBeforeRenderObservable.add(() => {
      if (!userInteracting) {
        idleTime += 0.002;
        camera.alpha = baseAlpha + Math.sin(idleTime) * 0.15;
      }
    });

    // 3-point studio lighting (follows the front of the character)
    const keyLight = new B.DirectionalLight("key", new B.Vector3(-0.5, -1.2, 1), scene);
    keyLight.intensity = 1.6;
    keyLight.diffuse = new B.Color3(1, 0.95, 0.9);

    const fillLight = new B.HemisphericLight("fill", new B.Vector3(0, 1, 0), scene);
    fillLight.intensity = 0.5;
    fillLight.diffuse = new B.Color3(0.55, 0.6, 0.85);
    fillLight.groundColor = new B.Color3(0.1, 0.06, 0.04);

    const rimLight = new B.PointLight("rim", new B.Vector3(-1.5, 2.5, -2.5), scene);
    rimLight.intensity = 0.9;
    rimLight.diffuse = new B.Color3(0.7, 0.75, 0.9);
    rimLight.range = 10;

    const frontFill = new B.PointLight("frontFill", new B.Vector3(0, 1.0, 3), scene);
    frontFill.intensity = 0.3;
    frontFill.diffuse = new B.Color3(1, 0.95, 0.9);
    frontFill.range = 6;

    // Dark ground
    const ground = B.MeshBuilder.CreateGround("ground", { width: 16, height: 16 }, scene);
    ground.position.y = 0;
    const gMat = new B.StandardMaterial("gMat", scene);
    gMat.diffuseColor = new B.Color3(0.03, 0.025, 0.04);
    gMat.specularColor = new B.Color3(0.02, 0.02, 0.02);
    ground.material = gMat;

    // Build the character
    buildCharacter(B, scene, config, raceId, weapon, memory);

    engine.runRenderLoop(() => scene.render());
    const onResize = () => engine.resize();
    window.addEventListener("resize", onResize);
    const cv = canvasRef.current!;
    return () => {
      cv.removeEventListener("pointerdown", onPointerDown);
      cv.removeEventListener("pointerup", onPointerUp);
      if (interactTimeout) clearTimeout(interactTimeout);
      window.removeEventListener("resize", onResize);
      engine.dispose();
    };
  }, [raceId, weapon, memory, autoRotate]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    buildScene().then((c) => { cleanup = c; });
    return () => {
      cleanup?.();
      if (engineRef.current) { engineRef.current.dispose(); engineRef.current = null; }
    };
  }, [buildScene]);

  return (
    <div className={`relative h-full w-full ${className}`}>
      <canvas ref={canvasRef} className="h-full w-full touch-none" style={{ outline: "none" }} />
      <div className="pointer-events-none absolute inset-0" style={{
        background: "radial-gradient(ellipse at center, transparent 50%, rgba(2,1,5,0.6) 100%)"
      }} />
    </div>
  );
}

function buildCharacter(B: any, scene: any, config: (typeof RACE_CONFIGS)[RaceId], raceId: RaceId, weapon?: string, memory?: string) {
  const S = config.height / 1.8; // scale factor
  const root = new B.TransformNode("root", scene);
  root.rotation.y = Math.PI;
  const seg = 24; // high tessellation for smooth surfaces

  // --- Materials ---
  const skinMat = new B.StandardMaterial("skin", scene);
  skinMat.diffuseColor = new B.Color3(...config.skin);
  skinMat.specularColor = new B.Color3(0.12, 0.1, 0.08);
  skinMat.specularPower = 40;

  const armorMat = new B.StandardMaterial("armor", scene);
  armorMat.diffuseColor = new B.Color3(...config.armor);
  armorMat.specularColor = new B.Color3(0.2, 0.18, 0.15);
  armorMat.specularPower = 20;

  const accentMat = new B.StandardMaterial("accent", scene);
  accentMat.diffuseColor = new B.Color3(...config.accent);
  accentMat.specularColor = new B.Color3(0.3, 0.28, 0.25);
  accentMat.specularPower = 16;

  const darkMat = new B.StandardMaterial("dark", scene);
  darkMat.diffuseColor = new B.Color3(0.08, 0.06, 0.05);
  darkMat.specularColor = new B.Color3(0.05, 0.05, 0.05);

  const eyeMat = new B.StandardMaterial("eye", scene);
  eyeMat.diffuseColor = new B.Color3(0, 0, 0);
  eyeMat.emissiveColor = new B.Color3(...config.eyeGlow);

  // --- Proportions by body type ---
  let hipW = 0.22, shoulderW = 0.3, torsoH = 0.55, waistW = 0.2;
  let legUp = 0.42, legLow = 0.42, armUp = 0.35, armLow = 0.32;
  let headR = 0.14, neckH = 0.08, footL = 0.16;

  switch (config.bodyType) {
    case "heavy":
      hipW = 0.28; shoulderW = 0.4; torsoH = 0.5; waistW = 0.28;
      legUp = 0.36; legLow = 0.34; armUp = 0.3; armLow = 0.28;
      headR = 0.16; footL = 0.18;
      break;
    case "lean":
      hipW = 0.18; shoulderW = 0.25; torsoH = 0.6; waistW = 0.17;
      legUp = 0.48; legLow = 0.48; armUp = 0.4; armLow = 0.36;
      headR = 0.12; footL = 0.15;
      break;
    case "ethereal":
      hipW = 0.19; shoulderW = 0.26; torsoH = 0.58; waistW = 0.18;
      legUp = 0.45; legLow = 0.44; armUp = 0.38; armLow = 0.34;
      headR = 0.13; footL = 0.14;
      break;
  }

  // Y positions
  const footTop = footL * S * 0.3;
  const kneeY = footTop + legLow * S;
  const hipY = kneeY + legUp * S;
  const waistY = hipY + 0.05 * S;
  const chestY = waistY + torsoH * S * 0.6;
  const shoulderY = waistY + torsoH * S;
  const neckY = shoulderY + neckH * S;
  const headY = neckY + headR * S + 0.02 * S;

  // --- Pelvis / Hips ---
  const pelvis = B.MeshBuilder.CreateSphere("pelvis", {
    diameterX: hipW * S * 2.2, diameterY: 0.15 * S, diameterZ: hipW * S * 1.6, segments: seg
  }, scene);
  pelvis.position.y = hipY;
  pelvis.material = armorMat;
  pelvis.parent = root;

  // --- Torso ---
  // Lower torso (waist to chest) — tapered cylinder
  const lowerTorso = B.MeshBuilder.CreateCylinder("lTorso", {
    diameterTop: shoulderW * S * 2, diameterBottom: waistW * S * 2,
    height: torsoH * S * 0.65, tessellation: seg
  }, scene);
  lowerTorso.position.y = waistY + torsoH * S * 0.325;
  lowerTorso.material = armorMat;
  lowerTorso.parent = root;

  // Upper torso / chest — wider sphere
  const chest = B.MeshBuilder.CreateSphere("chest", {
    diameterX: shoulderW * S * 2.2, diameterY: torsoH * S * 0.55,
    diameterZ: shoulderW * S * 1.5, segments: seg
  }, scene);
  chest.position.y = chestY + torsoH * S * 0.15;
  chest.material = armorMat;
  chest.parent = root;

  // --- Neck ---
  const neck = B.MeshBuilder.CreateCylinder("neck", {
    diameter: 0.08 * S, height: neckH * S * 1.5, tessellation: seg
  }, scene);
  neck.position.y = shoulderY + neckH * S * 0.5;
  neck.material = skinMat;
  neck.parent = root;

  // --- Head ---
  const head = B.MeshBuilder.CreateSphere("head", {
    diameterX: headR * S * 2, diameterY: headR * S * 2.3,
    diameterZ: headR * S * 2, segments: seg
  }, scene);
  head.position.y = headY;
  head.material = skinMat;
  head.parent = root;

  // Face — slight forward protrusion for nose/brow area
  const face = B.MeshBuilder.CreateSphere("face", {
    diameterX: headR * S * 1.4, diameterY: headR * S * 1.2,
    diameterZ: headR * S * 0.6, segments: 16
  }, scene);
  face.position.set(0, headY - headR * S * 0.1, headR * S * 0.7);
  face.material = skinMat;
  face.parent = root;

  // Eyes
  for (const side of [-1, 1]) {
    const eye = B.MeshBuilder.CreateSphere(`eye${side}`, { diameter: 0.025 * S, segments: 12 }, scene);
    eye.position.set(side * headR * S * 0.4, headY + headR * S * 0.15, headR * S * 0.85);
    eye.material = eyeMat;
    eye.parent = root;
  }

  // --- Legs ---
  for (const side of [-1, 1]) {
    const hx = side * hipW * S * 0.75;

    // Upper leg
    const uLeg = B.MeshBuilder.CreateCapsule(`uLeg${side}`, {
      radius: 0.085 * S, height: legUp * S, subdivisions: 2, tessellation: seg
    }, scene);
    uLeg.position.set(hx, kneeY + legUp * S * 0.5, 0);
    uLeg.material = armorMat;
    uLeg.parent = root;

    // Knee joint
    const knee = B.MeshBuilder.CreateSphere(`knee${side}`, {
      diameter: 0.1 * S, segments: 16
    }, scene);
    knee.position.set(hx, kneeY, 0.01 * S);
    knee.material = armorMat;
    knee.parent = root;

    // Lower leg
    const lLeg = B.MeshBuilder.CreateCapsule(`lLeg${side}`, {
      radius: 0.07 * S, height: legLow * S, subdivisions: 2, tessellation: seg
    }, scene);
    lLeg.position.set(hx, footTop + legLow * S * 0.5, 0);
    lLeg.material = armorMat;
    lLeg.parent = root;

    // Foot
    const foot = B.MeshBuilder.CreateBox(`foot${side}`, {
      width: 0.1 * S, height: footL * S * 0.3, depth: footL * S
    }, scene);
    foot.position.set(hx, footL * S * 0.15, 0.03 * S);
    foot.material = darkMat;
    foot.parent = root;
  }

  // --- Arms ---
  for (const side of [-1, 1]) {
    const sx = side * (shoulderW * S + 0.02 * S);

    // Shoulder sphere
    const shoulder = B.MeshBuilder.CreateSphere(`shoulder${side}`, {
      diameter: 0.12 * S, segments: seg
    }, scene);
    shoulder.position.set(sx, shoulderY, 0);
    shoulder.material = accentMat;
    shoulder.parent = root;

    // Upper arm
    const uArm = B.MeshBuilder.CreateCapsule(`uArm${side}`, {
      radius: 0.055 * S, height: armUp * S, subdivisions: 2, tessellation: seg
    }, scene);
    uArm.position.set(sx * 1.05, shoulderY - armUp * S * 0.5, 0);
    uArm.rotation.z = side * 0.08;
    uArm.material = skinMat;
    uArm.parent = root;

    // Elbow
    const elbow = B.MeshBuilder.CreateSphere(`elbow${side}`, {
      diameter: 0.065 * S, segments: 12
    }, scene);
    elbow.position.set(sx * 1.08, shoulderY - armUp * S, 0);
    elbow.material = skinMat;
    elbow.parent = root;

    // Forearm
    const fArm = B.MeshBuilder.CreateCapsule(`fArm${side}`, {
      radius: 0.048 * S, height: armLow * S, subdivisions: 2, tessellation: seg
    }, scene);
    fArm.position.set(sx * 1.1, shoulderY - armUp * S - armLow * S * 0.5, 0.01 * S);
    fArm.rotation.z = side * 0.04;
    fArm.material = skinMat;
    fArm.parent = root;

    // Hand
    const hand = B.MeshBuilder.CreateSphere(`hand${side}`, {
      diameterX: 0.06 * S, diameterY: 0.07 * S, diameterZ: 0.04 * S, segments: 12
    }, scene);
    hand.position.set(sx * 1.12, shoulderY - armUp * S - armLow * S, 0.02 * S);
    hand.material = skinMat;
    hand.parent = root;

    // Bracer / gauntlet on forearm
    const bracer = B.MeshBuilder.CreateCylinder(`bracer${side}`, {
      diameter: 0.07 * S, height: 0.08 * S, tessellation: seg
    }, scene);
    bracer.position.set(sx * 1.1, shoulderY - armUp * S - armLow * S * 0.35, 0.01 * S);
    bracer.material = accentMat;
    bracer.parent = root;
  }

  // --- Belt ---
  const belt = B.MeshBuilder.CreateCylinder("belt", {
    diameter: waistW * S * 2.3, height: 0.04 * S, tessellation: seg
  }, scene);
  belt.position.y = waistY;
  belt.material = accentMat;
  belt.parent = root;

  // --- Race-specific features (subtle, attached to body) ---
  if (raceId === "dracor") {
    // Horns — curved back
    for (const side of [-1, 1]) {
      const horn = B.MeshBuilder.CreateCylinder(`horn${side}`, {
        diameterTop: 0, diameterBottom: 0.04 * S, height: 0.22 * S, tessellation: 12
      }, scene);
      horn.position.set(side * headR * S * 0.6, headY + headR * S * 0.8, -headR * S * 0.15);
      horn.rotation.z = side * -0.3;
      horn.rotation.x = 0.35;
      horn.material = accentMat;
      horn.parent = root;
    }
    // Spine ridges
    for (let i = 0; i < 3; i++) {
      const ridge = B.MeshBuilder.CreateSphere(`ridge${i}`, {
        diameterX: 0.04 * S, diameterY: 0.025 * S, diameterZ: 0.03 * S, segments: 8
      }, scene);
      ridge.position.set(0, shoulderY - i * 0.1 * S, -shoulderW * S * 0.5);
      ridge.material = accentMat;
      ridge.parent = root;
    }
  } else if (raceId === "ironborn") {
    // Brow plate
    const brow = B.MeshBuilder.CreateBox("brow", {
      width: headR * S * 2.4, height: headR * S * 0.4, depth: headR * S * 1.2
    }, scene);
    brow.position.set(0, headY + headR * S * 0.7, headR * S * 0.1);
    brow.material = accentMat;
    brow.parent = root;

    // Chest plate
    const plate = B.MeshBuilder.CreateBox("plate", {
      width: shoulderW * S * 1.6, height: torsoH * S * 0.5, depth: 0.06 * S
    }, scene);
    plate.position.set(0, chestY + torsoH * S * 0.1, shoulderW * S * 0.5);
    plate.material = accentMat;
    plate.parent = root;
  } else if (raceId === "sylvhari") {
    // Pointed ears
    for (const side of [-1, 1]) {
      const ear = B.MeshBuilder.CreateCylinder(`ear${side}`, {
        diameterTop: 0, diameterBottom: 0.025 * S, height: 0.18 * S, tessellation: 6
      }, scene);
      ear.position.set(side * headR * S * 0.95, headY + headR * S * 0.1, 0);
      ear.rotation.z = side * -0.9;
      ear.material = skinMat;
      ear.parent = root;
    }
    // Leaf crown
    const crown = B.MeshBuilder.CreateTorus("crown", {
      diameter: headR * S * 2.6, thickness: 0.02 * S, tessellation: 24
    }, scene);
    crown.position.y = headY + headR * S * 0.8;
    crown.rotation.x = Math.PI / 2;
    crown.material = accentMat;
    crown.parent = root;
  } else if (raceId === "ashwalker") {
    // Hood
    const hood = B.MeshBuilder.CreateSphere("hood", {
      diameterX: headR * S * 2.8, diameterY: headR * S * 2.2,
      diameterZ: headR * S * 2.8, segments: 16, slice: 0.55
    }, scene);
    hood.position.set(0, headY + headR * S * 0.15, -headR * S * 0.3);
    hood.rotation.x = -0.2;
    const hoodMat = new B.StandardMaterial("hood", scene);
    hoodMat.diffuseColor = new B.Color3(0.2, 0.16, 0.12);
    hoodMat.specularColor = new B.Color3(0.05, 0.05, 0.05);
    hood.material = hoodMat;
    hood.parent = root;

    // Bandolier strap
    const strap = B.MeshBuilder.CreateBox("strap", {
      width: 0.03 * S, height: torsoH * S * 1.2, depth: 0.015 * S
    }, scene);
    strap.position.set(shoulderW * S * 0.2, chestY, shoulderW * S * 0.3);
    strap.rotation.z = 0.45;
    strap.material = accentMat;
    strap.parent = root;
  } else if (raceId === "voidtouched") {
    // Void halo
    const halo = B.MeshBuilder.CreateTorus("halo", {
      diameter: headR * S * 3.5, thickness: 0.015 * S, tessellation: 32
    }, scene);
    halo.position.y = headY + headR * S * 1.5;
    halo.rotation.x = Math.PI / 2;
    const haloMat = new B.StandardMaterial("haloM", scene);
    haloMat.emissiveColor = new B.Color3(0.4, 0.1, 0.7);
    haloMat.diffuseColor = new B.Color3(0, 0, 0);
    haloMat.alpha = 0.7;
    halo.material = haloMat;
    halo.parent = root;

    // Slight body transparency
    root.getChildMeshes().forEach((m: any) => {
      if (m.material && m !== halo) {
        m.material = m.material.clone(m.material.name + "_v");
        m.material.alpha = 0.9;
      }
    });
  } else if (raceId === "bloodfane") {
    // Long pointed ears
    for (const side of [-1, 1]) {
      const ear = B.MeshBuilder.CreateCylinder(`ear${side}`, {
        diameterTop: 0, diameterBottom: 0.02 * S, height: 0.2 * S, tessellation: 6
      }, scene);
      ear.position.set(side * headR * S * 0.95, headY + headR * S * 0.15, 0);
      ear.rotation.z = side * -0.85;
      ear.material = skinMat;
      ear.parent = root;
    }
    // Crimson circlet
    const circlet = B.MeshBuilder.CreateTorus("circlet", {
      diameter: headR * S * 2.3, thickness: 0.015 * S, tessellation: 24
    }, scene);
    circlet.position.y = headY + headR * S * 0.6;
    circlet.rotation.x = Math.PI / 2;
    circlet.material = accentMat;
    circlet.parent = root;
  } else if (raceId === "stoneguard") {
    // Helmet brow
    const helm = B.MeshBuilder.CreateBox("helm", {
      width: headR * S * 2.5, height: headR * S * 0.5, depth: headR * S * 1.4
    }, scene);
    helm.position.set(0, headY + headR * S * 0.6, headR * S * 0.05);
    helm.material = accentMat;
    helm.parent = root;
    // Beard (cone below chin)
    const beard = B.MeshBuilder.CreateCylinder("beard", {
      diameterTop: headR * S * 1.2, diameterBottom: 0.02 * S, height: 0.25 * S, tessellation: 8
    }, scene);
    beard.position.set(0, headY - headR * S * 1.0, headR * S * 0.3);
    beard.material = skinMat;
    beard.parent = root;
    // Chest plate
    const plate = B.MeshBuilder.CreateBox("sPlate", {
      width: shoulderW * S * 1.8, height: torsoH * S * 0.5, depth: 0.07 * S
    }, scene);
    plate.position.set(0, chestY + torsoH * S * 0.1, shoulderW * S * 0.5);
    plate.material = accentMat;
    plate.parent = root;
  } else if (raceId === "grukhar") {
    // Tusks
    for (const side of [-1, 1]) {
      const tusk = B.MeshBuilder.CreateCylinder(`tusk${side}`, {
        diameterTop: 0, diameterBottom: 0.03 * S, height: 0.12 * S, tessellation: 8
      }, scene);
      tusk.position.set(side * headR * S * 0.45, headY - headR * S * 0.5, headR * S * 0.75);
      tusk.rotation.x = -0.3;
      tusk.material = accentMat;
      tusk.parent = root;
    }
    // Jaw ridge
    const jaw = B.MeshBuilder.CreateBox("jaw", {
      width: headR * S * 1.8, height: headR * S * 0.3, depth: headR * S * 0.5
    }, scene);
    jaw.position.set(0, headY - headR * S * 0.6, headR * S * 0.4);
    jaw.material = skinMat;
    jaw.parent = root;
  } else if (raceId === "skrix") {
    // Large pointed ears
    for (const side of [-1, 1]) {
      const ear = B.MeshBuilder.CreateCylinder(`ear${side}`, {
        diameterTop: 0, diameterBottom: 0.035 * S, height: 0.22 * S, tessellation: 4
      }, scene);
      ear.position.set(side * headR * S * 1.0, headY + headR * S * 0.3, -headR * S * 0.1);
      ear.rotation.z = side * -0.7;
      ear.material = skinMat;
      ear.parent = root;
    }
    // Goggles on forehead
    const goggle = B.MeshBuilder.CreateTorus("goggle", {
      diameter: headR * S * 1.4, thickness: 0.015 * S, tessellation: 16
    }, scene);
    goggle.position.set(0, headY + headR * S * 0.5, headR * S * 0.3);
    goggle.rotation.x = Math.PI / 2.5;
    goggle.material = accentMat;
    goggle.parent = root;
  }

  // --- Weapon in right hand ---
  if (weapon) {
    const rightHandX = (shoulderW * S + 0.02 * S) * 1.12;
    const rightHandY = shoulderY - armUp * S - armLow * S;

    const weaponMat = new B.StandardMaterial("weaponMat", scene);
    weaponMat.specularColor = new B.Color3(0.6, 0.6, 0.6);
    weaponMat.specularPower = 8;

    if (weapon === "blade") {
      weaponMat.diffuseColor = new B.Color3(0.6, 0.6, 0.65);
      // Blade
      const blade = B.MeshBuilder.CreateBox("blade", {
        width: 0.025 * S, height: 0.55 * S, depth: 0.008 * S
      }, scene);
      blade.position.set(rightHandX, rightHandY + 0.28 * S, 0.03 * S);
      blade.material = weaponMat;
      blade.parent = root;
      // Guard
      const guard = B.MeshBuilder.CreateBox("guard", {
        width: 0.12 * S, height: 0.015 * S, depth: 0.025 * S
      }, scene);
      guard.position.set(rightHandX, rightHandY + 0.01 * S, 0.03 * S);
      guard.material = accentMat;
      guard.parent = root;
      // Grip
      const grip = B.MeshBuilder.CreateCylinder("grip", {
        diameter: 0.02 * S, height: 0.1 * S, tessellation: 8
      }, scene);
      grip.position.set(rightHandX, rightHandY - 0.05 * S, 0.03 * S);
      grip.material = darkMat;
      grip.parent = root;
    } else if (weapon === "bow") {
      weaponMat.diffuseColor = new B.Color3(0.4, 0.25, 0.12);
      // Bow arc
      const bow = B.MeshBuilder.CreateTorus("bow", {
        diameter: 0.45 * S, thickness: 0.018 * S, arc: 0.55, tessellation: 20
      }, scene);
      bow.position.set(rightHandX + 0.05 * S, rightHandY + 0.15 * S, 0.06 * S);
      bow.rotation.y = Math.PI / 2;
      bow.rotation.z = 0.1;
      bow.material = weaponMat;
      bow.parent = root;
      // String
      const string = B.MeshBuilder.CreateCylinder("bowstring", {
        diameter: 0.004 * S, height: 0.4 * S, tessellation: 4
      }, scene);
      string.position.set(rightHandX + 0.05 * S, rightHandY + 0.15 * S, 0.06 * S);
      const stringMat = new B.StandardMaterial("stringMat", scene);
      stringMat.diffuseColor = new B.Color3(0.8, 0.8, 0.75);
      stringMat.emissiveColor = new B.Color3(0.1, 0.1, 0.1);
      string.material = stringMat;
      string.parent = root;
    } else if (weapon === "staff") {
      weaponMat.diffuseColor = new B.Color3(0.35, 0.22, 0.1);
      // Staff pole
      const staff = B.MeshBuilder.CreateCylinder("staff", {
        diameterTop: 0.015 * S, diameterBottom: 0.025 * S, height: 1.1 * S, tessellation: 10
      }, scene);
      staff.position.set(rightHandX, rightHandY + 0.55 * S, 0.03 * S);
      staff.material = weaponMat;
      staff.parent = root;
      // Orb at top
      const orb = B.MeshBuilder.CreateSphere("staffOrb", {
        diameter: 0.08 * S, segments: 16
      }, scene);
      orb.position.set(rightHandX, rightHandY + 1.1 * S, 0.03 * S);
      const orbMat = new B.StandardMaterial("orbMat", scene);
      orbMat.diffuseColor = new B.Color3(0.1, 0.05, 0.15);
      orbMat.emissiveColor = new B.Color3(0.6, 0.3, 1.0);
      orbMat.alpha = 0.9;
      orb.material = orbMat;
      orb.parent = root;
      // Orb glow pulse
      const orbPulse = new B.Animation("orbPulse", "material.emissiveColor", 30,
        B.Animation.ANIMATIONTYPE_COLOR3, B.Animation.ANIMATIONLOOPMODE_CYCLE);
      orbPulse.setKeys([
        { frame: 0, value: new B.Color3(0.6, 0.3, 1.0) },
        { frame: 45, value: new B.Color3(0.9, 0.5, 1.0) },
        { frame: 90, value: new B.Color3(0.6, 0.3, 1.0) },
      ]);
      orb.animations.push(orbPulse);
      scene.beginAnimation(orb, 0, 90, true);
    }
  }

  // --- Dragon Memory aura ---
  if (memory) {
    const memoryColors: Record<string, [number, number, number]> = {
      ember: [1.0, 0.4, 0.0],
      stone: [0.7, 0.55, 0.15],
      storm: [0.2, 0.5, 1.0],
    };
    const mc = memoryColors[memory];
    if (mc) {
      // Aura sphere — subtle glow around character
      const aura = B.MeshBuilder.CreateSphere("memoryAura", {
        diameter: 2.0 * S, segments: 20
      }, scene);
      aura.position.y = hipY + torsoH * S * 0.5;
      const auraMat = new B.StandardMaterial("auraMat", scene);
      auraMat.diffuseColor = new B.Color3(0, 0, 0);
      auraMat.emissiveColor = new B.Color3(mc[0] * 0.12, mc[1] * 0.12, mc[2] * 0.12);
      auraMat.alpha = 0.08;
      auraMat.backFaceCulling = false;
      aura.material = auraMat;
      aura.parent = root;

      // Aura pulse animation
      const auraPulse = new B.Animation("auraPulse", "material.alpha", 30,
        B.Animation.ANIMATIONTYPE_FLOAT, B.Animation.ANIMATIONLOOPMODE_CYCLE);
      auraPulse.setKeys([
        { frame: 0, value: 0.05 },
        { frame: 50, value: 0.12 },
        { frame: 100, value: 0.05 },
      ]);
      aura.animations.push(auraPulse);
      scene.beginAnimation(aura, 0, 100, true);

      // Ground ring — glowing circle at feet
      const ring = B.MeshBuilder.CreateTorus("memoryRing", {
        diameter: 1.6 * S, thickness: 0.012, tessellation: 48
      }, scene);
      ring.position.y = 0.02;
      ring.rotation.x = Math.PI / 2;
      const ringMat = new B.StandardMaterial("ringMat", scene);
      ringMat.diffuseColor = new B.Color3(0, 0, 0);
      ringMat.emissiveColor = new B.Color3(mc[0] * 0.4, mc[1] * 0.4, mc[2] * 0.4);
      ring.material = ringMat;
      ring.parent = root;

      // Ring slow rotation
      const ringRot = new B.Animation("ringRot", "rotation.y", 30,
        B.Animation.ANIMATIONTYPE_FLOAT, B.Animation.ANIMATIONLOOPMODE_CYCLE);
      ringRot.setKeys([
        { frame: 0, value: 0 },
        { frame: 300, value: Math.PI * 2 },
      ]);
      ring.animations.push(ringRot);
      scene.beginAnimation(ring, 0, 300, true);

      // Colored point light to tint the character
      const memLight = new B.PointLight("memLight", new B.Vector3(0, 1.5, 0.5), scene);
      memLight.intensity = 0.4;
      memLight.diffuse = new B.Color3(mc[0], mc[1], mc[2]);
      memLight.range = 4;
    }
  }

  // --- Subtle idle breathing ---
  const breathAnim = new B.Animation("breath", "scaling.y", 30,
    B.Animation.ANIMATIONTYPE_FLOAT, B.Animation.ANIMATIONLOOPMODE_CYCLE);
  breathAnim.setKeys([
    { frame: 0, value: 1.0 },
    { frame: 60, value: 1.008 },
    { frame: 120, value: 1.0 },
  ]);
  chest.animations.push(breathAnim);
  scene.beginAnimation(chest, 0, 120, true);

  return root;
}
