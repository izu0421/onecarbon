/* ============================================================
   ONE CARBON — 3-D Neuron  |  sharp particles, no edges
   DPR-aware canvas · depth-shaded blue · perspective spin
   ============================================================ */
(function () {
  var canvas = document.getElementById('neuron-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');

  /* ── Config ── */
  var FOV      = 520;
  var Z_OFFSET = 320;
  var SCALE    = 1.55;   // overall neuron size multiplier
  var BG       = '#F7F5F0';

  /* depth colour stops: back(dark navy) → mid(accent) → front(pale blue) */
  var STOPS = [
    { t: 0,    r: 18,  g: 36,  b: 85  },
    { t: 0.5,  r: 69,  g: 107, b: 183 },
    { t: 1,    r: 162, g: 198, b: 242 },
  ];

  var W, H, cx, cy, dpr;
  var rotY = 0;
  var rotX = 0.22;
  var pts  = [];

  /* ── Depth → colour ── */
  function depthColor(t) {
    t = Math.max(0, Math.min(1, t));
    var lo, hi;
    if (t <= 0.5) { lo = STOPS[0]; hi = STOPS[1]; t = t / 0.5; }
    else           { lo = STOPS[1]; hi = STOPS[2]; t = (t - 0.5) / 0.5; }
    var r = Math.round(lo.r + (hi.r - lo.r) * t);
    var g = Math.round(lo.g + (hi.g - lo.g) * t);
    var b = Math.round(lo.b + (hi.b - lo.b) * t);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  /* ── Geometry helpers ── */
  function randn() { return (Math.random() + Math.random() + Math.random() - 1.5) * 0.85; }

  function addSphere(n, radius, ox, oy, oz, noise) {
    for (var i = 0; i < n; i++) {
      var theta = Math.acos(2 * Math.random() - 1);
      var phi   = Math.random() * Math.PI * 2;
      var r     = radius * (0.35 + Math.random() * 0.65);
      pts.push({
        x: (ox + r * Math.sin(theta) * Math.cos(phi) + randn() * noise) * SCALE,
        y: (oy + r * Math.sin(theta) * Math.sin(phi) + randn() * noise) * SCALE,
        z: (oz + r * Math.cos(theta)                 + randn() * noise) * SCALE,
        baseR: 1.4 + Math.random() * 1.8
      });
    }
  }

  function addBranch(n, ox, oy, oz, dx, dy, dz, length, noise, depth) {
    var len = Math.sqrt(dx*dx + dy*dy + dz*dz);
    var ndx = dx/len, ndy = dy/len, ndz = dz/len;
    for (var i = 0; i < n; i++) {
      var t = (i / Math.max(n - 1, 1)) * length;
      pts.push({
        x: (ox + ndx * t + randn() * noise) * SCALE,
        y: (oy + ndy * t + randn() * noise) * SCALE,
        z: (oz + ndz * t + randn() * noise) * SCALE,
        baseR: 0.7 + Math.random() * 1.2
      });
    }
    if (depth > 0) {
      var numSubs = 2 + Math.floor(Math.random() * 2);
      for (var s = 0; s < numSubs; s++) {
        var t2  = length * (0.35 + Math.random() * 0.45);
        addBranch(
          Math.ceil(n * 0.45),
          ox + ndx * t2, oy + ndy * t2, oz + ndz * t2,
          ndx * 0.4 + (Math.random()-0.5)*1.6,
          ndy * 0.4 + (Math.random()-0.5)*1.6,
          ndz * 0.4 + (Math.random()-0.5)*1.6,
          length * 0.55, noise * 0.8, depth - 1
        );
      }
    }
  }

  /* ── Build neuron ── */
  function init() {
    pts.length = 0;

    addSphere(240, 72, 0, 0, 0, 10);

    var dirs = [
      [ 1.0,  0.4,  0.5],
      [-1.0,  0.3, -0.4],
      [ 0.3,  1.0,  0.3],
      [-0.2, -1.0,  0.3],
      [ 0.6, -0.5,  1.0],
      [-0.7,  0.4, -1.0],
      [ 0.1,  0.9, -0.7],
    ];
    dirs.forEach(function (d) {
      addBranch(80, 0, 0, 0, d[0], d[1], d[2], 155 + Math.random() * 80, 15, 2);
    });

    addBranch(120, 0, 0, 0, 0.08, -1, 0.12, 280, 8, 1);
    addSphere(38, 22,  26, -280,  30, 5);
    addSphere(32, 18, -22, -263,  44, 5);
    addSphere(32, 18,  42, -270, -18, 5);
  }

  /* ── Projection ── */
  function project(x, y, z) {
    var cosY = Math.cos(rotY), sinY = Math.sin(rotY);
    var x1 =  x * cosY + z * sinY;
    var z1 = -x * sinY + z * cosY;

    var cosX = Math.cos(rotX), sinX = Math.sin(rotX);
    var y2 =  y * cosX - z1 * sinX;
    var z2 =  y * sinX + z1 * cosX;

    var scale = FOV / (FOV + z2 + Z_OFFSET);
    return { sx: cx + x1 * scale, sy: cy + y2 * scale, scale: scale, z: z2 };
  }

  /* ── Draw ── */
  var SCALE_MIN = FOV / (FOV + 300 * SCALE + Z_OFFSET);
  var SCALE_MAX = FOV / (FOV - 300 * SCALE + Z_OFFSET);
  var SCALE_RNG = SCALE_MAX - SCALE_MIN;

  var proj = new Array(pts.length);
  var order = [];

  function draw() {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);

    for (var i = 0; i < pts.length; i++) {
      proj[i] = project(pts[i].x, pts[i].y, pts[i].z);
    }

    if (order.length !== pts.length) {
      order = pts.map(function (_, i) { return i; });
    }
    order.sort(function (a, b) { return proj[a].z - proj[b].z; });

    for (var n = 0; n < order.length; n++) {
      var idx = order[n];
      var p   = proj[idx];
      var r   = Math.max(0.4, pts[idx].baseR * p.scale * 2.4);
      var t   = (p.scale - SCALE_MIN) / SCALE_RNG;
      ctx.beginPath();
      ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2);
      ctx.fillStyle = depthColor(t);
      ctx.fill();
    }
  }

  /* ── Loop ── */
  function loop() {
    rotY += 0.004;
    rotX  = 0.22 + Math.sin(rotY * 0.27) * 0.12;
    draw();
    requestAnimationFrame(loop);
  }

  /* ── Resize ── */
  function resize() {
    dpr = window.devicePixelRatio || 1;
    var rect = canvas.getBoundingClientRect();
    W = rect.width;
    H = rect.height;
    cx = W / 2;
    cy = H / 2;
    canvas.width  = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  resize();
  init();
  loop();

  window.addEventListener('resize', function () { resize(); });
})();
