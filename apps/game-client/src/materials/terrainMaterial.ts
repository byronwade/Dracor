import { Scene } from '@babylonjs/core/scene';
import { Effect } from '@babylonjs/core/Materials/effect';
import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { Vector2 } from '@babylonjs/core/Maths/math.vector';

const VERTEX = `
precision highp float;

attribute vec3 position;
attribute vec3 normal;
attribute vec4 color;
attribute vec2 uv;

uniform mat4 world;
uniform mat4 worldViewProjection;
uniform mat4 view;

varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying vec4 vColor;
varying float vSlope;

void main() {
  vec4 wp = world * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  vWorldNormal = normalize((world * vec4(normal, 0.0)).xyz);
  vColor = color;
  vSlope = 1.0 - abs(vWorldNormal.y);
  gl_Position = worldViewProjection * vec4(position, 1.0);
}
`;

const FRAGMENT = `
precision highp float;

uniform sampler2D grassTex;
uniform sampler2D grassNorm;
uniform sampler2D rockTex;
uniform sampler2D rockNorm;
uniform sampler2D dirtTex;
uniform sampler2D dirtNorm;
uniform sampler2D forestTex;
uniform sampler2D forestNorm;
uniform vec2 texScale;
uniform vec3 sunDir;
uniform float time;

varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying vec4 vColor;
varying float vSlope;

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

void main() {
  float scale = texScale.x;
  float detailScale = texScale.y;
  vec3 n = normalize(vWorldNormal);

  // Slope-based blending: flat=grass, medium=forest/dirt, steep=rock
  float slopeAngle = acos(clamp(abs(n.y), 0.0, 1.0)) * 57.2958;
  float grassW = smoothstep(15.0, 5.0, slopeAngle);
  float rockW = smoothstep(20.0, 35.0, slopeAngle);
  float dirtW = 1.0 - grassW - rockW;
  dirtW = max(dirtW, 0.0);

  // Main textures (triplanar projected)
  vec4 grassC = triplanar(grassTex, vWorldPos, n, scale);
  vec4 rockC = triplanar(rockTex, vWorldPos, n, scale);
  vec4 dirtC = triplanar(dirtTex, vWorldPos, n, scale);

  // Detail layer at close range (forest floor)
  vec4 detailC = triplanar(forestTex, vWorldPos, n, detailScale);

  // Blend by slope
  vec4 baseColor = grassC * grassW + dirtC * dirtW + rockC * rockW;

  // Mix detail texture (subtle overlay)
  baseColor = mix(baseColor, baseColor * detailC * 2.0, 0.25);

  // Apply biome vertex color tint
  baseColor.rgb *= vColor.rgb * 2.5;

  // Normal mapping
  vec3 grassN = triplanarNorm(grassNorm, vWorldPos, n, scale);
  vec3 rockN = triplanarNorm(rockNorm, vWorldPos, n, scale);
  vec3 dirtN = triplanarNorm(dirtNorm, vWorldPos, n, scale);
  vec3 detailN = triplanarNorm(forestNorm, vWorldPos, n, detailScale);
  vec3 blendedNormal = normalize(
    grassN * grassW + dirtN * dirtW + rockN * rockW
  );
  blendedNormal = normalize(mix(n, blendedNormal, 0.7));

  // Simple directional lighting
  float NdotL = max(dot(blendedNormal, normalize(sunDir)), 0.0);
  float ambient = 0.35;
  float diffuse = NdotL * 0.65;
  vec3 lit = baseColor.rgb * (ambient + diffuse);

  // Subtle distance fog
  float dist = length(vWorldPos);
  float fog = smoothstep(400.0, 900.0, dist);
  vec3 fogColor = vec3(0.14, 0.16, 0.22);
  lit = mix(lit, fogColor, fog);

  // Atmospheric blue shift at extreme distance
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
    uniforms: ['world', 'worldViewProjection', 'view', 'texScale', 'sunDir', 'time'],
    samplers: [
      'grassTex', 'grassNorm',
      'rockTex', 'rockNorm',
      'dirtTex', 'dirtNorm',
      'forestTex', 'forestNorm',
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
  mat.setTexture('rockTex', load('/textures/terrain/rock_albedo.webp'));
  mat.setTexture('rockNorm', load('/textures/terrain/rock_normal.webp'));
  mat.setTexture('dirtTex', load('/textures/terrain/dirt_albedo.webp'));
  mat.setTexture('dirtNorm', load('/textures/terrain/dirt_normal.webp'));
  mat.setTexture('forestTex', load('/textures/terrain/forest_floor_albedo.webp'));
  mat.setTexture('forestNorm', load('/textures/terrain/forest_floor_normal.webp'));

  mat.setVector2('texScale', new Vector2(0.08, 0.2));
  mat.setVector3('sunDir', { x: -0.5, y: 1.0, z: 0.3 } as any);
  mat.setFloat('time', 0);

  scene.onBeforeRenderObservable.add(() => {
    mat.setFloat('time', performance.now() * 0.001);
  });

  return mat;
}
