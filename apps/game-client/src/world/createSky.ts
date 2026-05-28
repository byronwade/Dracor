import { Scene } from '@babylonjs/core/scene';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial';
import { Effect } from '@babylonjs/core/Materials/effect';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import '@babylonjs/core/Meshes/Builders/sphereBuilder';

const SKY_VERTEX = `
precision highp float;
attribute vec3 position;
uniform mat4 worldViewProjection;
varying vec3 vPosition;
void main() {
  vPosition = position;
  gl_Position = worldViewProjection * vec4(position, 1.0);
}
`;

const SKY_FRAGMENT = `
precision highp float;
varying vec3 vPosition;
uniform float time;
uniform vec3 sunDirection;

// Simple hash for cloud noise
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec3 dir = normalize(vPosition);
  float y = dir.y;

  // Sky gradient: deep blue zenith to warm horizon
  vec3 zenith = vec3(0.15, 0.25, 0.55);
  vec3 horizon = vec3(0.55, 0.45, 0.38);
  vec3 nadir = vec3(0.08, 0.06, 0.12);

  vec3 skyColor;
  if (y > 0.0) {
    float t = pow(y, 0.5);
    skyColor = mix(horizon, zenith, t);
  } else {
    skyColor = mix(horizon, nadir, min(1.0, -y * 3.0));
  }

  // Sun disk
  float sunDot = dot(dir, normalize(sunDirection));
  float sunDisk = smoothstep(0.9995, 0.9999, sunDot);
  vec3 sunColor = vec3(1.0, 0.95, 0.8);
  skyColor += sunColor * sunDisk * 2.0;

  // Sun glow/halo
  float sunGlow = pow(max(0.0, sunDot), 64.0);
  skyColor += vec3(1.0, 0.7, 0.3) * sunGlow * 0.5;

  // Wider sun scatter near horizon
  float horizonGlow = pow(max(0.0, sunDot), 8.0) * smoothstep(0.0, 0.15, y) * (1.0 - smoothstep(0.15, 0.5, y));
  skyColor += vec3(0.8, 0.4, 0.15) * horizonGlow * 0.4;

  // Clouds
  float cloudY = smoothstep(0.05, 0.6, y);
  vec2 cloudUV = dir.xz / (y + 0.1) * 0.3;
  float cloudDensity = fbm(cloudUV + time * 0.003);
  float cloudMask = smoothstep(0.4, 0.7, cloudDensity) * cloudY;

  vec3 cloudLit = mix(vec3(0.5, 0.5, 0.55), vec3(0.95, 0.92, 0.88), max(0.0, dot(normalize(sunDirection), vec3(0.0, 1.0, 0.0)) + 0.3));
  skyColor = mix(skyColor, cloudLit, cloudMask * 0.7);

  // Subtle stars in dark sky areas (fantasy touch)
  float starField = step(0.998, hash(floor(dir.xz * 200.0)));
  float starBright = starField * smoothstep(0.3, 0.8, y) * (1.0 - cloudMask);
  skyColor += vec3(0.8, 0.85, 1.0) * starBright * 0.3;

  gl_FragColor = vec4(skyColor, 1.0);
}
`;

Effect.ShadersStore['dracorSkyVertexShader'] = SKY_VERTEX;
Effect.ShadersStore['dracorSkyFragmentShader'] = SKY_FRAGMENT;

export function createSky(scene: Scene): Mesh {
  const skyDome = MeshBuilder.CreateSphere('skyDome', {
    diameter: 2000,
    segments: 24,
  }, scene);

  skyDome.infiniteDistance = true;
  skyDome.isPickable = false;
  skyDome.renderingGroupId = 0;

  const mat = new ShaderMaterial('skyMat', scene, {
    vertex: 'dracorSky',
    fragment: 'dracorSky',
  }, {
    attributes: ['position'],
    uniforms: ['worldViewProjection', 'time', 'sunDirection'],
    needAlphaBlending: false,
  });

  mat.backFaceCulling = false;

  mat.setVector3('sunDirection', { x: -0.4, y: 0.7, z: 0.3 } as any);
  mat.setFloat('time', 0);

  scene.onBeforeRenderObservable.add(() => {
    mat.setFloat('time', performance.now() * 0.001);
  });

  skyDome.material = mat;
  return skyDome;
}
