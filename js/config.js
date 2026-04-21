// ─────────────────────────────────────────────────────────────
// NEURON CONFIG — edit these values in VS Code, save, refresh browser.
// All numbers are the same scale as the Tweaks panel used.
// ─────────────────────────────────────────────────────────────
export const NEURON_CONFIG = {
  // Number of particles. Higher = richer but heavier on GPU.
  // Mobile tip: drop to ~12000 on small screens.
  count: 40000,

  // Scroll rotation speed (100 = default, 0 = locked, 200 = twice the spin)
  speed: 100,

  // Particle size multiplier. 45 matches what you had in the preview.
  size: 45,

  // Overall neuron scale. 110 matches what you had in the preview.
  scale: 110,

  // Particle shape: "round", "square", "glyph" (neuron-shaped), "cross", "dash", "star"
  shape: "glyph",

  // Colors (use your brand accent or anything)
  colorOuter:   "#456BB7",   // dendrites
  colorMid:     "#2f4f8f",   // axon
  colorInner:   "#a8ccf8",   // terminals
  colorNucleus: "#ff6600"    // nucleus
};
