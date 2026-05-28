// Force all Babylon.js imports through a single module so Vite
// bundles them as one dep instead of 1300+ separate files.
export { Engine } from '@babylonjs/core/Engines/engine';
export { Scene } from '@babylonjs/core/scene';
export { Vector3, Quaternion, Matrix } from '@babylonjs/core/Maths/math.vector';
export { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
export { Mesh } from '@babylonjs/core/Meshes/mesh';
export { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
export { TransformNode } from '@babylonjs/core/Meshes/transformNode';
export { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
export { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
export { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial';
export { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
export { Effect } from '@babylonjs/core/Materials/effect';
export { Texture } from '@babylonjs/core/Materials/Textures/texture';
export { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
export { HDRCubeTexture } from '@babylonjs/core/Materials/Textures/hdrCubeTexture';
export { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
export { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
export { PointLight } from '@babylonjs/core/Lights/pointLight';
export { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
export { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
export { Ray } from '@babylonjs/core/Culling/ray';
export { ParticleSystem } from '@babylonjs/core/Particles/particleSystem';
export { AssetContainer } from '@babylonjs/core/assetContainer';
export { LoadAssetContainerAsync } from '@babylonjs/core/Loading/sceneLoader';
export { DefaultRenderingPipeline } from '@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline';
export { HavokPlugin } from '@babylonjs/core/Physics/v2/Plugins/havokPlugin';
export { PhysicsBody } from '@babylonjs/core/Physics/v2/physicsBody';
export { PhysicsMotionType } from '@babylonjs/core/Physics/v2/IPhysicsEnginePlugin';
export { PhysicsShapeMesh } from '@babylonjs/core/Physics/v2/physicsShape';

// Side-effect imports
import '@babylonjs/core/Physics/physicsEngineComponent';
import '@babylonjs/core/Rendering/depthRendererSceneComponent';
import '@babylonjs/core/PostProcesses/RenderPipeline/postProcessRenderPipelineManagerSceneComponent';
import '@babylonjs/core/Helpers/sceneHelpers';
import '@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent';
import '@babylonjs/core/Meshes/thinInstanceMesh';
import '@babylonjs/core/Meshes/Builders/groundBuilder';
import '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import '@babylonjs/core/Meshes/Builders/sphereBuilder';
import '@babylonjs/core/Meshes/Builders/boxBuilder';
import '@babylonjs/core/Meshes/Builders/planeBuilder';
import '@babylonjs/core/Meshes/Builders/capsuleBuilder';
import '@babylonjs/core/Meshes/Builders/torusBuilder';
import '@babylonjs/core/Culling/ray';
import '@babylonjs/core/Shaders/ShadersInclude/instancesDeclaration';
import '@babylonjs/core/Shaders/ShadersInclude/instancesVertex';

export { registerBuiltInLoaders } from '@babylonjs/loaders/dynamic';
