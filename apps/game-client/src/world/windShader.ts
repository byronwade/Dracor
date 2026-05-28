import { Scene } from '@babylonjs/core/scene';
import { Effect } from '@babylonjs/core/Materials/effect';
import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { Material } from '@babylonjs/core/Materials/material';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector2, Vector3 } from '@babylonjs/core/Maths/math.vector';
import '@babylonjs/core/Shaders/ShadersInclude/instancesDeclaration';
import '@babylonjs/core/Shaders/ShadersInclude/instancesVertex';

const VERTEX_SHADER = `
precision highp float;

attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;

uniform mat4 viewProjection;
uniform vec3 cameraPosition;
uniform float windTime;
uniform float windStrength;
uniform vec2 windDirection;
uniform float windSpeed;

varying vec2 vUV;
varying vec3 vNormal;
varying vec3 vWorldPos;
varying vec3 vViewDir;
varying float vSubsurfaceMask;

#include<instancesDeclaration>

void main() {
  vec3 positionUpdated = position;

  #include<instancesVertex>

  vec4 worldPos = finalWorld * vec4(position, 1.0);

  // Two-frequency sway: large slow trunk sway + fast small leaf flutter
  float height = max(0.0, position.y);
  float swayAmount = height * height * windStrength * 0.002;
  float bigPhase = windTime * windSpeed + worldPos.x * 0.05 + worldPos.z * 0.07;
  float smallPhase = windTime * windSpeed * 3.5 + worldPos.x * 0.4 + worldPos.z * 0.5;
  float sway = sin(bigPhase) * 0.7 + sin(bigPhase * 2.3 + 1.4) * 0.3;
  float flutter = sin(smallPhase) * 0.15 * height;

  worldPos.x += (sway * swayAmount + flutter * windStrength * 0.001) * windDirection.x;
  worldPos.z += (sway * swayAmount + flutter * windStrength * 0.001) * windDirection.y;

  vUV = uv;
  vNormal = normalize((finalWorld * vec4(normal, 0.0)).xyz);
  vWorldPos = worldPos.xyz;
  vViewDir = normalize(cameraPosition - worldPos.xyz);
  // Mask SSS by height — leaves/canopy get full SSS, trunks don't
  vSubsurfaceMask = smoothstep(0.5, 2.0, height);

  gl_Position = viewProjection * worldPos;
}
`;

const FRAGMENT_SHADER = `
precision highp float;

varying vec2 vUV;
varying vec3 vNormal;
varying vec3 vWorldPos;
varying vec3 vViewDir;
varying float vSubsurfaceMask;

uniform vec3 baseColor;
uniform float roughness;
uniform float metallic;
uniform vec3 lightDirection;
uniform vec3 lightColor;
uniform vec3 ambientColor;
uniform vec3 subsurfaceColor;
uniform float cloudTime;
uniform sampler2D albedoTexture;
uniform float hasAlbedoTexture;

float wsHash2(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float wsValueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(wsHash2(i), wsHash2(i + vec2(1.0, 0.0)), f.x),
    mix(wsHash2(i + vec2(0.0, 1.0)), wsHash2(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}

void main() {
  vec3 albedo;
  if (hasAlbedoTexture > 0.5) {
    vec4 texColor = texture2D(albedoTexture, vUV);
    if (texColor.a < 0.3) discard;
    albedo = texColor.rgb * baseColor;
  } else {
    albedo = baseColor;
  }

  vec3 N = normalize(vNormal);
  vec3 L = normalize(-lightDirection);
  vec3 V = normalize(vViewDir);

  // Wrap lighting — softens shadow falloff on round leaf-clusters
  float NdotL = dot(N, L);
  float wrap = max(0.0, (NdotL + 0.4) / 1.4);

  // Cloud shadow modulation — matches the terrain pattern so light/dark moves together
  vec2 cloudUV = vWorldPos.xz * 0.0018 + vec2(cloudTime * 0.004, cloudTime * 0.002);
  float cloud = wsValueNoise(cloudUV);
  cloud = mix(cloud, wsValueNoise(cloudUV * 2.1 + 5.0), 0.5);
  cloud = smoothstep(0.35, 0.85, cloud);
  float cloudShadow = 1.0 - cloud * 0.28;

  // Diffuse with wrap, modulated by cloud shadow
  vec3 diffuse = albedo * lightColor * wrap * cloudShadow;

  // Subsurface back-light: sun shining through leaves from behind
  // Models translucent leaf material — peak intensity when view is roughly opposite to L
  float backDot = max(0.0, dot(-L, V) + 0.2);
  float backLight = pow(backDot, 4.0) * vSubsurfaceMask;
  // Also accept light bleeding through edges (when L hits the back of the leaf)
  float bleed = max(0.0, dot(-N, L)) * 0.3;
  vec3 transmission = subsurfaceColor * lightColor * (backLight + bleed) * vSubsurfaceMask;

  // Hemispheric ambient — sky tint above, ground tint below
  vec3 hemi = mix(ambientColor * 0.5, ambientColor, max(0.0, N.y * 0.5 + 0.5));
  vec3 ambient = albedo * hemi;

  // Subtle specular highlight (sheen on wet leaves)
  vec3 H = normalize(L + V);
  float NdotH = max(0.0, dot(N, H));
  float spec = pow(NdotH, mix(8.0, 64.0, 1.0 - roughness)) * (1.0 - roughness) * 0.2;
  vec3 specular = lightColor * spec;

  vec3 color = ambient + diffuse + transmission + specular;

  // Filmic tone curve
  color = color / (color + vec3(1.0));

  gl_FragColor = vec4(color, 1.0);
}
`;

let shaderRegistered = false;

function ensureShaderRegistered(): void {
  if (shaderRegistered) return;

  Effect.ShadersStore['foliageWindVertexShader'] = VERTEX_SHADER;
  Effect.ShadersStore['foliageWindFragmentShader'] = FRAGMENT_SHADER;
  shaderRegistered = true;
}

export interface WindState {
  time: number;
  strength: number;
  speed: number;
  directionX: number;
  directionZ: number;
  materials: ShaderMaterial[];
}

let globalWindState: WindState | null = null;

export function getOrCreateWindState(): WindState {
  if (!globalWindState) {
    globalWindState = {
      time: 0,
      strength: 0.8,
      speed: 1.5,
      directionX: 1.0,
      directionZ: 0.3,
      materials: [],
    };
  }
  return globalWindState;
}

export function createWindMaterial(
  scene: Scene,
  baseMaterial: Material | null,
  name: string
): ShaderMaterial {
  ensureShaderRegistered();

  const windMat = new ShaderMaterial(`wind_${name}`, scene, 'foliageWind', {
    attributes: ['position', 'normal', 'uv'],
    uniforms: [
      'viewProjection', 'cameraPosition',
      'windTime', 'windStrength', 'windDirection', 'windSpeed',
      'baseColor', 'roughness', 'metallic',
      'lightDirection', 'lightColor', 'ambientColor', 'subsurfaceColor',
      'cloudTime',
      'hasAlbedoTexture',
    ],
    samplers: ['albedoTexture'],
    defines: ['#define THIN_INSTANCES'],
  });

  let color = new Color3(0.15, 0.25, 0.1);
  let rough = 0.9;
  let metal = 0.0;
  let albedoTex: Texture | null = null;

  if (baseMaterial instanceof PBRMaterial) {
    color = baseMaterial.albedoColor || color;
    rough = baseMaterial.roughness ?? rough;
    metal = baseMaterial.metallic ?? metal;
    albedoTex = baseMaterial.albedoTexture as Texture | null;
  } else if (baseMaterial instanceof StandardMaterial) {
    color = baseMaterial.diffuseColor || color;
    albedoTex = baseMaterial.diffuseTexture as Texture | null;
  }

  windMat.setColor3('baseColor', color);
  windMat.setFloat('roughness', rough);
  windMat.setFloat('metallic', metal);
  windMat.setVector3('lightDirection', new Vector3(-0.6, -0.3, -0.75));
  windMat.setColor3('lightColor', new Color3(1.0, 0.7, 0.35));
  windMat.setColor3('ambientColor', new Color3(0.15, 0.1, 0.08));
  // Subsurface tint — sun light filtered through chlorophyll → warm yellow-green for needles,
  // brighter green for broadleaf. Default tuned for dark pine.
  windMat.setColor3('subsurfaceColor', new Color3(0.85, 0.65, 0.25));

  if (albedoTex) {
    windMat.setTexture('albedoTexture', albedoTex);
    windMat.setFloat('hasAlbedoTexture', 1.0);
  } else {
    windMat.setFloat('hasAlbedoTexture', 0.0);
  }

  windMat.backFaceCulling = false;

  const wind = getOrCreateWindState();
  wind.materials.push(windMat);

  return windMat;
}

const _windDirVec = new Vector2();

export function updateWind(deltaTime: number): void {
  const wind = getOrCreateWindState();
  if (!wind) return;

  wind.time += deltaTime;
  _windDirVec.set(wind.directionX, wind.directionZ);

  for (const mat of wind.materials) {
    mat.setFloat('windTime', wind.time);
    mat.setFloat('windStrength', wind.strength);
    mat.setFloat('windSpeed', wind.speed);
    mat.setVector2('windDirection', _windDirVec);
    mat.setFloat('cloudTime', wind.time);

    const scene = mat.getScene();
    const cam = scene.activeCamera;
    if (cam) mat.setVector3('cameraPosition', cam.position);

    const sun = scene.getLightByName('sun') as any;
    if (sun?.direction) {
      mat.setVector3('lightDirection', sun.direction);
      if (sun.diffuse) mat.setColor3('lightColor', sun.diffuse);
    }
    const ambient = scene.getLightByName('ambient') as any;
    if (ambient?.diffuse) mat.setColor3('ambientColor', ambient.diffuse);
  }
}

export function resetWindState(): void {
  if (globalWindState) {
    globalWindState.materials = [];
    globalWindState.time = 0;
  }
  globalWindState = null;
}
