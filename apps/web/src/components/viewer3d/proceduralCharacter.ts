import type { RaceId } from "@dracor/shared";

export interface ProceduralConfig {
  bodyType: "heavy" | "medium" | "lean" | "ethereal";
  height: number;
  skin: [number, number, number];
  armor: [number, number, number];
  accent: [number, number, number];
  eyeGlow: [number, number, number];
}

export const PROCEDURAL_CONFIGS: Record<RaceId, ProceduralConfig> = {
  dracor:      { bodyType: "medium",   height: 1.85, skin: [0.55, 0.38, 0.25], armor: [0.35, 0.18, 0.08], accent: [0.85, 0.45, 0.10], eyeGlow: [1.00, 0.50, 0.00] },
  ironborn:    { bodyType: "heavy",    height: 1.55, skin: [0.42, 0.40, 0.38], armor: [0.30, 0.28, 0.26], accent: [0.70, 0.65, 0.55], eyeGlow: [1.00, 0.60, 0.00] },
  sylvhari:    { bodyType: "lean",     height: 1.95, skin: [0.65, 0.80, 0.65], armor: [0.18, 0.35, 0.20], accent: [0.40, 0.80, 0.45], eyeGlow: [0.30, 1.00, 0.50] },
  ashwalker:   { bodyType: "medium",   height: 1.78, skin: [0.60, 0.48, 0.35], armor: [0.35, 0.28, 0.20], accent: [0.65, 0.50, 0.30], eyeGlow: [0.90, 0.80, 0.40] },
  voidtouched: { bodyType: "ethereal", height: 1.82, skin: [0.48, 0.38, 0.55], armor: [0.15, 0.08, 0.25], accent: [0.50, 0.20, 0.70], eyeGlow: [0.70, 0.20, 1.00] },
  bloodfane:   { bodyType: "lean",     height: 1.92, skin: [0.90, 0.82, 0.78], armor: [0.30, 0.00, 0.00], accent: [0.80, 0.00, 0.15], eyeGlow: [1.00, 0.00, 0.20] },
  stoneguard:  { bodyType: "heavy",    height: 1.40, skin: [0.45, 0.42, 0.40], armor: [0.25, 0.25, 0.25], accent: [0.83, 0.63, 0.09], eyeGlow: [0.83, 0.63, 0.09] },
  grukhar:     { bodyType: "heavy",    height: 2.10, skin: [0.35, 0.42, 0.22], armor: [0.30, 0.22, 0.10], accent: [0.55, 0.41, 0.08], eyeGlow: [0.80, 0.20, 0.00] },
  skrix:       { bodyType: "lean",     height: 1.20, skin: [0.40, 0.48, 0.30], armor: [0.30, 0.35, 0.20], accent: [0.53, 0.67, 0.00], eyeGlow: [0.70, 0.80, 0.00] },
};

export interface ProceduralCharacterResult {
  root: any;
  chestMesh: any;
  hipY: number;
  torsoH: number;
  S: number;
}

export function buildProceduralCharacter(
  B: any,
  scene: any,
  raceId: RaceId,
  config: ProceduralConfig
): ProceduralCharacterResult {
  const S = config.height / 1.8;
  const root = new B.TransformNode("characterRoot", scene);
  const seg = 24;

  const skinMat = new B.StandardMaterial("skin", scene);
  skinMat.diffuseColor = new B.Color3(...config.skin);
  skinMat.specularColor = new B.Color3(0.12, 0.10, 0.08);
  skinMat.specularPower = 40;

  const armorMat = new B.StandardMaterial("armor", scene);
  armorMat.diffuseColor = new B.Color3(...config.armor);
  armorMat.specularColor = new B.Color3(0.20, 0.18, 0.15);
  armorMat.specularPower = 20;

  const accentMat = new B.StandardMaterial("accent", scene);
  accentMat.diffuseColor = new B.Color3(...config.accent);
  accentMat.specularColor = new B.Color3(0.30, 0.28, 0.25);
  accentMat.specularPower = 16;

  const darkMat = new B.StandardMaterial("dark", scene);
  darkMat.diffuseColor = new B.Color3(0.08, 0.06, 0.05);
  darkMat.specularColor = new B.Color3(0.05, 0.05, 0.05);

  const eyeMat = new B.StandardMaterial("eye", scene);
  eyeMat.diffuseColor = new B.Color3(0, 0, 0);
  eyeMat.emissiveColor = new B.Color3(...config.eyeGlow);

  let hipW = 0.22, shoulderW = 0.30, torsoH = 0.55, waistW = 0.20;
  let legUp = 0.42, legLow = 0.42, armUp = 0.35, armLow = 0.32;
  let headR = 0.14, neckH = 0.08, footL = 0.16;

  switch (config.bodyType) {
    case "heavy":
      hipW = 0.28; shoulderW = 0.40; torsoH = 0.50; waistW = 0.28;
      legUp = 0.36; legLow = 0.34; armUp = 0.30; armLow = 0.28;
      headR = 0.16; footL = 0.18;
      break;
    case "lean":
      hipW = 0.18; shoulderW = 0.25; torsoH = 0.60; waistW = 0.17;
      legUp = 0.48; legLow = 0.48; armUp = 0.40; armLow = 0.36;
      headR = 0.12; footL = 0.15;
      break;
    case "ethereal":
      hipW = 0.19; shoulderW = 0.26; torsoH = 0.58; waistW = 0.18;
      legUp = 0.45; legLow = 0.44; armUp = 0.38; armLow = 0.34;
      headR = 0.13; footL = 0.14;
      break;
  }

  const footTop = footL * S * 0.3;
  const kneeY = footTop + legLow * S;
  const hipY = kneeY + legUp * S;
  const waistY = hipY + 0.05 * S;
  const chestY = waistY + torsoH * S * 0.6;
  const shoulderY = waistY + torsoH * S;
  const neckY = shoulderY + neckH * S;
  const headY = neckY + headR * S + 0.02 * S;

  const pelvis = B.MeshBuilder.CreateSphere("pelvis", {
    diameterX: hipW * S * 2.2, diameterY: 0.15 * S, diameterZ: hipW * S * 1.6, segments: seg,
  }, scene);
  pelvis.position.y = hipY;
  pelvis.material = armorMat;
  pelvis.parent = root;

  const lowerTorso = B.MeshBuilder.CreateCylinder("lTorso", {
    diameterTop: shoulderW * S * 2, diameterBottom: waistW * S * 2,
    height: torsoH * S * 0.65, tessellation: seg,
  }, scene);
  lowerTorso.position.y = waistY + torsoH * S * 0.325;
  lowerTorso.material = armorMat;
  lowerTorso.parent = root;

  const chest = B.MeshBuilder.CreateSphere("chest", {
    diameterX: shoulderW * S * 2.2, diameterY: torsoH * S * 0.55,
    diameterZ: shoulderW * S * 1.5, segments: seg,
  }, scene);
  chest.position.y = chestY + torsoH * S * 0.15;
  chest.material = armorMat;
  chest.parent = root;

  const neck = B.MeshBuilder.CreateCylinder("neck", {
    diameter: 0.08 * S, height: neckH * S * 1.5, tessellation: seg,
  }, scene);
  neck.position.y = shoulderY + neckH * S * 0.5;
  neck.material = skinMat;
  neck.parent = root;

  const head = B.MeshBuilder.CreateSphere("head", {
    diameterX: headR * S * 2, diameterY: headR * S * 2.3,
    diameterZ: headR * S * 2, segments: seg,
  }, scene);
  head.position.y = headY;
  head.material = skinMat;
  head.parent = root;

  const face = B.MeshBuilder.CreateSphere("face", {
    diameterX: headR * S * 1.4, diameterY: headR * S * 1.2,
    diameterZ: headR * S * 0.6, segments: 16,
  }, scene);
  face.position.set(0, headY - headR * S * 0.1, headR * S * 0.7);
  face.material = skinMat;
  face.parent = root;

  for (const side of [-1, 1]) {
    const eye = B.MeshBuilder.CreateSphere(`eye${side}`, { diameter: 0.025 * S, segments: 12 }, scene);
    eye.position.set(side * headR * S * 0.4, headY + headR * S * 0.15, headR * S * 0.85);
    eye.material = eyeMat;
    eye.parent = root;
  }

  for (const side of [-1, 1]) {
    const hx = side * hipW * S * 0.75;
    const uLeg = B.MeshBuilder.CreateCapsule(`uLeg${side}`, {
      radius: 0.085 * S, height: legUp * S, subdivisions: 2, tessellation: seg,
    }, scene);
    uLeg.position.set(hx, kneeY + legUp * S * 0.5, 0);
    uLeg.material = armorMat;
    uLeg.parent = root;

    const knee = B.MeshBuilder.CreateSphere(`knee${side}`, { diameter: 0.10 * S, segments: 16 }, scene);
    knee.position.set(hx, kneeY, 0.01 * S);
    knee.material = armorMat;
    knee.parent = root;

    const lLeg = B.MeshBuilder.CreateCapsule(`lLeg${side}`, {
      radius: 0.07 * S, height: legLow * S, subdivisions: 2, tessellation: seg,
    }, scene);
    lLeg.position.set(hx, footTop + legLow * S * 0.5, 0);
    lLeg.material = armorMat;
    lLeg.parent = root;

    const foot = B.MeshBuilder.CreateBox(`foot${side}`, {
      width: 0.10 * S, height: footL * S * 0.3, depth: footL * S,
    }, scene);
    foot.position.set(hx, footL * S * 0.15, 0.03 * S);
    foot.material = darkMat;
    foot.parent = root;
  }

  for (const side of [-1, 1]) {
    const sx = side * (shoulderW * S + 0.02 * S);
    const shoulder = B.MeshBuilder.CreateSphere(`shoulder${side}`, { diameter: 0.12 * S, segments: seg }, scene);
    shoulder.position.set(sx, shoulderY, 0);
    shoulder.material = accentMat;
    shoulder.parent = root;

    const uArm = B.MeshBuilder.CreateCapsule(`uArm${side}`, {
      radius: 0.055 * S, height: armUp * S, subdivisions: 2, tessellation: seg,
    }, scene);
    uArm.position.set(sx * 1.05, shoulderY - armUp * S * 0.5, 0);
    uArm.rotation.z = side * 0.08;
    uArm.material = skinMat;
    uArm.parent = root;

    const elbow = B.MeshBuilder.CreateSphere(`elbow${side}`, { diameter: 0.065 * S, segments: 12 }, scene);
    elbow.position.set(sx * 1.08, shoulderY - armUp * S, 0);
    elbow.material = skinMat;
    elbow.parent = root;

    const fArm = B.MeshBuilder.CreateCapsule(`fArm${side}`, {
      radius: 0.048 * S, height: armLow * S, subdivisions: 2, tessellation: seg,
    }, scene);
    fArm.position.set(sx * 1.10, shoulderY - armUp * S - armLow * S * 0.5, 0.01 * S);
    fArm.rotation.z = side * 0.04;
    fArm.material = skinMat;
    fArm.parent = root;

    const hand = B.MeshBuilder.CreateSphere(`hand${side}`, {
      diameterX: 0.06 * S, diameterY: 0.07 * S, diameterZ: 0.04 * S, segments: 12,
    }, scene);
    hand.position.set(sx * 1.12, shoulderY - armUp * S - armLow * S, 0.02 * S);
    hand.material = skinMat;
    hand.parent = root;

    const bracer = B.MeshBuilder.CreateCylinder(`bracer${side}`, {
      diameter: 0.07 * S, height: 0.08 * S, tessellation: seg,
    }, scene);
    bracer.position.set(sx * 1.10, shoulderY - armUp * S - armLow * S * 0.35, 0.01 * S);
    bracer.material = accentMat;
    bracer.parent = root;
  }

  const belt = B.MeshBuilder.CreateCylinder("belt", {
    diameter: waistW * S * 2.3, height: 0.04 * S, tessellation: seg,
  }, scene);
  belt.position.y = waistY;
  belt.material = accentMat;
  belt.parent = root;

  attachRaceFeatures(B, scene, root, raceId, {
    accentMat, skinMat, headR, S, shoulderY, shoulderW, chestY, torsoH, headY,
  });

  return { root, chestMesh: chest, hipY, torsoH, S };
}

function attachRaceFeatures(
  B: any, scene: any, root: any, raceId: RaceId,
  ctx: { accentMat: any; skinMat: any; headR: number; S: number; shoulderY: number; shoulderW: number; chestY: number; torsoH: number; headY: number }
) {
  const { accentMat, skinMat, headR, S, shoulderY, shoulderW, chestY, torsoH, headY } = ctx;

  if (raceId === "dracor") {
    for (const side of [-1, 1]) {
      const horn = B.MeshBuilder.CreateCylinder(`horn${side}`, {
        diameterTop: 0, diameterBottom: 0.04 * S, height: 0.22 * S, tessellation: 12,
      }, scene);
      horn.position.set(side * headR * S * 0.6, headY + headR * S * 0.8, -headR * S * 0.15);
      horn.rotation.z = side * -0.3;
      horn.rotation.x = 0.35;
      horn.material = accentMat;
      horn.parent = root;
    }
    for (let i = 0; i < 3; i++) {
      const ridge = B.MeshBuilder.CreateSphere(`ridge${i}`, {
        diameterX: 0.04 * S, diameterY: 0.025 * S, diameterZ: 0.03 * S, segments: 8,
      }, scene);
      ridge.position.set(0, shoulderY - i * 0.1 * S, -shoulderW * S * 0.5);
      ridge.material = accentMat;
      ridge.parent = root;
    }
  } else if (raceId === "ironborn") {
    const brow = B.MeshBuilder.CreateBox("brow", {
      width: headR * S * 2.4, height: headR * S * 0.4, depth: headR * S * 1.2,
    }, scene);
    brow.position.set(0, headY + headR * S * 0.7, headR * S * 0.1);
    brow.material = accentMat;
    brow.parent = root;
    const plate = B.MeshBuilder.CreateBox("plate", {
      width: shoulderW * S * 1.6, height: torsoH * S * 0.5, depth: 0.06 * S,
    }, scene);
    plate.position.set(0, chestY + torsoH * S * 0.1, shoulderW * S * 0.5);
    plate.material = accentMat;
    plate.parent = root;
  } else if (raceId === "sylvhari") {
    for (const side of [-1, 1]) {
      const ear = B.MeshBuilder.CreateCylinder(`ear${side}`, {
        diameterTop: 0, diameterBottom: 0.025 * S, height: 0.18 * S, tessellation: 6,
      }, scene);
      ear.position.set(side * headR * S * 0.95, headY + headR * S * 0.1, 0);
      ear.rotation.z = side * -0.9;
      ear.material = skinMat;
      ear.parent = root;
    }
    const crown = B.MeshBuilder.CreateTorus("crown", {
      diameter: headR * S * 2.6, thickness: 0.02 * S, tessellation: 24,
    }, scene);
    crown.position.y = headY + headR * S * 0.8;
    crown.rotation.x = Math.PI / 2;
    crown.material = accentMat;
    crown.parent = root;
  } else if (raceId === "ashwalker") {
    const hood = B.MeshBuilder.CreateSphere("hood", {
      diameterX: headR * S * 2.8, diameterY: headR * S * 2.2,
      diameterZ: headR * S * 2.8, segments: 16, slice: 0.55,
    }, scene);
    hood.position.set(0, headY + headR * S * 0.15, -headR * S * 0.3);
    hood.rotation.x = -0.2;
    const hoodMat = new B.StandardMaterial("hood", scene);
    hoodMat.diffuseColor = new B.Color3(0.20, 0.16, 0.12);
    hoodMat.specularColor = new B.Color3(0.05, 0.05, 0.05);
    hood.material = hoodMat;
    hood.parent = root;
    const strap = B.MeshBuilder.CreateBox("strap", {
      width: 0.03 * S, height: torsoH * S * 1.2, depth: 0.015 * S,
    }, scene);
    strap.position.set(shoulderW * S * 0.2, chestY, shoulderW * S * 0.3);
    strap.rotation.z = 0.45;
    strap.material = accentMat;
    strap.parent = root;
  } else if (raceId === "voidtouched") {
    const halo = B.MeshBuilder.CreateTorus("halo", {
      diameter: headR * S * 3.5, thickness: 0.015 * S, tessellation: 32,
    }, scene);
    halo.position.y = headY + headR * S * 1.5;
    halo.rotation.x = Math.PI / 2;
    const haloMat = new B.StandardMaterial("haloM", scene);
    haloMat.emissiveColor = new B.Color3(0.4, 0.1, 0.7);
    haloMat.diffuseColor = new B.Color3(0, 0, 0);
    haloMat.alpha = 0.7;
    halo.material = haloMat;
    halo.parent = root;
    root.getChildMeshes().forEach((m: any) => {
      if (m.material && m !== halo) {
        m.material = m.material.clone(m.material.name + "_v");
        m.material.alpha = 0.9;
      }
    });
  } else if (raceId === "bloodfane") {
    for (const side of [-1, 1]) {
      const ear = B.MeshBuilder.CreateCylinder(`ear${side}`, {
        diameterTop: 0, diameterBottom: 0.02 * S, height: 0.20 * S, tessellation: 6,
      }, scene);
      ear.position.set(side * headR * S * 0.95, headY + headR * S * 0.15, 0);
      ear.rotation.z = side * -0.85;
      ear.material = skinMat;
      ear.parent = root;
    }
    const circlet = B.MeshBuilder.CreateTorus("circlet", {
      diameter: headR * S * 2.3, thickness: 0.015 * S, tessellation: 24,
    }, scene);
    circlet.position.y = headY + headR * S * 0.6;
    circlet.rotation.x = Math.PI / 2;
    circlet.material = accentMat;
    circlet.parent = root;
  } else if (raceId === "stoneguard") {
    const helm = B.MeshBuilder.CreateBox("helm", {
      width: headR * S * 2.5, height: headR * S * 0.5, depth: headR * S * 1.4,
    }, scene);
    helm.position.set(0, headY + headR * S * 0.6, headR * S * 0.05);
    helm.material = accentMat;
    helm.parent = root;
    const beard = B.MeshBuilder.CreateCylinder("beard", {
      diameterTop: headR * S * 1.2, diameterBottom: 0.02 * S, height: 0.25 * S, tessellation: 8,
    }, scene);
    beard.position.set(0, headY - headR * S * 1.0, headR * S * 0.3);
    beard.material = skinMat;
    beard.parent = root;
    const plate = B.MeshBuilder.CreateBox("sPlate", {
      width: shoulderW * S * 1.8, height: torsoH * S * 0.5, depth: 0.07 * S,
    }, scene);
    plate.position.set(0, chestY + torsoH * S * 0.1, shoulderW * S * 0.5);
    plate.material = accentMat;
    plate.parent = root;
  } else if (raceId === "grukhar") {
    for (const side of [-1, 1]) {
      const tusk = B.MeshBuilder.CreateCylinder(`tusk${side}`, {
        diameterTop: 0, diameterBottom: 0.03 * S, height: 0.12 * S, tessellation: 8,
      }, scene);
      tusk.position.set(side * headR * S * 0.45, headY - headR * S * 0.5, headR * S * 0.75);
      tusk.rotation.x = -0.3;
      tusk.material = accentMat;
      tusk.parent = root;
    }
    const jaw = B.MeshBuilder.CreateBox("jaw", {
      width: headR * S * 1.8, height: headR * S * 0.3, depth: headR * S * 0.5,
    }, scene);
    jaw.position.set(0, headY - headR * S * 0.6, headR * S * 0.4);
    jaw.material = skinMat;
    jaw.parent = root;
  } else if (raceId === "skrix") {
    for (const side of [-1, 1]) {
      const ear = B.MeshBuilder.CreateCylinder(`ear${side}`, {
        diameterTop: 0, diameterBottom: 0.035 * S, height: 0.22 * S, tessellation: 4,
      }, scene);
      ear.position.set(side * headR * S * 1.0, headY + headR * S * 0.3, -headR * S * 0.1);
      ear.rotation.z = side * -0.7;
      ear.material = skinMat;
      ear.parent = root;
    }
    const goggle = B.MeshBuilder.CreateTorus("goggle", {
      diameter: headR * S * 1.4, thickness: 0.015 * S, tessellation: 16,
    }, scene);
    goggle.position.set(0, headY + headR * S * 0.5, headR * S * 0.3);
    goggle.rotation.x = Math.PI / 2.5;
    goggle.material = accentMat;
    goggle.parent = root;
  }
}
