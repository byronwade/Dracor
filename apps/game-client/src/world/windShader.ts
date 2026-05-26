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
uniform float windTime;
uniform float windStrength;
uniform vec2 windDirection;
uniform float windSpeed;

varying vec2 vUV;
varying vec3 vNormal;
varying vec3 vWorldPos;

#include<instancesDeclaration>

void main() {
  vec3 positionUpdated = position;

  #include<instancesVertex>

  vec4 worldPos = finalWorld * vec4(position, 1.0);

  float height = max(0.0, position.y);
  float swayAmount = height * height * windStrength * 0.002;
  float phase = windTime * windSpeed + worldPos.x * 0.05 + worldPos.z * 0.07;
  float sway = sin(phase) * 0.7 + sin(phase * 2.3 + 1.4) * 0.3;

  worldPos.x += sway * swayAmount * windDirection.x;
  worldPos.z += sway * swayAmount * windDirection.y;

  vUV = uv;
  vNormal = normalize((finalWorld * vec4(normal, 0.0)).xyz);
  vWorldPos = worldPos.xyz;

  gl_Position = viewProjection * worldPos;
}
`;

const FRAGMENT_SHADER = `
precision highp float;

varying vec2 vUV;
varying vec3 vNormal;
varying vec3 vWorldPos;

uniform vec3 baseColor;
uniform float roughness;
uniform float metallic;
uniform vec3 lightDirection;
uniform vec3 lightColor;
uniform vec3 ambientColor;
uniform sampler2D albedoTexture;
uniform float hasAlbedoTexture;

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
  float NdotL = max(dot(N, L), 0.0);

  vec3 diffuse = albedo * lightColor * NdotL;
  vec3 ambient = albedo * ambientColor;

  vec3 color = ambient + diffuse;

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
      'viewProjection',
      'windTime', 'windStrength', 'windDirection', 'windSpeed',
      'baseColor', 'roughness', 'metallic',
      'lightDirection', 'lightColor', 'ambientColor',
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

export function updateWind(deltaTime: number): void {
  const wind = getOrCreateWindState();
  if (!wind) return;

  wind.time += deltaTime;

  for (const mat of wind.materials) {
    mat.setFloat('windTime', wind.time);
    mat.setFloat('windStrength', wind.strength);
    mat.setFloat('windSpeed', wind.speed);
    mat.setVector2('windDirection', new Vector2(wind.directionX, wind.directionZ));
  }
}
