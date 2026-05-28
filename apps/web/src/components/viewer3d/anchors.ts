import type { RaceId, WeaponType } from "@dracor/shared";

export type Vec3 = { x: number; y: number; z: number };

export interface RaceHandAnchor {
  rightHand: Vec3;
  leftHand: Vec3;
  weaponScale: number;
}

export interface WeaponGrip {
  hand: "right" | "left";
  rot: Vec3;
  pos: Vec3;
  targetSize: number;
  pivotY: number;
}

export interface CharacterGLB {
  dir: string;
  file: string;
  height: number;
}

export interface WeaponGLB {
  dir: string;
  file: string;
}

export const CHARACTER_GLB: Partial<Record<RaceId, CharacterGLB>> = {
  ashwalker:  { dir: "/models/characters/ashwalker/",  file: "ashwalker.glb",  height: 1.78 },
  dracor:     { dir: "/models/characters/dracor/",     file: "dracor.glb",     height: 1.85 },
  ironborn:   { dir: "/models/characters/ironborn/",   file: "ironborn.glb",   height: 1.55 },
  skrix:      { dir: "/models/characters/skrix/",      file: "skrix.glb",      height: 1.2  },
  stoneguard: { dir: "/models/characters/stoneguard/", file: "stoneguard.glb", height: 1.4  },
};

export const WEAPON_GLB: Partial<Record<WeaponType, WeaponGLB>> = {
  arming_sword: { dir: "/models/weapons/swords/",      file: "sword.glb"       },
  longsword:    { dir: "/models/weapons/swords/",      file: "sword.glb"       },
  greatsword:   { dir: "/models/weapons/greatswords/", file: "greatsword.glb"  },
  axe:          { dir: "/models/weapons/axes/",        file: "axe.glb"         },
  hammer:       { dir: "/models/weapons/hammers/",     file: "hammer.glb"      },
  spear:        { dir: "/models/weapons/spears/",      file: "spear.glb"       },
  staff:        { dir: "/models/weapons/staves/",      file: "staff.glb"       },
  bow:          { dir: "/models/weapons/bows/",        file: "bow.glb"         },
};

const DEFAULT_HAND = (heightMult: number, sideX: number): Vec3 => ({
  x: sideX * 0.32,
  y: heightMult * 0.46,
  z: 0.06,
});

export const RACE_HAND_ANCHORS: Record<RaceId, RaceHandAnchor> = {
  dracor:      { rightHand: DEFAULT_HAND(1, 1),  leftHand: DEFAULT_HAND(1, -1),  weaponScale: 1.00 },
  ironborn:    { rightHand: { x:  0.42, y: 0.40, z: 0.05 }, leftHand: { x: -0.42, y: 0.40, z: 0.05 }, weaponScale: 0.95 },
  sylvhari:    { rightHand: { x:  0.30, y: 0.55, z: 0.06 }, leftHand: { x: -0.30, y: 0.55, z: 0.06 }, weaponScale: 1.05 },
  ashwalker:   { rightHand: { x:  0.34, y: 0.48, z: 0.06 }, leftHand: { x: -0.34, y: 0.48, z: 0.06 }, weaponScale: 1.00 },
  voidtouched: { rightHand: { x:  0.32, y: 0.50, z: 0.06 }, leftHand: { x: -0.32, y: 0.50, z: 0.06 }, weaponScale: 1.00 },
  bloodfane:   { rightHand: { x:  0.30, y: 0.55, z: 0.06 }, leftHand: { x: -0.30, y: 0.55, z: 0.06 }, weaponScale: 1.00 },
  stoneguard:  { rightHand: { x:  0.40, y: 0.32, z: 0.05 }, leftHand: { x: -0.40, y: 0.32, z: 0.05 }, weaponScale: 0.85 },
  grukhar:     { rightHand: { x:  0.48, y: 0.52, z: 0.06 }, leftHand: { x: -0.48, y: 0.52, z: 0.06 }, weaponScale: 1.15 },
  skrix:       { rightHand: { x:  0.26, y: 0.34, z: 0.05 }, leftHand: { x: -0.26, y: 0.34, z: 0.05 }, weaponScale: 0.75 },
};

export const WEAPON_GRIPS: Record<WeaponType, WeaponGrip> = {
  dagger: {
    hand: "right",
    rot: { x: -0.15, y: 0, z: 0.20 },
    pos: { x: 0.02, y: 0, z: 0 },
    targetSize: 0.30,
    pivotY: 0.20,
  },
  arming_sword: {
    hand: "right",
    rot: { x: -0.10, y: 0, z: 0.20 },
    pos: { x: 0.02, y: 0, z: 0 },
    targetSize: 0.65,
    pivotY: 0.15,
  },
  longsword: {
    hand: "right",
    rot: { x: -0.10, y: 0, z: 0.20 },
    pos: { x: 0.02, y: 0, z: 0 },
    targetSize: 0.75,
    pivotY: 0.13,
  },
  greatsword: {
    hand: "right",
    rot: { x: -0.45, y: -0.20, z: -0.55 },
    pos: { x: 0.04, y: 0.04, z: -0.04 },
    targetSize: 1.00,
    pivotY: 0.10,
  },
  bow: {
    hand: "left",
    rot: { x: 0, y: Math.PI / 2, z: 0 },
    pos: { x: -0.02, y: 0.04, z: 0 },
    targetSize: 0.80,
    pivotY: 0.50,
  },
  arrows: {
    hand: "left",
    rot: { x: 0, y: 0, z: 0 },
    pos: { x: 0, y: 0, z: 0 },
    targetSize: 0.35,
    pivotY: 0.30,
  },
  axe: {
    hand: "right",
    rot: { x: 0, y: 0, z: 0.05 },
    pos: { x: 0.02, y: 0, z: 0 },
    targetSize: 0.60,
    pivotY: 0.35,
  },
  hammer: {
    hand: "right",
    rot: { x: 0, y: 0, z: 0.05 },
    pos: { x: 0.02, y: 0, z: 0 },
    targetSize: 0.65,
    pivotY: 0.30,
  },
  spear: {
    hand: "right",
    rot: { x: 0, y: 0, z: 0.04 },
    pos: { x: 0.02, y: -0.10, z: 0 },
    targetSize: 1.10,
    pivotY: 0.40,
  },
  staff: {
    hand: "right",
    rot: { x: 0, y: 0, z: 0.04 },
    pos: { x: 0.02, y: -0.20, z: 0 },
    targetSize: 1.05,
    pivotY: 0.45,
  },
};

export const SIGNATURE_WEAPON: Record<RaceId, WeaponType> = {
  dracor:      "greatsword",
  ironborn:    "hammer",
  sylvhari:    "bow",
  ashwalker:   "spear",
  voidtouched: "staff",
  bloodfane:   "longsword",
  stoneguard:  "axe",
  grukhar:     "axe",
  skrix:       "dagger",
};
