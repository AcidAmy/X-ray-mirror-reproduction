// One shader for everything. uMode picks the look:
//   0  x-ray   additive glow, strongest where the surface turns away from the viewer
//   1  solid   lit, opaque, depth-tested
//   2  veil    flat dark skin-shaped layer that hides the real face behind the anatomy
import * as THREE from "three";

export const VERT = `
uniform mat4 uToHead; uniform mat4 uJawM; uniform float uOrtho;
attribute float aJaw;                                  // 0 = fixed to the skull, 1 = rides on the lower jaw (see anatomy/jaw.js)
varying vec3 vN; varying vec3 vV; varying vec3 vL;
void main() {
  // blend each vertex between where it sits on the skull and where the swinging jaw would carry it
  vec3 p = mix(position, (uJawM * vec4(position, 1.0)).xyz, aJaw);
  vec3 nrm = normalize(mix(normal, mat3(uJawM) * normal, aJaw));
  vL = (uToHead * vec4(p, 1.0)).xyz;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vN = normalize(normalMatrix * nrm);
  vV = uOrtho > 0.5 ? vec3(0.0, 0.0, 1.0) : normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;

export const FRAG = `
uniform vec3 uColor; uniform vec3 uSolidColor;
uniform float uOpacity, uGain, uMode, uClipOn, uFade, uFeather, uCutSoft; uniform vec4 uClip;
varying vec3 vN; varying vec3 vV; varying vec3 vL;
void main() {
  float soft = 1.0;                                    // edge feather: 1 = fully drawn, 0 = faded out
  if (uClipOn > 0.5) {
    float dcut = dot(uClip.xyz, vL) - uClip.w;         // distance (cm) inside the cut
    if (dcut < 0.0) discard;
    if (uCutSoft > 0.001) soft *= smoothstep(0.0, uCutSoft, dcut);
  }
  vec3 n = normalize(vN);
  float ndv = abs(dot(n, normalize(vV)));
  if (uFeather > 0.001) soft *= smoothstep(0.0, uFeather, ndv);   // surfaces turning away at the outline fade out
  float fade = uFade > 0.5 ? smoothstep(-12.4, -9.2, vL.y) : 1.0;   // the neck fades out instead of ending in a hard edge
  if (uMode > 1.5) {                                   // flat veil that hides the real face
    gl_FragColor = vec4(uColor, uOpacity * fade * soft);
  } else if (uMode > 0.5) {                            // solid, lit
    vec3 fn = gl_FrontFacing ? n : -n;
    float d = max(dot(fn, normalize(vec3(0.35, 0.55, 0.76))), 0.0);
    float rim = pow(1.0 - ndv, 2.5);
    gl_FragColor = vec4(uSolidColor * (0.28 + 0.78 * d) * uGain + vec3(0.25) * rim, uOpacity * soft);
  } else {                                             // x-ray: edges glow, flat areas stay see-through
    float rim = pow(1.0 - ndv, 2.1);
    float a = clamp((0.035 + 0.95 * rim) * uGain * uOpacity * fade, 0.0, 1.0);
    gl_FragColor = vec4(uColor, a * soft);
  }
}`;

export function makeMat(xray, solid, mode) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(xray) }, uSolidColor: { value: new THREE.Color(solid) },
                uOpacity: { value: 1 }, uGain: { value: 1 }, uMode: { value: mode || 0 }, uOrtho: { value: 0 }, uFade: { value: 0 }, uFeather: { value: 0 }, uCutSoft: { value: 0 },
                uClipOn: { value: 0 }, uClip: { value: new THREE.Vector4(1, 0, 0, 0) }, uToHead: { value: new THREE.Matrix4() },
                uJawM: { value: new THREE.Matrix4() } },
    vertexShader: VERT, fragmentShader: FRAG, side: THREE.DoubleSide, transparent: true,
    depthTest: false, depthWrite: false, blending: mode === 2 ? THREE.NormalBlending : THREE.AdditiveBlending
  });
}
