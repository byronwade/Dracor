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
    position: [80, 40, -60],
    target: [10, 0, 40],
    fov: 0.65,
    orbitSpeed: 0.0004,
    orbitRadius: 15,
  },
  road: {
    position: [-50, 8, -30],
    target: [80, 0, 100],
    fov: 0.75,
    orbitSpeed: 0.0003,
    orbitRadius: 10,
  },
  shrine: {
    position: [50, 12, 30],
    target: [30, 5, 50],
    fov: 0.8,
    orbitSpeed: 0.0006,
    orbitRadius: 8,
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
      await import("@babylonjs/core/Meshes/Builders/planeBuilder");

      if (disposed || !canvasRef.current) return;

      const engine = new Engine(canvasRef.current, true, {
        preserveDrawingBuffer: false,
        stencil: true,
        antialias: true,
      });
      engineRef.current = engine;

      const scene = new Scene(engine);

      // Warm dusk sky — not pure black
      scene.clearColor = new Color4(0.04, 0.03, 0.05, 1.0);
      scene.fogMode = Scene.FOGMODE_EXP2;
      scene.fogDensity = 0.006;
      scene.fogColor = new Color3(0.15, 0.1, 0.08);
      scene.ambientColor = new Color3(0.15, 0.12, 0.1);

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
      camera.maxZ = 800;

      // ─── Warm dusk lighting ───
      const hemi = new HemisphericLight("hemi", new Vector3(0, 1, 0), scene);
      hemi.intensity = 0.6;
      hemi.diffuse = new Color3(0.25, 0.18, 0.12);
      hemi.groundColor = new Color3(0.08, 0.06, 0.05);

      // Sun — low angle warm golden light
      const sun = new DirectionalLight(
        "sun",
        new Vector3(-0.5, -0.2, -0.8).normalize(),
        scene
      );
      sun.intensity = 2.8;
      sun.diffuse = new Color3(1.0, 0.65, 0.3);

      // Fill light — cool blue from opposite side
      const fill = new DirectionalLight(
        "fill",
        new Vector3(0.6, -0.4, 0.5).normalize(),
        scene
      );
      fill.intensity = 0.4;
      fill.diffuse = new Color3(0.3, 0.35, 0.5);

      // ─── Terrain ───
      const ground = MeshBuilder.CreateGround(
        "ground",
        { width: 500, height: 500, subdivisions: 80 },
        scene
      );
      const groundMat = new StandardMaterial("groundMat", scene);
      groundMat.diffuseColor = new Color3(0.18, 0.14, 0.1);
      groundMat.specularColor = new Color3(0.03, 0.03, 0.02);
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
          Math.sin(x * 0.015) * 4 +
          Math.cos(z * 0.02) * 3 +
          Math.sin((x + z) * 0.008) * 6 +
          Math.cos(x * 0.04) * 1.5 +
          Math.sin(z * 0.05) * 1
        );
      }

      // ─── Road (visible cobblestone path) ───
      const roadPoints = [
        [-220, -200], [-160, -140], [-100, -80], [-40, -20],
        [10, 30], [60, 90], [120, 140], [170, 180], [220, 220],
      ];
      const roadMat = new StandardMaterial("roadMat", scene);
      roadMat.diffuseColor = new Color3(0.25, 0.2, 0.15);
      roadMat.specularColor = new Color3(0.05, 0.04, 0.03);

      for (let i = 0; i < roadPoints.length - 1; i++) {
        const [x1, z1] = roadPoints[i];
        const [x2, z2] = roadPoints[i + 1];
        const mx = (x1 + x2) / 2;
        const mz = (z1 + z2) / 2;
        const dx = x2 - x1;
        const dz = z2 - z1;
        const len = Math.sqrt(dx * dx + dz * dz);
        const angle = Math.atan2(dx, dz);

        const seg = MeshBuilder.CreateGround(
          `road_${i}`,
          { width: 5, height: len + 2, subdivisions: 1 },
          scene
        );
        seg.position = new Vector3(mx, getHeight(mx, mz) + 0.15, mz);
        seg.rotation.y = angle;
        seg.material = roadMat;
      }

      // ─── Sky dome ───
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
      skyMat.emissiveColor = new Color3(0.04, 0.03, 0.06);
      skyMat.disableLighting = true;
      skyMat.backFaceCulling = false;
      skyDome.material = skyMat;

      // Warm horizon glow — large, prominent amber band
      const horizonGlow = MeshBuilder.CreateSphere(
        "horizonGlow",
        { diameter: 780, segments: 12, sideOrientation: 1, arc: 0.6 },
        scene
      );
      horizonGlow.position = new Vector3(0, -60, 80);
      horizonGlow.scaling.y = 0.2;
      horizonGlow.isPickable = false;
      horizonGlow.infiniteDistance = true;
      horizonGlow.applyFog = false;

      const horizonMat = new StandardMaterial("horizonMat", scene);
      horizonMat.diffuseColor = Color3.Black();
      horizonMat.specularColor = Color3.Black();
      horizonMat.emissiveColor = new Color3(0.3, 0.12, 0.04);
      horizonMat.alpha = 0.6;
      horizonMat.disableLighting = true;
      horizonMat.backFaceCulling = false;
      horizonGlow.material = horizonMat;
      horizonGlow.renderingGroupId = 0;

      // Second horizon layer — wider, more subtle orange
      const horizonGlow2 = MeshBuilder.CreateSphere(
        "horizonGlow2",
        { diameter: 785, segments: 10, sideOrientation: 1, arc: 0.8 },
        scene
      );
      horizonGlow2.position = new Vector3(0, -80, 60);
      horizonGlow2.scaling.y = 0.25;
      horizonGlow2.isPickable = false;
      horizonGlow2.infiniteDistance = true;
      horizonGlow2.applyFog = false;

      const horizonMat2 = new StandardMaterial("horizonMat2", scene);
      horizonMat2.diffuseColor = Color3.Black();
      horizonMat2.specularColor = Color3.Black();
      horizonMat2.emissiveColor = new Color3(0.15, 0.06, 0.02);
      horizonMat2.alpha = 0.4;
      horizonMat2.disableLighting = true;
      horizonMat2.backFaceCulling = false;
      horizonGlow2.material = horizonMat2;
      horizonGlow2.renderingGroupId = 0;

      // ─── Pine trees (placed away from camera, varied) ───
      const treeMat = new StandardMaterial("treeMat", scene);
      treeMat.diffuseColor = new Color3(0.1, 0.22, 0.08);
      treeMat.specularColor = Color3.Black();

      const treeDarkMat = new StandardMaterial("treeDarkMat", scene);
      treeDarkMat.diffuseColor = new Color3(0.06, 0.12, 0.05);
      treeDarkMat.specularColor = Color3.Black();

      const trunkMat = new StandardMaterial("trunkMat", scene);
      trunkMat.diffuseColor = new Color3(0.2, 0.14, 0.07);
      trunkMat.specularColor = Color3.Black();

      for (let i = 0; i < 120; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 30 + Math.random() * 210;
        const x = Math.cos(angle) * dist;
        const z = Math.sin(angle) * dist;
        const y = getHeight(x, z);
        const scale = 0.6 + Math.random() * 1.0;
        const mat = Math.random() > 0.4 ? treeMat : treeDarkMat;

        const trunk = MeshBuilder.CreateCylinder(
          `trunk_${i}`,
          { height: 3 * scale, diameter: 0.4 * scale, tessellation: 5 },
          scene
        );
        trunk.position = new Vector3(x, y + 1.5 * scale, z);
        trunk.material = trunkMat;

        // Multi-layer crown for fuller look
        const layers = 2 + Math.floor(Math.random() * 2);
        for (let l = 0; l < layers; l++) {
          const layerScale = 1 - l * 0.25;
          const crown = MeshBuilder.CreateCylinder(
            `crown_${i}_${l}`,
            {
              height: 5 * scale * layerScale,
              diameterTop: 0,
              diameterBottom: (3.5 + Math.random()) * scale * layerScale,
              tessellation: 6,
            },
            scene
          );
          crown.position = new Vector3(x, y + (4 + l * 3) * scale, z);
          crown.material = mat;
        }
      }

      // ─── Dead trees (sparse, atmospheric) ───
      const deadMat = new StandardMaterial("deadMat", scene);
      deadMat.diffuseColor = new Color3(0.15, 0.1, 0.07);
      deadMat.specularColor = Color3.Black();

      for (let i = 0; i < 15; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 50 + Math.random() * 150;
        const x = Math.cos(angle) * dist;
        const z = Math.sin(angle) * dist;
        const y = getHeight(x, z);
        const scale = 0.8 + Math.random() * 0.6;

        const trunk = MeshBuilder.CreateCylinder(
          `dead_${i}`,
          { height: 6 * scale, diameter: 0.3 * scale, tessellation: 5 },
          scene
        );
        trunk.position = new Vector3(x, y + 3 * scale, z);
        trunk.rotation.z = (Math.random() - 0.5) * 0.15;
        trunk.material = deadMat;
      }

      // ─── Rocks ───
      const rockMat = new StandardMaterial("rockMat", scene);
      rockMat.diffuseColor = new Color3(0.22, 0.2, 0.18);
      rockMat.specularColor = new Color3(0.04, 0.04, 0.03);

      for (let i = 0; i < 30; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 20 + Math.random() * 200;
        const x = Math.cos(angle) * dist;
        const z = Math.sin(angle) * dist;
        const y = getHeight(x, z);
        const scale = 0.4 + Math.random() * 2;

        const rock = MeshBuilder.CreateBox(
          `rock_${i}`,
          { width: 2 * scale, height: 1.2 * scale, depth: 1.8 * scale },
          scene
        );
        rock.position = new Vector3(x, y + scale * 0.3, z);
        rock.rotation.set(
          (Math.random() - 0.5) * 0.3,
          Math.random() * Math.PI * 2,
          (Math.random() - 0.5) * 0.2
        );
        rock.material = rockMat;
      }

      // ─── Shrine (bright ember glow, very visible) ───
      const shrineBase = MeshBuilder.CreateCylinder(
        "shrineBase",
        { height: 5, diameterTop: 1.2, diameterBottom: 2.2, tessellation: 8 },
        scene
      );
      const shrineY = getHeight(30, 50);
      shrineBase.position = new Vector3(30, shrineY + 2.5, 50);

      const shrineMat = new StandardMaterial("shrineMat", scene);
      shrineMat.diffuseColor = new Color3(0.25, 0.2, 0.15);
      shrineMat.specularColor = new Color3(0.1, 0.08, 0.05);
      shrineMat.emissiveColor = new Color3(0.08, 0.04, 0.01);
      shrineBase.material = shrineMat;

      // Shrine cap (ember crystal)
      const shrineCap = MeshBuilder.CreateCylinder(
        "shrineCap",
        { height: 1.5, diameterTop: 0, diameterBottom: 1, tessellation: 6 },
        scene
      );
      shrineCap.position = new Vector3(30, shrineY + 5.5, 50);
      const shrineCapMat = new StandardMaterial("shrineCapMat", scene);
      shrineCapMat.diffuseColor = new Color3(0.8, 0.4, 0.1);
      shrineCapMat.emissiveColor = new Color3(0.6, 0.25, 0.05);
      shrineCapMat.alpha = 0.9;
      shrineCap.material = shrineCapMat;

      // Shrine light — strong warm glow
      const shrineLight = new PointLight(
        "shrineLight",
        new Vector3(30, shrineY + 6, 50),
        scene
      );
      shrineLight.intensity = 5;
      shrineLight.diffuse = new Color3(1.0, 0.5, 0.1);
      shrineLight.range = 35;

      // Ground glow under shrine
      const glowDisc = MeshBuilder.CreateGround(
        "shrineGlow",
        { width: 10, height: 10 },
        scene
      );
      glowDisc.position = new Vector3(30, shrineY + 0.1, 50);
      const glowMat = new StandardMaterial("glowMat", scene);
      glowMat.diffuseColor = Color3.Black();
      glowMat.emissiveColor = new Color3(0.4, 0.15, 0.03);
      glowMat.alpha = 0.3;
      glowMat.disableLighting = true;
      glowDisc.material = glowMat;

      // Ember particles — more dense, more visible
      const embers = new ParticleSystem("embers", 150, scene);
      embers.emitter = new Vector3(30, shrineY + 5, 50);
      embers.minEmitBox = new Vector3(-0.8, 0, -0.8);
      embers.maxEmitBox = new Vector3(0.8, 0, 0.8);
      embers.minLifeTime = 1.5;
      embers.maxLifeTime = 4;
      embers.minSize = 0.04;
      embers.maxSize = 0.12;
      embers.emitRate = 30;
      embers.color1 = new Color4(1, 0.6, 0.1, 1);
      embers.color2 = new Color4(1, 0.35, 0.05, 0.8);
      embers.colorDead = new Color4(0.4, 0.1, 0, 0);
      embers.direction1 = new Vector3(-0.5, 1.5, -0.5);
      embers.direction2 = new Vector3(0.5, 3, 0.5);
      embers.minEmitPower = 0.4;
      embers.maxEmitPower = 1.2;
      embers.gravity = new Vector3(0, -0.05, 0);
      embers.blendMode = ParticleSystem.BLENDMODE_ADD;
      embers.start();

      // ─── Town lights (warm distant glow) ───
      const townPositions = [
        { x: -30, z: -80 },
        { x: -10, z: -90 },
        { x: 15, z: -85 },
        { x: 40, z: -75 },
        { x: -50, z: -95 },
        { x: 0, z: -100 },
        { x: 25, z: -70 },
      ];
      for (let i = 0; i < townPositions.length; i++) {
        const p = townPositions[i];
        const y = getHeight(p.x, p.z) + 3;
        const light = new PointLight(`townLight_${i}`, new Vector3(p.x, y, p.z), scene);
        light.intensity = 0.8;
        light.diffuse = new Color3(1.0, 0.7, 0.3);
        light.range = 25;
      }

      // ─── Mountains (varied, atmospheric) ───
      const mountainMat = new StandardMaterial("mtMat", scene);
      mountainMat.diffuseColor = new Color3(0.1, 0.08, 0.12);
      mountainMat.specularColor = Color3.Black();
      mountainMat.emissiveColor = new Color3(0.03, 0.02, 0.04);

      const mountainData = [
        { angle: 0.0, dist: 280, h: 80, w: 80 },
        { angle: 0.6, dist: 300, h: 100, w: 70 },
        { angle: 1.2, dist: 260, h: 60, w: 90 },
        { angle: 1.8, dist: 290, h: 90, w: 75 },
        { angle: 2.4, dist: 270, h: 70, w: 85 },
        { angle: 3.0, dist: 310, h: 110, w: 65 },
        { angle: 3.6, dist: 250, h: 55, w: 95 },
        { angle: 4.2, dist: 295, h: 85, w: 80 },
        { angle: 4.8, dist: 275, h: 75, w: 70 },
        { angle: 5.4, dist: 305, h: 95, w: 60 },
        { angle: 5.9, dist: 265, h: 65, w: 100 },
      ];

      for (let i = 0; i < mountainData.length; i++) {
        const m = mountainData[i];
        const x = Math.cos(m.angle) * m.dist;
        const z = Math.sin(m.angle) * m.dist;

        const mt = MeshBuilder.CreateCylinder(
          `mt_${i}`,
          {
            height: m.h,
            diameterTop: 3 + Math.random() * 10,
            diameterBottom: m.w,
            tessellation: 7,
          },
          scene
        );
        mt.position = new Vector3(x, m.h * 0.25, z);
        mt.material = mountainMat;
      }

      // ─── Ambient dust ───
      const dust = new ParticleSystem("dust", 150, scene);
      dust.emitter = new Vector3(0, 8, 0);
      dust.minEmitBox = new Vector3(-80, 0, -80);
      dust.maxEmitBox = new Vector3(80, 20, 80);
      dust.minLifeTime = 5;
      dust.maxLifeTime = 10;
      dust.minSize = 0.02;
      dust.maxSize = 0.06;
      dust.emitRate = 25;
      dust.color1 = new Color4(0.7, 0.55, 0.4, 0.15);
      dust.color2 = new Color4(0.5, 0.4, 0.3, 0.1);
      dust.colorDead = new Color4(0.3, 0.2, 0.15, 0);
      dust.direction1 = new Vector3(-0.4, 0.1, -0.4);
      dust.direction2 = new Vector3(0.4, 0.25, 0.4);
      dust.minEmitPower = 0.05;
      dust.maxEmitPower = 0.12;
      dust.gravity = new Vector3(0, -0.003, 0);
      dust.blendMode = ParticleSystem.BLENDMODE_ADD;
      dust.start();

      // ─── Post-processing ───
      const pipeline = new DefaultRenderingPipeline(
        "pipeline",
        true,
        scene,
        [camera]
      );

      pipeline.bloomEnabled = true;
      pipeline.bloomThreshold = 0.5;
      pipeline.bloomWeight = 0.4;
      pipeline.bloomKernel = 64;

      pipeline.imageProcessingEnabled = true;
      pipeline.imageProcessing.toneMappingEnabled = true;
      pipeline.imageProcessing.toneMappingType = 1;
      pipeline.imageProcessing.exposure = 1.6;
      pipeline.imageProcessing.contrast = 1.2;

      pipeline.imageProcessing.vignetteEnabled = true;
      pipeline.imageProcessing.vignetteWeight = 2.0;
      pipeline.imageProcessing.vignetteCameraFov = 0.5;

      pipeline.grainEnabled = true;
      pipeline.grain.intensity = 5;
      pipeline.grain.animated = true;

      // ─── Camera movement (smooth orbit + bob) ───
      let time = Math.random() * 100;
      const basePos = new Vector3(cam.position[0], cam.position[1], cam.position[2]);
      const targetPos = new Vector3(cam.target[0], cam.target[1], cam.target[2]);

      scene.registerBeforeRender(() => {
        time += engine.getDeltaTime() * 0.001;
        const orbitAngle = time * cam.orbitSpeed * 60;
        camera.position.x = basePos.x + Math.sin(orbitAngle) * cam.orbitRadius;
        camera.position.z = basePos.z + Math.cos(orbitAngle) * cam.orbitRadius;
        camera.position.y = basePos.y + Math.sin(time * 0.12) * 2;
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
