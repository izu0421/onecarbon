/* ============================================================
   OneCarbon — Cognitive Test Battery
   ------------------------------------------------------------
   Browser re-implementations of the UK Biobank cognitive tasks
   used in the AD-FA analysis. Each task produces the same outcome
   measure as the corresponding UKB field:

     Reaction time ("Snap")        -> cog_rt      (mean ms)
     Numeric memory                -> cog_numeric (max digits)
     Symbol digit substitution     -> cog_symbol  (count correct)
     Paired associate learning     -> cog_pal     (count correct)
     Matrix pattern completion     -> cog_matrix  (count correct)
     Trail making A (numeric)      -> cog_tmta    (ms)
     Trail making B (alternating)  -> cog_tmtb    (ms)

   All content (words, symbols, matrix patterns) is original and
   generated here — none is copied from the UKB instruments.

   Usage:
     CognitiveTests.start(containerEl, {
       onProgress: function(done, total) { ... },
       onComplete: function(results) { ... }   // results keyed by field name
     });
   ============================================================ */

(function (global) {
  'use strict';

  // ---- Inject styles (kept with the logic so the module is self-contained) ----
  var STYLE_ID = 'cog-test-styles';
  if (!document.getElementById(STYLE_ID)) {
    var css = '' +
      '.cog-wrap{max-width:560px;margin:0 auto;text-align:center;}' +
      '.cog-instructions{background:var(--surface);border:1px solid var(--border);padding:28px 24px;margin-bottom:8px;text-align:left;}' +
      '.cog-instructions h3{font-family:"DM Sans",sans-serif;font-weight:500;font-size:1.2rem;margin-bottom:10px;color:var(--text);}' +
      '.cog-instructions p{font-size:0.95rem;color:var(--text-muted);margin-bottom:10px;line-height:1.6;}' +
      '.cog-instructions .cog-eg{font-size:0.85rem;color:var(--text-faint);}' +
      '.cog-stage{background:var(--surface);border:1px solid var(--border);padding:32px 24px;min-height:240px;display:flex;flex-direction:column;align-items:center;justify-content:center;}' +
      '.cog-prompt{font-size:0.9rem;color:var(--text-faint);margin-bottom:18px;}' +
      '.cog-bignum{font-family:"DM Sans",sans-serif;font-weight:600;font-size:3rem;letter-spacing:0.15em;color:var(--text);}' +
      '.cog-btn{background:var(--accent);border:none;padding:13px 34px;font-family:"Outfit",sans-serif;font-size:0.95rem;color:#fff;cursor:pointer;border-radius:var(--radius-pill);transition:background .2s;}' +
      '.cog-btn:hover{background:var(--accent-dark);}' +
      '.cog-btn:disabled{opacity:.4;cursor:not-allowed;}' +
      '.cog-btn-ghost{background:none;border:1px solid var(--border);color:var(--text-muted);}' +
      '.cog-btn-ghost:hover{border-color:var(--text-muted);background:none;}' +
      '.cog-actions{display:flex;gap:12px;justify-content:center;align-items:center;margin-top:18px;}' +
      '.cog-input{font-family:"DM Sans",sans-serif;font-size:1.6rem;text-align:center;letter-spacing:0.15em;padding:10px 16px;border:1px solid var(--border);width:220px;color:var(--text);background:var(--surface);}' +
      '.cog-progress{font-size:0.8rem;color:var(--text-faint);margin-bottom:16px;text-transform:uppercase;letter-spacing:0.08em;}' +
      '.cog-cards{display:flex;gap:24px;justify-content:center;margin-bottom:8px;}' +
      '.cog-card{width:96px;height:120px;border:1px solid var(--border);background:var(--surface);display:flex;align-items:center;justify-content:center;font-size:2.6rem;}' +
      '.cog-key{display:grid;grid-template-columns:repeat(6,1fr);gap:6px;margin-bottom:20px;width:100%;max-width:420px;}' +
      '.cog-key-cell{border:1px solid var(--border);padding:8px 0;}' +
      '.cog-key-sym{font-size:1.5rem;line-height:1;}' +
      '.cog-key-dig{font-size:0.85rem;color:var(--text-faint);margin-top:4px;}' +
      '.cog-target-sym{font-size:3.4rem;margin:6px 0 18px;}' +
      '.cog-digits{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;}' +
      '.cog-digit-btn{width:52px;height:52px;border:1px solid var(--border);background:var(--surface);font-size:1.3rem;font-family:"DM Sans",sans-serif;cursor:pointer;color:var(--text);transition:border-color .15s,background .15s;}' +
      '.cog-digit-btn:hover{border-color:var(--accent);}' +
      '.cog-pairs{display:grid;grid-template-columns:1fr 1fr;gap:10px 28px;margin:8px 0 4px;text-align:left;max-width:420px;width:100%;}' +
      '.cog-pair-row{display:contents;}' +
      '.cog-pair-a{font-family:"DM Sans",sans-serif;font-weight:500;color:var(--text);}' +
      '.cog-pair-b{color:var(--accent);}' +
      '.cog-choices{display:flex;flex-direction:column;gap:8px;width:100%;max-width:360px;margin-top:8px;}' +
      '.cog-choice{padding:12px 16px;border:1px solid var(--border);background:var(--surface);cursor:pointer;font-size:0.95rem;color:var(--text);transition:border-color .15s,background .15s;}' +
      '.cog-choice:hover{border-color:var(--accent);background:rgba(69,107,183,0.05);}' +
      '.cog-matrix-grid{display:grid;grid-template-columns:repeat(3,72px);grid-template-rows:repeat(3,72px);gap:6px;justify-content:center;margin-bottom:18px;}' +
      '.cog-matrix-cell{border:1px solid var(--border);background:var(--surface);display:flex;align-items:center;justify-content:center;}' +
      '.cog-matrix-cell.cog-missing{border-style:dashed;border-color:var(--accent);font-size:1.8rem;color:var(--accent);}' +
      '.cog-options{display:grid;grid-template-columns:repeat(3,64px);gap:8px;justify-content:center;}' +
      '.cog-option{border:1px solid var(--border);background:var(--surface);width:64px;height:64px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:border-color .15s,background .15s;}' +
      '.cog-option:hover{border-color:var(--accent);background:rgba(69,107,183,0.05);}' +
      '.cog-trail{position:relative;width:100%;max-width:480px;height:340px;border:1px solid var(--border);background:var(--surface);margin:0 auto 8px;touch-action:manipulation;}' +
      '.cog-node{position:absolute;width:42px;height:42px;border-radius:50%;border:2px solid var(--accent);background:var(--surface);color:var(--accent);font-family:"DM Sans",sans-serif;font-weight:600;display:flex;align-items:center;justify-content:center;cursor:pointer;transform:translate(-50%,-50%);font-size:0.95rem;user-select:none;}' +
      '.cog-node.cog-done{background:var(--accent);color:#fff;}' +
      '.cog-node.cog-bad{animation:cogShake .3s;}' +
      '@keyframes cogShake{0%,100%{transform:translate(-50%,-50%);}25%{transform:translate(-54%,-50%);}75%{transform:translate(-46%,-50%);}}' +
      '.cog-feedback{font-size:0.85rem;color:var(--text-faint);min-height:20px;margin-top:10px;}' +
      '.cog-countdown{font-family:"DM Sans",sans-serif;font-weight:600;font-size:4rem;color:var(--accent);}';
    var styleEl = document.createElement('style');
    styleEl.id = STYLE_ID;
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
  }

  // ---- Small helpers ----
  function el(html) {
    var d = document.createElement('div');
    d.innerHTML = html.trim();
    return d.firstChild;
  }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function now() { return (global.performance && performance.now) ? performance.now() : Date.now(); }

  // Shows a 3-2-1 countdown then runs cb()
  function countdown(stage, cb) {
    var n = 3;
    var box = el('<div class="cog-countdown">' + n + '</div>');
    clear(stage); stage.appendChild(box);
    var iv = setInterval(function () {
      n--;
      if (n <= 0) { clearInterval(iv); cb(); }
      else { box.textContent = n; }
    }, 800);
  }

  // ============================================================
  // 1. REACTION TIME ("Snap")  ->  cog_rt (mean ms of correct presses)
  // ============================================================
  var symbolsRT = ['●', '▲', '■', '◆', '★'];
  function testReactionTime(stage, done) {
    var TRIALS = 10;
    var trial = 0, times = [], awaiting = false, shownAt = 0, isMatch = false, timeout;
    var prompt = el('<div class="cog-prompt">Press <strong>MATCH</strong> only when the two cards are identical.</div>');
    var cards = el('<div class="cog-cards"><div class="cog-card" id="cogc1"></div><div class="cog-card" id="cogc2"></div></div>');
    var fb = el('<div class="cog-feedback"></div>');
    var btn = el('<button class="cog-btn" type="button">MATCH</button>');
    clear(stage);
    stage.appendChild(prompt); stage.appendChild(cards); stage.appendChild(fb);
    var actions = el('<div class="cog-actions"></div>'); actions.appendChild(btn); stage.appendChild(actions);
    var c1 = cards.querySelector('#cogc1'), c2 = cards.querySelector('#cogc2');

    function nextTrial() {
      if (trial >= TRIALS) {
        var mean = times.length ? Math.round(times.reduce(function (a, b) { return a + b; }, 0) / times.length) : null;
        return done(mean);
      }
      trial++;
      c1.textContent = ''; c2.textContent = '';
      fb.textContent = '';
      awaiting = false;
      setTimeout(showCards, 600);
    }
    function showCards() {
      var s1 = symbolsRT[Math.floor(Math.random() * symbolsRT.length)];
      isMatch = Math.random() < 0.5;
      var s2 = isMatch ? s1 : symbolsRT[(symbolsRT.indexOf(s1) + 1 + Math.floor(Math.random() * (symbolsRT.length - 1))) % symbolsRT.length];
      c1.textContent = s1; c2.textContent = s2;
      awaiting = true; shownAt = now();
      // window to respond
      timeout = setTimeout(function () {
        if (!awaiting) return;
        awaiting = false;
        if (isMatch) fb.textContent = 'Missed!';
        nextTrial();
      }, 1600);
    }
    btn.addEventListener('click', function () {
      if (!awaiting) return;
      awaiting = false;
      clearTimeout(timeout);
      if (isMatch) {
        var rt = now() - shownAt;
        times.push(rt);
        fb.textContent = Math.round(rt) + ' ms';
      } else {
        fb.textContent = 'Not a match — wait for identical cards.';
      }
      nextTrial();
    });
    countdown(stage._cd || stage, function () {
      clear(stage);
      stage.appendChild(prompt); stage.appendChild(cards); stage.appendChild(fb); stage.appendChild(actions);
      nextTrial();
    });
  }

  // ============================================================
  // 2. NUMERIC MEMORY  ->  cog_numeric (max digit length recalled)
  // ============================================================
  function testNumericMemory(stage, done) {
    var len = 2, maxCorrect = 0, current = '';
    function showNumber() {
      current = '';
      for (var i = 0; i < len; i++) current += Math.floor(Math.random() * 10);
      clear(stage);
      stage.appendChild(el('<div class="cog-prompt">Memorise this number</div>'));
      stage.appendChild(el('<div class="cog-bignum">' + current + '</div>'));
      var ms = 1200 + len * 350;
      setTimeout(askNumber, ms);
    }
    function askNumber() {
      clear(stage);
      stage.appendChild(el('<div class="cog-prompt">Type the number you saw</div>'));
      var input = el('<input class="cog-input" type="text" inputmode="numeric" autocomplete="off">');
      stage.appendChild(input);
      var actions = el('<div class="cog-actions"></div>');
      var submit = el('<button class="cog-btn" type="button">Enter</button>');
      actions.appendChild(submit); stage.appendChild(actions);
      input.focus();
      function check() {
        var val = (input.value || '').replace(/\D/g, '');
        if (val === current) {
          maxCorrect = len;
          len++;
          if (len > 12) return finish();
          showNumber();
        } else {
          finish();
        }
      }
      submit.addEventListener('click', check);
      input.addEventListener('keydown', function (e) { if (e.key === 'Enter') check(); });
    }
    function finish() { done(maxCorrect); }
    countdown(stage, showNumber);
  }

  // ============================================================
  // 3. SYMBOL DIGIT SUBSTITUTION  ->  cog_symbol (count correct in 60s)
  // ============================================================
  var symbolSet = ['✦', '❍', '✚', '◐', '☂', '⬟'];
  function testSymbolDigit(stage, done) {
    var DURATION = 60000;
    var key = shuffle(symbolSet).map(function (s, i) { return { sym: s, dig: i + 1 }; });
    var correct = 0, endAt = 0, ticking, target;

    var keyHtml = '<div class="cog-key">' + key.map(function (k) {
      return '<div class="cog-key-cell"><div class="cog-key-sym">' + k.sym + '</div><div class="cog-key-dig">' + k.dig + '</div></div>';
    }).join('') + '</div>';

    function render() {
      clear(stage);
      stage.appendChild(el('<div class="cog-prompt" id="cogSdTime">60s</div>'));
      stage.appendChild(el(keyHtml));
      stage.appendChild(el('<div class="cog-prompt">Which digit matches this symbol?</div>'));
      var tgt = el('<div class="cog-target-sym"></div>');
      stage.appendChild(tgt);
      var digits = el('<div class="cog-digits"></div>');
      for (var d = 1; d <= 6; d++) {
        (function (dd) {
          var b = el('<button class="cog-digit-btn" type="button">' + dd + '</button>');
          b.addEventListener('click', function () { answer(dd); });
          digits.appendChild(b);
        })(d);
      }
      stage.appendChild(digits);
      stage.appendChild(el('<div class="cog-feedback" id="cogSdScore">0 correct</div>'));
      newTarget();
      endAt = now() + DURATION;
      ticking = setInterval(function () {
        var left = Math.max(0, endAt - now());
        var t = stage.querySelector('#cogSdTime');
        if (t) t.textContent = Math.ceil(left / 1000) + 's';
        if (left <= 0) { clearInterval(ticking); done(correct); }
      }, 200);
    }
    function newTarget() {
      target = key[Math.floor(Math.random() * key.length)];
      var t = stage.querySelector('.cog-target-sym');
      if (t) t.textContent = target.sym;
    }
    function answer(dig) {
      if (now() >= endAt) return;
      if (dig === target.dig) correct++;
      var sc = stage.querySelector('#cogSdScore');
      if (sc) sc.textContent = correct + ' correct';
      newTarget();
    }
    countdown(stage, render);
  }

  // ============================================================
  // 4. PAIRED ASSOCIATE LEARNING  ->  cog_pal (count correct)
  // ============================================================
  var wordPairs = [
    ['HARBOUR', 'LANTERN'], ['MEADOW', 'COMPASS'], ['VELVET', 'THUNDER'],
    ['ORCHARD', 'PEBBLE'], ['CANDLE', 'RIVER'], ['MARBLE', 'FOREST'],
    ['WILLOW', 'COPPER'], ['SADDLE', 'BEACON']
  ];
  function testPairedAssociate(stage, done) {
    var pairs = shuffle(wordPairs).slice(0, 6);
    var correct = 0, idx = 0, order;

    function study() {
      clear(stage);
      stage.appendChild(el('<div class="cog-prompt">Memorise these word pairs (you have 15 seconds)</div>'));
      var grid = el('<div class="cog-pairs"></div>');
      pairs.forEach(function (p) {
        grid.appendChild(el('<div class="cog-pair-a">' + p[0] + '</div>'));
        grid.appendChild(el('<div class="cog-pair-b">' + p[1] + '</div>'));
      });
      stage.appendChild(grid);
      var actions = el('<div class="cog-actions"></div>');
      var ready = el('<button class="cog-btn cog-btn-ghost" type="button">I\'m ready</button>');
      actions.appendChild(ready); stage.appendChild(actions);
      var auto = setTimeout(startTest, 15000);
      ready.addEventListener('click', function () { clearTimeout(auto); startTest(); });
    }
    function startTest() { order = shuffle(pairs); idx = 0; askOne(); }
    function askOne() {
      if (idx >= order.length) return done(correct);
      var pair = order[idx];
      // build 4 choices: the correct partner + 3 distractors from other pairs
      var others = pairs.filter(function (p) { return p[1] !== pair[1]; }).map(function (p) { return p[1]; });
      var choices = shuffle([pair[1]].concat(shuffle(others).slice(0, 3)));
      clear(stage);
      stage.appendChild(el('<div class="cog-progress">Pair ' + (idx + 1) + ' of ' + order.length + '</div>'));
      stage.appendChild(el('<div class="cog-prompt">Which word was paired with</div>'));
      stage.appendChild(el('<div class="cog-bignum" style="font-size:1.8rem">' + pair[0] + '</div>'));
      var box = el('<div class="cog-choices"></div>');
      choices.forEach(function (c) {
        var b = el('<div class="cog-choice">' + c + '</div>');
        b.addEventListener('click', function () {
          if (c === pair[1]) correct++;
          idx++; askOne();
        });
        box.appendChild(b);
      });
      stage.appendChild(box);
    }
    study();
  }

  // ============================================================
  // 5. MATRIX PATTERN COMPLETION  ->  cog_matrix (count correct)
  // ------------------------------------------------------------
  // Each puzzle: a 3x3 grid of small SVGs with the last cell missing.
  // Rule-based and original. `answer` is the index into `options`.
  // ============================================================
  function dots(n) {
    // returns an SVG with n dots arranged in a small grid
    var pts = [[18, 18], [36, 18], [54, 18], [18, 36], [36, 36], [54, 36], [18, 54], [36, 54], [54, 54]];
    var c = '';
    for (var i = 0; i < n; i++) c += '<circle cx="' + pts[i][0] + '" cy="' + pts[i][1] + '" r="6" fill="#456BB7"/>';
    return '<svg width="56" height="56" viewBox="0 0 72 72">' + c + '</svg>';
  }
  function arrow(deg) {
    return '<svg width="48" height="48" viewBox="0 0 48 48" style="transform:rotate(' + deg + 'deg)"><path d="M24 6 L24 38 M14 28 L24 38 L34 28" stroke="#456BB7" stroke-width="3" fill="none" stroke-linecap="round"/></svg>';
  }
  function shapeBars(n) {
    var c = '';
    for (var i = 0; i < n; i++) c += '<rect x="' + (10 + i * 14) + '" y="14" width="8" height="32" fill="#456BB7"/>';
    return '<svg width="56" height="56" viewBox="0 0 72 60">' + c + '</svg>';
  }
  function circleSize(r) {
    return '<svg width="56" height="56" viewBox="0 0 56 56"><circle cx="28" cy="28" r="' + r + '" fill="none" stroke="#456BB7" stroke-width="3"/></svg>';
  }
  var matrixPuzzles = [
    { // increasing dot count: rows 1,2,3 / 2,3,4 / 3,4,? -> 5
      grid: [dots(1), dots(2), dots(3), dots(2), dots(3), dots(4), dots(3), dots(4), null],
      options: [dots(3), dots(5), dots(4), dots(6), dots(2), dots(7)], answer: 1
    },
    { // arrow rotating 90deg each cell across reading order, last = 360%
      grid: [arrow(0), arrow(90), arrow(180), arrow(90), arrow(180), arrow(270), arrow(180), arrow(270), null],
      options: [arrow(90), arrow(0), arrow(180), arrow(270), arrow(45), arrow(135)], answer: 1
    },
    { // bar count grows by row: 1,2,3 / 2,3,4 / 3,4,? -> 5
      grid: [shapeBars(1), shapeBars(2), shapeBars(3), shapeBars(2), shapeBars(3), shapeBars(4), shapeBars(3), shapeBars(4), null],
      options: [shapeBars(4), shapeBars(2), shapeBars(5), shapeBars(1), shapeBars(3), shapeBars(6)], answer: 2
    },
    { // circle size shrinks across each row by fixed step; last cell smallest
      grid: [circleSize(22), circleSize(16), circleSize(10), circleSize(22), circleSize(16), circleSize(10), circleSize(22), circleSize(16), null],
      options: [circleSize(16), circleSize(22), circleSize(10), circleSize(6), circleSize(13), circleSize(20)], answer: 2
    },
    { // diagonal: dots = row+col; bottom-right = 3+3 -> 6 (cap visual)
      grid: [dots(2), dots(3), dots(4), dots(3), dots(4), dots(5), dots(4), dots(5), null],
      options: [dots(5), dots(7), dots(6), dots(4), dots(8), dots(3)], answer: 2
    }
  ];
  function testMatrices(stage, done) {
    var puzzles = matrixPuzzles; // fixed order, fixed difficulty progression
    var idx = 0, correct = 0;
    function render() {
      if (idx >= puzzles.length) return done(correct);
      var p = puzzles[idx];
      clear(stage);
      stage.appendChild(el('<div class="cog-progress">Puzzle ' + (idx + 1) + ' of ' + puzzles.length + '</div>'));
      stage.appendChild(el('<div class="cog-prompt">Choose the piece that completes the pattern</div>'));
      var grid = el('<div class="cog-matrix-grid"></div>');
      p.grid.forEach(function (cell) {
        if (cell === null) grid.appendChild(el('<div class="cog-matrix-cell cog-missing">?</div>'));
        else { var c = el('<div class="cog-matrix-cell"></div>'); c.innerHTML = cell; grid.appendChild(c); }
      });
      stage.appendChild(grid);
      var opts = el('<div class="cog-options"></div>');
      var order = shuffle(p.options.map(function (o, i) { return { html: o, correct: i === p.answer }; }));
      order.forEach(function (o) {
        var c = el('<div class="cog-option"></div>');
        c.innerHTML = o.html;
        c.addEventListener('click', function () {
          if (o.correct) correct++;
          idx++; render();
        });
        opts.appendChild(c);
      });
      stage.appendChild(opts);
    }
    render();
  }

  // ============================================================
  // 6 & 7. TRAIL MAKING  ->  cog_tmta / cog_tmtb (ms to complete)
  // ============================================================
  function nonOverlappingPositions(count, w, h, pad, minDist) {
    var pts = [], tries = 0;
    while (pts.length < count && tries < 4000) {
      tries++;
      var x = pad + Math.random() * (w - 2 * pad);
      var y = pad + Math.random() * (h - 2 * pad);
      var ok = pts.every(function (p) {
        return Math.hypot(p.x - x, p.y - y) >= minDist;
      });
      if (ok) pts.push({ x: x, y: y });
    }
    return pts;
  }
  function runTrail(stage, labels, done) {
    var W = 460, H = 338;
    clear(stage);
    stage.appendChild(el('<div class="cog-prompt">Tap the circles in order, as fast as you can</div>'));
    var board = el('<div class="cog-trail"></div>');
    board.style.maxWidth = W + 'px';
    stage.appendChild(board);
    var fb = el('<div class="cog-feedback"></div>');
    stage.appendChild(fb);
    var pos = nonOverlappingPositions(labels.length, W, H, 28, 64);
    var nodes = [];
    var next = 0, startedAt = 0;
    labels.forEach(function (lab, i) {
      var n = el('<div class="cog-node">' + lab + '</div>');
      var px = (pos[i].x / W) * 100, py = (pos[i].y / H) * 100;
      n.style.left = px + '%'; n.style.top = py + '%';
      n.addEventListener('click', function () { hit(i, n); });
      board.appendChild(n); nodes.push(n);
    });
    function hit(i, node) {
      if (i === next) {
        if (next === 0) startedAt = now();
        node.classList.add('cog-done');
        next++;
        if (next >= labels.length) {
          var dur = Math.round(now() - startedAt);
          fb.textContent = (dur / 1000).toFixed(1) + ' s';
          setTimeout(function () { done(dur); }, 500);
        }
      } else {
        node.classList.add('cog-bad');
        fb.textContent = 'Wrong one — looking for ' + labels[next];
        setTimeout(function () { node.classList.remove('cog-bad'); }, 320);
      }
    }
  }
  function testTrailA(stage, done) {
    var labels = [];
    for (var i = 1; i <= 12; i++) labels.push(String(i));
    countdown(stage, function () { runTrail(stage, labels, done); });
  }
  function testTrailB(stage, done) {
    // alternate 1-A-2-B-3-C... up to 6 numbers / 6 letters = 12 nodes
    var letters = ['A', 'B', 'C', 'D', 'E', 'F'];
    var labels = [];
    for (var i = 0; i < 6; i++) { labels.push(String(i + 1)); labels.push(letters[i]); }
    countdown(stage, function () { runTrail(stage, labels, done); });
  }

  // ============================================================
  // Battery controller
  // ============================================================
  var BATTERY = [
    { field: 'cog_rt', name: 'Reaction time', run: testReactionTime,
      instr: '<h3>1. Reaction time</h3><p>Two cards will appear side by side. Press the <strong>MATCH</strong> button as quickly as you can <strong>only when the two cards are identical</strong>.</p><p class="cog-eg">Tip: don\'t press when they differ — wait for a true match.</p>' },
    { field: 'cog_numeric', name: 'Numeric memory', run: testNumericMemory,
      instr: '<h3>2. Numeric memory</h3><p>A number will flash on screen. When it disappears, type it back exactly. Each correct answer makes the next number one digit longer.</p><p class="cog-eg">It continues until you make a mistake.</p>' },
    { field: 'cog_symbol', name: 'Symbol-digit matching', run: testSymbolDigit,
      instr: '<h3>3. Symbol-digit matching</h3><p>You\'ll see a key pairing six symbols with the digits 1–6. For each symbol shown, tap the matching digit as fast as you can.</p><p class="cog-eg">You have 60 seconds — get as many correct as possible.</p>' },
    { field: 'cog_pal', name: 'Word-pair memory', run: testPairedAssociate,
      instr: '<h3>4. Word-pair memory</h3><p>You\'ll be shown several pairs of words to memorise. Then, for each first word, choose the word it was paired with.</p><p class="cog-eg">You have 15 seconds to study the pairs.</p>' },
    { field: 'cog_matrix', name: 'Pattern puzzles', run: testMatrices,
      instr: '<h3>5. Pattern puzzles</h3><p>Each puzzle shows a 3×3 grid with one piece missing. Work out the pattern and choose the piece that completes it.</p><p class="cog-eg">There are five puzzles of increasing difficulty.</p>' },
    { field: 'cog_tmta', name: 'Trail making (numbers)', run: testTrailA,
      instr: '<h3>6. Trail making — part 1</h3><p>Numbered circles are scattered on the board. Tap them in order: 1, 2, 3 … as fast as you can.</p><p class="cog-eg">We measure how long it takes you to complete the path.</p>' },
    { field: 'cog_tmtb', name: 'Trail making (alternating)', run: testTrailB,
      instr: '<h3>7. Trail making — part 2</h3><p>Now tap circles alternating numbers and letters in order: 1, A, 2, B, 3, C … as fast as you can.</p><p class="cog-eg">We measure how long it takes you to complete the path.</p>' }
  ];

  function start(container, opts) {
    opts = opts || {};
    var results = {};
    var i = 0;
    var battery = shuffle(BATTERY.slice());
    var total = battery.length;

    function showInstructions() {
      if (i >= total) { if (opts.onComplete) opts.onComplete(results); return; }
      var task = battery[i];
      if (opts.onProgress) opts.onProgress(i, total);
      clear(container);
      var wrap = el('<div class="cog-wrap"></div>');
      wrap.appendChild(el('<div class="cog-progress">Task ' + (i + 1) + ' of ' + total + '</div>'));
      wrap.appendChild(el('<div class="cog-instructions">' + task.instr + '</div>'));
      var actions = el('<div class="cog-actions"></div>');
      var secs = 3;
      var begin = el('<button class="cog-btn" type="button">Starting in ' + secs + '…</button>');
      actions.appendChild(begin);
      wrap.appendChild(actions);
      container.appendChild(wrap);
      var timer = setInterval(function() {
        secs--;
        if (secs > 0) {
          begin.textContent = 'Starting in ' + secs + '…';
        } else {
          clearInterval(timer);
          runTask();
        }
      }, 1000);
      begin.addEventListener('click', function() { clearInterval(timer); runTask(); });
    }
    function runTask() {
      var task = battery[i];
      clear(container);
      var wrap = el('<div class="cog-wrap"></div>');
      wrap.appendChild(el('<div class="cog-progress">' + task.name + '</div>'));
      var stage = el('<div class="cog-stage"></div>');
      wrap.appendChild(stage);
      container.appendChild(wrap);
      task.run(stage, function (value) {
        results[task.field] = (value === null || value === undefined) ? '' : value;
        i++;
        showInstructions();
      });
    }
    showInstructions();
  }

  global.CognitiveTests = { start: start, fields: BATTERY.map(function (t) { return t.field; }) };
})(window);
