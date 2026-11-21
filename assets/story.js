// Projust: one dotted character tells the whole page.
// A single fixed WebGL canvas holds ~34k dots. As you scroll, the same dots
// morph between seven shapes, each pinned to its section's live position:
//   0 hero    the student (head scan, bust, graduation cap), looking up
//   1 story   the student looking down, an orange "?" above
//   2 how     a concept constellation around the app window
//   3 scores  the six-skill radar web
//   4 proof   a certificate seal around the paper (light dots on the dark band)
//   5 people  drifting dust
//   6 close   the student again, facing forward
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const N = innerWidth < 900 ? 16000 : 36000;
const T = 7;
const $ = s => document.querySelector(s);
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/* ================= shaders ================= */
const VS = /* glsl */`
  attribute vec3 aP1; attribute vec3 aP2; attribute vec3 aP3; attribute vec3 aP4; attribute vec3 aP5; attribute vec3 aP6;
  attribute vec4 aKA; attribute vec3 aKB; attribute float aRand;
  uniform vec3 uA[7]; uniform float uS[7]; uniform float uAl[7]; uniform float uSz[7];
  uniform mat3 uRot0;
  uniform float uM, uTime, uIntro, uPix, uDark, uScanY, uScanOn, uMouseOn, uMouseR, uDrift, uSplit, uSplitW;
  uniform vec2 uMouse;
  varying vec4 vC;

  vec3 lp(int i){
    if (i == 0) return uRot0 * position;
    if (i == 1) return aP1; if (i == 2) return aP2; if (i == 3) return aP3;
    if (i == 4) return aP4; if (i == 5) return aP5; return aP6;
  }
  vec3 wp(int i){ return lp(i) * uS[i] + uA[i]; }
  float rawOf(int i){ if (i < 4) return i == 0 ? aKA.x : i == 1 ? aKA.y : i == 2 ? aKA.z : aKA.w; return i == 4 ? aKB.x : i == 5 ? aKB.y : aKB.z; }
  float kindOf(int i){ return floor(rawOf(i) * 0.5); }
  float shadeOf(int i){ float r = rawOf(i); return r - floor(r * 0.5) * 2.0; }
  vec3 pal(float k, vec3 ink){
    if (k < 0.5) return ink;
    if (k < 1.5) return vec3(1.0, 0.478, 0.239);   // orange
    if (k < 2.5) return vec3(0.37, 0.66, 0.19);    // green
    if (k < 3.5) return vec3(0.36, 0.62, 0.94);    // blue
    return vec3(0.80, 0.92, 0.35);                 // lime
  }
  float hash(float n){ return fract(sin(n) * 43758.5453); }

  void main(){
    float m = clamp(uM, 0.0, 6.0);
    float fi = floor(m); int i = int(fi); int j = i < 6 ? i + 1 : 6;
    float k = clamp((m - fi) * 1.7 - aRand * 0.7, 0.0, 1.0); k = k * k * (3.0 - 2.0 * k);
    vec3 a = wp(i), b = wp(j);
    vec3 swirl = vec3(sin(aRand * 31.0 + uTime * 0.3), cos(aRand * 17.0 - uTime * 0.2), sin(aRand * 7.0));
    vec3 mid = (a + b) * 0.5 + swirl * length(a - b) * 0.22;
    vec3 p = mix(mix(a, mid, k), mix(mid, b, k), k);

    // first load: dots fall in from a wide cloud, face first
    vec3 sc = normalize(vec3(sin(aRand * 91.7), cos(aRand * 53.1), sin(aRand * 12.9 + 1.0))) * (6.0 + aRand * 5.0) + uA[0];
    float ik = clamp(uIntro * 1.6 - aRand * 0.6, 0.0, 1.0); ik = 1.0 - pow(1.0 - ik, 3.0);
    p = mix(sc, p, ik);

    // hero split: left of the line is the vibe-coder. Their dots go grey and a
    // share of them leak out and fall away; nothing they "learned" stays put.
    float hero = 1.0 - clamp(m * 2.0, 0.0, 1.0);
    float side = smoothstep(uSplit - uSplitW, uSplit + uSplitW, p.x);
    float vibe = (1.0 - side) * hero * ik;
    float leak = step(0.42, fract(aRand * 13.7));
    float lt = fract(uTime * 0.08 + aRand * 5.3);
    p.y -= vibe * leak * lt * lt * 2.4 * uS[0];
    p.x -= vibe * leak * lt * 0.22 * uS[0];

    float dust = 1.0 - clamp(abs(m - 5.0), 0.0, 1.0);
    p.xy += vec2(sin(uTime * 0.6 + aRand * 60.0), cos(uTime * 0.5 + aRand * 45.0)) * uDrift * (1.0 + dust * 14.0);

    vec2 dm = p.xy - uMouse; float dl = length(dm);
    p.xy += normalize(dm + 1e-5) * smoothstep(uMouseR, 0.0, dl) * uMouseR * 0.45 * uMouseOn;

    float lit = mix(1.0, side, hero);   // scan + twinkles only on the learner's side
    float scan = smoothstep(0.06, 0.0, abs(lp(0).y - uScanY)) * uScanOn * hero * lit;
    float tw = step(0.997, hash(aRand * 917.3 + floor(uTime * 2.5 + aRand * 9.0))) * hero * ik * lit;

    vec3 ink = mix(vec3(0.075, 0.075, 0.07), vec3(0.95, 0.93, 0.88), uDark);
    float kind = k < 0.5 ? kindOf(i) : kindOf(j);
    vec3 col = pal(kind, ink);
    col = mix(col, vec3(0.37, 0.66, 0.19), scan);
    col = mix(col, vec3(1.0, 0.478, 0.239), tw);
    float al = mix(uAl[i] * shadeOf(i), uAl[j] * shadeOf(j), k);
    col = mix(col, vec3(0.6, 0.58, 0.54), vibe * 0.85);
    al *= 1.0 - vibe * (0.45 + 0.5 * leak * lt);
    al = clamp(al + scan * 0.6 + tw * 0.9, 0.0, 1.0) * (0.15 + 0.85 * ik);
    vC = vec4(col, al);

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = mix(uSz[i], uSz[j], k) * uPix * (0.65 + aRand * 0.7) * (1.0 + scan * 0.8 + tw * 1.6);
    gl_Position = projectionMatrix * mv;
  }`;
const FS = /* glsl */`
  varying vec4 vC;
  void main(){
    float d = length(gl_PointCoord - 0.5); if (d > 0.5 || vC.a < 0.01) discard;
    gl_FragColor = vec4(vC.rgb, vC.a * smoothstep(0.5, 0.22, d));
  }`;
const STREAM_VS = /* glsl */`
  attribute vec3 aFrom; attribute vec3 aTo; attribute float aOff; attribute vec3 aCol;
  uniform vec3 uA0; uniform float uS0; uniform mat3 uRot0; uniform float uTime, uOn, uPix;
  varying float vA; varying vec3 vCl;
  void main(){
    float t = fract(uTime * 0.11 + aOff);
    vec3 f = uRot0 * aFrom, to = uRot0 * aTo;
    vec3 mid = mix(f, to, 0.5) + vec3(0.0, 0.35, 0.6);
    vec3 p = mix(mix(f, mid, t), mix(mid, to, t), t) * uS0 + uA0;
    vA = sin(t * 3.14159) * uOn; vCl = aCol;
    gl_PointSize = uPix * (3.4 - t * 2.0);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }`;
const STREAM_FS = /* glsl */`
  varying float vA; varying vec3 vCl;
  void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; gl_FragColor = vec4(vCl, vA * exp(-d * d * 14.0)); }`;

/* ================= the head scan, weighted toward detail ================= */
async function loadHead() {
  const gltf = await new GLTFLoader().loadAsync('assets/models/head.glb');
  let mesh; gltf.scene.traverse(o => { if (o.isMesh && !mesh) mesh = o; });
  let g = mesh.geometry.clone();
  for (const k of Object.keys(g.attributes)) if (k !== 'position') g.deleteAttribute(k);
  g = mergeVertices(g, 1e-4);
  g.computeBoundingBox();
  const size = new THREE.Vector3(), c = new THREE.Vector3();
  g.boundingBox.getSize(size); g.boundingBox.getCenter(c);
  g.translate(-c.x, -c.y, -c.z); const s = 2 / size.y; g.scale(s, s, s);
  g.computeVertexNormals();
  { // make sure normals point outward (the scan's winding can flip them)
    const P = g.attributes.position.array, Nn = g.attributes.normal.array; let d = 0;
    for (let i = 0; i < P.length; i += 3) d += P[i] * Nn[i] + P[i + 1] * Nn[i + 1] + P[i + 2] * Nn[i + 2];
    if (d < 0) { for (let i = 0; i < Nn.length; i++) Nn[i] = -Nn[i]; g.attributes.normal.needsUpdate = true; }
    console.info('head normals', d < 0 ? 'flipped' : 'ok');
  }
  // curvature per vertex: how far its normal turns from its neighbours'.
  // Eyes, nose, lips and ears turn sharply, so they get more dots.
  const n = g.attributes.normal.array, idx = g.index.array, nv = g.attributes.position.count;
  const acc = new Float32Array(nv * 3);
  for (let f = 0; f < idx.length; f += 3) {
    const v = [idx[f], idx[f + 1], idx[f + 2]];
    for (let e = 0; e < 3; e++) { const a = v[e], b = v[(e + 1) % 3];
      acc[a * 3] += n[b * 3]; acc[a * 3 + 1] += n[b * 3 + 1]; acc[a * 3 + 2] += n[b * 3 + 2];
      acc[b * 3] += n[a * 3]; acc[b * 3 + 1] += n[a * 3 + 1]; acc[b * 3 + 2] += n[a * 3 + 2]; }
  }
  const curv = new Float32Array(nv);
  for (let v = 0; v < nv; v++) {
    const x = acc[v * 3], y = acc[v * 3 + 1], z = acc[v * 3 + 2], l = Math.hypot(x, y, z) || 1;
    curv[v] = 1 - (n[v * 3] * x + n[v * 3 + 1] * y + n[v * 3 + 2] * z) / l;
  }
  const sorted = Array.from(curv).sort((a, b) => a - b), p95 = sorted[Math.floor(nv * 0.95)] || 1;
  const w = new Float32Array(nv);
  for (let v = 0; v < nv; v++) {
    const front = g.attributes.position.array[v * 3 + 2] > 0 ? 1.25 : 0.7;   // the face matters more than the back
    w[v] = (0.3 + 2.4 * Math.min(1, curv[v] / p95)) * front;
  }
  g.setAttribute('w', new THREE.BufferAttribute(w, 1));
  const m = new THREE.Mesh(g);
  return new MeshSurfaceSampler(m).setWeightAttribute('w').build();
}

/* ================= shape builders (local units) ================= */
class Target {
  constructor() { this.p = new Float32Array(N * 3); this.k = new Float32Array(N); this.s = new Float32Array(N).fill(1); this.i = 0; }
  push(x, y, z, kind = 0, shade = 1) { if (this.i >= N) return; const i = this.i++; this.p[i * 3] = x; this.p[i * 3 + 1] = y; this.p[i * 3 + 2] = z; this.k[i] = kind; this.s[i] = shade; }
  fillFrom(fn) { while (this.i < N) fn(); }
}

const L = new THREE.Vector3(-0.62, 0.42, 0.66).normalize();
function shadeAt(p, n) {
  // ink on paper: shadows get dense dark dots, highlights stay light
  const lam = Math.max(0, n.dot(L)), facing = smooth(-0.25, 0.3, n.z);
  const rim = Math.pow(1 - Math.abs(n.z), 2.5) * 0.45 * facing;
  const dark = 1 - lam;
  const hatch = dark > 0.55 ? ((((p.y * 0.8 + p.x * 0.6) * 30) % 1 + 1) % 1 < 0.5 ? 1 : 0.45) : 1;
  return Math.min(1, Math.max(0.02, facing * (0.1 + 0.88 * Math.pow(dark, 1.3)) * hatch + rim));
}

function bustPoint(v, nn) {
  const r = Math.random();
  if (r < 0.26) {                                    // neck, leaning slightly forward
    const u = Math.random(), a = Math.random() * Math.PI * 2;
    const y = -0.55 - u * 0.85, rx = 0.33 + u * 0.08, rz = 0.35 + u * 0.03;
    v.set(Math.sin(a) * rx, y, Math.cos(a) * rz - 0.2 + u * 0.06); nn.set(Math.sin(a), 0.1, Math.cos(a));
  } else if (r < 0.34) {                             // T-shirt collar, dipping at the front
    const a = Math.random() * Math.PI * 2, cf = Math.max(0, Math.cos(a));
    v.set(Math.sin(a) * 0.5, -1.36 - 0.16 * cf * cf + (Math.random() - 0.5) * 0.03, Math.cos(a) * 0.44 - 0.16); nn.set(Math.sin(a), 0.4, Math.cos(a));
  } else if (r < 0.39) {                             // collarbones
    const s = Math.random() < 0.5 ? -1 : 1, x = 0.2 + Math.random() * 0.75;
    v.set(s * x, -1.52 - 0.05 * Math.sin(x * 3.2) + (Math.random() - 0.5) * 0.02, 0.3 - 0.22 * x * x); nn.set(s * 0.2, 0.5, 0.85);
  } else {                                           // shoulders and chest
    const u = Math.random(), a = Math.random() * Math.PI * 2;
    const W = 0.44 + 1.12 * smooth(0, 0.4, u) + 0.05 * u, D = 0.42 + 0.2 * smooth(0, 0.5, u);
    const x = Math.sin(a) * W, z = Math.cos(a) * D - 0.22;
    const y = -1.35 - u * 1.55 - 0.3 * Math.pow(Math.abs(x) / 1.6, 2.4) * (1 - u * 0.5);
    v.set(x, y, z); nn.set(Math.sin(a), 0.35 * (1 - u), Math.cos(a));
  }
  nn.normalize();
}

const CAP_BOARD = new THREE.Matrix4().makeRotationY(Math.PI / 4).premultiply(new THREE.Matrix4().makeRotationX(-0.16));
function capPoint(v, nn) {
  const t = Math.random(), BY = 1.02, H = 0.8, R = 0.6; let kind = 0;
  if (t < 0.3) {
    const a = Math.random() * Math.PI * 2, y = 0.66 + Math.random() * (BY - 0.66);
    v.set(Math.cos(a) * R, y, Math.sin(a) * R * 1.1 - 0.12); nn.set(Math.cos(a), 0, Math.sin(a));
  } else if (t < 0.87) {
    let x = (Math.random() * 2 - 1) * H, z = (Math.random() * 2 - 1) * H;
    if (Math.random() < 0.32) { if (Math.random() < 0.5) x = Math.sign(x) * H; else z = Math.sign(z) * H; }
    v.set(x, Math.random() < 0.6 ? 0 : -0.035, z).applyMatrix4(CAP_BOARD); v.y += BY; v.z -= 0.12;
    nn.set(0, 1, 0).applyMatrix4(CAP_BOARD).add(new THREE.Vector3(0, 0, 0.6));
  } else {
    const u = Math.random(), corner = new THREE.Vector3(H * 0.98, 0.01, 0).applyMatrix4(CAP_BOARD);
    if (u < 0.4) v.set(0, 0.03, 0).applyMatrix4(CAP_BOARD).lerp(corner, u / 0.4);
    else { const sp = u > 0.85 ? 2.2 : 1; v.copy(corner); v.y -= (u - 0.4) / 0.6 * 0.62; v.x += (Math.random() - 0.5) * 0.05 * sp; v.z += (Math.random() - 0.5) * 0.05 * sp; }
    v.y += BY; v.z -= 0.12; nn.set(0, 0, 1); kind = 1;
  }
  nn.normalize(); return kind;
}

// The student: head, bust and (optionally) cap, turned by `rot`, then scaled and moved.
function addFigure(t, sampler, count, rot, scale = 1, off = [0, 0, 0], cap = true, slot = 0) {
  const R = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rot[0], rot[1], rot[2], 'YXZ'));
  const v = new THREE.Vector3(), nn = new THREE.Vector3();
  const nHead = Math.round(count * (cap ? 0.66 : 0.74)), nBust = Math.round(count * 0.22);
  for (let c = 0; c < count; c++) {
    let kind = 0;
    if (c < nHead) sampler.sample(v, nn);
    else if (c < nHead + nBust) bustPoint(v, nn);
    else if (cap) kind = capPoint(v, nn); else bustPoint(v, nn);
    v.applyMatrix4(R); nn.transformDirection(R);
    let sh = shadeAt(v, nn); if (kind === 1) sh = Math.max(sh, 0.75);
    t.push(v.x * scale + off[0], v.y * scale + off[1], v.z * scale + off[2], kind, sh);
  }
}

function glyphPoints(t, ch, count, size, off, kind) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d'); x.font = 'italic 230px "Instrument Serif", Georgia, serif';
  x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(ch, 128, 140);
  const d = x.getImageData(0, 0, 256, 256).data, hits = [];
  for (let y = 0; y < 256; y += 2) for (let xx = 0; xx < 256; xx += 2) if (d[(y * 256 + xx) * 4 + 3] > 128) hits.push([xx, y]);
  for (let i = 0; i < count; i++) {
    const [px, py] = hits[(Math.random() * hits.length) | 0] || [128, 128];
    t.push((px / 256 - 0.5) * size + off[0], (0.5 - py / 256) * size + off[1], (Math.random() - 0.5) * 0.08 + off[2], kind, 1);
  }
}

function buildGraph(t) {      // local: 1 = half the app window's width
  const nodes = [[-0.95, 1.12], [-0.25, 1.22], [0.45, 1.08], [1.12, 1.02], [1.24, 0.38], [1.18, -0.32], [1.1, -1.0], [0.4, -1.18], [-0.3, -1.12], [-1.0, -1.15], [1.42, 1.25], [0.05, 1.42], [1.46, -1.28], [-0.6, -1.4]];
  const edges = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [3, 10], [1, 11], [2, 11], [6, 12], [8, 13], [9, 13], [10, 4]];
  const kinds = [1, 0, 2, 3, 4, 1, 0, 2, 3, 0, 4, 1, 2, 3];
  t.fillFrom(() => {
    const r = Math.random();
    if (r < 0.46) {
      const ni = (Math.random() * nodes.length) | 0, [nx, ny] = nodes[ni], rad = 0.03 + (ni % 3) * 0.015;
      const a = Math.random() * Math.PI * 2, b = Math.acos(2 * Math.random() - 1), rr = rad * Math.cbrt(Math.random());
      t.push(nx + rr * Math.sin(b) * Math.cos(a), ny + rr * Math.cos(b), rr * Math.sin(b) * Math.sin(a), kinds[ni], 1);
    } else if (r < 0.88) {
      const [e0, e1] = edges[(Math.random() * edges.length) | 0], u = Math.random();
      const [ax, ay] = nodes[e0], [bx, by] = nodes[e1];
      t.push(ax + (bx - ax) * u + (Math.random() - 0.5) * 0.008, ay + (by - ay) * u + (Math.random() - 0.5) * 0.008, 0, 0, 0.55);
    } else {
      t.push((Math.random() - 0.5) * 3.2, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 0.4, 0, 0.25);
    }
  });
}

function buildRadar(t) {      // local: 1 = the radar's full radius
  const ang = i => -Math.PI / 2 + i * Math.PI / 3;
  const corner = (i, r) => [Math.cos(ang(i)) * r, -Math.sin(ang(i)) * r];
  t.fillFrom(() => {
    const r = Math.random();
    if (r < 0.5) {            // rings
      const ring = [0.25, 0.5, 0.75, 1][(Math.random() * 4) | 0], e = (Math.random() * 6) | 0, u = Math.random();
      const [ax, ay] = corner(e, ring), [bx, by] = corner((e + 1) % 6, ring);
      t.push(ax + (bx - ax) * u, ay + (by - ay) * u, (Math.random() - 0.5) * 0.02, 0, ring === 1 ? 0.9 : 0.45);
    } else if (r < 0.7) {     // spokes
      const e = (Math.random() * 6) | 0, u = Math.random(), [x, y] = corner(e, u);
      t.push(x, y, 0, 0, 0.4);
    } else if (r < 0.82) {    // glow at each skill's tip
      const e = (Math.random() * 6) | 0, [x, y] = corner(e, 1), a = Math.random() * 6.283, rr = 0.06 * Math.sqrt(Math.random());
      t.push(x + Math.cos(a) * rr, y + Math.sin(a) * rr, 0, e === 5 ? 4 : 2, 1);
    } else {                  // outer halo
      const a = Math.random() * 6.283, rr = 1.12 + Math.random() * 0.1 + 0.02 * Math.sin(a * 24);
      t.push(Math.cos(a) * rr, Math.sin(a) * rr, 0, 0, 0.35);
    }
  });
}

function buildSeal(t) {       // local: 1 = the seal's radius
  t.fillFrom(() => {
    const r = Math.random(), a = Math.random() * Math.PI * 2;
    if (r < 0.34) { const rr = 1 + 0.035 * Math.cos(a * 30); t.push(Math.cos(a) * rr, Math.sin(a) * rr, 0, 0, 1); }          // serrated edge
    else if (r < 0.5) { const rr = 0.9 + (Math.random() - 0.5) * 0.006; t.push(Math.cos(a) * rr, Math.sin(a) * rr, 0, 0, 0.8); }
    else if (r < 0.72) { const rr = 0.93 + Math.random() * 0.045; const tick = Math.abs(((a / (Math.PI * 2)) * 72) % 1 - 0.5) < 0.14; t.push(Math.cos(a) * rr, Math.sin(a) * rr, 0, tick ? 4 : 0, tick ? 1 : 0.2); }
    else if (r < 0.9) { const rr = 1.08 + Math.random() * 0.25; t.push(Math.cos(a) * rr, Math.sin(a) * rr, (Math.random() - 0.5) * 0.1, Math.random() < 0.15 ? 4 : 0, 0.18); }
    else { const rr = 0.86 * Math.sqrt(Math.random()); t.push(Math.cos(a) * rr, Math.sin(a) * rr, 0, 0, 0.35); }
  });
}

function buildDust(t) {
  t.fillFrom(() => t.push((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 1.3, (Math.random() - 0.5) * 0.6, Math.random() < 0.08 ? 1 + ((Math.random() * 4) | 0) : 0, 0.3 + Math.random() * 0.7));
}

// Pair dots between shapes by position (z-order), so morphs flow instead of criss-crossing.
function zsort(t) {
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (let i = 0; i < N; i++) { const x = t.p[i * 3], y = t.p[i * 3 + 1]; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const part = v => { v &= 1023; v = (v | (v << 8)) & 0x00ff00ff; v = (v | (v << 4)) & 0x0f0f0f0f; v = (v | (v << 2)) & 0x33333333; return (v | (v << 1)) & 0x55555555; };
  const key = new Float64Array(N), idx = new Uint32Array(N);
  for (let i = 0; i < N; i++) {
    const qx = Math.floor((t.p[i * 3] - x0) / (x1 - x0 + 1e-9) * 1023), qy = Math.floor((t.p[i * 3 + 1] - y0) / (y1 - y0 + 1e-9) * 1023);
    key[i] = part(qx) | (part(qy) << 1); idx[i] = i;
  }
  idx.sort((a, b) => key[a] - key[b]);
  const p = new Float32Array(N * 3), k = new Float32Array(N), s = new Float32Array(N);
  for (let n = 0; n < N; n++) { const o = idx[n]; p.set(t.p.subarray(o * 3, o * 3 + 3), n * 3); k[n] = t.k[o]; s[n] = t.s[o]; }
  t.p = p; t.k = k; t.s = s; return t;
}

function streams(t0, count) {
  const from = new Float32Array(count * 3), to = new Float32Array(count * 3), off = new Float32Array(count), col = new Float32Array(count * 3);
  const C = ['#5FA831', '#FF7A3D', '#5B9DF0', '#3FB984', '#9CC92E'].map(h => new THREE.Color(h));
  for (let i = 0; i < count; i++) {
    // knowledge only flows in from the learner's side (right)
    const lane = i % 5;
    from.set([1.9 + Math.random() * 0.9, -0.5 + lane * 0.38 + (Math.random() - 0.5) * 0.2, -0.3 + Math.random() * 0.9], i * 3);
    let j, tries = 0; do { j = (Math.random() * N) | 0; tries++; } while ((t0.p[j * 3 + 1] < 0.1 || t0.p[j * 3] < 0.12 || t0.k[j] !== 0) && tries < 40);
    to.set([t0.p[j * 3], t0.p[j * 3 + 1], t0.p[j * 3 + 2]], i * 3);
    off[i] = lane * 0.2 + Math.random() * 0.2; col.set([C[lane].r, C[lane].g, C[lane].b], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(to, 3));
  g.setAttribute('aFrom', new THREE.BufferAttribute(from, 3)); g.setAttribute('aTo', new THREE.BufferAttribute(to, 3));
  g.setAttribute('aOff', new THREE.BufferAttribute(off, 1)); g.setAttribute('aCol', new THREE.BufferAttribute(col, 3));
  return g;
}

/* ================= scene ================= */
async function main() {
  const canvas = document.getElementById('gl');
  const [sampler] = await Promise.all([loadHead(), document.fonts ? document.fonts.ready : null]);

  const tg = [];
  // 0 hero: looking up and to the side, taking an idea in
  // facing forward, so the split line runs down the middle of the face
  tg[0] = new Target(); addFigure(tg[0], sampler, N, [-0.08, -0.04, 0]);
  // 1 story: looking down, with the unanswered question above
  tg[1] = new Target(); addFigure(tg[1], sampler, Math.round(N * 0.74), [0.36, 0.78, 0], 0.82, [-0.55, -0.45, 0], false);
  glyphPoints(tg[1], '?', N - tg[1].i, 1.6, [0.95, 1.05, 0.3], 1);
  tg[2] = new Target(); buildGraph(tg[2]);
  tg[3] = new Target(); buildRadar(tg[3]);
  tg[4] = new Target(); buildSeal(tg[4]);
  tg[5] = new Target(); buildDust(tg[5]);
  // 6 close: facing forward, chin up
  tg[6] = new Target(); addFigure(tg[6], sampler, N, [-0.12, 0.12, 0]);
  const T0raw = { p: tg[0].p.slice(), k: tg[0].k.slice() };
  tg.forEach(zsort);

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(tg[0].p, 3));
  for (let i = 1; i < T; i++) g.setAttribute('aP' + i, new THREE.BufferAttribute(tg[i].p, 3));
  const KA = new Float32Array(N * 4), KB = new Float32Array(N * 3), RND = new Float32Array(N);
  for (let n = 0; n < N; n++) {
    const pk = i => tg[i].k[n] * 2 + Math.min(0.999, tg[i].s[n]);
    KA.set([pk(0), pk(1), pk(2), pk(3)], n * 4); KB.set([pk(4), pk(5), pk(6)], n * 3);
    RND[n] = Math.random();
  }
  g.setAttribute('aKA', new THREE.BufferAttribute(KA, 4)); g.setAttribute('aKB', new THREE.BufferAttribute(KB, 3));
  g.setAttribute('aRand', new THREE.BufferAttribute(RND, 1));

  const vec = () => new THREE.Vector3();
  const U = {
    uA: { value: Array.from({ length: T }, vec) }, uS: { value: new Array(T).fill(1) },
    uAl: { value: [1, 0.95, 0.5, 0.8, 0.95, 0.28, 0.42] }, uSz: { value: [1.9, 1.8, 2.0, 2.0, 1.8, 1.8, 1.8] },
    uRot0: { value: new THREE.Matrix3() }, uM: { value: 0 }, uTime: { value: 0 }, uIntro: { value: RM ? 1 : 0 },
    uPix: { value: 1 }, uDark: { value: 0 }, uScanY: { value: 9 }, uScanOn: { value: 0 },
    uMouse: { value: new THREE.Vector2(999, 999) }, uMouseOn: { value: 0 }, uMouseR: { value: 1 }, uDrift: { value: 0 },
    uSplit: { value: 99 }, uSplitW: { value: 0.05 },
  };
  const mat = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, uniforms: U, transparent: true, depthWrite: false, depthTest: false });
  const pts = new THREE.Points(g, mat); pts.frustumCulled = false;

  const sU = { uA0: { value: vec() }, uS0: { value: 1 }, uRot0: U.uRot0, uTime: U.uTime, uOn: { value: 0 }, uPix: U.uPix };
  const sMat = new THREE.ShaderMaterial({ vertexShader: STREAM_VS, fragmentShader: STREAM_FS, uniforms: sU, transparent: true, depthWrite: false, depthTest: false });
  const sp = new THREE.Points(streams(T0raw, innerWidth < 900 ? 220 : 460), sMat); sp.frustumCulled = false;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene(); scene.add(pts); scene.add(sp);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100); camera.position.z = 10;
  const TAN = Math.tan(THREE.MathUtils.degToRad(15));
  let W = 0, H = 0, ppw = 1;
  const resize = () => {
    W = innerWidth; H = innerHeight; const dpr = Math.min(devicePixelRatio, 2);
    renderer.setPixelRatio(dpr); renderer.setSize(W, H, false);
    camera.aspect = W / H; camera.updateProjectionMatrix();
    ppw = H / (2 * 10 * TAN); U.uPix.value = dpr; U.uMouseR.value = 80 / ppw; U.uDrift.value = 0.9 / ppw;
  };
  resize(); addEventListener('resize', resize);

  const toW = (px, py, out) => out.set((px - W / 2) / ppw, -(py - H / 2) / ppw, 0);
  const el = { arch: $('.photo-arch'), story: $('.story figure'), app: $('.how .app'), radar: $('#radar'), paper: $('#paper'), close: $('#close') };
  const secs = ['#story', '#how', '#scores', '#certificate', '#who', '#close'].map(s => $(s));
  const cert = $('#certificate'), divider = $('#divider'), tmp2 = vec();

  // pointer
  let mx = 0, my = 0, tx = 0, ty = 0, mOn = 0, mIn = 0;
  addEventListener('pointermove', e => { tx = e.clientX / W - 0.5; ty = e.clientY / H - 0.5; mIn = 1; toW(e.clientX, e.clientY, tmp); U.uMouse.value.set(tmp.x, tmp.y); });
  document.addEventListener('pointerleave', () => { mIn = 0; });
  const tmp = vec(), rot = new THREE.Matrix4(), eul = new THREE.Euler();

  const t0 = performance.now(); let introT = null;
  document.documentElement.classList.add('gl-on');
  const frame = now => {
    const t = (now - t0) / 1000;
    if (introT === null) introT = t;
    // which chapter: each section's top sliding up the screen moves the dots one shape on
    let m = 0;
    secs.forEach((s, i) => { const r = s.getBoundingClientRect(); const pr = Math.min(1, Math.max(0, (H - r.top) / (H * 0.85))); if (pr > 0) m = Math.max(m, i + pr); });
    U.uM.value = m;
    // anchors follow their sections live
    let r = el.arch.getBoundingClientRect();
    const headPx = Math.min(H * 0.52, 500);
    toW(r.left + r.width / 2, r.top + headPx * 0.64, U.uA.value[0]); U.uS.value[0] = headPx / 2 / ppw;
    r = el.story.getBoundingClientRect();
    toW(r.left + r.width / 2, r.top + r.height * 0.5, U.uA.value[1]); U.uS.value[1] = r.height * 0.95 / 4.2 / ppw;
    r = el.app.getBoundingClientRect();
    toW(r.left + r.width / 2, r.top + r.height / 2, U.uA.value[2]); U.uS.value[2] = r.width / 2 / ppw;
    const ctm = el.radar.getScreenCTM();
    if (ctm) { toW(ctm.e, ctm.f, U.uA.value[3]); U.uS.value[3] = 110 * ctm.a / ppw; }
    r = el.paper.getBoundingClientRect();
    toW(r.left + r.width / 2, r.top + r.height / 2, U.uA.value[4]); U.uS.value[4] = Math.max(r.width, r.height) * 0.6 / ppw;
    toW(W / 2, H / 2, U.uA.value[5]); U.uS.value[5] = W * 0.55 / ppw;
    r = el.close.getBoundingClientRect();
    toW(W / 2, r.top + r.height * 0.5, U.uA.value[6]); U.uS.value[6] = H * 0.34 / ppw;

    // dark band
    const cr = cert.getBoundingClientRect(), dk = cr.top < H * 0.55 && cr.bottom > H * 0.45 ? 1 : 0;
    U.uDark.value += (dk - U.uDark.value) * 0.08;

    mx += (tx - mx) * 0.05; my += (ty - my) * 0.05; mOn += ((RM ? 0 : mIn) - mOn) * 0.06;
    U.uMouseOn.value = mOn;
    eul.set(my * 0.18, mx * 0.45 + (RM ? 0 : Math.sin(t * 0.25) * 0.06), 0, 'YXZ'); rot.makeRotationFromEuler(eul); U.uRot0.value.setFromMatrix4(rot);
    U.uTime.value = RM ? 0 : t;
    if (!RM) U.uIntro.value = Math.min(1, (t - introT) / 2.8);
    const sc = ((t - 3) % 4.5) / 4.5;
    U.uScanOn.value = RM || t < 3 ? 0 : Math.sin(Math.min(1, sc * 1.4) * Math.PI);
    U.uScanY.value = 1.3 - Math.min(1, sc * 1.4) * 3.6;
    sU.uA0.value.copy(U.uA.value[0]); sU.uS0.value = U.uS.value[0];
    // hero split line, in world units; streams fade as the line covers the learner's half
    if (divider) { const dr = divider.getBoundingClientRect(); toW(dr.left + dr.width / 2, 0, tmp2); U.uSplit.value = tmp2.x; }
    U.uSplitW.value = 0.05 * U.uS.value[0];
    const splitLocal = (U.uSplit.value - U.uA.value[0].x) / U.uS.value[0];
    sU.uOn.value = (RM ? 0.5 : Math.min(1, Math.max(0, (t - 2.2) / 1.2))) * (1 - Math.min(1, m * 3)) * (1 - smooth(-0.2, 0.9, splitLocal));
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

function glOK() { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } }
if (!glOK()) document.documentElement.classList.add('no-gl');
else main().catch(e => { console.warn('dotted story failed', e); document.documentElement.classList.add('no-gl'); });
