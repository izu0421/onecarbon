/*
  neuron-portable.js — drop-in neuron animation for any page.

  USAGE: paste this into the <head> of your page, then add the canvas div:

  ─── <head> snippet ──────────────────────────────────────────────────────────

  <script type="importmap">
    { "imports": { "three": "https://unpkg.com/three@0.160.0/build/three.module.js" } }
  </script>

  <style>
    .neuron-stage {
      position: relative;
      width: 340px;
      height: 480px;
      flex-shrink: 0;
    }
    #neuron-canvas { width: 100%; height: 100%; display: block; }
  </style>

  ─── <body> snippet ──────────────────────────────────────────────────────────

  <div class="neuron-stage">
    <canvas id="neuron-canvas"></canvas>
  </div>
  <script type="module" src="js/neuron-portable.js"></script>

  ─────────────────────────────────────────────────────────────────────────────

  SCROLL COUPLING (optional):
    If the page has a section with id="timeline", the camera will pan down the
    neuron as the user scrolls through it — matching the our_story.html effect.
    Without #timeline the neuron just rotates slowly over time.

  CONFIG:
    Override defaults before the script tag with a global:
      <script>window.NEURON_OPTS = { count: 20000, colorOuter: "#ff6600" };</script>
*/

import * as THREE from 'three';

// ── Config — override via window.NEURON_OPTS ──────────────────────────────────
const DEFAULTS = {
  count:        40000,
  speed:        100,
  size:         45,
  scale:        110,
  shape:        'glyph',
  tilt:         0.22,
  shiftX:       0,
  colorOuter:   '#456BB7',
  colorMid:     '#2f4f8f',
  colorInner:   '#a8ccf8',
  colorNucleus: '#ff6600',
};
const state = Object.assign({}, DEFAULTS, window.NEURON_OPTS || {});

// ── Canvas / renderer ─────────────────────────────────────────────────────────
const canvas = document.getElementById('neuron-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x000000, 0);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 1000);
camera.position.set(0, 0, 14);
camera.lookAt(0, 0, 0);

const neuronGroup = new THREE.Group();
scene.add(neuronGroup);

// ── PRNG ──────────────────────────────────────────────────────────────────────
function mulberry32(seed) {
  return function() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = seed;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// ── Geometry constants ────────────────────────────────────────────────────────
const SOMA_Y         =  2.8;
const NEURON_TOP     = SOMA_Y + 3.0;
const AXON_START_Y   = SOMA_Y - 1.4;
const AXON_END_Y     = -14.0;
const TERM_BOTTOM_Y  = AXON_END_Y - 1.8;
const AXON_ALONG_START = 0.25;
const AXON_ALONG_END   = 0.92;

function generateNeuron(particleCount) {
  const rand = mulberry32(11);
  const positions = new Float32Array(particleCount * 3);
  const colors    = new Float32Array(particleCount * 3);
  const sizes     = new Float32Array(particleCount);
  const seeds     = new Float32Array(particleCount);
  const parts     = new Float32Array(particleCount);
  const along     = new Float32Array(particleCount);

  const nucleusCount  = Math.floor(particleCount * 0.03);
  const somaCount     = Math.floor(particleCount * 0.06);
  const dendriteCount = Math.floor(particleCount * 0.30);
  const spineCount    = Math.floor(particleCount * 0.04);
  const axonCount     = Math.floor(particleCount * 0.45);
  const terminalCount = particleCount - nucleusCount - somaCount - dendriteCount - spineCount - axonCount;

  let idx = 0;
  const tmp = new THREE.Vector3();

  // Nucleus
  const nucPos  = new THREE.Vector3(0, SOMA_Y, 0);
  const nucTilt = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.3, -0.25, 0.15));
  for (let i = 0; i < nucleusCount; i++) {
    const u = rand(), v = rand();
    const theta = u * Math.PI * 2;
    const phi   = Math.acos(2 * v - 1);
    const r     = Math.cbrt(rand()) * 0.4;
    tmp.set(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta) * 0.65,
      r * Math.cos(phi) * 0.75
    );
    tmp.applyQuaternion(nucTilt).add(nucPos);
    positions[idx*3] = tmp.x; positions[idx*3+1] = tmp.y; positions[idx*3+2] = tmp.z;
    seeds[idx] = rand(); parts[idx] = 2; along[idx] = 0.10;
    sizes[idx] = 0.35 + rand() * 0.25; idx++;
  }

  // Soma
  for (let i = 0; i < somaCount; i++) {
    const u = rand(), v = rand();
    const theta = u * Math.PI * 2;
    const phi   = Math.acos(2 * v - 1);
    const r     = 0.45 + Math.pow(rand(), 0.6) * 0.7;
    tmp.set(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta) * 0.9,
      r * Math.cos(phi) * 0.85
    );
    tmp.add(nucPos);
    positions[idx*3] = tmp.x; positions[idx*3+1] = tmp.y; positions[idx*3+2] = tmp.z;
    seeds[idx] = rand(); parts[idx] = 0; along[idx] = 0.12;
    sizes[idx] = 0.25 + rand() * 0.25; idx++;
  }

  // Dendrites
  const dendriteSegs    = [];
  const dendriteTipPoints = [];

  function growBranch(origin, dir, length, thickness, depth, maxDepth) {
    const steps = Math.max(8, Math.floor(length * 14));
    let p = origin.clone();
    let d = dir.clone().normalize();
    for (let s = 0; s < steps; s++) {
      const curlAmt = 0.05 + (depth / maxDepth) * 0.18;
      const curl = new THREE.Vector3(
        (rand() - 0.5) * curlAmt,
        (rand() - 0.5) * curlAmt * 0.6,
        (rand() - 0.5) * curlAmt
      );
      d.add(curl).normalize();
      const step = length / steps;
      const next = p.clone().add(d.clone().multiplyScalar(step));
      const t    = s / steps;
      const localThick = thickness * (1 - t * 0.55);
      dendriteSegs.push({ p0: p.clone(), p1: next.clone(), thickness: Math.max(0.006, localThick) });
      p = next;
    }
    if (depth < maxDepth) {
      const ratio = 0.45 + rand() * 0.1;
      const t1 = thickness * Math.pow(ratio, 1/1.5) * 0.95;
      const t2 = thickness * Math.pow(1 - ratio, 1/1.5) * 0.95;
      const perp = (Math.abs(d.y) < 0.9 ? new THREE.Vector3(0,1,0) : new THREE.Vector3(1,0,0));
      const axis = new THREE.Vector3().crossVectors(d, perp).normalize();
      const spin = rand() * Math.PI * 2;
      const qSpin = new THREE.Quaternion().setFromAxisAngle(d, spin);
      axis.applyQuaternion(qSpin);
      const ang1 = (0.42 + rand() * 0.25) * (0.9 + rand()*0.2);
      const ang2 = -(0.42 + rand() * 0.25) * (0.9 + rand()*0.2);
      const q1   = new THREE.Quaternion().setFromAxisAngle(axis, ang1);
      const q2   = new THREE.Quaternion().setFromAxisAngle(axis, ang2);
      const dir1 = d.clone().applyQuaternion(q1).normalize();
      const dir2 = d.clone().applyQuaternion(q2).normalize();
      growBranch(p.clone(), dir1, length * (0.55 + rand() * 0.3), t1, depth + 1, maxDepth);
      growBranch(p.clone(), dir2, length * (0.55 + rand() * 0.3), t2, depth + 1, maxDepth);
      if (rand() < 0.15) {
        const q3   = new THREE.Quaternion().setFromAxisAngle(axis.clone().applyQuaternion(new THREE.Quaternion().setFromAxisAngle(d, Math.PI/2)), 0.3 + rand()*0.3);
        const dir3 = d.clone().applyQuaternion(q3).normalize();
        growBranch(p.clone(), dir3, length * 0.4, thickness * 0.35, depth + 1, maxDepth);
      }
    } else {
      dendriteTipPoints.push({ p: p.clone(), dir: d.clone(), thickness: thickness * 0.6 });
    }
  }

  function growTuft(origin, dir, length, thickness) {
    const steps = Math.max(6, Math.floor(length * 20));
    let p = origin.clone();
    let d = dir.clone().normalize();
    for (let s = 0; s < steps; s++) {
      const curl = new THREE.Vector3((rand()-0.5)*0.25, (rand()-0.5)*0.25, (rand()-0.5)*0.25);
      d.add(curl).normalize();
      const step = length / steps;
      const next = p.clone().add(d.clone().multiplyScalar(step));
      const t    = s / steps;
      dendriteSegs.push({ p0: p.clone(), p1: next.clone(), thickness: Math.max(0.004, thickness * (1 - t * 0.8)) });
      p = next;
    }
  }

  const primaryCount = 9;
  for (let i = 0; i < primaryCount; i++) {
    const angle = (i / primaryCount) * Math.PI * 2 + rand() * 0.4;
    const elev  = (rand() - 0.2) * 1.2;
    const dir   = new THREE.Vector3(
      Math.cos(angle) * Math.cos(elev * 0.6),
      Math.sin(Math.max(elev, -0.2)) * 0.9 + 0.15,
      Math.sin(angle) * Math.cos(elev * 0.6)
    ).normalize();
    const origin = nucPos.clone().addScaledVector(dir, 0.75);
    growBranch(origin, dir, 1.0 + rand() * 0.5, 0.22 + rand() * 0.05, 0, 5);
  }

  for (const tip of dendriteTipPoints) {
    const nTufts = 3 + Math.floor(rand() * 4);
    for (let j = 0; j < nTufts; j++) {
      const offset  = new THREE.Vector3((rand()-0.5)*1.6, (rand()-0.5)*1.6, (rand()-0.5)*1.6);
      const tuftDir = tip.dir.clone().multiplyScalar(0.4).add(offset).normalize();
      growTuft(tip.p, tuftDir, 0.18 + rand() * 0.35, tip.thickness * 0.5);
    }
  }

  distributeOnSegs(dendriteSegs, dendriteCount, 0, 0.08, false);

  // Dendritic spines
  (function placeSpines() {
    let total = 0;
    const weights = [];
    for (const s of dendriteSegs) {
      const w = s.thickness > 0.02 ? s.thickness * s.p0.distanceTo(s.p1) : 0;
      weights.push(w); total += w;
    }
    if (total < 1e-6) return;
    let placed = 0;
    while (placed < spineCount) {
      const r = rand() * total;
      let acc = 0, segIdx = 0;
      for (let i = 0; i < weights.length; i++) { acc += weights[i]; if (acc >= r) { segIdx = i; break; } }
      const s   = dendriteSegs[segIdx];
      const t   = rand();
      const base = s.p0.clone().lerp(s.p1, t);
      const dir  = s.p1.clone().sub(s.p0).normalize();
      const perpUp = Math.abs(dir.y) < 0.9 ? new THREE.Vector3(0,1,0) : new THREE.Vector3(1,0,0);
      const u    = new THREE.Vector3().crossVectors(dir, perpUp).normalize();
      const v    = new THREE.Vector3().crossVectors(dir, u).normalize();
      const theta    = rand() * Math.PI * 2;
      const spineLen = s.thickness * (1.5 + rand() * 2.5);
      const spine    = base.clone()
        .addScaledVector(u, Math.cos(theta) * spineLen)
        .addScaledVector(v, Math.sin(theta) * spineLen);
      if (idx >= particleCount) return;
      positions[idx*3] = spine.x; positions[idx*3+1] = spine.y; positions[idx*3+2] = spine.z;
      seeds[idx] = rand(); parts[idx] = 0; along[idx] = 0.09;
      sizes[idx] = 0.14 + rand() * 0.12; idx++; placed++;
    }
  })();

  // Axon hillock
  const hillockTop          = SOMA_Y - 0.55;
  const hillockBottom       = AXON_START_Y;
  const hillockTopRadius    = 0.85;
  const hillockBottomRadius = 0.14;
  const hillockSteps        = 14;
  const hillockSegs         = [];
  for (let i = 0; i < hillockSteps; i++) {
    const t0 = i / hillockSteps, t1 = (i + 1) / hillockSteps;
    const y0 = hillockTop + (hillockBottom - hillockTop) * t0;
    const y1 = hillockTop + (hillockBottom - hillockTop) * t1;
    const r0 = hillockTopRadius + (hillockBottomRadius - hillockTopRadius) * Math.pow(t0, 0.7);
    const r1 = hillockTopRadius + (hillockBottomRadius - hillockTopRadius) * Math.pow(t1, 0.7);
    hillockSegs.push({ p0: new THREE.Vector3(0, y0, 0), p1: new THREE.Vector3(0, y1, 0), thickness: (r0 + r1) * 0.5, alongOverride: 0.14 + t0 * 0.08 });
  }

  // Axon
  const axonCurvePoints = [];
  const axonSteps = 220;
  for (let i = 0; i <= axonSteps; i++) {
    const t     = i / axonSteps;
    const y     = AXON_START_Y + (AXON_END_Y - AXON_START_Y) * t;
    const ramp  = Math.min(1, t * 5);
    const sway  = Math.sin(t * Math.PI * 3.0) * 1.3 * (0.3 + t * 0.7) * ramp;
    const depth = Math.sin(t * Math.PI * 2.1 + 1.3) * 0.6 * ramp;
    axonCurvePoints.push(new THREE.Vector3(sway, y, depth));
  }

  const hillockParticleCount = Math.floor(axonCount * 0.10);
  const axonCountAdjusted    = axonCount - hillockParticleCount;
  distributeOnSegs(hillockSegs, hillockParticleCount, 0, null, false);

  const axonSegs = [];
  for (let i = 0; i < axonCurvePoints.length - 1; i++) {
    const t = i / (axonCurvePoints.length - 1);
    axonSegs.push({ p0: axonCurvePoints[i], p1: axonCurvePoints[i+1], thickness: 0.13 - t * 0.03, along: t });
  }
  for (const seg of axonSegs) {
    const phase = (seg.along * 10) % 1;
    let mult;
    if (phase < 0.12 || phase > 0.88) mult = 0.5;
    else { const x = (phase - 0.5) / 0.38; mult = 1.0 + Math.cos(x * Math.PI) * 0.35; }
    seg.thickness *= mult;
    seg.alongOverride = AXON_ALONG_START + seg.along * (AXON_ALONG_END - AXON_ALONG_START);
  }
  distributeOnSegs(axonSegs, axonCountAdjusted, 0.5, null, true);

  // Terminals
  const termSegs   = [];
  const termOrigin = axonCurvePoints[axonCurvePoints.length - 1].clone();
  function growTerm(origin, dir, length, thickness, depth, maxDepth, collect) {
    const steps = Math.max(8, Math.floor(length * 14));
    let p = origin.clone(), d = dir.clone().normalize();
    for (let s = 0; s < steps; s++) {
      const curl = new THREE.Vector3((rand()-0.5)*0.18, (rand()-0.5)*0.10, (rand()-0.5)*0.18);
      d.add(curl).normalize();
      const step      = length / steps;
      const next      = p.clone().add(d.clone().multiplyScalar(step));
      const t         = s / steps;
      const localThick = thickness * (1 - t * 0.85);
      collect.push({ p0: p.clone(), p1: next.clone(), thickness: Math.max(0.006, localThick) });
      p = next;
      if (depth < maxDepth && s > 2 && s < steps - 2 && rand() < 0.14) {
        const perp     = new THREE.Vector3(-d.y, d.x, d.z).normalize();
        const branchDir = d.clone().add(perp.multiplyScalar((rand()-0.5)*1.5 + (rand()<0.5?0.8:-0.8)));
        branchDir.y -= rand() * 0.3; branchDir.normalize();
        growTerm(p.clone(), branchDir, length * (0.45 + rand()*0.35), thickness * 0.55, depth+1, maxDepth, collect);
      }
    }
  }
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2 + rand() * 0.4;
    const dir   = new THREE.Vector3(Math.cos(angle) * 0.7, -0.55 - rand() * 0.4, Math.sin(angle) * 0.7).normalize();
    growTerm(termOrigin.clone(), dir, 1.2 + rand() * 0.9, 0.08, 0, 2, termSegs);
  }
  distributeOnSegs(termSegs, terminalCount, 1, 0.96, false);

  function distributeOnSegs(segs, count, partValue, alongOverride, isAxon) {
    let totalW = 0;
    for (const s of segs) { s.len = s.p0.distanceTo(s.p1); s.weight = s.thickness * s.len; totalW += s.weight; }
    let placed = 0;
    for (let si = 0; si < segs.length; si++) {
      const s = segs[si];
      const n = Math.max(1, Math.round((s.weight / totalW) * count));
      for (let i = 0; i < n && placed < count; i++) {
        const t   = rand();
        const p   = s.p0.clone().lerp(s.p1, t);
        const dir = s.p1.clone().sub(s.p0).normalize();
        const up  = Math.abs(dir.y) < 0.9 ? new THREE.Vector3(0,1,0) : new THREE.Vector3(1,0,0);
        const u   = new THREE.Vector3().crossVectors(dir, up).normalize();
        const vVec= new THREE.Vector3().crossVectors(dir, u).normalize();
        const gauss  = (rand() + rand() + rand() - 1.5) * 0.7;
        const gauss2 = (rand() + rand() + rand() - 1.5) * 0.7;
        const scatter = s.thickness * (1 + rand() * 0.6);
        p.addScaledVector(u, gauss * scatter).addScaledVector(vVec, gauss2 * scatter);
        if (rand() < 0.035) { p.addScaledVector(u, (rand()-0.5)*scatter*4).addScaledVector(vVec, (rand()-0.5)*scatter*4); }
        positions[idx*3] = p.x; positions[idx*3+1] = p.y; positions[idx*3+2] = p.z;
        seeds[idx] = rand(); parts[idx] = partValue;
        along[idx] = (isAxon && s.alongOverride !== undefined) ? s.alongOverride : alongOverride + (rand()-0.5)*0.02;
        sizes[idx] = isAxon ? (0.22 + rand() * 0.28) : (0.20 + rand() * 0.30);
        idx++; placed++;
      }
    }
  }

  while (idx < particleCount) {
    positions[idx*3] = 0; positions[idx*3+1] = SOMA_Y; positions[idx*3+2] = 0;
    seeds[idx] = rand(); parts[idx] = 0; along[idx] = 0.1; sizes[idx] = 0.25; idx++;
  }

  return { positions, colors, sizes, seeds, parts, along };
}

// ── Colors ────────────────────────────────────────────────────────────────────
function hexToRgb(hex) {
  const v = parseInt(hex.slice(1), 16);
  return [((v >> 16) & 255)/255, ((v >> 8) & 255)/255, (v & 255)/255];
}
function lerp3(a, b, t) { return [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t]; }

function applyColors(data) {
  const topC = hexToRgb(state.colorOuter);
  const midC = hexToRgb(state.colorMid);
  const botC = hexToRgb(state.colorInner);
  const nucC = hexToRgb(state.colorNucleus);
  const { colors, along, parts, seeds } = data;
  for (let i = 0; i < along.length; i++) {
    const a = along[i], part = parts[i];
    let c;
    if (part > 1.5) c = lerp3(nucC, lerp3(nucC, topC, 0.25), seeds[i] * 0.3);
    else {
      c = a < 0.5 ? lerp3(topC, midC, a * 2) : lerp3(midC, botC, (a - 0.5) * 2);
      const j = (seeds[i] - 0.5) * 0.16;
      c = [Math.max(0,Math.min(1,c[0]+j)), Math.max(0,Math.min(1,c[1]+j*0.5)), Math.max(0,Math.min(1,c[2]-j*0.5))];
    }
    colors[i*3] = c[0]; colors[i*3+1] = c[1]; colors[i*3+2] = c[2];
  }
}

// ── Glyph texture ("1" / "C") ─────────────────────────────────────────────────
function makeGlyphAtlas() {
  const size = 128;
  const atlas = document.createElement('canvas');
  atlas.width = size * 2; atlas.height = size;
  const ctx = atlas.getContext('2d');
  ctx.clearRect(0, 0, size*2, size);
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `900 ${size * 0.9}px "Helvetica Neue", Arial, sans-serif`;
  ctx.fillText('1', size * 0.5, size * 0.5);
  ctx.fillText('C', size * 1.5, size * 0.5);
  const tex = new THREE.CanvasTexture(atlas);
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true; tex.anisotropy = 4;
  return tex;
}
const glyphTex = makeGlyphAtlas();

// ── Shader material ───────────────────────────────────────────────────────────
let points = null, geometry = null, material = null, data = null;
const SHAPE_MAP = { circle: 0, square: 1, diamond: 2, ring: 3, cross: 4, glyph: 5 };

const vertexShader = /* glsl */`
  attribute float aSize;
  attribute float aSeed;
  attribute float aAlong;
  attribute float aPart;
  uniform float uTime;
  uniform float uSizeScale;
  uniform float uPixelRatio;
  uniform float uScrollT;
  varying vec3 vColor;
  varying float vAlpha;
  varying float vSeed;
  void main() {
    vColor = color; vSeed = aSeed;
    vec3 displaced = position;
    if (aPart > 0.25 && aPart < 0.75) {
      float t = uTime * (0.5 + aSeed * 0.6);
      displaced += vec3(sin(t + aSeed*6.28)*0.006, 0.0, cos(t*0.8 + aSeed*3.14)*0.006);
    }
    vec4 mv = modelViewMatrix * vec4(displaced, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uSizeScale * uPixelRatio * (300.0 / -mv.z);
    float depth = -mv.z;
    vAlpha = smoothstep(60.0, 6.0, depth) * 0.85 + 0.15;
  }
`;

const fragmentShader = /* glsl */`
  precision highp float;
  varying vec3 vColor; varying float vAlpha; varying float vSeed;
  uniform int uShape; uniform sampler2D uGlyph;
  void main() {
    if (vAlpha < 0.01) discard;
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv); float a = 1.0;
    if (uShape == 0) { if (d > 0.5) discard; }
    else if (uShape == 1) { if (max(abs(uv.x), abs(uv.y)) > 0.45) discard; }
    else if (uShape == 2) { if (abs(uv.x) + abs(uv.y) > 0.5) discard; }
    else if (uShape == 3) { if (d > 0.5 || d < 0.28) discard; }
    else if (uShape == 4) {
      float thick = 0.14;
      if (!(abs(uv.y)<thick&&abs(uv.x)<0.48) && !(abs(uv.x)<thick&&abs(uv.y)<0.48)) discard;
    } else if (uShape == 5) {
      float pick = step(0.5, vSeed);
      vec2 local = vec2(gl_PointCoord.x, 1.0 - gl_PointCoord.y);
      vec2 tuv   = vec2(pick * 0.5 + local.x * 0.5, local.y);
      vec4 s = texture2D(uGlyph, tuv);
      if (s.a < 0.4) discard; a = s.a;
    }
    gl_FragColor = vec4(vColor, vAlpha * a);
  }
`;

function buildNeuron() {
  if (points) { geometry.dispose(); material.dispose(); neuronGroup.remove(points); }
  data = generateNeuron(state.count);
  applyColors(data);
  geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
  geometry.setAttribute('color',    new THREE.BufferAttribute(data.colors, 3));
  geometry.setAttribute('aSize',    new THREE.BufferAttribute(data.sizes, 1));
  geometry.setAttribute('aSeed',    new THREE.BufferAttribute(data.seeds, 1));
  geometry.setAttribute('aAlong',   new THREE.BufferAttribute(data.along, 1));
  geometry.setAttribute('aPart',    new THREE.BufferAttribute(data.parts, 1));
  material = new THREE.ShaderMaterial({
    vertexShader, fragmentShader,
    vertexColors: true, transparent: true, depthWrite: false,
    blending: THREE.NormalBlending,
    uniforms: {
      uTime:       { value: 0 },
      uSizeScale:  { value: state.size / 100 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      uScrollT:    { value: 0.15 },
      uShape:      { value: SHAPE_MAP[state.shape] || 0 },
      uGlyph:      { value: glyphTex },
    }
  });
  points = new THREE.Points(geometry, material);
  neuronGroup.add(points);
  neuronGroup.scale.setScalar(state.scale / 100);
}

// ── Resize ────────────────────────────────────────────────────────────────────
function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  if (material) material.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2);
}
window.addEventListener('resize', resize);

// ── Scroll coupling (only when #timeline exists on the page) ──────────────────
let timelineT = 0;
const timelineEl = document.getElementById('timeline');

function updateScroll() {
  if (!timelineEl) return;
  const rect  = timelineEl.getBoundingClientRect();
  const vh    = window.innerHeight;
  const start = window.scrollY + rect.top  - vh * 0.5;
  const end   = window.scrollY + rect.bottom - vh * 0.5;
  timelineT   = Math.max(0, Math.min(1, (window.scrollY - start) / (end - start)));
}
if (timelineEl) window.addEventListener('scroll', updateScroll, { passive: true });

// ── Render loop ───────────────────────────────────────────────────────────────
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const elapsed = clock.getElapsedTime();

  if (timelineEl) {
    // Scroll-driven: camera pans down the neuron, rotation follows scroll
    const topY    = SOMA_Y + 0.5;
    const bottomY = TERM_BOTTOM_Y + 2.5;
    camera.position.y = topY + timelineT * (bottomY - topY);
    camera.lookAt(0, camera.position.y, 0);
    neuronGroup.rotation.y = timelineT * Math.PI * 0.9 * (state.speed / 100);
    neuronGroup.rotation.z = 0;
    neuronGroup.rotation.x = 0;
  } else {
    // Time-driven: camera centred on soma, slow Y rotation + fixed Z tilt
    camera.position.set(state.shiftX, SOMA_Y, 14);
    camera.lookAt(state.shiftX, SOMA_Y, 0);
    neuronGroup.rotation.y = elapsed * (state.speed / 1000);
    neuronGroup.rotation.z = state.tilt;
    neuronGroup.rotation.x = 0;
  }
  if (material) material.uniforms.uTime.value = elapsed;
  renderer.render(scene, camera);
}

buildNeuron();
requestAnimationFrame(() => { resize(); updateScroll(); animate(); });
