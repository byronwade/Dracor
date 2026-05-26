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
};

export function CharacterViewer({
  raceId,
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

    // Camera — front-facing, slightly above eye level
    const camera = new B.ArcRotateCamera(
      "camera",
      Math.PI,
      Math.PI / 2.4,
      4.2,
      new B.Vector3(0, 1.1, 0),
      scene
    );
    camera.lowerRadiusLimit = 2.5;
    camera.upperRadiusLimit = 7;
    camera.lowerBetaLimit = 0.4;
    camera.upperBetaLimit = Math.PI / 2.05;
    camera.wheelDeltaPercentage = 0.02;
    camera.attachControl(canvasRef.current, true);

    // 3-point studio lighting
    const keyLight = new B.DirectionalLight("key", new B.Vector3(-0.5, -1.2, 1), scene);
    keyLight.intensity = 1.6;
    keyLight.diffuse = new B.Color3(1, 0.95, 0.9);

    const fillLight = new B.HemisphericLight("fill", new B.Vector3(0, 1, 0), scene);
    fillLight.intensity = 0.45;
    fillLight.diffuse = new B.Color3(0.55, 0.6, 0.8);
    fillLight.groundColor = new B.Color3(0.1, 0.06, 0.04);

    const rimLight = new B.PointLight("rim", new B.Vector3(1.5, 2, -2), scene);
    rimLight.intensity = 0.8;
    rimLight.diffuse = new B.Color3(0.7, 0.75, 0.9);
    rimLight.range = 8;

    // Simple dark ground
    const ground = B.MeshBuilder.CreateGround("ground", { width: 16, height: 16 }, scene);
    ground.position.y = 0;
    const gMat = new B.StandardMaterial("gMat", scene);
    gMat.diffuseColor = new B.Color3(0.03, 0.025, 0.04);
    gMat.specularColor = new B.Color3(0.02, 0.02, 0.02);
    ground.material = gMat;

    // Build the character
    buildCharacter(B, scene, config, raceId);

    // Gentle auto-rotate
    if (autoRotate) {
      let t = 0;
      scene.onBeforeRenderObservable.add(() => {
        t += 0.003;
        camera.alpha = Math.PI + Math.sin(t) * 0.2;
      });
    }

    engine.runRenderLoop(() => scene.render());
    const onResize = () => engine.resize();
    window.addEventListener("resize", onResize);
    return () => { window.removeEventListener("resize", onResize); engine.dispose(); };
  }, [raceId, autoRotate]);

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

function buildCharacter(B: any, scene: any, config: (typeof RACE_CONFIGS)[RaceId], raceId: RaceId) {
  const S = config.height / 1.8; // scale factor
  const root = new B.TransformNode("root", scene);
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
