import { Scene } from '@babylonjs/core/scene';
import { Effect } from '@babylonjs/core/Materials/effect';
import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { Vector2, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { getOrCreateWindState } from '../world/windShader';

const VERTEX = `
precision highp float;

attribute vec3 position;
attribute vec3 normal;
attribute vec4 color;
attribute vec2 uv;

uniform mat4 world;
uniform mat4 worldViewProjection;
uniform mat4 view;
uniform vec3 cameraPosition;

varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying vec4 vColor;
varying float vSlope;
varying vec3 vViewDir;

void main() {
  vec4 wp = world * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  vWorldNormal = normalize((world * vec4(normal, 0.0)).xyz);
  vColor = color;
  vSlope = 1.0 - abs(vWorldNormal.y);
  vViewDir = normalize(cameraPosition - wp.xyz);
  gl_Position = worldViewProjection * vec4(position, 1.0);
}
`;

const FRAGMENT = `
precision highp float;

uniform sampler2D grassTex;
uniform sampler2D grassNorm;
uniform sampler2D grassARM;
uniform sampler2D rockTex;
uniform sampler2D rockNorm;
uniform sampler2D rockARM;
uniform sampler2D dirtTex;
uniform sampler2D dirtNorm;
uniform sampler2D dirtARM;
uniform sampler2D forestTex;
uniform sampler2D forestNorm;
uniform sampler2D forestARM;
uniform vec2 texScale;
uniform vec3 sunDir;
uniform vec3 sunColor;
uniform vec3 ambientColor;
uniform float time;

varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying vec4 vColor;
varying float vSlope;
varying vec3 vViewDir;

float hash2D(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash2D(i), hash2D(i + vec2(1.0, 0.0)), f.x),
    mix(hash2D(i + vec2(0.0, 1.0)), hash2D(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}

vec4 triplanar(sampler2D tex, vec3 wp, vec3 n, float scale) {
  vec3 blend = abs(n);
  blend = pow(blend, vec3(4.0));
  blend /= (blend.x + blend.y + blend.z);
  vec4 cx = texture2D(tex, wp.yz * scale);
  vec4 cy = texture2D(tex, wp.xz * scale);
  vec4 cz = texture2D(tex, wp.xy * scale);
  return cx * blend.x + cy * blend.y + cz * blend.z;
}

vec3 triplanarNorm(sampler2D tex, vec3 wp, vec3 n, float scale) {
  vec3 blend = abs(n);
  blend = pow(blend, vec3(4.0));
  blend /= (blend.x + blend.y + blend.z);
  vec3 nx = texture2D(tex, wp.yz * scale).xyz * 2.0 - 1.0;
  vec3 ny = texture2D(tex, wp.xz * scale).xyz * 2.0 - 1.0;
  vec3 nz = texture2D(tex, wp.xy * scale).xyz * 2.0 - 1.0;
  return normalize(nx * blend.x + ny * blend.y + nz * blend.z);
}

// Cook-Torrance BRDF helpers
float D_GGX(float NdotH, float roughness) {
  float a = roughness * roughness;
  float a2 = a * a;
  float d = NdotH * NdotH * (a2 - 1.0) + 1.0;
  return a2 / (3.14159265 * d * d + 0.0001);
}

float G_Smith(float NdotV, float NdotL, float roughness) {
  float r = roughness + 1.0;
  float k = r * r / 8.0;
  float ggx1 = NdotV / (NdotV * (1.0 - k) + k);
  float ggx2 = NdotL / (NdotL * (1.0 - k) + k);
  return ggx1 * ggx2;
}

vec3 F_Schlick(float cosTheta, vec3 F0) {
  return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
}

void main() {
  float scale = texScale.x;
  float detailScale = texScale.y;
  vec3 n = normalize(vWorldNormal);

  // Slope-based blending
  float slopeAngle = acos(clamp(abs(n.y), 0.0, 1.0)) * 57.2958;
  float grassW = smoothstep(15.0, 5.0, slopeAngle);
  float rockW = smoothstep(20.0, 35.0, slopeAngle);
  float dirtW = 1.0 - grassW - rockW;
  dirtW = max(dirtW, 0.0);

  // Albedo
  vec4 grassC = triplanar(grassTex, vWorldPos, n, scale);
  vec4 rockC = triplanar(rockTex, vWorldPos, n, scale);
  vec4 dirtC = triplanar(dirtTex, vWorldPos, n, scale);
  vec4 detailC = triplanar(forestTex, vWorldPos, n, detailScale);

  // ARM = .r ambient occlusion, .g roughness, .b metallic
  vec4 grassARMC = triplanar(grassARM, vWorldPos, n, scale);
  vec4 rockARMC = triplanar(rockARM, vWorldPos, n, scale);
  vec4 dirtARMC = triplanar(dirtARM, vWorldPos, n, scale);
  vec4 detailARMC = triplanar(forestARM, vWorldPos, n, detailScale);

  // Tiling break
  float tilingBreak = valueNoise(vWorldPos.xz * 0.01) * 0.3 + 0.85;
  float microVariation = valueNoise(vWorldPos.xz * 0.05) * 0.15 + 0.92;
  grassC.rgb *= tilingBreak * microVariation;
  rockC.rgb *= (tilingBreak * 0.7 + 0.3) * microVariation;
  dirtC.rgb *= tilingBreak * (microVariation * 0.8 + 0.2);

  // Blend by slope
  vec4 baseColor = grassC * grassW + dirtC * dirtW + rockC * rockW;
  vec4 baseARM = grassARMC * grassW + dirtARMC * dirtW + rockARMC * rockW;

  // Detail overlay
  baseColor = mix(baseColor, baseColor * detailC * 2.0, 0.25);
  baseARM = mix(baseARM, baseARM * detailARMC, 0.25);

  baseColor.rgb *= vColor.rgb * 2.5;

  // Snow
  float snowLine = smoothstep(160.0, 220.0, vWorldPos.y);
  float snowNoise = triplanar(grassTex, vWorldPos, n, scale * 3.0).r;
  float snowMask = snowLine * smoothstep(0.3, 0.8, abs(n.y)) * (0.7 + snowNoise * 0.3);
  vec3 snowColor = vec3(0.92, 0.94, 0.98);
  baseColor.rgb = mix(baseColor.rgb, snowColor, snowMask);
  baseARM.g = mix(baseARM.g, 0.45, snowMask); // snow is rougher
  baseARM.b = mix(baseARM.b, 0.0, snowMask);

  // Lava glow
  float lavaDepth = smoothstep(-10.0, -40.0, vWorldPos.y);
  float lavaPattern = triplanar(rockTex, vWorldPos, n, scale * 0.5).r;
  float lavaMask = lavaDepth * step(0.3, lavaPattern);
  vec3 lavaColor = mix(vec3(0.8, 0.2, 0.0), vec3(1.0, 0.6, 0.0), lavaPattern);
  baseColor.rgb = mix(baseColor.rgb, lavaColor, lavaMask * 0.8);

  // Sand
  float sandIndicator = smoothstep(0.45, 0.65, vColor.r) * smoothstep(0.2, 0.0, vColor.b);
  float sandFlat = smoothstep(10.0, 3.0, slopeAngle);
  vec3 sandColor = vec3(0.78, 0.68, 0.45);
  baseColor.rgb = mix(baseColor.rgb, sandColor * triplanar(dirtTex, vWorldPos, n, scale * 1.5).rgb * 1.8, sandIndicator * sandFlat * 0.6);

  float heightFactor = smoothstep(-20.0, 100.0, vWorldPos.y);
  float valleyDarken = smoothstep(5.0, -15.0, vWorldPos.y) * 0.3;
  baseColor.rgb *= (0.85 + heightFactor * 0.15);
  baseColor.rgb *= (1.0 - valleyDarken);

  // Normal mapping
  vec3 grassN = triplanarNorm(grassNorm, vWorldPos, n, scale);
  vec3 rockN = triplanarNorm(rockNorm, vWorldPos, n, scale);
  vec3 dirtN = triplanarNorm(dirtNorm, vWorldPos, n, scale);
  vec3 detailN = triplanarNorm(forestNorm, vWorldPos, n, detailScale);
  vec3 blendedNormal = normalize(grassN * grassW + dirtN * dirtW + rockN * rockW);
  blendedNormal = normalize(mix(n, blendedNormal, 0.7));
  blendedNormal = normalize(mix(blendedNormal, detailN, 0.15));

  // PBR lighting (Cook-Torrance)
  float ao = baseARM.r;
  float roughness = clamp(baseARM.g, 0.04, 1.0);
  float metallic = baseARM.b;

  vec3 N = blendedNormal;
  vec3 V = normalize(vViewDir);
  vec3 L = normalize(-sunDir);
  vec3 H = normalize(V + L);

  float NdotL = max(dot(N, L), 0.0);
  float NdotV = max(dot(N, V), 0.001);
  float NdotH = max(dot(N, H), 0.0);
  float VdotH = max(dot(V, H), 0.0);

  vec3 F0 = mix(vec3(0.04), baseColor.rgb, metallic);
  vec3 F = F_Schlick(VdotH, F0);
  float D = D_GGX(NdotH, roughness);
  float G = G_Smith(NdotV, NdotL, roughness);

  vec3 specular = (D * G * F) / (4.0 * NdotV * NdotL + 0.0001);
  vec3 kd = (vec3(1.0) - F) * (1.0 - metallic);
  vec3 diffuse = kd * baseColor.rgb / 3.14159265;

  // Cloud shadows — slow-scrolling fbm projected onto ground plane
  vec2 cloudUV = vWorldPos.xz * 0.0018 + vec2(time * 0.004, time * 0.002);
  float cloud = valueNoise(cloudUV);
  cloud = mix(cloud, valueNoise(cloudUV * 2.1 + 5.0), 0.5);
  cloud = smoothstep(0.35, 0.85, cloud);
  float cloudShadow = 1.0 - cloud * 0.28; // 72–100% sunlight under clouds

  vec3 direct = (diffuse + specular) * sunColor * NdotL * cloudShadow;

  // Hemispheric ambient with sky/ground tint
  vec3 skyAmbient = mix(vec3(0.18, 0.22, 0.32), vec3(0.38, 0.34, 0.28), max(0.0, N.y));
  vec3 ambient = ambientColor * skyAmbient * baseColor.rgb * ao;

  // Subtle backlight (atmospheric scatter)
  float back = max(0.0, dot(N, normalize(-sunDir + vec3(0.0, 0.5, 0.0)))) * 0.08;
  vec3 lit = direct + ambient + baseColor.rgb * back * sunColor;

  // Distance fog
  float dist = length(vWorldPos);
  float fog = smoothstep(400.0, 900.0, dist);
  vec3 fogColor = vec3(0.14, 0.16, 0.22);
  lit = mix(lit, fogColor, fog);

  float haze = smoothstep(600.0, 900.0, dist);
  lit = mix(lit, vec3(0.18, 0.22, 0.32), haze * 0.3);

  gl_FragColor = vec4(lit, 1.0);
}
`;

Effect.ShadersStore['terrainRealisticVertexShader'] = VERTEX;
Effect.ShadersStore['terrainRealisticFragmentShader'] = FRAGMENT;

export function createTerrainPBRMaterial(scene: Scene): ShaderMaterial {
  const mat = new ShaderMaterial('terrainRealistic', scene, {
    vertex: 'terrainRealistic',
    fragment: 'terrainRealistic',
  }, {
    attributes: ['position', 'normal', 'color', 'uv'],
    uniforms: ['world', 'worldViewProjection', 'view', 'cameraPosition', 'texScale', 'sunDir', 'sunColor', 'ambientColor', 'time'],
    samplers: [
      'grassTex', 'grassNorm', 'grassARM',
      'rockTex', 'rockNorm', 'rockARM',
      'dirtTex', 'dirtNorm', 'dirtARM',
      'forestTex', 'forestNorm', 'forestARM',
    ],
  });

  mat.backFaceCulling = true;

  const load = (path: string) => {
    const t = new Texture(path, scene);
    t.wrapU = Texture.WRAP_ADDRESSMODE;
    t.wrapV = Texture.WRAP_ADDRESSMODE;
    return t;
  };

  mat.setTexture('grassTex', load('/textures/terrain/grass_albedo.webp'));
  mat.setTexture('grassNorm', load('/textures/terrain/grass_normal.webp'));
  mat.setTexture('grassARM', load('/textures/terrain/grass_arm.webp'));
  mat.setTexture('rockTex', load('/textures/terrain/rock_albedo.webp'));
  mat.setTexture('rockNorm', load('/textures/terrain/rock_normal.webp'));
  mat.setTexture('rockARM', load('/textures/terrain/rock_arm.webp'));
  mat.setTexture('dirtTex', load('/textures/terrain/dirt_albedo.webp'));
  mat.setTexture('dirtNorm', load('/textures/terrain/dirt_normal.webp'));
  mat.setTexture('dirtARM', load('/textures/terrain/dirt_arm.webp'));
  mat.setTexture('forestTex', load('/textures/terrain/forest_floor_albedo.webp'));
  mat.setTexture('forestNorm', load('/textures/terrain/forest_floor_normal.webp'));
  mat.setTexture('forestARM', load('/textures/terrain/forest_floor_arm.webp'));

  mat.setVector2('texScale', new Vector2(0.08, 0.2));
  mat.setVector3('sunDir', new Vector3(-0.5, -1.0, -0.3));
  mat.setVector3('sunColor', new Vector3(1.0, 0.9, 0.75));
  mat.setVector3('ambientColor', new Vector3(0.5, 0.55, 0.65));
  mat.setFloat('time', 0);

  scene.onBeforeRenderObservable.add(() => {
    // Share the wind clock so cloud shadows on terrain and foliage stay in sync
    mat.setFloat('time', getOrCreateWindState().time);
    const cam = scene.activeCamera;
    if (cam) mat.setVector3('cameraPosition', cam.position);

    const sun = scene.getLightByName('sun') as any;
    if (sun?.direction) {
      mat.setVector3('sunDir', sun.direction);
      if (sun.diffuse) mat.setVector3('sunColor', new Vector3(sun.diffuse.r, sun.diffuse.g, sun.diffuse.b));
    }
    const ambient = scene.getLightByName('ambient') as any;
    if (ambient?.diffuse) {
      mat.setVector3('ambientColor', new Vector3(ambient.diffuse.r, ambient.diffuse.g, ambient.diffuse.b));
    }
  });

  return mat;
}
