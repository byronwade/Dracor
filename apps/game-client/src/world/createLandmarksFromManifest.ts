import { Scene } from '@babylonjs/core/scene';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import '@babylonjs/core/Meshes/Builders/boxBuilder';
import '@babylonjs/core/Meshes/Builders/cylinderBuilder';

import type { LandmarkDefinition } from '../scenes/IronvaleOutskirtsScene';

/**
 * Create non-shrine landmarks: ruined gate, old bridge, etc.
 */
export function createLandmarksFromManifest(
  landmark: LandmarkDefinition,
  scene: Scene
): Mesh {
  if (landmark.type === 'gate') {
    return createRuinedGate(landmark, scene);
  }
  if (landmark.type === 'bridge') {
    return createOldBridge(landmark, scene);
  }

  // Generic fallback: a simple marker post
  return createGenericLandmark(landmark, scene);
}

function createRuinedGate(
  landmark: LandmarkDefinition,
  scene: Scene
): Mesh {
  const parent = new TransformNode(`gate_${landmark.id}`, scene) as unknown as Mesh;
  const pos = landmark.position;
  const rotY = ((landmark.rotation ?? 0) * Math.PI) / 180;
  const scale = landmark.scale ?? 1.0;

  const stoneMat = new StandardMaterial('gateStone', scene);
  stoneMat.diffuseColor = new Color3(0.18, 0.17, 0.16);
  stoneMat.specularColor = new Color3(0.02, 0.02, 0.02);
  stoneMat.roughness = 1.0;

  const mossyMat = new StandardMaterial('gateMossy', scene);
  mossyMat.diffuseColor = new Color3(0.12, 0.16, 0.1);
  mossyMat.specularColor = new Color3(0.02, 0.02, 0.02);
  mossyMat.roughness = 1.0;

  // Standing pillar (left)
  const pillarLeft = MeshBuilder.CreateBox(
    'gatePillarLeft',
    { width: 1.2 * scale, height: 6 * scale, depth: 1.2 * scale },
    scene
  );
  pillarLeft.position = new Vector3(
    pos.x - Math.cos(rotY) * 2.5,
    pos.y + 3 * scale,
    pos.z - Math.sin(rotY) * 2.5
  );
  pillarLeft.rotation.y = rotY;
  pillarLeft.material = stoneMat;
  pillarLeft.parent = parent;

  // Collapsed pillar (right) - tilted
  const pillarRight = MeshBuilder.CreateBox(
    'gatePillarRight',
    { width: 1.2 * scale, height: 5 * scale, depth: 1.2 * scale },
    scene
  );
  pillarRight.position = new Vector3(
    pos.x + Math.cos(rotY) * 2.5,
    pos.y + 1.5 * scale,
    pos.z + Math.sin(rotY) * 2.5
  );
  pillarRight.rotation.y = rotY;
  pillarRight.rotation.z = 0.5; // Tilted/collapsed
  pillarRight.material = mossyMat;
  pillarRight.parent = parent;

  // Broken lintel (partial arch piece resting on standing pillar)
  const lintel = MeshBuilder.CreateBox(
    'gateLintel',
    { width: 3 * scale, height: 0.8 * scale, depth: 1.2 * scale },
    scene
  );
  lintel.position = new Vector3(
    pos.x - Math.cos(rotY) * 1.0,
    pos.y + 5.8 * scale,
    pos.z - Math.sin(rotY) * 1.0
  );
  lintel.rotation.y = rotY;
  lintel.rotation.z = 0.15; // Slightly angled
  lintel.material = stoneMat;
  lintel.parent = parent;

  // Scattered rubble at the base of the collapsed pillar
  for (let i = 0; i < 6; i++) {
    const rubbleSize = 0.3 + Math.random() * 0.6;
    const rubble = MeshBuilder.CreateBox(
      `gateRubble_${i}`,
      {
        width: rubbleSize * scale,
        height: rubbleSize * 0.5 * scale,
        depth: rubbleSize * scale,
      },
      scene
    );
    const offsetX = (Math.random() - 0.5) * 4;
    const offsetZ = (Math.random() - 0.5) * 3;
    rubble.position = new Vector3(
      pos.x + Math.cos(rotY) * 2.5 + offsetX,
      pos.y + rubbleSize * 0.25 * scale,
      pos.z + Math.sin(rotY) * 2.5 + offsetZ
    );
    rubble.rotation.set(
      (Math.random() - 0.5) * 0.5,
      Math.random() * Math.PI * 2,
      (Math.random() - 0.5) * 0.5
    );
    rubble.material = i % 2 === 0 ? stoneMat : mossyMat;
    rubble.parent = parent;
  }

  return parent as unknown as Mesh;
}

function createOldBridge(
  landmark: LandmarkDefinition,
  scene: Scene
): Mesh {
  const parent = new TransformNode(`bridge_${landmark.id}`, scene) as unknown as Mesh;
  const pos = landmark.position;
  const rotY = ((landmark.rotation ?? 0) * Math.PI) / 180;
  const scale = landmark.scale ?? 1.0;

  const bridgeMat = new StandardMaterial('bridgeStone', scene);
  bridgeMat.diffuseColor = new Color3(0.2, 0.19, 0.17);
  bridgeMat.specularColor = new Color3(0.02, 0.02, 0.02);
  bridgeMat.roughness = 1.0;
  bridgeMat.ambientColor = new Color3(0.05, 0.06, 0.04);

  // Bridge deck (main flat surface)
  const deck = MeshBuilder.CreateBox(
    'bridgeDeck',
    { width: 4 * scale, height: 0.4 * scale, depth: 8 * scale },
    scene
  );
  deck.position = new Vector3(pos.x, pos.y + 0.2 * scale, pos.z);
  deck.rotation.y = rotY;
  deck.material = bridgeMat;
  deck.parent = parent;

  // Support pillars underneath
  const supportMat = new StandardMaterial('bridgeSupport', scene);
  supportMat.diffuseColor = new Color3(0.15, 0.14, 0.12);
  supportMat.specularColor = new Color3(0.02, 0.02, 0.02);
  supportMat.roughness = 1.0;

  for (let i = -1; i <= 1; i += 2) {
    const support = MeshBuilder.CreateCylinder(
      `bridgeSupport_${i}`,
      { diameter: 0.6 * scale, height: 2.5 * scale, tessellation: 8 },
      scene
    );
    const offset = i * 3;
    support.position = new Vector3(
      pos.x + Math.sin(rotY) * offset,
      pos.y - 1.0 * scale,
      pos.z + Math.cos(rotY) * offset
    );
    support.material = supportMat;
    support.parent = parent;
  }

  // Moss patches on deck surface
  const mossMat = new StandardMaterial('bridgeMoss', scene);
  mossMat.diffuseColor = new Color3(0.1, 0.2, 0.08);
  mossMat.specularColor = Color3.Black();
  mossMat.alpha = 0.7;

  for (let i = 0; i < 4; i++) {
    const moss = MeshBuilder.CreateBox(
      `bridgeMoss_${i}`,
      {
        width: (0.5 + Math.random() * 1.0) * scale,
        height: 0.02 * scale,
        depth: (0.5 + Math.random() * 1.0) * scale,
      },
      scene
    );
    const offsetForward = (Math.random() - 0.5) * 6;
    const offsetSide = (Math.random() - 0.5) * 3;
    moss.position = new Vector3(
      pos.x + Math.sin(rotY) * offsetForward + Math.cos(rotY) * offsetSide,
      pos.y + 0.42 * scale,
      pos.z + Math.cos(rotY) * offsetForward - Math.sin(rotY) * offsetSide
    );
    moss.rotation.y = Math.random() * Math.PI;
    moss.material = mossMat;
    moss.parent = parent;
  }

  return parent as unknown as Mesh;
}

function createGenericLandmark(
  landmark: LandmarkDefinition,
  scene: Scene
): Mesh {
  const scale = landmark.scale ?? 1.0;
  const pos = landmark.position;

  const mat = new StandardMaterial(`landmark_${landmark.id}_mat`, scene);
  mat.diffuseColor = new Color3(0.2, 0.18, 0.16);
  mat.specularColor = new Color3(0.02, 0.02, 0.02);

  const marker = MeshBuilder.CreateCylinder(
    `landmark_${landmark.id}`,
    { diameter: 0.5 * scale, height: 2 * scale, tessellation: 8 },
    scene
  );
  marker.position = new Vector3(pos.x, pos.y + scale, pos.z);
  marker.material = mat;

  return marker;
}
