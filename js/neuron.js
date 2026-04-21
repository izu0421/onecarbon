
import * as THREE from 'three';
import { NEURON_CONFIG } from './config.js';

const state = { ...NEURON_CONFIG };

const canvas = document.getElementById('neuron-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x000000, 0);

const scene = new THREE.Scene();
// Orthographic-ish feel via narrow FOV + distant camera; fully fixed position.
const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 1000);
camera.position.set(0, 0, 14);
camera.lookAt(0, 0, 0);

const neuronGroup = new THREE.Group();
scene.add(neuronGroup);

// ---- PRNG ----
function mulberry32(seed) {
  return function() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = seed;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// ---- Geometry constants ----
// Neuron is laid out along Y. Soma is positioned near the top of the stage (y ≈ +2.8),
// so when camera looks at (0,0,0), dendrites + soma fill the upper ~60% of the viewport.
// Axon extends far below (y down to -18). "Along" value is 0..1 across the neuron.
const SOMA_Y = 2.8;
const NEURON_TOP = SOMA_Y + 3.0;    // top of dendrites
const AXON_START_Y = SOMA_Y - 1.4;
const AXON_END_Y = -14.0;            // long axon
const TERM_BOTTOM_Y = AXON_END_Y - 1.8;

const AXON_ALONG_START = 0.25;       // "along" value where axon begins
const AXON_ALONG_END = 0.92;         // and ends (terminals after)

function generateNeuron(particleCount) {
  const rand = mulberry32(11);
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const sizes = new Float32Array(particleCount);
  const seeds = new Float32Array(particleCount);
  // part: 0 = dendrite/soma, 0.5 = axon, 1 = terminal, 2 = nucleus
  const parts = new Float32Array(particleCount);
  // along: position along neuron 0 (top) -> 1 (bottom) — used for gradient and scroll reveal
  const along = new Float32Array(particleCount);

  const nucleusCount = Math.floor(particleCount * 0.03);
  const somaCount    = Math.floor(particleCount * 0.06);
  const dendriteCount= Math.floor(particleCount * 0.30);
  const spineCount   = Math.floor(particleCount * 0.04);
  const axonCount    = Math.floor(particleCount * 0.45);
  const terminalCount= particleCount - nucleusCount - somaCount - dendriteCount - spineCount - axonCount;

  let idx = 0;
  const tmp = new THREE.Vector3();

  // ----- Nucleus -----
  const nucPos = new THREE.Vector3(0, SOMA_Y, 0);
  const nucTilt = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.3, -0.25, 0.15));
  for (let i = 0; i < nucleusCount; i++) {
    const u = rand(), v = rand();
    const theta = u * Math.PI * 2;
    const phi = Math.acos(2 * v - 1);
    const r = Math.cbrt(rand()) * 0.4;
    tmp.set(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta) * 0.65,
      r * Math.cos(phi) * 0.75
    );
    tmp.applyQuaternion(nucTilt);
    tmp.add(nucPos);
    positions[idx*3] = tmp.x; positions[idx*3+1] = tmp.y; positions[idx*3+2] = tmp.z;
    seeds[idx] = rand(); parts[idx] = 2;
    along[idx] = 0.10; // reveal with soma from start
    sizes[idx] = 0.35 + rand() * 0.25;
    idx++;
  }

  // ----- Soma -----
  for (let i = 0; i < somaCount; i++) {
    const u = rand(), v = rand();
    const theta = u * Math.PI * 2;
    const phi = Math.acos(2 * v - 1);
    const r = 0.45 + Math.pow(rand(), 0.6) * 0.7;
    tmp.set(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta) * 0.9,
      r * Math.cos(phi) * 0.85
    );
    tmp.add(nucPos);
    positions[idx*3] = tmp.x; positions[idx*3+1] = tmp.y; positions[idx*3+2] = tmp.z;
    seeds[idx] = rand(); parts[idx] = 0;
    along[idx] = 0.12;
    sizes[idx] = 0.25 + rand() * 0.25;
    idx++;
  }

  // ----- Dendrites: multi-generational bifurcating tree with terminal tufts -----
  // Biologically: primary dendrites (thick) -> secondary -> tertiary -> fine branches -> tufts.
  // Each branch point is a true bifurcation (2 children), angle ~30-50deg, with taper per Rall's law.
  const dendriteSegs = [];
  const dendriteTipPoints = []; // for terminal tufts

  function growBranch(origin, dir, length, thickness, depth, maxDepth) {
    const steps = Math.max(8, Math.floor(length * 14));
    let p = origin.clone();
    let d = dir.clone().normalize();
    for (let s = 0; s < steps; s++) {
      // smaller curl on thick branches, more on thin ones (fine branches wiggle more)
      const curlAmt = 0.05 + (depth / maxDepth) * 0.18;
      const curl = new THREE.Vector3(
        (rand() - 0.5) * curlAmt,
        (rand() - 0.5) * curlAmt * 0.6,
        (rand() - 0.5) * curlAmt
      );
      d.add(curl).normalize();
      const step = length / steps;
      const next = p.clone().add(d.clone().multiplyScalar(step));
      const t = s / steps;
      // Rall's taper: thickness^(3/2) conserved across branches; within a segment, gentle taper.
      const localThick = thickness * (1 - t * 0.55);
      dendriteSegs.push({ p0: p.clone(), p1: next.clone(), thickness: Math.max(0.006, localThick) });
      p = next;
    }
    // At branch end: either bifurcate, or terminate with a tuft
    if (depth < maxDepth) {
      // bifurcate into 2 children with smaller thickness (Rall: d_parent^1.5 = d1^1.5 + d2^1.5)
      // simplified asymmetric split
      const ratio = 0.45 + rand() * 0.1; // 0.45-0.55 split
      const t1 = thickness * Math.pow(ratio, 1/1.5) * 0.95;
      const t2 = thickness * Math.pow(1 - ratio, 1/1.5) * 0.95;
      // branch angle 25-45 degrees off parent
      const perp = (Math.abs(d.y) < 0.9 ? new THREE.Vector3(0,1,0) : new THREE.Vector3(1,0,0));
      const axis = new THREE.Vector3().crossVectors(d, perp).normalize();
      // rotate axis randomly around d so branches fan in 3D
      const spin = rand() * Math.PI * 2;
      const qSpin = new THREE.Quaternion().setFromAxisAngle(d, spin);
      axis.applyQuaternion(qSpin);
      const ang1 = (0.42 + rand() * 0.25) * (0.9 + rand()*0.2);
      const ang2 = -(0.42 + rand() * 0.25) * (0.9 + rand()*0.2);
      const q1 = new THREE.Quaternion().setFromAxisAngle(axis, ang1);
      const q2 = new THREE.Quaternion().setFromAxisAngle(axis, ang2);
      const dir1 = d.clone().applyQuaternion(q1).normalize();
      const dir2 = d.clone().applyQuaternion(q2).normalize();
      const len1 = length * (0.55 + rand() * 0.3);
      const len2 = length * (0.55 + rand() * 0.3);
      growBranch(p.clone(), dir1, len1, t1, depth + 1, maxDepth);
      growBranch(p.clone(), dir2, len2, t2, depth + 1, maxDepth);
      // occasional 3rd small offshoot (trifurcation, rarer)
      if (rand() < 0.15) {
        const q3 = new THREE.Quaternion().setFromAxisAngle(axis.clone().applyQuaternion(new THREE.Quaternion().setFromAxisAngle(d, Math.PI/2)), 0.3 + rand()*0.3);
        const dir3 = d.clone().applyQuaternion(q3).normalize();
        growBranch(p.clone(), dir3, length * 0.4, thickness * 0.35, depth + 1, maxDepth);
      }
    } else {
      // terminal: mark tip for a small tuft of fine fibers
      dendriteTipPoints.push({ p: p.clone(), dir: d.clone(), thickness: thickness * 0.6 });
    }
  }

  // Primary dendrites: 9 thick trunks radiating in all directions (biased upward/outward, not just up).
  // Real neurons have 3-10+ primary dendrites emerging all around the soma.
  const primaryCount = 9;
  for (let i = 0; i < primaryCount; i++) {
    // distribute roughly evenly on a sphere but avoid the axon hillock (downward)
    const angle = (i / primaryCount) * Math.PI * 2 + rand() * 0.4;
    const elev = (rand() - 0.2) * 1.2; // -0.3 .. 1.0 — mostly up/side, rare down
    const dir = new THREE.Vector3(
      Math.cos(angle) * Math.cos(elev * 0.6),
      Math.sin(Math.max(elev, -0.2)) * 0.9 + 0.15,
      Math.sin(angle) * Math.cos(elev * 0.6)
    ).normalize();
    const origin = nucPos.clone().addScaledVector(dir, 0.75);
    // thick primary, ~5 generations of branching — gives realistic fractal look
    const primaryLen = 1.0 + rand() * 0.5;
    const primaryThick = 0.22 + rand() * 0.05;
    growBranch(origin, dir, primaryLen, primaryThick, 0, 5);
  }

  // Terminal tufts: at each tip, sprout 3-6 very fine short fibers in a starburst.
  // This creates the "feathery" look of real dendritic terminals.
  for (const tip of dendriteTipPoints) {
    const nTufts = 3 + Math.floor(rand() * 4);
    for (let j = 0; j < nTufts; j++) {
      // random direction biased along the parent's heading
      const offset = new THREE.Vector3((rand()-0.5)*1.6, (rand()-0.5)*1.6, (rand()-0.5)*1.6);
      const tuftDir = tip.dir.clone().multiplyScalar(0.4).add(offset).normalize();
      const tuftLen = 0.18 + rand() * 0.35;
      growTuft(tip.p, tuftDir, tuftLen, tip.thickness * 0.5);
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
      const t = s / steps;
      dendriteSegs.push({ p0: p.clone(), p1: next.clone(), thickness: Math.max(0.004, thickness * (1 - t * 0.8)) });
      p = next;
    }
  }

  distributeOnSegs(dendriteSegs, dendriteCount, 0, 0.08 /* along */, false);

  // ----- Dendritic spines: tiny bumps scattered along the dendrite shafts -----
  // Real pyramidal cells are covered in them. These are small outliers perpendicular
  // to segment direction, placed on the thicker (proximal) segments mostly.
  (function placeSpines() {
    // weight segments by thickness so spines cluster on visible mid-order dendrites
    let total = 0;
    const weights = [];
    for (const s of dendriteSegs) {
      const w = s.thickness > 0.02 ? s.thickness * s.p0.distanceTo(s.p1) : 0;
      weights.push(w);
      total += w;
    }
    if (total < 1e-6) return;
    let placed = 0;
    while (placed < spineCount) {
      const r = rand() * total;
      let acc = 0;
      let segIdx = 0;
      for (let i = 0; i < weights.length; i++) {
        acc += weights[i];
        if (acc >= r) { segIdx = i; break; }
      }
      const s = dendriteSegs[segIdx];
      const t = rand();
      const base = s.p0.clone().lerp(s.p1, t);
      const dir = s.p1.clone().sub(s.p0).normalize();
      const perpUp = Math.abs(dir.y) < 0.9 ? new THREE.Vector3(0,1,0) : new THREE.Vector3(1,0,0);
      const u = new THREE.Vector3().crossVectors(dir, perpUp).normalize();
      const v = new THREE.Vector3().crossVectors(dir, u).normalize();
      const theta = rand() * Math.PI * 2;
      const spineLen = s.thickness * (1.5 + rand() * 2.5);
      const spine = base.clone()
        .addScaledVector(u, Math.cos(theta) * spineLen)
        .addScaledVector(v, Math.sin(theta) * spineLen);
      if (idx >= particleCount) return;
      positions[idx*3] = spine.x; positions[idx*3+1] = spine.y; positions[idx*3+2] = spine.z;
      seeds[idx] = rand();
      parts[idx] = 0;
      along[idx] = 0.09;
      sizes[idx] = 0.14 + rand() * 0.12;
      idx++;
      placed++;
    }
  })();

  // ----- Axon hillock (cone connecting soma to axon) -----
  // The axon hillock is the tapered cone-shaped region where the axon emerges
  // from the soma. It's a key biological landmark — the action-potential trigger zone.
  // We model it as a cone from (0, SOMA_Y - 0.55, 0) to (0, AXON_START_Y, 0),
  // widening back into the soma and narrowing down to match the axon thickness.
  const hillockTop = SOMA_Y - 0.55;    // inside the soma sphere
  const hillockBottom = AXON_START_Y;  // meets the axon
  const hillockTopRadius = 0.85;       // blends with soma surface
  const hillockBottomRadius = 0.14;    // matches axon thickness
  const hillockSteps = 14;
  const hillockSegs = [];
  for (let i = 0; i < hillockSteps; i++) {
    const t0 = i / hillockSteps;
    const t1 = (i + 1) / hillockSteps;
    const y0 = hillockTop + (hillockBottom - hillockTop) * t0;
    const y1 = hillockTop + (hillockBottom - hillockTop) * t1;
    // slight easing so cone tapers sharply near the bottom like real hillocks
    const r0 = hillockTopRadius + (hillockBottomRadius - hillockTopRadius) * Math.pow(t0, 0.7);
    const r1 = hillockTopRadius + (hillockBottomRadius - hillockTopRadius) * Math.pow(t1, 0.7);
    hillockSegs.push({
      p0: new THREE.Vector3(0, y0, 0),
      p1: new THREE.Vector3(0, y1, 0),
      thickness: (r0 + r1) * 0.5,
      alongOverride: 0.14 + t0 * 0.08
    });
  }

  // ----- Axon (long) — now starts exactly at hillock bottom (0, AXON_START_Y, 0) -----
  const axonCurvePoints = [];
  const axonSteps = 220;
  for (let i = 0; i <= axonSteps; i++) {
    const t = i / axonSteps;
    const y = AXON_START_Y + (AXON_END_Y - AXON_START_Y) * t;
    // Ramp sway/depth from 0 at t=0 so the axon leaves the hillock straight,
    // then gradually adopts its curve — no instant jog offsetting it from the soma.
    const ramp = Math.min(1, t * 5); // 0→1 over first 20% of axon
    const sway = Math.sin(t * Math.PI * 3.0) * 1.3 * (0.3 + t * 0.7) * ramp;
    const depth = Math.sin(t * Math.PI * 2.1 + 1.3) * 0.6 * ramp;
    axonCurvePoints.push(new THREE.Vector3(sway, y, depth));
  }
  // Spawn hillock particles — pulled from the axon budget so counts stay stable
  const hillockParticleCount = Math.floor(axonCount * 0.10);
  const axonCountAdjusted = axonCount - hillockParticleCount;
  distributeOnSegs(hillockSegs, hillockParticleCount, 0, null, false);
  const axonSegs = [];
  for (let i = 0; i < axonCurvePoints.length - 1; i++) {
    const t = i / (axonCurvePoints.length - 1);
    axonSegs.push({ p0: axonCurvePoints[i], p1: axonCurvePoints[i+1], thickness: 0.13 - t * 0.03, along: t });
  }
  // myelin / nodes
  for (const seg of axonSegs) {
    const phase = (seg.along * 10) % 1;
    let mult;
    if (phase < 0.12 || phase > 0.88) mult = 0.5;
    else { const x = (phase - 0.5) / 0.38; mult = 1.0 + Math.cos(x * Math.PI) * 0.35; }
    seg.thickness *= mult;
    seg.alongOverride = AXON_ALONG_START + seg.along * (AXON_ALONG_END - AXON_ALONG_START);
  }
  distributeOnSegs(axonSegs, axonCountAdjusted, 0.5, null, true);

  // ----- Terminals -----
  const termSegs = [];
  const termOrigin = axonCurvePoints[axonCurvePoints.length - 1].clone();
  // simple terminal grow (the old recursive branching style, scoped to terminals only)
  function growTerm(origin, dir, length, thickness, depth, maxDepth, collect) {
    const steps = Math.max(8, Math.floor(length * 14));
    let p = origin.clone();
    let d = dir.clone().normalize();
    for (let s = 0; s < steps; s++) {
      const curl = new THREE.Vector3((rand()-0.5)*0.18, (rand()-0.5)*0.10, (rand()-0.5)*0.18);
      d.add(curl).normalize();
      const step = length / steps;
      const next = p.clone().add(d.clone().multiplyScalar(step));
      const t = s / steps;
      const localThick = thickness * (1 - t * 0.85);
      collect.push({ p0: p.clone(), p1: next.clone(), thickness: Math.max(0.006, localThick) });
      p = next;
      if (depth < maxDepth && s > 2 && s < steps - 2 && rand() < 0.14) {
        const perp = new THREE.Vector3(-d.y, d.x, d.z).normalize();
        const branchDir = d.clone().add(perp.multiplyScalar((rand()-0.5)*1.5 + (rand()<0.5?0.8:-0.8)));
        branchDir.y -= rand() * 0.3;
        branchDir.normalize();
        growTerm(p.clone(), branchDir, length * (0.45 + rand()*0.35), thickness * 0.55, depth+1, maxDepth, collect);
      }
    }
  }
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2 + rand() * 0.4;
    const dir = new THREE.Vector3(Math.cos(angle) * 0.7, -0.55 - rand() * 0.4, Math.sin(angle) * 0.7).normalize();
    growTerm(termOrigin.clone(), dir, 1.2 + rand() * 0.9, 0.08, 0, 2, termSegs);
  }
  distributeOnSegs(termSegs, terminalCount, 1, 0.96, false);

  function distributeOnSegs(segs, count, partValue, alongOverride, isAxon) {
    let totalW = 0;
    for (const s of segs) {
      s.len = s.p0.distanceTo(s.p1);
      s.weight = s.thickness * s.len;
      totalW += s.weight;
    }
    let placed = 0;
    for (let si = 0; si < segs.length; si++) {
      const s = segs[si];
      const n = Math.max(1, Math.round((s.weight / totalW) * count));
      for (let i = 0; i < n && placed < count; i++) {
        const t = rand();
        const p = s.p0.clone().lerp(s.p1, t);
        const dir = s.p1.clone().sub(s.p0).normalize();
        const up = Math.abs(dir.y) < 0.9 ? new THREE.Vector3(0,1,0) : new THREE.Vector3(1,0,0);
        const u = new THREE.Vector3().crossVectors(dir, up).normalize();
        const vVec = new THREE.Vector3().crossVectors(dir, u).normalize();
        const gauss = (rand() + rand() + rand() - 1.5) * 0.7;
        const gauss2 = (rand() + rand() + rand() - 1.5) * 0.7;
        const scatter = s.thickness * (1 + rand() * 0.6);
        p.addScaledVector(u, gauss * scatter);
        p.addScaledVector(vVec, gauss2 * scatter);
        if (rand() < 0.035) {
          p.addScaledVector(u, (rand() - 0.5) * scatter * 4);
          p.addScaledVector(vVec, (rand() - 0.5) * scatter * 4);
        }
        positions[idx*3] = p.x; positions[idx*3+1] = p.y; positions[idx*3+2] = p.z;
        seeds[idx] = rand();
        parts[idx] = partValue;
        // along value: axon uses per-segment along, others use provided override with jitter
        if (isAxon && s.alongOverride !== undefined) {
          along[idx] = s.alongOverride;
        } else {
          along[idx] = alongOverride + (rand() - 0.5) * 0.02;
        }
        sizes[idx] = isAxon ? (0.22 + rand() * 0.28) : (0.20 + rand() * 0.30);
        idx++; placed++;
      }
    }
  }

  while (idx < particleCount) {
    positions[idx*3] = 0; positions[idx*3+1] = SOMA_Y; positions[idx*3+2] = 0;
    seeds[idx] = rand(); parts[idx] = 0; along[idx] = 0.1; sizes[idx] = 0.25;
    idx++;
  }

  return { positions, colors, sizes, seeds, parts, along };
}

// ---- colors ----
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
  const n = along.length;
  for (let i = 0; i < n; i++) {
    const a = along[i], part = parts[i];
    let c;
    if (part > 1.5) c = lerp3(nucC, lerp3(nucC, topC, 0.25), seeds[i] * 0.3);
    else {
      if (a < 0.5) c = lerp3(topC, midC, a * 2);
      else c = lerp3(midC, botC, (a - 0.5) * 2);
      const j = (seeds[i] - 0.5) * 0.16;
      c = [
        Math.max(0, Math.min(1, c[0] + j)),
        Math.max(0, Math.min(1, c[1] + j * 0.5)),
        Math.max(0, Math.min(1, c[2] - j * 0.5))
      ];
    }
    colors[i*3] = c[0]; colors[i*3+1] = c[1]; colors[i*3+2] = c[2];
  }
}

// ---- Glyph texture atlas for "1/C" shape ----
function makeGlyphAtlas() {
  const size = 128;
  const atlas = document.createElement('canvas');
  atlas.width = size * 2; atlas.height = size;
  const ctx = atlas.getContext('2d');
  ctx.clearRect(0, 0, size*2, size);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${size * 0.9}px "Helvetica Neue", Arial, sans-serif`;
  ctx.fillText('1', size * 0.5, size * 0.5);
  ctx.fillText('C', size * 1.5, size * 0.5);
  const tex = new THREE.CanvasTexture(atlas);
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 4;
  return tex;
}
const glyphTex = makeGlyphAtlas();

// ---- shader material ----
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
    vColor = color;
    vSeed = aSeed;

    // Only axon particles have micro-shimmer along their length; everything else is static.
    vec3 displaced = position;
    if (aPart > 0.25 && aPart < 0.75) {
      float t = uTime * (0.5 + aSeed * 0.6);
      float amp = 0.006;
      displaced += vec3(sin(t + aSeed*6.28) * amp, 0.0, cos(t*0.8 + aSeed*3.14) * amp);
    }

    vec4 mv = modelViewMatrix * vec4(displaced, 1.0);
    gl_Position = projectionMatrix * mv;

    float baseSize = aSize * uSizeScale * uPixelRatio;
    gl_PointSize = baseSize * (300.0 / -mv.z);

    float depth = -mv.z;
    float depthFade = smoothstep(60.0, 6.0, depth) * 0.85 + 0.15;
    vAlpha = depthFade;
  }
`;

const fragmentShader = /* glsl */`
  precision highp float;
  varying vec3 vColor;
  varying float vAlpha;
  varying float vSeed;
  uniform int uShape;
  uniform sampler2D uGlyph;

  void main() {
    if (vAlpha < 0.01) discard;
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    float a = 1.0;

    if (uShape == 0) {
      // circle, sharp
      if (d > 0.5) discard;
    } else if (uShape == 1) {
      // square - just draw full quad
      if (max(abs(uv.x), abs(uv.y)) > 0.45) discard;
    } else if (uShape == 2) {
      // diamond
      if (abs(uv.x) + abs(uv.y) > 0.5) discard;
    } else if (uShape == 3) {
      // ring
      if (d > 0.5 || d < 0.28) discard;
    } else if (uShape == 4) {
      // cross (+)
      float thick = 0.14;
      bool inX = abs(uv.y) < thick && abs(uv.x) < 0.48;
      bool inY = abs(uv.x) < thick && abs(uv.y) < 0.48;
      if (!(inX || inY)) discard;
    } else if (uShape == 5) {
      // glyph: pick 1 or C based on seed
      float pick = step(0.5, vSeed); // 0 => "1", 1 => "C"
      vec2 tuv;
      // gl_PointCoord origin: top-left. Flip Y for canvas texture.
      vec2 local = vec2(gl_PointCoord.x, 1.0 - gl_PointCoord.y);
      tuv.x = pick * 0.5 + local.x * 0.5;
      tuv.y = local.y;
      vec4 s = texture2D(uGlyph, tuv);
      if (s.a < 0.4) discard;
      a = s.a;
    }

    gl_FragColor = vec4(vColor, vAlpha * a);
  }
`;

function buildNeuron() {
  if (points) {
    geometry.dispose();
    material.dispose();
    neuronGroup.remove(points);
  }
  data = generateNeuron(state.count);
  applyColors(data);
  geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(data.colors, 3));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(data.sizes, 1));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(data.seeds, 1));
  geometry.setAttribute('aAlong', new THREE.BufferAttribute(data.along, 1));
  geometry.setAttribute('aPart', new THREE.BufferAttribute(data.parts, 1));

  material = new THREE.ShaderMaterial({
    vertexShader, fragmentShader,
    vertexColors: true, transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
    uniforms: {
      uTime: { value: 0 },
      uSizeScale: { value: state.size / 100 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      uScrollT: { value: 0.15 },
      uShape: { value: SHAPE_MAP[state.shape] || 0 },
      uGlyph: { value: glyphTex }
    }
  });

  points = new THREE.Points(geometry, material);
  neuronGroup.add(points);
  neuronGroup.scale.setScalar(state.scale / 100);
}

function recolor() {
  if (!data) return;
  applyColors(data);
  geometry.attributes.color.needsUpdate = true;
}

// ---- resize ----
function resize() {
  const w = canvas.clientWidth || canvas.parentElement.clientWidth;
  const h = canvas.clientHeight || canvas.parentElement.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  if (material) material.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2);
}
window.addEventListener('resize', resize);

// ---- scroll-driven rotation + axon reveal ----
let timelineT = 0;
let scrollMomentum = 0;
let lastScroll = window.scrollY;
let currentScrollT = 0.15;

function updateScroll() {
  const timeline = document.getElementById('timeline');
  const rect = timeline.getBoundingClientRect();
  const vh = window.innerHeight;
  const start = window.scrollY + rect.top - vh * 0.5;
  const end = window.scrollY + rect.bottom - vh * 0.5;
  const t = Math.max(0, Math.min(1, (window.scrollY - start) / (end - start)));
  timelineT = t;

  lastScroll = window.scrollY;

  const items = document.querySelectorAll('.tl-item');
  const dots = document.querySelectorAll('#progress .dot');
  let activeIdx = 0, bestDist = Infinity;
  items.forEach((el, i) => {
    const r = el.getBoundingClientRect();
    const center = r.top + r.height / 2;
    const dist = Math.abs(center - vh / 2);
    if (dist < bestDist) { bestDist = dist; activeIdx = i; }
  });
  items.forEach((el, i) => el.classList.toggle('active', i === activeIdx));
  dots.forEach((el, i) => el.classList.toggle('active', i === activeIdx));
}
window.addEventListener('scroll', updateScroll, { passive: true });

// ---- render loop ----
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const elapsed = clock.elapsedTime;

  // Camera pans down through the neuron — DIRECT binding, no easing.
  const topY = SOMA_Y + 0.5;
  const bottomY = TERM_BOTTOM_Y + 2.5;
  camera.position.y = topY + timelineT * (bottomY - topY);
  camera.lookAt(0, camera.position.y, 0);

  // Scroll-only rotation — DIRECT binding, no easing.
  neuronGroup.rotation.y = timelineT * Math.PI * 0.9 * (state.speed / 100);
  neuronGroup.rotation.z = 0.0;
  neuronGroup.rotation.x = 0.0;

  if (material) {
    material.uniforms.uTime.value = elapsed;
  }
  renderer.render(scene, camera);
}

buildNeuron();
resize();
setTimeout(resize, 50);
updateScroll();
animate();

