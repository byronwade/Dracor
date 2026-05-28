"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import type { WeaponType } from "@dracor/shared";
import { WEAPON_GLB } from "./viewer3d/anchors";
import { buildProceduralWeapon } from "./viewer3d/proceduralWeapon";

interface WeaponViewerProps {
  weapon: WeaponType;
  autoRotate?: boolean;
  className?: string;
}

export function WeaponViewer({ weapon, autoRotate = true, className = "" }: WeaponViewerProps) {
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
    scene.clearColor = new B.Color4(0.02, 0.015, 0.03, 1);
    scene.ambientColor = new B.Color3(0.05, 0.04, 0.06);

    const camera = new B.ArcRotateCamera(
      "camera", Math.PI / 2, Math.PI / 2.3, 2.2,
      new B.Vector3(0, 0.6, 0), scene,
    );
    camera.lowerRadiusLimit = 1.2;
    camera.upperRadiusLimit = 5;
    camera.lowerBetaLimit = 0.3;
    camera.upperBetaLimit = Math.PI / 1.9;
    camera.wheelDeltaPercentage = 0.01;
    camera.panningSensibility = 0;
    camera.inertia = 0.85;
    camera.attachControl(canvasRef.current, true);

    let rotateTime = 0;
    let userInteracting = false;
    let interactTimeout: ReturnType<typeof setTimeout> | null = null;
    const onPointerDown = () => { userInteracting = true; if (interactTimeout) clearTimeout(interactTimeout); };
    const onPointerUp = () => {
      if (interactTimeout) clearTimeout(interactTimeout);
      interactTimeout = setTimeout(() => { userInteracting = false; }, 2000);
    };
    canvasRef.current!.addEventListener("pointerdown", onPointerDown);
    canvasRef.current!.addEventListener("pointerup", onPointerUp);

    scene.onBeforeRenderObservable.add(() => {
      if (autoRotate && !userInteracting) {
        rotateTime += 0.005;
        camera.alpha = Math.PI / 2 + rotateTime;
      }
    });

    const keyLight = new B.DirectionalLight("key", new B.Vector3(-0.5, -1.0, 0.8), scene);
    keyLight.intensity = 1.4;
    keyLight.diffuse = new B.Color3(1, 0.95, 0.9);

    const fillLight = new B.HemisphericLight("fill", new B.Vector3(0, 1, 0), scene);
    fillLight.intensity = 0.4;
    fillLight.diffuse = new B.Color3(0.55, 0.6, 0.85);
    fillLight.groundColor = new B.Color3(0.1, 0.06, 0.04);

    const rimLight = new B.PointLight("rim", new B.Vector3(-1.5, 2.0, -2.0), scene);
    rimLight.intensity = 0.8;
    rimLight.diffuse = new B.Color3(0.9, 0.7, 0.5);
    rimLight.range = 8;

    // Pedestal
    const pedestal = B.MeshBuilder.CreateCylinder("pedestal", {
      diameterTop: 0.7, diameterBottom: 0.9, height: 0.06, tessellation: 32,
    }, scene);
    pedestal.position.y = 0;
    const pMat = new B.StandardMaterial("pMat", scene);
    pMat.diffuseColor = new B.Color3(0.06, 0.05, 0.07);
    pMat.specularColor = new B.Color3(0.15, 0.13, 0.18);
    pMat.specularPower = 32;
    pedestal.material = pMat;

    const pedestalRing = B.MeshBuilder.CreateTorus("pedestalRing", {
      diameter: 0.92, thickness: 0.012, tessellation: 48,
    }, scene);
    pedestalRing.position.y = 0.03;
    const ringMat = new B.StandardMaterial("ringMat", scene);
    ringMat.diffuseColor = new B.Color3(0, 0, 0);
    ringMat.emissiveColor = new B.Color3(0.45, 0.25, 0.05);
    pedestalRing.material = ringMat;

    const ground = B.MeshBuilder.CreateGround("ground", { width: 12, height: 12 }, scene);
    ground.position.y = -0.03;
    const gMat = new B.StandardMaterial("gMat", scene);
    gMat.diffuseColor = new B.Color3(0.025, 0.020, 0.030);
    gMat.specularColor = new B.Color3(0.01, 0.01, 0.01);
    ground.material = gMat;

    // Mount point sits above the pedestal
    const mount = new B.TransformNode("mount", scene);
    mount.position.set(0, 0.06, 0);
    mount.rotation.x = -0.1; // slight tilt back so weapons read

    const glbInfo = WEAPON_GLB[weapon];
    let weaponRoot: any;

    if (glbInfo) {
      await import("@babylonjs/loaders/glTF");
      if (signal.disposed || scene.isDisposed) { engine.dispose(); return; }
      const result = await B.SceneLoader.ImportMeshAsync("", glbInfo.dir, glbInfo.file, scene);
      if (signal.disposed || scene.isDisposed) { engine.dispose(); return; }
      weaponRoot = result.meshes[0];

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
      const longestAxis = Math.max(extent.x, extent.y, extent.z);
      const targetLen = 1.2;
      const scale = targetLen / longestAxis;
      weaponRoot.scaling = new B.Vector3(scale, scale, scale);
      weaponRoot.position.x = -center.x * scale;
      weaponRoot.position.z = -center.z * scale;
      weaponRoot.position.y = -min.y * scale + 0.06; // sit on pedestal
      weaponRoot.parent = mount;
    } else {
      weaponRoot = buildProceduralWeapon(B, scene, mount, weapon, [0.85, 0.45, 0.10]);
      weaponRoot.scaling = new B.Vector3(2, 2, 2);
      weaponRoot.position.y = 0.06;
    }

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
  }, [weapon, autoRotate]);

  useEffect(() => {
    setIsLoading(true);
    let cleanup: (() => void) | undefined;
    const signal = { disposed: false };
    buildScene(signal).then((c) => {
      if (signal.disposed) c?.();
      else cleanup = c;
    }).catch((err) => {
      console.error("WeaponViewer build failed", err);
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
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-stone-950/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-ember-500/30 border-t-ember-500" />
            <p className="font-display text-[10px] tracking-widest text-stone-600 uppercase">Forging</p>
          </div>
        </div>
      )}
    </div>
  );
}
