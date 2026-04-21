/* ============================================================
   ONE CARBON — 3-D Particle Brain
   Two hemispheres + cerebellum + brain stem
   DPR-sharp · depth-shaded blue · drag-to-rotate + auto-spin
   ============================================================ */
(function () {
  var canvas = document.getElementById('neuron-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');

  /* ── Appearance ── */
  var BG       = '#F7F5F0';
  var FOV      = 800;
  var Z_OFFSET = 500;

  /* Dark navy (back) → accent blue (mid) → pale sky (front) */
  var C0 = { r: 14,  g: 28,  b: 72  };
  var C1 = { r: 69,  g: 107, b: 183 };
  var C2 = { r: 168, g: 204, b: 248 };

  function depthColor(t) {
    t = Math.max(0, Math.min(1, t));
    var lo, hi, u;
    if (t < 0.5) { lo = C0; hi = C1; u = t * 2; }
    else          { lo = C1; hi = C2; u = (t - 0.5) * 2; }
    return 'rgb(' +
      Math.round(lo.r + (hi.r - lo.r) * u) + ',' +
      Math.round(lo.g + (hi.g - lo.g) * u) + ',' +
      Math.round(lo.b + (hi.b - lo.b) * u) + ')';
  }

  /* ── State ── */
  var W, H, cx, cy, dpr;
  var rotY = 0.4;
  var rotX = 0.18;
  var velX = 0, velY = 0;
  var dragging = false;
  var lastX, lastY;

  /* ── Geometry ── */
  var pts   = [];
  var proj  = [];
  var order = [];

  /* Gyri surface noise — simulates cortical folds */
  function gyri(theta, phi) {
    return (
      0.11 * Math.sin(4.1 * phi) * Math.sin(3.3 * theta) +
      0.07 * Math.sin(7.6 * phi + 0.5) * Math.cos(5.9 * theta + 0.9) +
      0.05 * Math.sin(11.2 * phi + 1.1) * Math.sin(9.1 * theta + 0.4) +
      0.03 * Math.sin(16.0 * phi) * Math.cos(13.0 * theta + 0.7)
    );
  }

  /* Add one hemisphere (side: +1=right, -1=left) */
  function addHemisphere(n, side) {
    var RX = 354, RY = 300, RZ = 390;   /* 3× original */
    var OFFSET_X = side * 27;
    var FISSURE  = 27;
    var count = 0;

    while (count < n) {
      var theta = Math.random() * Math.PI * 2;
      var phi   = Math.acos(1 - 2 * Math.random());

      var sx = Math.sin(phi) * Math.cos(theta);
      var sy = Math.cos(phi);
      var sz = Math.sin(phi) * Math.sin(theta);

      if (side > 0 && sx < 0) continue;
      if (side < 0 && sx > 0) continue;

      var gn = gyri(theta, phi);
      var r  = (1 + gn) * (0.82 + Math.random() * 0.22);

      var x = OFFSET_X + sx * RX * r;
      var y = sy * RY * r;
      var z = sz * RZ * r;

      if (Math.abs(x) < FISSURE) continue;
      if (y > RY * 0.82) continue;

      pts.push({ x: x, y: y, z: z, baseR: 0.37 + Math.random() * 0.57 });
      count++;
    }
  }

  /* Cerebellum */
  function addCerebellum(n) {
    var CY = 234, CZ = -165, R = 168;  /* 3× original */
    var count = 0;
    while (count < n) {
      var theta = Math.random() * Math.PI * 2;
      var phi   = Math.acos(1 - 2 * Math.random());
      var sx = Math.sin(phi) * Math.cos(theta);
      var sy = Math.cos(phi);
      var sz = Math.sin(phi) * Math.sin(theta);

      var gn = 0.09 * Math.sin(9 * phi) * Math.sin(7 * theta)
             + 0.05 * Math.sin(16 * phi) * Math.cos(12 * theta);
      var r = (1 + gn) * (0.80 + Math.random() * 0.24);

      if (sy < -0.5) continue;

      pts.push({
        x: sx * R * r,
        y: CY + sy * R * r * 0.72,
        z: CZ + sz * R * r * 0.88,
        baseR: 0.3 + Math.random() * 0.4
      });
      count++;
    }
  }

  /* Brain stem */
  function addBrainStem(n) {
    for (var i = 0; i < n; i++) {
      var angle = Math.random() * Math.PI * 2;
      var t = Math.random();
      var rad = 72 * (1 - t * 0.45);   /* 3× original */
      pts.push({
        x: Math.cos(angle) * rad * (0.65 + Math.random() * 0.35),
        y: 234 + t * 240,              /* 3× original */
        z: -54 + Math.sin(angle) * rad * (0.65 + Math.random() * 0.35),
        baseR: 0.23 + Math.random() * 0.33
      });
    }
  }

  /* Interior volume */
  function addInterior(n) {
    for (var i = 0; i < n; i++) {
      var theta = Math.random() * Math.PI * 2;
      var phi   = Math.acos(1 - 2 * Math.random());
      var r = Math.random() * 0.55;
      pts.push({
        x: Math.sin(phi) * Math.cos(theta) * 315 * r,   /* 3× */
        y: Math.cos(phi) * 264 * r,                      /* 3× */
        z: Math.sin(phi) * Math.sin(theta) * 354 * r,    /* 3× */
        baseR: 0.17 + Math.random() * 0.27
      });
    }
  }

  function init() {
    pts.length = 0;
    addHemisphere(2200, +1);
    addHemisphere(2200, -1);
    addCerebellum(600);
    addBrainStem(220);
    addInterior(350);
    proj  = new Array(pts.length);
    order = pts.map(function (_, i) { return i; });
  }

  /* ── 3-D projection ── */
  function project(x, y, z) {
    var cosY = Math.cos(rotY), sinY = Math.sin(rotY);
    var x1 =  x * cosY + z * sinY;
    var z1 = -x * sinY + z * cosY;
    var cosX = Math.cos(rotX), sinX = Math.sin(rotX);
    var y2 =  y * cosX - z1 * sinX;
    var z2 =  y * sinX + z1 * cosX;
    var s = FOV / (FOV + z2 + Z_OFFSET);
    return { sx: cx + x1 * s, sy: cy + y2 * s, scale: s, z: z2 };
  }

  /* depth-colour range (Z extent ≈ ±420 after 3× scale) */
  var S_MIN = FOV / (FOV + 420 + Z_OFFSET);
  var S_MAX = FOV / (FOV - 420 + Z_OFFSET);
  var S_RNG = S_MAX - S_MIN;

  /* ── Draw ── */
  function draw() {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);

    var i, idx, p, r, t;

    for (i = 0; i < pts.length; i++) {
      proj[i] = project(pts[i].x, pts[i].y, pts[i].z);
    }

    order.sort(function (a, b) { return proj[a].z - proj[b].z; });

    for (var n = 0; n < order.length; n++) {
      idx = order[n];
      p   = proj[idx];
      r   = Math.max(0.3, pts[idx].baseR * p.scale * 2.7);  /* 1/3 size */
      t   = (p.scale - S_MIN) / S_RNG;
      ctx.beginPath();
      ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2);
      ctx.fillStyle = depthColor(t);
      ctx.fill();
    }
  }

  /* ── Animation loop ── */
  function loop() {
    if (!dragging) {
      rotY += velX;
      rotX += velY;
      velX *= 0.91;
      velY *= 0.91;

      if (Math.abs(velX) < 0.0008 && Math.abs(velY) < 0.0008) {
        rotY += 0.0035;
        rotX += (0.18 + Math.sin(rotY * 0.24) * 0.09 - rotX) * 0.015;
      }
    }
    rotX = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, rotX));

    draw();
    requestAnimationFrame(loop);
  }

  /* ── Resize (DPR-aware) ── */
  function resize() {
    dpr = window.devicePixelRatio || 1;
    var rect = canvas.getBoundingClientRect();
    W = rect.width;
    H = rect.height;
    cx = W / 2;
    cy = H / 2 - 10;
    canvas.width  = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /* ── Drag interaction ── */
  function onDown(x, y) {
    dragging = true;
    lastX = x; lastY = y;
    velX = velY = 0;
    canvas.style.cursor = 'grabbing';
  }
  function onMove(x, y) {
    if (!dragging) return;
    velX = (x - lastX) * 0.0075;
    velY = (y - lastY) * 0.0075;
    rotY += velX;
    rotX += velY;
    lastX = x; lastY = y;
  }
  function onUp() {
    dragging = false;
    canvas.style.cursor = 'grab';
  }

  canvas.style.cursor = 'grab';

  canvas.addEventListener('mousedown', function (e) { onDown(e.clientX, e.clientY); });
  window.addEventListener('mousemove', function (e) { onMove(e.clientX, e.clientY); });
  window.addEventListener('mouseup', onUp);

  canvas.addEventListener('touchstart', function (e) {
    e.preventDefault();
    onDown(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: false });
  canvas.addEventListener('touchmove', function (e) {
    e.preventDefault();
    onMove(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: false });
  canvas.addEventListener('touchend', function (e) {
    e.preventDefault(); onUp();
  }, { passive: false });

  resize();
  init();
  loop();

  window.addEventListener('resize', resize);
})();
