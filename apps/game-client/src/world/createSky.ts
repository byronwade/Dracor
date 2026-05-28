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
    p *= 2.1;
    a *= 0.48;
  }
  return v;
}

void main() {
  vec3 dir = normalize(vPosition);
  vec3 sun = normalize(sunDirection);
  float y = dir.y;
  float sunDot = dot(dir, sun);

  // Rayleigh scattering approximation
  // Scatter more blue light at perpendicular angles to sun
  float rayleighPhase = 0.75 * (1.0 + sunDot * sunDot);
  vec3 rayleighColor = vec3(0.15, 0.35, 0.65) * rayleighPhase;

  // Mie scattering — forward scatter (sun glow)
  float miePhase = pow(max(0.0, sunDot), 8.0) * 0.35;
  vec3 mieColor = vec3(1.0, 0.85, 0.6) * miePhase;

  // Sky gradient with scattering
  float heightGradient = pow(max(0.0, y), 0.4);
  vec3 zenithColor = vec3(0.08, 0.18, 0.5);
  vec3 horizonColor = vec3(0.5, 0.42, 0.35);

  // Sunset/sunrise: warm the horizon when sun is low
  float sunHeight = sun.y;
  float sunsetFactor = smoothstep(0.0, 0.3, sunHeight);
  horizonColor = mix(vec3(0.7, 0.35, 0.15), horizonColor, sunsetFactor);
  zenithColor = mix(vec3(0.15, 0.1, 0.35), zenithColor, sunsetFactor * 0.7 + 0.3);

  vec3 skyColor;
  if (y > 0.0) {
    skyColor = mix(horizonColor, zenithColor, heightGradient);
    skyColor += rayleighColor * (1.0 - heightGradient) * 0.3;
    skyColor += mieColor;
  } else {
    vec3 nadir = vec3(0.04, 0.03, 0.08);
    skyColor = mix(horizonColor, nadir, min(1.0, -y * 4.0));
  }

  // Sun disk with soft edge
  float sunAngle = acos(clamp(sunDot, -1.0, 1.0));
  float sunRadius = 0.015;
  float sunEdge = smoothstep(sunRadius, sunRadius * 0.6, sunAngle);
  vec3 sunDiskColor = vec3(1.0, 0.95, 0.85) * 3.0;
  skyColor += sunDiskColor * sunEdge;

  // Sun corona
  float corona = exp(-sunAngle * 15.0) * 0.6;
  skyColor += vec3(1.0, 0.8, 0.5) * corona;

  // Horizon glow from sun
  float horizonSunGlow = pow(max(0.0, sunDot), 4.0) * smoothstep(-0.02, 0.15, y) * (1.0 - smoothstep(0.15, 0.5, y));
  skyColor += vec3(0.6, 0.35, 0.12) * horizonSunGlow * 0.5;

  // Clouds with lighting
  if (y > 0.02) {
    float cloudY = smoothstep(0.02, 0.5, y);
    vec2 cloudUV = dir.xz / (y + 0.05) * 0.25;
    float cloud1 = fbm(cloudUV + time * 0.002);
    float cloud2 = fbm(cloudUV * 1.8 + vec2(time * 0.003, -time * 0.001));
    float cloudDensity = (cloud1 * 0.6 + cloud2 * 0.4);
    float cloudMask = smoothstep(0.42, 0.72, cloudDensity) * cloudY;

    // Light clouds from sun direction
    float cloudLighting = max(0.3, dot(sun, vec3(0.0, 1.0, 0.0)) + 0.5);
    vec3 cloudBright = vec3(0.95, 0.92, 0.88) * cloudLighting;
    vec3 cloudDark = vec3(0.35, 0.35, 0.4);
    vec3 cloudColor = mix(cloudDark, cloudBright, smoothstep(0.42, 0.62, cloudDensity));

    // Cloud edge glow when between viewer and sun
    float cloudSunGlow = pow(max(0.0, sunDot), 3.0) * 0.2;
    cloudColor += vec3(1.0, 0.7, 0.4) * cloudSunGlow * cloudMask;

    skyColor = mix(skyColor, cloudColor, cloudMask * 0.75);
  }

  // Stars (visible in dark areas away from sun)
  float starField = step(0.997, hash(floor(dir.xz * 250.0)));
  float starTwinkle = 0.5 + 0.5 * sin(time * 2.0 + hash(floor(dir.xz * 250.0)) * 6.28);
  float starBright = starField * smoothstep(0.35, 0.8, y) * (1.0 - smoothstep(-0.1, 0.3, sunHeight));
  skyColor += vec3(0.85, 0.9, 1.0) * starBright * starTwinkle * 0.25;

  // Final tone — slight warm tint
  skyColor = pow(skyColor, vec3(0.95));

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
