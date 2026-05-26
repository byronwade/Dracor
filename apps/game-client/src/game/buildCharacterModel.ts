import { Scene } from '@babylonjs/core/scene';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import '@babylonjs/core/Meshes/Builders/sphereBuilder';
import '@babylonjs/core/Meshes/Builders/boxBuilder';
import '@babylonjs/core/Meshes/Builders/torusBuilder';
import '@babylonjs/core/Meshes/Builders/capsuleBuilder';

export interface RaceVisuals {
  bodyType: 'heavy' | 'medium' | 'lean' | 'ethereal';
  height: number;
  skin: [number, number, number];
  armor: [number, number, number];
  accent: [number, number, number];
  eyeGlow: [number, number, number];
}

const RACE_VISUALS: Record<string, RaceVisuals> = {
  dracor:      { bodyType: 'medium',   height: 1.85, skin: [0.55, 0.38, 0.25], armor: [0.35, 0.18, 0.08], accent: [0.85, 0.45, 0.1],  eyeGlow: [1.0, 0.5, 0.0] },
  ironborn:    { bodyType: 'heavy',    height: 1.55, skin: [0.42, 0.4, 0.38],  armor: [0.3, 0.28, 0.26],  accent: [0.7, 0.65, 0.55],  eyeGlow: [1.0, 0.6, 0.0] },
  sylvhari:    { bodyType: 'lean',     height: 1.95, skin: [0.65, 0.8, 0.65],  armor: [0.18, 0.35, 0.2],  accent: [0.4, 0.8, 0.45],   eyeGlow: [0.3, 1.0, 0.5] },
  ashwalker:   { bodyType: 'medium',   height: 1.78, skin: [0.6, 0.48, 0.35],  armor: [0.35, 0.28, 0.2],  accent: [0.65, 0.5, 0.3],   eyeGlow: [0.9, 0.8, 0.4] },
  voidtouched: { bodyType: 'ethereal', height: 1.82, skin: [0.48, 0.38, 0.55], armor: [0.15, 0.08, 0.25], accent: [0.5, 0.2, 0.7],    eyeGlow: [0.7, 0.2, 1.0] },
  bloodfane:   { bodyType: 'lean',     height: 1.92, skin: [0.9, 0.82, 0.78],  armor: [0.3, 0.0, 0.0],    accent: [0.8, 0.0, 0.15],   eyeGlow: [1.0, 0.0, 0.2] },
  stoneguard:  { bodyType: 'heavy',    height: 1.4,  skin: [0.45, 0.42, 0.4],  armor: [0.25, 0.25, 0.25], accent: [0.83, 0.63, 0.09],  eyeGlow: [0.83, 0.63, 0.09] },
  grukhar:     { bodyType: 'heavy',    height: 2.1,  skin: [0.35, 0.42, 0.22], armor: [0.3, 0.22, 0.1],   accent: [0.55, 0.41, 0.08],  eyeGlow: [0.8, 0.2, 0.0] },
  skrix:       { bodyType: 'lean',     height: 1.2,  skin: [0.4, 0.48, 0.3],   armor: [0.3, 0.35, 0.2],   accent: [0.53, 0.67, 0.0],   eyeGlow: [0.7, 0.8, 0.0] },
};

export function buildCharacterModel(
  scene: Scene,
  race: string,
  weapon: string,
  prefix: string
): { root: TransformNode; totalHeight: number } {
  const config = RACE_VISUALS[race] || RACE_VISUALS.dracor;
  const S = config.height / 1.8;
  const seg = 16;

  const root = new TransformNode(`${prefix}_root`, scene);

  const skinMat = new StandardMaterial(`${prefix}_skin`, scene);
  skinMat.diffuseColor = new Color3(...config.skin);
  skinMat.specularColor = new Color3(0.12, 0.1, 0.08);
  skinMat.specularPower = 40;

  const armorMat = new StandardMaterial(`${prefix}_armor`, scene);
  armorMat.diffuseColor = new Color3(...config.armor);
  armorMat.specularColor = new Color3(0.2, 0.18, 0.15);
  armorMat.specularPower = 20;

  const accentMat = new StandardMaterial(`${prefix}_accent`, scene);
  accentMat.diffuseColor = new Color3(...config.accent);
  accentMat.specularColor = new Color3(0.3, 0.28, 0.25);
  accentMat.specularPower = 16;

  const darkMat = new StandardMaterial(`${prefix}_dark`, scene);
  darkMat.diffuseColor = new Color3(0.08, 0.06, 0.05);
  darkMat.specularColor = new Color3(0.05, 0.05, 0.05);

  const eyeMat = new StandardMaterial(`${prefix}_eye`, scene);
  eyeMat.diffuseColor = new Color3(0, 0, 0);
  eyeMat.emissiveColor = new Color3(...config.eyeGlow);

  let hipW = 0.22, shoulderW = 0.3, torsoH = 0.55, waistW = 0.2;
  let legUp = 0.42, legLow = 0.42, armUp = 0.35, armLow = 0.32;
  let headR = 0.14, neckH = 0.08, footL = 0.16;

  switch (config.bodyType) {
    case 'heavy':
      hipW = 0.28; shoulderW = 0.4; torsoH = 0.5; waistW = 0.28;
      legUp = 0.36; legLow = 0.34; armUp = 0.3; armLow = 0.28;
      headR = 0.16; footL = 0.18;
      break;
    case 'lean':
      hipW = 0.18; shoulderW = 0.25; torsoH = 0.6; waistW = 0.17;
      legUp = 0.48; legLow = 0.48; armUp = 0.4; armLow = 0.36;
      headR = 0.12; footL = 0.15;
      break;
    case 'ethereal':
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

  const p = (n: string) => `${prefix}_${n}`;

  // Pelvis
  const pelvis = MeshBuilder.CreateSphere(p('pelvis'), {
    diameterX: hipW * S * 2.2, diameterY: 0.15 * S, diameterZ: hipW * S * 1.6, segments: seg
  }, scene);
  pelvis.position.y = hipY;
  pelvis.material = armorMat;
  pelvis.parent = root;

  // Lower torso
  const lowerTorso = MeshBuilder.CreateCylinder(p('lTorso'), {
    diameterTop: shoulderW * S * 2, diameterBottom: waistW * S * 2,
    height: torsoH * S * 0.65, tessellation: seg
  }, scene);
  lowerTorso.position.y = waistY + torsoH * S * 0.325;
  lowerTorso.material = armorMat;
  lowerTorso.parent = root;

  // Chest
  const chest = MeshBuilder.CreateSphere(p('chest'), {
    diameterX: shoulderW * S * 2.2, diameterY: torsoH * S * 0.55,
    diameterZ: shoulderW * S * 1.5, segments: seg
  }, scene);
  chest.position.y = chestY + torsoH * S * 0.15;
  chest.material = armorMat;
  chest.parent = root;

  // Neck
  const neck = MeshBuilder.CreateCylinder(p('neck'), {
    diameter: 0.08 * S, height: neckH * S * 1.5, tessellation: seg
  }, scene);
  neck.position.y = shoulderY + neckH * S * 0.5;
  neck.material = skinMat;
  neck.parent = root;

  // Head
  const head = MeshBuilder.CreateSphere(p('head'), {
    diameterX: headR * S * 2, diameterY: headR * S * 2.3,
    diameterZ: headR * S * 2, segments: seg
  }, scene);
  head.position.y = headY;
  head.material = skinMat;
  head.parent = root;

  // Face
  const face = MeshBuilder.CreateSphere(p('face'), {
    diameterX: headR * S * 1.4, diameterY: headR * S * 1.2,
    diameterZ: headR * S * 0.6, segments: 12
  }, scene);
  face.position.set(0, headY - headR * S * 0.1, headR * S * 0.7);
  face.material = skinMat;
  face.parent = root;

  // Eyes
  for (const side of [-1, 1]) {
    const eye = MeshBuilder.CreateSphere(p(`eye${side}`), { diameter: 0.025 * S, segments: 8 }, scene);
    eye.position.set(side * headR * S * 0.4, headY + headR * S * 0.15, headR * S * 0.85);
    eye.material = eyeMat;
    eye.parent = root;
  }

  // Legs
  for (const side of [-1, 1]) {
    const hx = side * hipW * S * 0.75;
    const uLeg = MeshBuilder.CreateCapsule(p(`uLeg${side}`), { radius: 0.085 * S, height: legUp * S, subdivisions: 2, tessellation: seg }, scene);
    uLeg.position.set(hx, kneeY + legUp * S * 0.5, 0);
    uLeg.material = armorMat;
    uLeg.parent = root;

    const knee = MeshBuilder.CreateSphere(p(`knee${side}`), { diameter: 0.1 * S, segments: 12 }, scene);
    knee.position.set(hx, kneeY, 0.01 * S);
    knee.material = armorMat;
    knee.parent = root;

    const lLeg = MeshBuilder.CreateCapsule(p(`lLeg${side}`), { radius: 0.07 * S, height: legLow * S, subdivisions: 2, tessellation: seg }, scene);
    lLeg.position.set(hx, footTop + legLow * S * 0.5, 0);
    lLeg.material = armorMat;
    lLeg.parent = root;

    const foot = MeshBuilder.CreateBox(p(`foot${side}`), { width: 0.1 * S, height: footL * S * 0.3, depth: footL * S }, scene);
    foot.position.set(hx, footL * S * 0.15, 0.03 * S);
    foot.material = darkMat;
    foot.parent = root;
  }

  // Arms
  for (const side of [-1, 1]) {
    const sx = side * (shoulderW * S + 0.02 * S);

    const shoulder = MeshBuilder.CreateSphere(p(`shoulder${side}`), { diameter: 0.12 * S, segments: seg }, scene);
    shoulder.position.set(sx, shoulderY, 0);
    shoulder.material = accentMat;
    shoulder.parent = root;

    const uArm = MeshBuilder.CreateCapsule(p(`uArm${side}`), { radius: 0.055 * S, height: armUp * S, subdivisions: 2, tessellation: seg }, scene);
    uArm.position.set(sx * 1.05, shoulderY - armUp * S * 0.5, 0);
    uArm.rotation.z = side * 0.08;
    uArm.material = skinMat;
    uArm.parent = root;

    const elbow = MeshBuilder.CreateSphere(p(`elbow${side}`), { diameter: 0.065 * S, segments: 8 }, scene);
    elbow.position.set(sx * 1.08, shoulderY - armUp * S, 0);
    elbow.material = skinMat;
    elbow.parent = root;

    const fArm = MeshBuilder.CreateCapsule(p(`fArm${side}`), { radius: 0.048 * S, height: armLow * S, subdivisions: 2, tessellation: seg }, scene);
    fArm.position.set(sx * 1.1, shoulderY - armUp * S - armLow * S * 0.5, 0.01 * S);
    fArm.rotation.z = side * 0.04;
    fArm.material = skinMat;
    fArm.parent = root;

    const hand = MeshBuilder.CreateSphere(p(`hand${side}`), { diameterX: 0.06 * S, diameterY: 0.07 * S, diameterZ: 0.04 * S, segments: 8 }, scene);
    hand.position.set(sx * 1.12, shoulderY - armUp * S - armLow * S, 0.02 * S);
    hand.material = skinMat;
    hand.parent = root;

    const bracer = MeshBuilder.CreateCylinder(p(`bracer${side}`), { diameter: 0.07 * S, height: 0.08 * S, tessellation: seg }, scene);
    bracer.position.set(sx * 1.1, shoulderY - armUp * S - armLow * S * 0.35, 0.01 * S);
    bracer.material = accentMat;
    bracer.parent = root;
  }

  // Belt
  const belt = MeshBuilder.CreateCylinder(p('belt'), { diameter: waistW * S * 2.3, height: 0.04 * S, tessellation: seg }, scene);
  belt.position.y = waistY;
  belt.material = accentMat;
  belt.parent = root;

  // Race features
  buildRaceFeatures(scene, race, config, root, headY, headR, shoulderY, chestY, shoulderW, torsoH, S, seg, skinMat, armorMat, accentMat, prefix);

  // Weapon
  if (weapon) {
    const handX = (shoulderW * S + 0.02 * S) * 1.12;
    const handY2 = shoulderY - armUp * S - armLow * S;
    const handZ = 0.02 * S;
    buildWeapon(scene, weapon, handX, handY2, handZ, S, accentMat, darkMat, root, prefix);
  }

  const totalHeight = headY + headR * S;
  return { root, totalHeight };
}

function buildRaceFeatures(
  scene: Scene, race: string, config: RaceVisuals, root: TransformNode,
  headY: number, headR: number, shoulderY: number, chestY: number,
  shoulderW: number, torsoH: number, S: number, seg: number,
  skinMat: StandardMaterial, _armorMat: StandardMaterial, accentMat: StandardMaterial,
  prefix: string
) {
  const p = (n: string) => `${prefix}_${n}`;

  if (race === 'dracor') {
    for (const side of [-1, 1]) {
      const horn = MeshBuilder.CreateCylinder(p(`horn${side}`), { diameterTop: 0, diameterBottom: 0.04 * S, height: 0.22 * S, tessellation: 10 }, scene);
      horn.position.set(side * headR * S * 0.6, headY + headR * S * 0.8, -headR * S * 0.15);
      horn.rotation.z = side * -0.3;
      horn.rotation.x = 0.35;
      horn.material = accentMat;
      horn.parent = root;
    }
    for (let i = 0; i < 3; i++) {
      const ridge = MeshBuilder.CreateSphere(p(`ridge${i}`), { diameterX: 0.04 * S, diameterY: 0.025 * S, diameterZ: 0.03 * S, segments: 6 }, scene);
      ridge.position.set(0, shoulderY - i * 0.1 * S, -shoulderW * S * 0.5);
      ridge.material = accentMat;
      ridge.parent = root;
    }
  } else if (race === 'ironborn') {
    const brow = MeshBuilder.CreateBox(p('brow'), { width: headR * S * 2.4, height: headR * S * 0.4, depth: headR * S * 1.2 }, scene);
    brow.position.set(0, headY + headR * S * 0.7, headR * S * 0.1);
    brow.material = accentMat;
    brow.parent = root;
    const plate = MeshBuilder.CreateBox(p('plate'), { width: shoulderW * S * 1.6, height: torsoH * S * 0.5, depth: 0.06 * S }, scene);
    plate.position.set(0, chestY + torsoH * S * 0.1, shoulderW * S * 0.5);
    plate.material = accentMat;
    plate.parent = root;
  } else if (race === 'sylvhari') {
    for (const side of [-1, 1]) {
      const ear = MeshBuilder.CreateCylinder(p(`ear${side}`), { diameterTop: 0, diameterBottom: 0.025 * S, height: 0.18 * S, tessellation: 6 }, scene);
      ear.position.set(side * headR * S * 0.95, headY + headR * S * 0.1, 0);
      ear.rotation.z = side * -0.9;
      ear.material = skinMat;
      ear.parent = root;
    }
    const crown = MeshBuilder.CreateTorus(p('crown'), { diameter: headR * S * 2.6, thickness: 0.02 * S, tessellation: 20 }, scene);
    crown.position.y = headY + headR * S * 0.8;
    crown.rotation.x = Math.PI / 2;
    crown.material = accentMat;
    crown.parent = root;
  } else if (race === 'ashwalker') {
    const hood = MeshBuilder.CreateSphere(p('hood'), { diameterX: headR * S * 2.8, diameterY: headR * S * 2.2, diameterZ: headR * S * 2.8, segments: 12 }, scene);
    hood.position.set(0, headY + headR * S * 0.15, -headR * S * 0.3);
    const hoodMat = new StandardMaterial(p('hoodMat'), scene);
    hoodMat.diffuseColor = new Color3(0.2, 0.16, 0.12);
    hoodMat.specularColor = new Color3(0.05, 0.05, 0.05);
    hood.material = hoodMat;
    hood.parent = root;
    const strap = MeshBuilder.CreateBox(p('strap'), { width: 0.03 * S, height: torsoH * S * 1.2, depth: 0.015 * S }, scene);
    strap.position.set(shoulderW * S * 0.2, chestY, shoulderW * S * 0.3);
    strap.rotation.z = 0.45;
    strap.material = accentMat;
    strap.parent = root;
  } else if (race === 'voidtouched') {
    const halo = MeshBuilder.CreateTorus(p('halo'), { diameter: headR * S * 3.5, thickness: 0.015 * S, tessellation: 24 }, scene);
    halo.position.y = headY + headR * S * 1.5;
    halo.rotation.x = Math.PI / 2;
    const haloMat = new StandardMaterial(p('haloMat'), scene);
    haloMat.emissiveColor = new Color3(0.4, 0.1, 0.7);
    haloMat.diffuseColor = new Color3(0, 0, 0);
    haloMat.alpha = 0.7;
    halo.material = haloMat;
    halo.parent = root;
  } else if (race === 'bloodfane') {
    for (const side of [-1, 1]) {
      const ear = MeshBuilder.CreateCylinder(p(`ear${side}`), { diameterTop: 0, diameterBottom: 0.02 * S, height: 0.2 * S, tessellation: 6 }, scene);
      ear.position.set(side * headR * S * 0.95, headY + headR * S * 0.15, 0);
      ear.rotation.z = side * -0.85;
      ear.material = skinMat;
      ear.parent = root;
    }
    const circlet = MeshBuilder.CreateTorus(p('circlet'), { diameter: headR * S * 2.3, thickness: 0.015 * S, tessellation: 20 }, scene);
    circlet.position.y = headY + headR * S * 0.6;
    circlet.rotation.x = Math.PI / 2;
    circlet.material = accentMat;
    circlet.parent = root;
  } else if (race === 'stoneguard') {
    const helm = MeshBuilder.CreateBox(p('helm'), { width: headR * S * 2.5, height: headR * S * 0.5, depth: headR * S * 1.4 }, scene);
    helm.position.set(0, headY + headR * S * 0.6, headR * S * 0.05);
    helm.material = accentMat;
    helm.parent = root;
    const beard = MeshBuilder.CreateCylinder(p('beard'), { diameterTop: headR * S * 1.2, diameterBottom: 0.02 * S, height: 0.25 * S, tessellation: 8 }, scene);
    beard.position.set(0, headY - headR * S * 1.0, headR * S * 0.3);
    beard.material = skinMat;
    beard.parent = root;
    const plate = MeshBuilder.CreateBox(p('sPlate'), { width: shoulderW * S * 1.8, height: torsoH * S * 0.5, depth: 0.07 * S }, scene);
    plate.position.set(0, chestY + torsoH * S * 0.1, shoulderW * S * 0.5);
    plate.material = accentMat;
    plate.parent = root;
  } else if (race === 'grukhar') {
    for (const side of [-1, 1]) {
      const tusk = MeshBuilder.CreateCylinder(p(`tusk${side}`), { diameterTop: 0, diameterBottom: 0.03 * S, height: 0.12 * S, tessellation: 8 }, scene);
      tusk.position.set(side * headR * S * 0.45, headY - headR * S * 0.5, headR * S * 0.75);
      tusk.rotation.x = -0.3;
      tusk.material = accentMat;
      tusk.parent = root;
    }
    const jaw = MeshBuilder.CreateBox(p('jaw'), { width: headR * S * 1.8, height: headR * S * 0.3, depth: headR * S * 0.5 }, scene);
    jaw.position.set(0, headY - headR * S * 0.6, headR * S * 0.4);
    jaw.material = skinMat;
    jaw.parent = root;
  } else if (race === 'skrix') {
    for (const side of [-1, 1]) {
      const ear = MeshBuilder.CreateCylinder(p(`ear${side}`), { diameterTop: 0, diameterBottom: 0.035 * S, height: 0.22 * S, tessellation: 4 }, scene);
      ear.position.set(side * headR * S * 1.0, headY + headR * S * 0.3, -headR * S * 0.1);
      ear.rotation.z = side * -0.7;
      ear.material = skinMat;
      ear.parent = root;
    }
    const goggle = MeshBuilder.CreateTorus(p('goggle'), { diameter: headR * S * 1.4, thickness: 0.015 * S, tessellation: 12 }, scene);
    goggle.position.set(0, headY + headR * S * 0.5, headR * S * 0.3);
    goggle.rotation.x = Math.PI / 2.5;
    goggle.material = accentMat;
    goggle.parent = root;
  }
}

function buildWeapon(
  scene: Scene, weapon: string,
  handX: number, handY: number, handZ: number, S: number,
  accentMat: StandardMaterial, darkMat: StandardMaterial,
  root: TransformNode, prefix: string
) {
  const p = (n: string) => `${prefix}_${n}`;
  const weaponMat = new StandardMaterial(p('weaponMat'), scene);
  weaponMat.specularColor = new Color3(0.6, 0.6, 0.6);
  weaponMat.specularPower = 8;

  const anchor = new TransformNode(p('weaponAnchor'), scene);
  anchor.position.set(handX, handY, handZ);
  anchor.rotation.x = -0.15;
  anchor.rotation.z = 0.2;
  anchor.parent = root;

  if (weapon === 'blade') {
    weaponMat.diffuseColor = new Color3(0.65, 0.65, 0.7);
    const blade = MeshBuilder.CreateBox(p('blade'), { width: 0.02 * S, height: 0.6 * S, depth: 0.006 * S }, scene);
    blade.position.y = 0.32 * S;
    blade.material = weaponMat;
    blade.parent = anchor;
    const guard = MeshBuilder.CreateBox(p('guard'), { width: 0.14 * S, height: 0.012 * S, depth: 0.02 * S }, scene);
    guard.position.y = 0.02 * S;
    guard.material = accentMat;
    guard.parent = anchor;
    const grip = MeshBuilder.CreateCylinder(p('grip'), { diameter: 0.022 * S, height: 0.1 * S, tessellation: 8 }, scene);
    grip.position.y = -0.04 * S;
    grip.material = darkMat;
    grip.parent = anchor;
    const pommel = MeshBuilder.CreateSphere(p('pommel'), { diameter: 0.03 * S, segments: 6 }, scene);
    pommel.position.y = -0.09 * S;
    pommel.material = accentMat;
    pommel.parent = anchor;
  } else if (weapon === 'bow') {
    const bowMat = new StandardMaterial(p('bowMat'), scene);
    bowMat.diffuseColor = new Color3(0.4, 0.25, 0.12);
    bowMat.specularColor = new Color3(0.15, 0.12, 0.08);
    const bowAnchor = new TransformNode(p('bowAnchor'), scene);
    bowAnchor.position.set(-handX, handY + 0.1 * S, handZ);
    bowAnchor.parent = root;
    const stave = MeshBuilder.CreateCylinder(p('bowStave'), { diameterTop: 0.015 * S, diameterBottom: 0.015 * S, height: 0.6 * S, tessellation: 8 }, scene);
    stave.material = bowMat;
    stave.parent = bowAnchor;
    const stringMat = new StandardMaterial(p('stringMat'), scene);
    stringMat.diffuseColor = new Color3(0.85, 0.82, 0.75);
    stringMat.emissiveColor = new Color3(0.08, 0.08, 0.08);
    const string = MeshBuilder.CreateCylinder(p('bowstring'), { diameter: 0.003 * S, height: 0.55 * S, tessellation: 4 }, scene);
    string.position.z = 0.06 * S;
    string.material = stringMat;
    string.parent = bowAnchor;
  } else if (weapon === 'staff') {
    weaponMat.diffuseColor = new Color3(0.35, 0.22, 0.1);
    const staffAnchor = new TransformNode(p('staffAnchor'), scene);
    staffAnchor.position.set(handX, handY, handZ);
    staffAnchor.rotation.z = 0.08;
    staffAnchor.parent = root;
    const pole = MeshBuilder.CreateCylinder(p('staff'), { diameterTop: 0.014 * S, diameterBottom: 0.024 * S, height: 1.3 * S, tessellation: 8 }, scene);
    pole.position.y = 0.65 * S;
    pole.material = weaponMat;
    pole.parent = staffAnchor;
    const orb = MeshBuilder.CreateSphere(p('staffOrb'), { diameter: 0.09 * S, segments: 12 }, scene);
    orb.position.y = 1.32 * S;
    const orbMat = new StandardMaterial(p('orbMat'), scene);
    orbMat.diffuseColor = new Color3(0.1, 0.05, 0.15);
    orbMat.emissiveColor = new Color3(0.6, 0.3, 1.0);
    orbMat.alpha = 0.9;
    orb.material = orbMat;
    orb.parent = staffAnchor;
    const ferrule = MeshBuilder.CreateSphere(p('ferrule'), { diameter: 0.03 * S, segments: 6 }, scene);
    ferrule.position.y = 0;
    ferrule.material = accentMat;
    ferrule.parent = staffAnchor;
  }
}
