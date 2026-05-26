"use client";

import { useEffect, useRef } from "react";

interface CameraPreset {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
}

const CAMERA_PRESETS: Record<string, CameraPreset> = {
  hero: {
    position: [60, 25, -40],
    target: [30, 5, 50],
    fov: 0.7,
  },
  road: {
    position: [-120, 15, -100],
    target: [60, 0, 90],
    fov: 0.8,
  },
  shrine: {
    position: [45, 8, 35],
    target: [30, 4, 50],
    fov: 0.9,
  },
};

interface SceneCanvasProps {
  preset: keyof typeof CAMERA_PRESETS;
  className?: string;
}

export function SceneCanvas({ preset, className = "" }: SceneCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<any>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    let disposed = false;

    async function init() {
      const { Engine } = await import("@babylonjs/core/Engines/engine");
      const { Scene } = await import("@babylonjs/core/scene");
      const { FreeCamera } = await import("@babylonjs/core/Cameras/freeCamera");
      const { HemisphericLight } = await import("@babylonjs/core/Lights/hemisphericLight");
      const { DirectionalLight } = await import("@babylonjs/core/Lights/directionalLight");
      const { PointLight } = await import("@babylonjs/core/Lights/pointLight");
      const { MeshBuilder } = await import("@babylonjs/core/Meshes/meshBuilder");
      const { StandardMaterial } = await import("@babylonjs/core/Materials/standardMaterial");
      const { Vector3 } = await import("@babylonjs/core/Maths/math.vector");
      const { Color3, Color4 } = await import("@babylonjs/core/Maths/math.color");
      const { ParticleSystem } = await import("@babylonjs/core/Particles/particleSystem");
      await import("@babylonjs/core/Meshes/Builders/groundBuilder");
      await import("@babylonjs/core/Meshes/Builders/sphereBuilder");
      await import("@babylonjs/core/Meshes/Builders/boxBuilder");
      await import("@babylonjs/core/Meshes/Builders/cylinderBuilder");

      if (disposed || !canvasRef.current) return;

      const engine = new Engine(canvasRef.current, true, {
        preserveDrawingBuffer: false,
        stencil: false,
        antialias: true,
        powerPreference: "low-power",
      });
      engineRef.current = engine;

      const scene = new Scene(engine);
      scene.clearColor = new Color4(0.02, 0.015, 0.03, 1.0);
      scene.fogMode = Scene.FOGMODE_EXP2;
      scene.fogDensity = 0.014;
      scene.fogColor = new Color3(0.3, 0.32, 0.38);

      const cam = CAMERA_PRESETS[preset];
      const camera = new FreeCamera(
        "cam",
        new Vector3(cam.position[0], cam.position[1], cam.position[2]),
        scene
      );
      camera.setTarget(new Vector3(cam.target[0], cam.target[1], cam.target[2]));
      camera.fov = cam.fov;

      // Lighting — dusk atmosphere
      const hemi = new HemisphericLight("hemi", new Vector3(0, 1, 0), scene);
      hemi.intensity = 0.4;
      hemi.diffuse = new Color3(0.15, 0.1, 0.08);
      hemi.groundColor = new Color3(0.05, 0.04, 0.06);

      const sun = new DirectionalLight(
        "sun",
        new Vector3(-0.6, -0.3, -0.75).normalize(),
        scene
      );
      sun.intensity = 1.8;
      sun.diffuse = new Color3(1.0, 0.7, 0.35);

      // Terrain — procedural ground
      const ground = MeshBuilder.CreateGround(
        "ground",
        { width: 500, height: 500, subdivisions: 64 },
        scene
      );
      const groundMat = new StandardMaterial("groundMat", scene);
      groundMat.diffuseColor = new Color3(0.12, 0.1, 0.08);
      groundMat.specularColor = new Color3(0.02, 0.02, 0.02);
      groundMat.roughness = 1.0;
      ground.material = groundMat;

      // Height displacement
      const positions = ground.getVerticesData("position");
      if (positions) {
        for (let i = 1; i < positions.length; i += 3) {
          const x = positions[i - 1];
          const z = positions[i + 1];
          const noise =
            Math.sin(x * 0.02) * 3 +
            Math.cos(z * 0.03) * 2 +
            Math.sin((x + z) * 0.01) * 5 +
            Math.cos(x * 0.05) * 1.5;
          positions[i] = noise;
        }
        ground.updateVerticesData("position", positions);
        ground.createNormals(false);
      }

      function getHeight(x: number, z: number): number {
        return (
          Math.sin(x * 0.02) * 3 +
          Math.cos(z * 0.03) * 2 +
          Math.sin((x + z) * 0.01) * 5 +
          Math.cos(x * 0.05) * 1.5
        );
      }

      // Sky dome
      const sky = MeshBuilder.CreateSphere(
        "sky",
        { diameter: 800, segments: 12, sideOrientation: 1 },
        scene
      );
      sky.isPickable = false;
      sky.infiniteDistance = true;
      sky.applyFog = false;
      const skyMat = new StandardMaterial("skyMat", scene);
      skyMat.diffuseColor = Color3.Black();
      skyMat.specularColor = Color3.Black();
      skyMat.emissiveColor = new Color3(0.03, 0.02, 0.05);
      skyMat.disableLighting = true;
      skyMat.backFaceCulling = false;
      sky.material = skyMat;

      // Pine trees (simplified cones)
      const treeMat = new StandardMaterial("treeMat", scene);
      treeMat.diffuseColor = new Color3(0.08, 0.15, 0.06);
      treeMat.specularColor = Color3.Black();

      const trunkMat = new StandardMaterial("trunkMat", scene);
      trunkMat.diffuseColor = new Color3(0.15, 0.1, 0.05);
      trunkMat.specularColor = Color3.Black();

      const treeCount = 60;
      for (let i = 0; i < treeCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 30 + Math.random() * 180;
        const x = Math.cos(angle) * dist;
        const z = Math.sin(angle) * dist;
        const y = getHeight(x, z);
        const scale = 0.7 + Math.random() * 0.8;

        const trunk = MeshBuilder.CreateCylinder(
          `trunk_${i}`,
          { height: 3 * scale, diameter: 0.5 * scale, tessellation: 6 },
          scene
        );
        trunk.position = new Vector3(x, y + 1.5 * scale, z);
        trunk.material = trunkMat;

        const crown = MeshBuilder.CreateCylinder(
          `crown_${i}`,
          { height: 8 * scale, diameterTop: 0, diameterBottom: 4 * scale, tessellation: 6 },
          scene
        );
        crown.position = new Vector3(x, y + 6 * scale, z);
        crown.material = treeMat;
      }

      // Shrine (ember glow)
      const shrineBase = MeshBuilder.CreateCylinder(
        "shrineBase",
        { height: 5, diameterTop: 1.2, diameterBottom: 2, tessellation: 8 },
        scene
      );
      const shrinePos = new Vector3(30, getHeight(30, 50) + 2.5, 50);
      shrineBase.position = shrinePos;
      const shrineMat = new StandardMaterial("shrineMat", scene);
      shrineMat.diffuseColor = new Color3(0.2, 0.18, 0.15);
      shrineMat.specularColor = new Color3(0.05, 0.05, 0.05);
      shrineMat.emissiveColor = new Color3(0.05, 0.03, 0.01);
      shrineBase.material = shrineMat;

      // Shrine light
      const shrineLight = new PointLight(
        "shrineLight",
        new Vector3(30, getHeight(30, 50) + 6, 50),
        scene
      );
      shrineLight.intensity = 2.5;
      shrineLight.diffuse = new Color3(1.0, 0.55, 0.1);
      shrineLight.range = 25;

      // Ember particles
      const embers = new ParticleSystem("embers", 80, scene);
      embers.emitter = new Vector3(30, getHeight(30, 50) + 5, 50);
      embers.minEmitBox = new Vector3(-0.5, 0, -0.5);
      embers.maxEmitBox = new Vector3(0.5, 0, 0.5);
      embers.minLifeTime = 1.5;
      embers.maxLifeTime = 3.5;
      embers.minSize = 0.03;
      embers.maxSize = 0.08;
      embers.emitRate = 15;
      embers.color1 = new Color4(1, 0.6, 0.1, 0.9);
      embers.color2 = new Color4(1, 0.3, 0.05, 0.7);
      embers.colorDead = new Color4(0.3, 0.1, 0, 0);
      embers.direction1 = new Vector3(-0.3, 1, -0.3);
      embers.direction2 = new Vector3(0.3, 2, 0.3);
      embers.minEmitPower = 0.3;
      embers.maxEmitPower = 0.8;
      embers.gravity = new Vector3(0, -0.1, 0);
      embers.blendMode = ParticleSystem.BLENDMODE_ADD;
      embers.start();

      // Distant mountains
      const mountainMat = new StandardMaterial("mtMat", scene);
      mountainMat.diffuseColor = new Color3(0.08, 0.07, 0.1);
      mountainMat.specularColor = Color3.Black();
      mountainMat.emissiveColor = new Color3(0.02, 0.015, 0.03);

      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2 + Math.random() * 0.3;
        const dist = 250 + Math.random() * 50;
        const x = Math.cos(angle) * dist;
        const z = Math.sin(angle) * dist;
        const height = 40 + Math.random() * 60;
        const width = 60 + Math.random() * 40;

        const mt = MeshBuilder.CreateCylinder(
          `mt_${i}`,
          { height, diameterTop: 5 + Math.random() * 15, diameterBottom: width, tessellation: 6 },
          scene
        );
        mt.position = new Vector3(x, height * 0.3, z);
        mt.material = mountainMat;
      }

      // Ambient dust
      const dust = new ParticleSystem("dust", 100, scene);
      dust.emitter = new Vector3(0, 5, 0);
      dust.minEmitBox = new Vector3(-60, 0, -60);
      dust.maxEmitBox = new Vector3(60, 12, 60);
      dust.minLifeTime = 4;
      dust.maxLifeTime = 8;
      dust.minSize = 0.02;
      dust.maxSize = 0.05;
      dust.emitRate = 20;
      dust.color1 = new Color4(0.6, 0.5, 0.4, 0.12);
      dust.color2 = new Color4(0.4, 0.35, 0.3, 0.08);
      dust.colorDead = new Color4(0.3, 0.25, 0.2, 0);
      dust.direction1 = new Vector3(-0.3, 0.1, -0.3);
      dust.direction2 = new Vector3(0.3, 0.2, 0.3);
      dust.minEmitPower = 0.05;
      dust.maxEmitPower = 0.1;
      dust.gravity = new Vector3(0, -0.005, 0);
      dust.blendMode = ParticleSystem.BLENDMODE_ADD;
      dust.start();

      // Slow camera orbit
      let angle = 0;
      const orbitRadius = 5;
      const basePos = new Vector3(cam.position[0], cam.position[1], cam.position[2]);
      const targetPos = new Vector3(cam.target[0], cam.target[1], cam.target[2]);

      scene.registerBeforeRender(() => {
        angle += 0.0003;
        camera.position.x = basePos.x + Math.sin(angle) * orbitRadius;
        camera.position.z = basePos.z + Math.cos(angle) * orbitRadius;
        camera.setTarget(targetPos);
      });

      engine.runRenderLoop(() => {
        if (!disposed) scene.render();
      });

      const handleResize = () => engine.resize();
      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("resize", handleResize);
      };
    }

    init();

    return () => {
      disposed = true;
      if (engineRef.current) {
        engineRef.current.dispose();
        engineRef.current = null;
      }
    };
  }, [preset]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  );
}
