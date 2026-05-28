"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import type { RaceId, WeaponType } from "@dracor/shared";
import {
  CHARACTER_GLB,
  WEAPON_GLB,
  RACE_HAND_ANCHORS,
  WEAPON_GRIPS,
} from "./viewer3d/anchors";
import {
  PROCEDURAL_CONFIGS,
  buildProceduralCharacter,
} from "./viewer3d/proceduralCharacter";
import { buildProceduralWeapon } from "./viewer3d/proceduralWeapon";

interface CharacterViewerProps {
  raceId: RaceId;
  appearance?: {
    eyeColor?: string;
    skinTone?: string;
    marking?: string;
    uniqueFeature?: string;
  };
  weapon?: WeaponType;
  memory?: "ember" | "stone" | "storm";
  autoRotate?: boolean;
  cameraAngle?: "front" | "three-quarter";
  className?: string;
}

export function CharacterViewer({
  raceId,
  weapon,
  memory,
  cameraAngle = "front",
  className = "",
}: CharacterViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const buildScene = useCallback(async (signal: { disposed: boolean }) => {
    if (!canvasRef.current) return;

    const B = await import("@babylonjs/core");
    if (signal.disposed || !canvasRef.current) return;

    if (engineRef.current) engineRef.current.dispose();

    const engine = new B.Engine(canvasRef.current, true, {
      preserveDrawingBuffer: true, stencil: true, antialias: true,
    });
    engineRef.current = engine;

    const scene = new B.Scene(engine);
    const config = PROCEDURAL_CONFIGS[raceId];
    const characterHeight = CHARACTER_GLB[raceId]?.height ?? config.height;

    scene.clearColor = new B.Color4(0.02, 0.015, 0.03, 1);
    scene.ambientColor = new B.Color3(0.05, 0.04, 0.06);

    const targetY = characterHeight * 0.55;
    const initialAlpha = cameraAngle === "three-quarter" ? Math.PI / 2 + 0.4 : Math.PI / 2;
    const camera = new B.ArcRotateCamera(
      "camera", initialAlpha, Math.PI / 2.4, 4.0,
      new B.Vector3(0, targetY, 0), scene
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

    let idleTime = 0;
    let userInteracting = false;
    let interactTimeout: ReturnType<typeof setTimeout> | null = null;
    const baseAlpha = initialAlpha;

    const onPointerDown = () => { userInteracting = true; if (interactTimeout) clearTimeout(interactTimeout); };
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

    const ground = B.MeshBuilder.CreateGround("ground", { width: 16, height: 16 }, scene);
    ground.position.y = 0;
    const gMat = new B.StandardMaterial("gMat", scene);
    gMat.diffuseColor = new B.Color3(0.03, 0.025, 0.04);
    gMat.specularColor = new B.Color3(0.02, 0.02, 0.02);
    ground.material = gMat;

    const characterRoot = await loadCharacter(B, scene, raceId, characterHeight);
    if (signal.disposed || scene.isDisposed) { engine.dispose(); return; }

    const anchors = RACE_HAND_ANCHORS[raceId];
    const H = characterHeight * 1.2;
    const rightHand = new B.TransformNode("rightHand", scene);
    rightHand.position.set(anchors.rightHand.x * H, anchors.rightHand.y * H, anchors.rightHand.z * H);
    rightHand.parent = characterRoot;
    const leftHand = new B.TransformNode("leftHand", scene);
    leftHand.position.set(anchors.leftHand.x * H, anchors.leftHand.y * H, anchors.leftHand.z * H);
    leftHand.parent = characterRoot;

    if (weapon) {
      await attachWeapon(B, scene, weapon, raceId, rightHand, leftHand, characterHeight, config.accent);
      if (signal.disposed || scene.isDisposed) { engine.dispose(); return; }
    }

    if (memory) attachMemoryAura(B, scene, characterRoot, memory, characterHeight);

    engine.runRenderLoop(() => scene.render());
    scene.executeWhenReady(() => { if (!signal.disposed) setIsLoading(false); });

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
  }, [raceId, weapon, memory, cameraAngle]);

  useEffect(() => {
    setIsLoading(true);
    let cleanup: (() => void) | undefined;
    const signal = { disposed: false };
    buildScene(signal).then((c) => {
      if (signal.disposed) c?.();
      else cleanup = c;
    }).catch((err) => {
      console.error("CharacterViewer build failed", err);
      if (!signal.disposed) setIsLoading(false);
    });
    return () => {
      signal.disposed = true;
      cleanup?.();
      if (engineRef.current) { engineRef.current.dispose(); engineRef.current = null; }
    };
  }, [buildScene]);

  return (
    <div className={`relative h-full w-full ${className}`}>
      <canvas ref={canvasRef} className="h-full w-full touch-none" style={{ outline: "none" }} />
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(ellipse at center, transparent 50%, rgba(2,1,5,0.6) 100%)" }}
      />
      {isLoading && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-stone-950/60 backdrop-blur-sm transition-opacity">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-ember-500/30 border-t-ember-500" />
            <p className="font-display text-xs tracking-widest text-stone-600 uppercase">Summoning</p>
          </div>
        </div>
      )}
    </div>
  );
}

async function loadCharacter(B: any, scene: any, raceId: RaceId, characterHeight: number): Promise<any> {
  const glbInfo = CHARACTER_GLB[raceId];

  if (glbInfo) {
    await import("@babylonjs/loaders/glTF");
    if (scene.isDisposed) throw new Error("scene disposed");
    const result = await B.SceneLoader.ImportMeshAsync("", glbInfo.dir, glbInfo.file, scene);
    if (scene.isDisposed) throw new Error("scene disposed");
    const glbRoot = result.meshes[0];

    let min = new B.Vector3(Infinity, Infinity, Infinity);
    let max = new B.Vector3(-Infinity, -Infinity, -Infinity);
    result.meshes.forEach((m: any) => {
      if (!m.getBoundingInfo) return;
      const bi = m.getBoundingInfo();
      min = B.Vector3.Minimize(min, bi.boundingBox.minimumWorld);
      max = B.Vector3.Maximize(max, bi.boundingBox.maximumWorld);
    });
    const center = B.Vector3.Center(min, max);
    const extent = max.subtract(min);
    const maxDim = Math.max(extent.x, extent.y, extent.z);
    const targetHeight = characterHeight * 1.2;
    const scaleFactor = targetHeight / maxDim;
    glbRoot.scaling = new B.Vector3(scaleFactor, scaleFactor, scaleFactor);
    glbRoot.position.y = -min.y * scaleFactor;
    glbRoot.position.x = -center.x * scaleFactor;
    glbRoot.position.z = -center.z * scaleFactor;
    return glbRoot;
  }

  const config = PROCEDURAL_CONFIGS[raceId];
  const { root } = buildProceduralCharacter(B, scene, raceId, config);
  return root;
}

async function attachWeapon(
  B: any, scene: any, weapon: WeaponType, raceId: RaceId,
  rightHand: any, leftHand: any, characterHeight: number,
  accentColor: [number, number, number],
) {
  const grip = WEAPON_GRIPS[weapon];
  const raceAnchor = RACE_HAND_ANCHORS[raceId];
  const handNode = grip.hand === "right" ? rightHand : leftHand;
  const weaponGlb = WEAPON_GLB[weapon];
  const H = characterHeight * 1.2;
  const targetLen = grip.targetSize * H * raceAnchor.weaponScale;

  let weaponRoot: any;

  if (weaponGlb) {
    await import("@babylonjs/loaders/glTF");
    if (scene.isDisposed) return;
    const result = await B.SceneLoader.ImportMeshAsync("", weaponGlb.dir, weaponGlb.file, scene);
    if (scene.isDisposed) return;
    weaponRoot = result.meshes[0];

    let min = new B.Vector3(Infinity, Infinity, Infinity);
    let max = new B.Vector3(-Infinity, -Infinity, -Infinity);
    result.meshes.forEach((m: any) => {
      if (!m.getBoundingInfo) return;
      const bi = m.getBoundingInfo();
      min = B.Vector3.Minimize(min, bi.boundingBox.minimumWorld);
      max = B.Vector3.Maximize(max, bi.boundingBox.maximumWorld);
    });
    const extent = max.subtract(min);
    const longestAxis = Math.max(extent.x, extent.y, extent.z);
    const scale = targetLen / longestAxis;
    weaponRoot.scaling = new B.Vector3(scale, scale, scale);

    // Center the weapon at origin, then offset along Y so pivotY % is at origin.
    // The weapon GLB might be oriented along any axis, but most blade-like assets are along Y.
    // We use vertical extent for offset; if the weapon was modeled horizontally, the rotation in grip.rot corrects orientation.
    const center = B.Vector3.Center(min, max);
    weaponRoot.position.x = -center.x * scale;
    weaponRoot.position.z = -center.z * scale;
    weaponRoot.position.y = (-min.y - extent.y * grip.pivotY) * scale;
  } else {
    weaponRoot = buildProceduralWeapon(B, scene, handNode, weapon, accentColor);
    weaponRoot.scaling = new B.Vector3(targetLen, targetLen, targetLen);
  }

  // Wrap in a pivot node so the grip transform can be applied independent of bbox correction.
  const pivot = new B.TransformNode(`gripPivot_${weapon}`, scene);
  pivot.parent = handNode;
  pivot.position.set(grip.pos.x * H, grip.pos.y * H, grip.pos.z * H);
  pivot.rotation.set(grip.rot.x, grip.rot.y, grip.rot.z);

  if (weaponGlb) {
    weaponRoot.parent = pivot;
  } else {
    // procedural was already parented to handNode — reparent under pivot
    weaponRoot.parent = pivot;
  }
}

function attachMemoryAura(B: any, scene: any, root: any, memory: "ember" | "stone" | "storm", characterHeight: number) {
  const memoryColors: Record<string, [number, number, number]> = {
    ember: [1.0, 0.4, 0.0],
    stone: [0.7, 0.55, 0.15],
    storm: [0.2, 0.5, 1.0],
  };
  const mc = memoryColors[memory];
  if (!mc) return;
  const H = characterHeight * 1.2;

  const aura = B.MeshBuilder.CreateSphere("memoryAura", { diameter: 1.1 * H, segments: 20 }, scene);
  aura.position.y = H * 0.5;
  const auraMat = new B.StandardMaterial("auraMat", scene);
  auraMat.diffuseColor = new B.Color3(0, 0, 0);
  auraMat.emissiveColor = new B.Color3(mc[0] * 0.12, mc[1] * 0.12, mc[2] * 0.12);
  auraMat.alpha = 0.08;
  auraMat.backFaceCulling = false;
  aura.material = auraMat;
  aura.parent = root;

  const auraPulse = new B.Animation("auraPulse", "material.alpha", 30,
    B.Animation.ANIMATIONTYPE_FLOAT, B.Animation.ANIMATIONLOOPMODE_CYCLE);
  auraPulse.setKeys([
    { frame: 0, value: 0.05 },
    { frame: 50, value: 0.12 },
    { frame: 100, value: 0.05 },
  ]);
  aura.animations.push(auraPulse);
  scene.beginAnimation(aura, 0, 100, true);

  const ring = B.MeshBuilder.CreateTorus("memoryRing", {
    diameter: 0.9 * H, thickness: 0.012, tessellation: 48,
  }, scene);
  ring.position.y = 0.02;
  ring.rotation.x = Math.PI / 2;
  const ringMat = new B.StandardMaterial("ringMat", scene);
  ringMat.diffuseColor = new B.Color3(0, 0, 0);
  ringMat.emissiveColor = new B.Color3(mc[0] * 0.4, mc[1] * 0.4, mc[2] * 0.4);
  ring.material = ringMat;
  ring.parent = root;

  const ringRot = new B.Animation("ringRot", "rotation.y", 30,
    B.Animation.ANIMATIONTYPE_FLOAT, B.Animation.ANIMATIONLOOPMODE_CYCLE);
  ringRot.setKeys([{ frame: 0, value: 0 }, { frame: 300, value: Math.PI * 2 }]);
  ring.animations.push(ringRot);
  scene.beginAnimation(ring, 0, 300, true);

  const memLight = new B.PointLight("memLight", new B.Vector3(0, 1.5, 0.5), scene);
  memLight.intensity = 0.4;
  memLight.diffuse = new B.Color3(mc[0], mc[1], mc[2]);
  memLight.range = 4;
}
