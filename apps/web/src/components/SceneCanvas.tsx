"use client";

import { useEffect, useRef } from "react";

interface CameraPreset {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
  orbitSpeed: number;
  orbitRadius: number;
}

const CAMERA_PRESETS: Record<string, CameraPreset> = {
  hero: {
    position: [60, 25, -40],
    target: [30, 5, 50],
    fov: 0.7,
    orbitSpeed: 0.0006,
    orbitRadius: 12,
  },
  road: {
    position: [-100, 12, -80],
    target: [60, 0, 90],
    fov: 0.8,
    orbitSpeed: 0.0004,
    orbitRadius: 8,
  },
  shrine: {
    position: [42, 10, 38],
    target: [30, 4, 50],
    fov: 0.9,
    orbitSpeed: 0.0008,
    orbitRadius: 6,
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
      const { DefaultRenderingPipeline } = await import("@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline");
      await import("@babylonjs/core/Rendering/depthRendererSceneComponent");
      await import("@babylonjs/core/Meshes/Builders/groundBuilder");
      await import("@babylonjs/core/Meshes/Builders/sphereBuilder");
      await import("@babylonjs/core/Meshes/Builders/boxBuilder");
      await import("@babylonjs/core/Meshes/Builders/cylinderBuilder");

      if (disposed || !canvasRef.current) return;

      const engine = new Engine(canvasRef.current, true, {
        preserveDrawingBuffer: false,
        stencil: true,
        antialias: true,
      });
      engineRef.current = engine;

      const scene = new Scene(engine);

      // ─── Match game client exactly ───
      scene.clearColor = new Color4(0.02, 0.015, 0.03, 1.0);
      scene.fogMode = Scene.FOGMODE_EXP2;
      scene.fogDensity = 0.012;
      scene.fogColor = new Color3(0.3, 0.32, 0.38);
      scene.ambientColor = new Color3(0.1, 0.1, 0.12);

      // Camera
      const cam = CAMERA_PRESETS[preset];
      const camera = new FreeCamera(
        "cam",
        new Vector3(cam.position[0], cam.position[1], cam.position[2]),
        scene
      );
      camera.setTarget(new Vector3(cam.target[0], cam.target[1], cam.target[2]));
      camera.fov = cam.fov;
      camera.minZ = 0.5;
      camera.maxZ = 600;

      // ─── Lighting (ironvale_dusk preset) ───
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

      // ─── Terrain ───
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

      const positions = ground.getVerticesData("position");
      if (positions) {
        for (let i = 1; i < positions.length; i += 3) {
          const x = positions[i - 1];
          const z = positions[i + 1];
          positions[i] = getHeight(x, z);
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

      // ─── Sky dome (same as game client) ───
      const skyDome = MeshBuilder.CreateSphere(
        "skyDome",
        { diameter: 800, segments: 16, sideOrientation: 1 },
        scene
      );
      skyDome.isPickable = false;
      skyDome.infiniteDistance = true;
      skyDome.applyFog = false;
      skyDome.renderingGroupId = 0;

      const skyMat = new StandardMaterial("skyMat", scene);
      skyMat.diffuseColor = Color3.Black();
      skyMat.specularColor = Color3.Black();
      skyMat.emissiveColor = new Color3(0.03, 0.02, 0.05);
      skyMat.disableLighting = true;
      skyMat.backFaceCulling = false;
      skyDome.material = skyMat;

      // Horizon glow (warm amber band at horizon — south)
      const horizonGlow = MeshBuilder.CreateSphere(
        "horizonGlow",
        { diameter: 790, segments: 8, sideOrientation: 1, arc: 0.5 },
        scene
      );
      horizonGlow.position = new Vector3(0, -50, 100);
      horizonGlow.scaling.y = 0.15;
      horizonGlow.isPickable = false;
      horizonGlow.infiniteDistance = true;
      horizonGlow.applyFog = false;

      const horizonMat = new StandardMaterial("horizonMat", scene);
      horizonMat.diffuseColor = Color3.Black();
      horizonMat.specularColor = Color3.Black();
      horizonMat.emissiveColor = new Color3(0.12, 0.06, 0.02);
      horizonMat.alpha = 0.4;
      horizonMat.disableLighting = true;
      horizonMat.backFaceCulling = false;
      horizonGlow.material = horizonMat;
      horizonGlow.renderingGroupId = 0;

      // ─── Pine trees ───
      const treeMat = new StandardMaterial("treeMat", scene);
      treeMat.diffuseColor = new Color3(0.08, 0.15, 0.06);
      treeMat.specularColor = Color3.Black();

      const trunkMat = new StandardMaterial("trunkMat", scene);
      trunkMat.diffuseColor = new Color3(0.15, 0.1, 0.05);
      trunkMat.specularColor = Color3.Black();

      for (let i = 0; i < 80; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 25 + Math.random() * 200;
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

      // ─── Rocks ───
      const rockMat = new StandardMaterial("rockMat", scene);
      rockMat.diffuseColor = new Color3(0.2, 0.2, 0.22);
      rockMat.specularColor = new Color3(0.05, 0.05, 0.05);
      rockMat.roughness = 1.0;

      for (let i = 0; i < 25; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 40 + Math.random() * 180;
        const x = Math.cos(angle) * dist;
        const z = Math.sin(angle) * dist;
        const y = getHeight(x, z);
        const scale = 0.5 + Math.random() * 2;

        const rock = MeshBuilder.CreateBox(
          `rock_${i}`,
          { width: 2 * scale, height: 1.5 * scale, depth: 2 * scale },
          scene
        );
        rock.position = new Vector3(x, y + scale * 0.5, z);
        rock.rotation.set(
          (Math.random() - 0.5) * 0.3,
          Math.random() * Math.PI * 2,
          (Math.random() - 0.5) * 0.3
        );
        rock.material = rockMat;
      }

      // ─── Shrine (with ember glow) ───
      const shrineBase = MeshBuilder.CreateCylinder(
        "shrineBase",
        { height: 5, diameterTop: 1.2, diameterBottom: 2, tessellation: 8 },
        scene
      );
      const shrineY = getHeight(30, 50);
      shrineBase.position = new Vector3(30, shrineY + 2.5, 50);
      const shrineMat = new StandardMaterial("shrineMat", scene);
      shrineMat.diffuseColor = new Color3(0.2, 0.18, 0.15);
      shrineMat.specularColor = new Color3(0.05, 0.05, 0.05);
      shrineMat.emissiveColor = new Color3(0.05, 0.03, 0.01);
      shrineBase.material = shrineMat;

      const shrineLight = new PointLight(
        "shrineLight",
        new Vector3(30, shrineY + 6, 50),
        scene
      );
      shrineLight.intensity = 2.5;
      shrineLight.diffuse = new Color3(1.0, 0.55, 0.1);
      shrineLight.range = 25;

      // Ember particles (same settings as game client)
      const embers = new ParticleSystem("embers", 100, scene);
      embers.emitter = new Vector3(30, shrineY + 5, 50);
      embers.minEmitBox = new Vector3(-0.5, 0, -0.5);
      embers.maxEmitBox = new Vector3(0.5, 0, 0.5);
      embers.minLifeTime = 1.5;
      embers.maxLifeTime = 3.5;
      embers.minSize = 0.03;
      embers.maxSize = 0.08;
      embers.emitRate = 20;
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

      // ─── Town lights (5 warm point lights — same as game client) ───
      const townPositions = [
        { x: -30, z: -80 },
        { x: -10, z: -90 },
        { x: 15, z: -85 },
        { x: 40, z: -75 },
        { x: -50, z: -95 },
      ];
      for (let i = 0; i < townPositions.length; i++) {
        const p = townPositions[i];
        const y = getHeight(p.x, p.z) + 2.5;
        const light = new PointLight(`townLight_${i}`, new Vector3(p.x, y, p.z), scene);
        light.intensity = 0.6;
        light.diffuse = new Color3(1.0, 0.75, 0.35);
        light.range = 20;
      }

      // ─── Distant mountains ───
      const mountainMat = new StandardMaterial("mtMat", scene);
      mountainMat.diffuseColor = new Color3(0.08, 0.07, 0.1);
      mountainMat.specularColor = Color3.Black();
      mountainMat.emissiveColor = new Color3(0.02, 0.015, 0.03);

      for (let i = 0; i < 10; i++) {
        const angle = (i / 10) * Math.PI * 2 + Math.random() * 0.3;
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

      // ─── Ambient dust particles ───
      const dust = new ParticleSystem("dust", 150, scene);
      dust.emitter = new Vector3(0, 5, 0);
      dust.minEmitBox = new Vector3(-80, 0, -80);
      dust.maxEmitBox = new Vector3(80, 15, 80);
      dust.minLifeTime = 4;
      dust.maxLifeTime = 8;
      dust.minSize = 0.02;
      dust.maxSize = 0.06;
      dust.emitRate = 30;
      dust.color1 = new Color4(0.6, 0.5, 0.4, 0.15);
      dust.color2 = new Color4(0.4, 0.35, 0.3, 0.1);
      dust.colorDead = new Color4(0.3, 0.25, 0.2, 0);
      dust.direction1 = new Vector3(-0.5, 0.1, -0.5);
      dust.direction2 = new Vector3(0.5, 0.3, 0.5);
      dust.minEmitPower = 0.05;
      dust.maxEmitPower = 0.15;
      dust.gravity = new Vector3(0, -0.005, 0);
      dust.blendMode = ParticleSystem.BLENDMODE_ADD;
      dust.start();

      // ─── Post-processing (bloom, vignette, tone mapping, grain) ───
      const pipeline = new DefaultRenderingPipeline(
        "pipeline",
        true,
        scene,
        [camera]
      );

      pipeline.bloomEnabled = true;
      pipeline.bloomThreshold = 0.7;
      pipeline.bloomWeight = 0.35;
      pipeline.bloomKernel = 64;

      pipeline.imageProcessingEnabled = true;
      pipeline.imageProcessing.toneMappingEnabled = true;
      pipeline.imageProcessing.toneMappingType = 1;
      pipeline.imageProcessing.exposure = 1.0;
      pipeline.imageProcessing.contrast = 1.05;

      pipeline.imageProcessing.vignetteEnabled = true;
      pipeline.imageProcessing.vignetteWeight = 1.8;
      pipeline.imageProcessing.vignetteCameraFov = 0.5;

      pipeline.grainEnabled = true;
      pipeline.grain.intensity = 6;
      pipeline.grain.animated = true;

      // ─── Camera movement (noticeable orbit + gentle bob) ───
      let time = 0;
      const basePos = new Vector3(cam.position[0], cam.position[1], cam.position[2]);
      const targetPos = new Vector3(cam.target[0], cam.target[1], cam.target[2]);

      scene.registerBeforeRender(() => {
        time += engine.getDeltaTime() * 0.001;
        camera.position.x = basePos.x + Math.sin(time * cam.orbitSpeed * 60) * cam.orbitRadius;
        camera.position.z = basePos.z + Math.cos(time * cam.orbitSpeed * 60) * cam.orbitRadius;
        camera.position.y = basePos.y + Math.sin(time * 0.15) * 1.5;
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
