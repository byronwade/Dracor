import { Scene } from '@babylonjs/core/scene';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial';
import { Effect } from '@babylonjs/core/Materials/effect';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import '@babylonjs/core/Meshes/Builders/sphereBuilder';
import '@babylonjs/core/Meshes/Builders/planeBuilder';

import { type AtmosphereState, type Color3 as AtmoColor3 } from '@dracor/atmosphere';

// ---------------------------------------------------------------------------
// Shader source
// ---------------------------------------------------------------------------

const SKY_VERTEX_SHADER = `
precision highp float;
attribute vec3 position;
uniform mat4 worldViewProjection;
varying vec3 vWorldPosition;
void main() {
  vWorldPosition = position;
  gl_Position = worldViewProjection * vec4(position, 1.0);
}
`;

const SKY_FRAGMENT_SHADER = `
precision highp float;
varying vec3 vWorldPosition;

uniform vec3 zenithColor;
uniform vec3 horizonColor;
uniform vec3 groundColor;
uniform vec3 sunDirection;
uniform vec3 sunColor;
uniform float sunIntensity;
uniform float sunDiskSize;
uniform float sunGlowIntensity;
uniform vec3 moonDirection;
uniform vec3 moonColor;
uniform float moonIntensity;
uniform float moonGlowIntensity;
uniform float starVisibility;
uniform float exposure;

// Deterministic hash for star field
float hash(vec3 p) {
  p = fract(p * vec3(443.897, 441.423, 437.195));
  p += dot(p, p.yxz + 19.19);
  return fract((p.x + p.y) * p.z);
}

void main() {
  vec3 viewDir = normalize(vWorldPosition);
  float altitude = dot(viewDir, vec3(0.0, 1.0, 0.0)); // -1 nadir, 0 horizon, 1 zenith

  // Sky gradient: ground -> horizon -> zenith
  vec3 skyColor;
  if (altitude >= 0.0) {
    skyColor = mix(horizonColor, zenithColor, pow(altitude, 0.6));
  } else {
    skyColor = mix(horizonColor, groundColor, pow(-altitude, 0.4));
  }

  // Sun disk (sharp)
  vec3 sunDir = normalize(sunDirection);
  float sunDot = max(0.0, dot(viewDir, sunDir));
  float diskExp = max(1.0, 256.0 / max(sunDiskSize, 0.001));
  float sunDisk = pow(sunDot, diskExp) * sunIntensity;

  // Sun glow (wide soft halo)
  float sunGlow = pow(sunDot, 4.0) * sunGlowIntensity;

  skyColor += sunColor * (sunDisk + sunGlow);

  // Moon glow
  vec3 moonDir = normalize(moonDirection);
  float moonDot = max(0.0, dot(viewDir, moonDir));
  float moonGlow = pow(moonDot, 32.0) * moonIntensity;
  float moonGlowWide = pow(moonDot, 6.0) * moonGlowIntensity;
  skyColor += moonColor * (moonGlow + moonGlowWide);

  // Stars (only above horizon, fades with starVisibility)
  if (starVisibility > 0.0 && altitude > 0.0) {
    // Use a snapped view direction for stable star positions
    vec3 starDir = floor(viewDir * 200.0) / 200.0;
    float starNoise = hash(starDir + 7.3);
    float star = step(0.998, starNoise) * starVisibility * smoothstep(0.0, 0.05, altitude);
    skyColor += vec3(star);
  }

  // Exposure
  skyColor *= exposure;

  // Reinhard tone mapping
  skyColor = skyColor / (skyColor + vec3(1.0));

  gl_FragColor = vec4(skyColor, 1.0);
}
`;

// ---------------------------------------------------------------------------
// Helper converters
// ---------------------------------------------------------------------------

function toColor3(c: AtmoColor3): Color3 {
  return new Color3(c.r, c.g, c.b);
}

function toVec3(v: { x: number; y: number; z: number }): Vector3 {
  return new Vector3(v.x, v.y, v.z);
}

// ---------------------------------------------------------------------------
// Shader registration guard
// ---------------------------------------------------------------------------

let skyShaderRegistered = false;

function ensureSkyShaderRegistered(): void {
  if (skyShaderRegistered) return;
  Effect.ShadersStore['atmosphereSkyVertexShader'] = SKY_VERTEX_SHADER;
  Effect.ShadersStore['atmosphereSkyFragmentShader'] = SKY_FRAGMENT_SHADER;
  skyShaderRegistered = true;
}

// ---------------------------------------------------------------------------
// BabylonAtmosphereRenderer
// ---------------------------------------------------------------------------

export class BabylonAtmosphereRenderer {
  private scene: Scene;
  private skyDome: Mesh;
  private skyMaterial: ShaderMaterial;
  private sunLight: DirectionalLight;
  private ambientLight: HemisphericLight;

  constructor(scene: Scene) {
    this.scene = scene;

    ensureSkyShaderRegistered();

    // --- Sky dome ---
    // Use sideOrientation=1 (BACKSIDE) so the sphere is visible from inside.
    this.skyDome = MeshBuilder.CreateSphere(
      'atmosphereSkyDome',
      { diameter: 1000, segments: 16, sideOrientation: Mesh.BACKSIDE },
      scene
    );
    this.skyDome.isPickable = false;
    this.skyDome.infiniteDistance = true;
    this.skyDome.applyFog = false;
    this.skyDome.renderingGroupId = 0;
    this.skyDome.alwaysSelectAsActiveMesh = true;

    this.skyMaterial = new ShaderMaterial(
      'atmosphereSkyMat',
      scene,
      'atmosphereSky',
      {
        attributes: ['position'],
        uniforms: [
          'worldViewProjection',
          'zenithColor',
          'horizonColor',
          'groundColor',
          'sunDirection',
          'sunColor',
          'sunIntensity',
          'sunDiskSize',
          'sunGlowIntensity',
          'moonDirection',
          'moonColor',
          'moonIntensity',
          'moonGlowIntensity',
          'starVisibility',
          'exposure',
        ],
      }
    );
    this.skyMaterial.backFaceCulling = false;
    this.skyMaterial.disableDepthWrite = true;
    this.skyDome.material = this.skyMaterial;

    // --- Lighting ---
    // Reuse existing lights when present so we don't duplicate scene lights
    const existingAmbient = scene.getLightByName('atmosphereAmbient') as HemisphericLight | null;
    this.ambientLight = existingAmbient
      ?? new HemisphericLight('atmosphereAmbient', new Vector3(0, 1, 0), scene);
    this.ambientLight.specular = Color3.Black();
    this.ambientLight.intensity = 0.6;
    this.ambientLight.diffuse = new Color3(0.6, 0.65, 0.75);
    this.ambientLight.groundColor = new Color3(0.15, 0.12, 0.10);

    const existingSun = scene.getLightByName('atmosphereSun') as DirectionalLight | null;
    this.sunLight = existingSun
      ?? new DirectionalLight('atmosphereSun', new Vector3(-0.5, -1, -0.5).normalize(), scene);
    this.sunLight.intensity = 1.5;
    this.sunLight.diffuse = new Color3(1.0, 0.95, 0.85);

    console.log('[Atmosphere] Renderer initialized — sky dome, ambient light, sun light');
  }

  /**
   * Apply an AtmosphereState to the scene every frame.
   * Call this from your game loop / render hook.
   */
  update(state: AtmosphereState): void {
    const { sky, fog, ambientColor, ambientIntensity, directionalColor, directionalIntensity } = state;

    // --- Sky shader uniforms ---
    this.skyMaterial.setColor3('zenithColor', toColor3(sky.zenithColor));
    this.skyMaterial.setColor3('horizonColor', toColor3(sky.horizonColor));
    this.skyMaterial.setColor3('groundColor', toColor3(sky.groundColor));

    this.skyMaterial.setVector3('sunDirection', toVec3(sky.sunDirection));
    this.skyMaterial.setColor3('sunColor', toColor3(sky.sunColor));
    this.skyMaterial.setFloat('sunIntensity', sky.sunIntensity);
    this.skyMaterial.setFloat('sunDiskSize', sky.sunDiskSize);
    this.skyMaterial.setFloat('sunGlowIntensity', sky.sunGlowIntensity);

    this.skyMaterial.setVector3('moonDirection', toVec3(sky.moonDirection));
    this.skyMaterial.setColor3('moonColor', toColor3(sky.moonColor));
    this.skyMaterial.setFloat('moonIntensity', sky.moonIntensity);
    this.skyMaterial.setFloat('moonGlowIntensity', sky.moonGlowIntensity);

    this.skyMaterial.setFloat('starVisibility', sky.starVisibility);
    this.skyMaterial.setFloat('exposure', sky.exposure);

    // --- Distance fog (linear for predictable distance control) ---
    const distFog = fog.distance;
    this.scene.fogMode = Scene.FOGMODE_LINEAR;
    this.scene.fogStart = distFog.start;
    this.scene.fogEnd = distFog.end;
    this.scene.fogColor = toColor3(sky.horizonColor);

    // --- Ambient (hemispheric) light ---
    this.ambientLight.diffuse = toColor3(ambientColor);
    this.ambientLight.intensity = ambientIntensity;
    // Use a darkened version of the ambient color for ground bounce
    this.ambientLight.groundColor = new Color3(
      ambientColor.r * 0.3,
      ambientColor.g * 0.3,
      ambientColor.b * 0.3
    );

    // --- Directional (sun/moon) light ---
    const sunDir = toVec3(sky.sunDirection);
    // The directional light direction is the direction light travels, not the source direction
    this.sunLight.direction = sunDir;
    this.sunLight.diffuse = toColor3(directionalColor);
    this.sunLight.intensity = directionalIntensity;

    // Keep clear color in sync with zenith for canvas background
    this.scene.clearColor = new Color4(
      sky.zenithColor.r,
      sky.zenithColor.g,
      sky.zenithColor.b,
      1.0
    );
  }

  dispose(): void {
    this.skyDome.dispose();
    this.skyMaterial.dispose();
    this.sunLight.dispose();
    this.ambientLight.dispose();
  }
}
