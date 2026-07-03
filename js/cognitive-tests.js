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
    var trials = [], lastMatch = null;
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
        return done(mean, { trials: trials });
      }
      trial++;
      c1.textContent = ''; c2.textContent = '';
      fb.textContent = '';
      awaiting = false;
      setTimeout(showCards, 600);
    }
    function showCards() {
      var s1 = symbolsRT[Math.floor(Math.random() * symbolsRT.length)];
      // Pick randomly, but re-roll once if it would repeat the previous outcome
      isMatch = Math.random() < 0.5;
      if (lastMatch !== null && isMatch === lastMatch) isMatch = Math.random() < 0.5;
      lastMatch = isMatch;
      var s2 = isMatch ? s1 : symbolsRT[(symbolsRT.indexOf(s1) + 1 + Math.floor(Math.random() * (symbolsRT.length - 1))) % symbolsRT.length];
      c1.textContent = s1; c2.textContent = s2;
      awaiting = true; shownAt = now();
      // window to respond
      timeout = setTimeout(function () {
        if (!awaiting) return;
        awaiting = false;
        if (isMatch) {
          fb.textContent = 'Missed!';
          trials.push({ trial: trial, is_match: true, responded: false, rt_ms: null });
        } else {
          trials.push({ trial: trial, is_match: false, responded: false, rt_ms: null });
        }
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
        trials.push({ trial: trial, is_match: true, responded: true, rt_ms: Math.round(rt) });
        fb.textContent = Math.round(rt) + ' ms';
      } else {
        trials.push({ trial: trial, is_match: false, responded: true, rt_ms: null });
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
    var attempts = [];
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
        var correct = val === current;
        attempts.push({ digits: len, correct: correct });
        if (correct) {
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
    function finish() { done(maxCorrect, { attempts: attempts }); }
    countdown(stage, showNumber);
  }

  // ============================================================
  // 3. SYMBOL DIGIT SUBSTITUTION  ->  cog_symbol (count correct in 60s)
  // ============================================================
  var symbolSet = ['✦', '❍', '✚', '◐', '☂', '⬟'];
  function testSymbolDigit(stage, done) {
    var DURATION = 60000;
    var key = shuffle(symbolSet).map(function (s, i) { return { sym: s, dig: i + 1 }; });
    var correct = 0, endAt = 0, ticking, target, targetShownAt = 0;
    var answers = [];

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
        if (left <= 0) { clearInterval(ticking); done(correct, { answers: answers }); }
      }, 200);
    }
    function newTarget() {
      target = key[Math.floor(Math.random() * key.length)];
      targetShownAt = now();
      var t = stage.querySelector('.cog-target-sym');
      if (t) t.textContent = target.sym;
    }
    function answer(dig) {
      if (now() >= endAt) return;
      var rt = Math.round(now() - targetShownAt);
      var isCorrect = dig === target.dig;
      if (isCorrect) correct++;
      answers.push({ symbol: target.sym, correct_digit: target.dig, chosen: dig, correct: isCorrect, rt_ms: rt });
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
    var responses = [];

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
    function askOne() {
      if (idx >= order.length) return finish();
      var pair = order[idx];
      // build 4 choices: the correct partner + 3 distractors from other pairs
      var others = pairs.filter(function (p) { return p[1] !== pair[1]; }).map(function (p) { return p[1]; });
      var choices = shuffle([pair[1]].concat(shuffle(others).slice(0, 3)));
      clear(stage);
      stage.appendChild(el('<div class="cog-progress">Pair ' + (idx + 1) + ' of ' + order.length + '</div>'));
      stage.appendChild(el('<div class="cog-prompt">Which word was paired with</div>'));
      stage.appendChild(el('<div class="cog-bignum" style="font-size:1.8rem">' + pair[0] + '</div>'));
      var box = el('<div class="cog-choices"></div>');
      var shownAt = now();
      choices.forEach(function (c) {
        var b = el('<div class="cog-choice">' + c + '</div>');
        b.addEventListener('click', function () {
          var isCorrect = c === pair[1];
          if (isCorrect) correct++;
          responses.push({ cue: pair[0], correct_answer: pair[1], chosen: c, correct: isCorrect, rt_ms: Math.round(now() - shownAt) });
          idx++; askOne();
        });
        box.appendChild(b);
      });
      stage.appendChild(box);
    }
    function finish() { done(correct, { responses: responses }); }
    function startTest() { order = shuffle(pairs); idx = 0; askOne(); }
    study();
  }

  // ============================================================
  // 5. MATRIX PATTERN COMPLETION  ->  cog_matrix (count correct)
  // ------------------------------------------------------------
  // Large puzzle bank (20+ items). Each session randomly picks 5
  // from three difficulty bands so no two sessions are identical.
  // `answer` is the 0-based index into the `options` array.
  // ============================================================

  // --- SVG cell generators ---
  function dots(n) {
    var pts = [[18,18],[36,18],[54,18],[18,36],[36,36],[54,36],[18,54],[36,54],[54,54]];
    var c = '';
    for (var i = 0; i < n; i++) c += '<circle cx="' + pts[i][0] + '" cy="' + pts[i][1] + '" r="6" fill="#456BB7"/>';
    return '<svg width="56" height="56" viewBox="0 0 72 72">' + c + '</svg>';
  }
  function arrow(deg) {
    return '<svg width="48" height="48" viewBox="0 0 48 48" style="transform:rotate(' + deg + 'deg)"><path d="M24 6 L24 38 M14 28 L24 38 L34 28" stroke="#456BB7" stroke-width="3" fill="none" stroke-linecap="round"/></svg>';
  }
  function bars(n) {
    var c = '';
    for (var i = 0; i < n; i++) c += '<rect x="' + (8 + i * 14) + '" y="12" width="9" height="36" fill="#456BB7"/>';
    return '<svg width="56" height="56" viewBox="0 0 72 60">' + c + '</svg>';
  }
  function ring(r) {
    return '<svg width="56" height="56" viewBox="0 0 56 56"><circle cx="28" cy="28" r="' + r + '" fill="none" stroke="#456BB7" stroke-width="3"/></svg>';
  }
  // shape outline/half/filled — no clipPath needed
  function shapeFill(sh, lvl) {
    var bg = lvl === 2 ? '#456BB7' : '#fff';
    var st = '#456BB7';
    var half = '';
    if (lvl === 1) {
      if (sh === 'C') half = '<path d="M8,28 A20,20 0 0,0 48,28 Z" fill="' + st + '"/>';
      if (sh === 'S') half = '<rect x="8" y="28" width="40" height="20" fill="' + st + '"/>';
      if (sh === 'D') half = '<polygon points="6,28 50,28 28,50" fill="' + st + '"/>';
    }
    var body = '';
    if (sh === 'C') body = '<circle cx="28" cy="28" r="20" fill="' + bg + '" stroke="' + st + '" stroke-width="3"/>';
    if (sh === 'S') body = '<rect x="8" y="8" width="40" height="40" fill="' + bg + '" stroke="' + st + '" stroke-width="3"/>';
    if (sh === 'D') body = '<polygon points="28,5 51,28 28,51 5,28" fill="' + bg + '" stroke="' + st + '" stroke-width="3"/>';
    return '<svg width="56" height="56" viewBox="0 0 56 56">' + body + half + '</svg>';
  }
  // multiple shapes side by side (1-3 icons)
  function icons(sh, n) {
    var positions = [[28,28], [18,28], [38,28]];
    var offsets = n === 1 ? [[0,0]] : n === 2 ? [[-10,0],[10,0]] : [[-16,0],[0,0],[16,0]];
    var c = '';
    offsets.forEach(function(o) {
      var x = 28 + o[0], y = 28 + o[1];
      if (sh === 'C') c += '<circle cx="' + x + '" cy="' + y + '" r="10" fill="#456BB7"/>';
      if (sh === 'S') c += '<rect x="' + (x-10) + '" y="' + (y-10) + '" width="20" height="20" fill="#456BB7"/>';
      if (sh === 'D') c += '<polygon points="' + x + ',' + (y-12) + ' ' + (x+12) + ',' + y + ' ' + x + ',' + (y+12) + ' ' + (x-12) + ',' + y + '" fill="#456BB7"/>';
    });
    return '<svg width="56" height="56" viewBox="0 0 56 56">' + c + '</svg>';
  }
  // line count (horizontal lines)
  function lines(n, thick) {
    var c = '';
    var step = 48 / (n + 1);
    for (var i = 1; i <= n; i++) {
      var y = 4 + Math.round(i * step);
      c += '<line x1="6" y1="' + y + '" x2="50" y2="' + y + '" stroke="#456BB7" stroke-width="' + (thick || 2) + '"/>';
    }
    return '<svg width="56" height="56" viewBox="0 0 56 56">' + c + '</svg>';
  }
  // checkerboard-like: filled squares in a 2×2 layout by bitmask
  function checker(mask) {
    var cells = [
      [4,4],[30,4],[4,30],[30,30]
    ];
    var c = '';
    cells.forEach(function(p, i) {
      var fill = (mask >> i) & 1 ? '#456BB7' : '#e8edf6';
      c += '<rect x="' + p[0] + '" y="' + p[1] + '" width="22" height="22" fill="' + fill + '" stroke="#d0d8ee" stroke-width="1"/>';
    });
    return '<svg width="56" height="56" viewBox="0 0 56 56">' + c + '</svg>';
  }

  // ---- Puzzle bank ----
  // diff: 1=easy (single rule), 2=medium, 3=hard (compound rules)
  var PUZZLE_BANK = [

    // ── Easy ──────────────────────────────────────────────────────
    { diff: 1, // dot count increases L→R in each row (same pattern each row)
      grid: [dots(1),dots(2),dots(3), dots(1),dots(2),dots(3), dots(1),dots(2),null],
      options: [dots(3),dots(1),dots(4),dots(2),dots(5),dots(0)], answer: 0 },

    { diff: 1, // arrow rotates +90° left→right, row 3 continues
      grid: [arrow(0),arrow(90),arrow(180), arrow(90),arrow(180),arrow(270), arrow(180),arrow(270),null],
      options: [arrow(90),arrow(0),arrow(180),arrow(360),arrow(45),arrow(270)], answer: 3 },

    { diff: 1, // bars increase L→R, same in each row
      grid: [bars(1),bars(2),bars(3), bars(1),bars(2),bars(3), bars(1),bars(2),null],
      options: [bars(2),bars(4),bars(3),bars(1),bars(5),bars(6)], answer: 2 },

    { diff: 1, // circle shrinks L→R (large → medium → small), repeats
      grid: [ring(22),ring(16),ring(9), ring(22),ring(16),ring(9), ring(22),ring(16),null],
      options: [ring(16),ring(22),ring(9),ring(6),ring(13),ring(20)], answer: 2 },

    { diff: 1, // fill goes empty→half→full across each row (circle)
      grid: [shapeFill('C',0),shapeFill('C',1),shapeFill('C',2),
             shapeFill('C',0),shapeFill('C',1),shapeFill('C',2),
             shapeFill('C',0),shapeFill('C',1),null],
      options: [shapeFill('C',1),shapeFill('C',0),shapeFill('C',2),shapeFill('S',2),shapeFill('D',2),shapeFill('C',0)],
      answer: 2 },

    { diff: 1, // icon count increases down each column (1,2,3 top→bottom)
      grid: [icons('C',1),icons('S',1),icons('D',1),
             icons('C',2),icons('S',2),icons('D',2),
             icons('C',3),icons('S',3),null],
      options: [icons('D',2),icons('D',3),icons('D',1),icons('C',3),icons('S',3),icons('C',2)],
      answer: 1 },

    { diff: 1, // lines increase top→bottom in each row (row 3 = 3 lines)
      grid: [lines(1),lines(1),lines(1), lines(2),lines(2),lines(2), lines(3),lines(3),null],
      options: [lines(2),lines(4),lines(3),lines(1),lines(5),lines(3,4)], answer: 2 },

    // ── Medium ────────────────────────────────────────────────────
    { diff: 2, // diagonal: dots = row + col (0-indexed); cell[2][2]=4
      grid: [dots(0),dots(1),dots(2), dots(1),dots(2),dots(3), dots(2),dots(3),null],
      options: [dots(3),dots(5),dots(4),dots(6),dots(2),dots(7)], answer: 2 },

    { diff: 2, // fill goes empty→half→full down each COLUMN (not row)
      grid: [shapeFill('S',0),shapeFill('C',0),shapeFill('D',0),
             shapeFill('S',1),shapeFill('C',1),shapeFill('D',1),
             shapeFill('S',2),shapeFill('C',2),null],
      options: [shapeFill('D',1),shapeFill('S',2),shapeFill('D',2),shapeFill('D',0),shapeFill('C',2),shapeFill('S',1)],
      answer: 2 },

    { diff: 2, // shape Latin square: C/S/D each once per row & column
      //  C S D
      //  S D C
      //  D C ?  -> S
      grid: [shapeFill('C',2),shapeFill('S',2),shapeFill('D',2),
             shapeFill('S',2),shapeFill('D',2),shapeFill('C',2),
             shapeFill('D',2),shapeFill('C',2),null],
      options: [shapeFill('D',2),shapeFill('C',2),shapeFill('S',2),shapeFill('S',0),shapeFill('D',0),shapeFill('C',0)],
      answer: 2 },

    { diff: 2, // bars increase left→right AND row by row (step: col+1, bonus +row)
      //  row0: 1,2,3   row1: 2,3,4   row2: 3,4,?=5
      grid: [bars(1),bars(2),bars(3), bars(2),bars(3),bars(4), bars(3),bars(4),null],
      options: [bars(4),bars(2),bars(5),bars(1),bars(3),bars(6)], answer: 2 },

    { diff: 2, // arrow rotates +90° top→bottom in each column
      //  col0: 0,90,180  col1: 90,180,270  col2: 180,270,?=0
      grid: [arrow(0),arrow(90),arrow(180), arrow(90),arrow(180),arrow(270), arrow(180),arrow(270),null],
      options: [arrow(90),arrow(0),arrow(180),arrow(270),arrow(45),arrow(135)], answer: 1 },

    { diff: 2, // checkerboard: each row adds one more filled quadrant (bitmask 0,1,3,7 → row 3 col 2 = 0b0111=7)
      grid: [checker(0),checker(1),checker(3), checker(0),checker(1),checker(3), checker(0),checker(1),null],
      options: [checker(7),checker(5),checker(3),checker(15),checker(9),checker(6)], answer: 0 },

    { diff: 2, // size shrinks AND fill increases: large-empty→med-half→small-full
      grid: [ring(22),ring(16),ring(9), ring(22),ring(16),ring(9), ring(22),ring(16),null],
      options: [ring(6),ring(16),ring(9),ring(13),ring(20),ring(4)], answer: 2 },

    // ── Hard ──────────────────────────────────────────────────────
    { diff: 3, // each row: same shape, fill follows col; each col: same fill, shape follows row
      //  (C,0)(S,0)(D,0)   (C,1)(S,1)(D,1)   (C,2)(S,2)(?,2) → D,2
      grid: [shapeFill('C',0),shapeFill('S',0),shapeFill('D',0),
             shapeFill('C',1),shapeFill('S',1),shapeFill('D',1),
             shapeFill('C',2),shapeFill('S',2),null],
      options: [shapeFill('C',2),shapeFill('S',0),shapeFill('D',2),shapeFill('D',1),shapeFill('S',2),shapeFill('C',0)],
      answer: 2 },

    { diff: 3, // dots = row × col (0-indexed, min 1): row2×col2 = 2×2 = 4? No: (r+1)*(c+1)
      // 1,2,3 / 2,4,6 / 3,6,? = 9
      grid: [dots(1),dots(2),dots(3), dots(2),dots(4),dots(6), dots(3),dots(6),null],
      options: [dots(6),dots(8),dots(9),dots(7),dots(5),dots(4)], answer: 2 },

    { diff: 3, // arrow rotates +45° L→R AND +45° top→bottom: cell[2][2] = 180°
      // (0,45,90) / (45,90,135) / (90,135,?)
      grid: [arrow(0),arrow(45),arrow(90), arrow(45),arrow(90),arrow(135), arrow(90),arrow(135),null],
      options: [arrow(90),arrow(45),arrow(135),arrow(180),arrow(225),arrow(270)], answer: 3 },

    { diff: 3, // icon count = row+col+1: row2,col2 = 2+2+1 = 5 (show as dots)
      grid: [dots(1),dots(2),dots(3), dots(2),dots(3),dots(4), dots(3),dots(4),null],
      options: [dots(4),dots(6),dots(5),dots(3),dots(7),dots(2)], answer: 2 },

    { diff: 3, // fill & shape both rotate: shape C→S→D across col, fill 0→1→2 across row
      // row0: (C,0)(S,0)(D,0)  row1: (C,1)(S,1)(D,1)  row2: (C,2)(S,2)(D,?) → 2
      grid: [shapeFill('C',0),shapeFill('S',0),shapeFill('D',0),
             shapeFill('C',1),shapeFill('S',1),shapeFill('D',1),
             shapeFill('C',2),shapeFill('S',2),null],
      options: [shapeFill('S',2),shapeFill('C',2),shapeFill('D',2),shapeFill('D',0),shapeFill('D',1),shapeFill('C',0)],
      answer: 2 },

    { diff: 3, // checker: each row XORs with next column bit  0,5,15 / 0,5,15 / 0,5,? = 15
      grid: [checker(0),checker(5),checker(15), checker(0),checker(5),checker(15), checker(0),checker(5),null],
      options: [checker(10),checker(5),checker(15),checker(7),checker(3),checker(9)], answer: 2 }
  ];

  function pickPuzzles(n) {
    // Pick n puzzles stratified by difficulty band so sessions vary
    var easy   = shuffle(PUZZLE_BANK.filter(function(p){ return p.diff === 1; }));
    var medium = shuffle(PUZZLE_BANK.filter(function(p){ return p.diff === 2; }));
    var hard   = shuffle(PUZZLE_BANK.filter(function(p){ return p.diff === 3; }));
    // allocate: 2 easy, 2 medium, 1 hard (for n=5)
    var picked = easy.slice(0,2).concat(medium.slice(0,2)).concat(hard.slice(0,1));
    // fall back if a band has fewer than needed
    if (picked.length < n) picked = shuffle(PUZZLE_BANK).slice(0, n);
    return picked; // already in easy→hard order within bands
  }

  function testMatrices(stage, done) {
    var puzzles = pickPuzzles(5);
    var idx = 0, correct = 0;
    var responses = [];
    function render() {
      if (idx >= puzzles.length) return done(correct, { responses: responses });
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
      var shownAt = now();
      var order = shuffle(p.options.map(function (o, i) { return { html: o, correct: i === p.answer }; }));
      order.forEach(function (o) {
        var c = el('<div class="cog-option"></div>');
        c.innerHTML = o.html;
        c.addEventListener('click', function () {
          var isCorrect = o.correct;
          if (isCorrect) correct++;
          responses.push({ puzzle: idx + 1, diff: p.diff, correct: isCorrect, rt_ms: Math.round(now() - shownAt) });
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
    var next = 0, startedAt = 0, errors = 0;
    var taps = [];
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
        var elapsed = Math.round(now() - startedAt);
        taps.push({ label: labels[i], elapsed_ms: elapsed, correct: true });
        node.classList.add('cog-done');
        next++;
        if (next >= labels.length) {
          var dur = Math.round(now() - startedAt);
          fb.textContent = (dur / 1000).toFixed(1) + ' s';
          setTimeout(function () { done(dur, { taps: taps, errors: errors, total_ms: dur }); }, 500);
        }
      } else {
        errors++;
        taps.push({ label: labels[i], elapsed_ms: Math.round(now() - startedAt), correct: false, expected: labels[next] });
        node.classList.add('cog-bad');
        fb.textContent = 'Wrong one — looking for ' + labels[next];
        setTimeout(function () { node.classList.remove('cog-bad'); }, 320);
      }
    }
  }
  function testTrailA(stage, done) {
    var labels = [];
    for (var i = 1; i <= 12; i++) labels.push(String(i));
    countdown(stage, function () { runTrail(stage, labels, function(val, raw) { done(val, raw); }); });
  }
  function testTrailB(stage, done) {
    var letters = ['A', 'B', 'C', 'D', 'E', 'F'];
    var labels = [];
    for (var i = 0; i < 6; i++) { labels.push(String(i + 1)); labels.push(letters[i]); }
    countdown(stage, function () { runTrail(stage, labels, function(val, raw) { done(val, raw); }); });
  }

  // ============================================================
  // PRACTICE PROLOGUES  (shown only on first session)
  // ============================================================

  var PRAC_SYMBOLS = ['●', '▲', '■', '◆', '★'];

  function pracBanner(stage, msg) {
    var b = el('<div style="width:100%;display:flex;flex-direction:column;align-items:center;gap:10px;margin-bottom:18px;">' +
      '<span style="background:var(--accent);color:#fff;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;padding:3px 12px;border-radius:100px;">Practice — won\'t be scored</span>' +
      '<div style="font-size:0.92rem;color:var(--text-muted);text-align:center;">' + msg + '</div>' +
    '</div>');
    stage.insertBefore(b, stage.firstChild);
  }

  function pracDone(stage, cb) {
    clear(stage);
    var box = el('<div style="text-align:center;padding:28px 12px;">' +
      '<div style="font-size:2.4rem;margin-bottom:10px;">✓</div>' +
      '<div style="font-family:\'DM Sans\',sans-serif;font-size:1.1rem;font-weight:500;margin-bottom:6px;color:var(--text);">Practice complete!</div>' +
      '<div style="font-size:0.9rem;color:var(--text-muted);">The real test starts now.</div>' +
    '</div>');
    stage.appendChild(box);
    setTimeout(cb, 1800);
  }

  // --- 1. Reaction time ---
  function pracRT(stage, done) {
    var steps = [
      { s1: '▲', s2: '▲', isMatch: true,  hint: 'Same symbol on both cards → press <strong>MATCH</strong>' },
      { s1: '●', s2: '■', isMatch: false, hint: 'Different symbols → <strong>do not</strong> press MATCH, wait' },
      { s1: '◆', s2: '◆', isMatch: true,  hint: 'Same again → press <strong>MATCH</strong>!' },
    ];
    var t = 0;
    function show() {
      if (t >= steps.length) { pracDone(stage, done); return; }
      var s = steps[t];
      clear(stage);
      pracBanner(stage, s.hint);
      stage.appendChild(el('<div class="cog-cards"><div class="cog-card">' + s.s1 + '</div><div class="cog-card">' + s.s2 + '</div></div>'));
      var fb = el('<div class="cog-feedback"></div>');
      stage.appendChild(fb);
      var actions = el('<div class="cog-actions"></div>');
      if (s.isMatch) {
        var btn = el('<button class="cog-btn" type="button">MATCH</button>');
        btn.addEventListener('click', function () { fb.textContent = '✓ Correct!'; setTimeout(function(){ t++; show(); }, 900); });
        actions.appendChild(btn);
      } else {
        var skip = el('<button class="cog-btn cog-btn-ghost" type="button">Skip →</button>');
        skip.addEventListener('click', function () { fb.textContent = '✓ Right — don\'t press on mismatches.'; setTimeout(function(){ t++; show(); }, 900); });
        actions.appendChild(skip);
      }
      stage.appendChild(actions);
    }
    show();
  }

  // --- 2. Numeric memory ---
  function pracNumeric(stage, done) {
    var seq = [4, 7, 2];
    clear(stage);
    pracBanner(stage, 'A number will flash. When it disappears, type it back.');
    var num = el('<div class="cog-bignum">' + seq.join('  ') + '</div>');
    stage.appendChild(num);
    setTimeout(function () {
      num.style.visibility = 'hidden';
      var inp = el('<input class="cog-input" type="tel" inputmode="numeric" placeholder="Type the number" autocomplete="off">');
      stage.appendChild(inp);
      var btn = el('<button class="cog-btn" style="margin-top:12px;" type="button">Check</button>');
      stage.appendChild(btn);
      var fb = el('<div class="cog-feedback" style="margin-top:8px;"></div>');
      stage.appendChild(fb);
      btn.addEventListener('click', function () {
        var ans = inp.value.replace(/\s/g, '');
        if (ans === seq.join('')) {
          fb.textContent = '✓ Correct! Each round adds one more digit.';
        } else {
          fb.textContent = 'The answer was ' + seq.join('') + '. That\'s fine — let\'s begin!';
        }
        btn.disabled = true;
        setTimeout(function(){ pracDone(stage, done); }, 1600);
      });
      inp.focus();
    }, 2200);
  }

  // --- 3. Symbol digit ---
  function pracSymbol(stage, done) {
    var key = [{ sym: '❋', dig: 3 }, { sym: '⬡', dig: 6 }, { sym: '⬟', dig: 1 }];
    clear(stage);
    pracBanner(stage, 'Use the key to find the matching digit for each symbol.');
    var keyEl = el('<div style="display:flex;gap:12px;justify-content:center;margin-bottom:20px;"></div>');
    key.forEach(function(k) {
      keyEl.appendChild(el('<div style="border:1px solid var(--border);padding:8px 14px;text-align:center;"><div style="font-size:1.5rem;">' + k.sym + '</div><div style="font-size:0.85rem;color:var(--text-faint);">' + k.dig + '</div></div>'));
    });
    stage.appendChild(keyEl);
    var t = 0;
    var fb = el('<div class="cog-feedback" style="min-height:20px;margin-top:8px;"></div>');
    function nextSymbol() {
      if (t >= key.length) { pracDone(stage, done); return; }
      var target = key[t];
      var targetEl = stage.querySelector('.prac-target');
      if (targetEl) stage.removeChild(targetEl);
      var dig = stage.querySelector('.prac-digits');
      if (dig) stage.removeChild(dig);
      var tEl = el('<div class="cog-target-sym prac-target">' + target.sym + '</div>');
      var digs = el('<div class="cog-digits prac-digits"></div>');
      shuffle([1,2,3,4,5,6]).slice(0,4).concat([target.dig]).filter(function(v,i,a){return a.indexOf(v)===i;}).slice(0,4).forEach(function(d) {
        var b = el('<button class="cog-digit-btn" type="button">' + d + '</button>');
        b.addEventListener('click', function() {
          if (d === target.dig) { fb.textContent = '✓ Correct!'; }
          else { fb.textContent = 'The answer was ' + target.dig + '.'; }
          t++;
          setTimeout(nextSymbol, 900);
        });
        digs.appendChild(b);
      });
      stage.insertBefore(fb, null);
      stage.appendChild(tEl);
      stage.appendChild(digs);
    }
    stage.appendChild(fb);
    nextSymbol();
  }

  // --- 4. Word pairs ---
  function pracPAL(stage, done) {
    var pairs = [['Ocean', 'Tiger'], ['Candle', 'Bridge']];
    clear(stage);
    pracBanner(stage, 'Memorise these pairs — you\'ll need to recall them in 5 seconds.');
    var grid = el('<div class="cog-pairs"></div>');
    pairs.forEach(function(p) {
      grid.appendChild(el('<div class="cog-pair-a">' + p[0] + '</div>'));
      grid.appendChild(el('<div class="cog-pair-b">' + p[1] + '</div>'));
    });
    stage.appendChild(grid);
    var bar = el('<div style="font-size:0.85rem;color:var(--text-faint);margin-top:12px;">Disappearing in 5 s…</div>');
    stage.appendChild(bar);
    setTimeout(function() {
      clear(stage);
      pracBanner(stage, 'Which word was paired with <strong>Ocean</strong>?');
      var choices = shuffle(['Tiger', 'River', 'Feather', 'Clock']);
      var fb = el('<div class="cog-feedback" style="margin-top:10px;"></div>');
      var ch = el('<div class="cog-choices"></div>');
      choices.forEach(function(c) {
        var btn = el('<button class="cog-choice" type="button">' + c + '</button>');
        btn.addEventListener('click', function() {
          fb.textContent = c === 'Tiger' ? '✓ Correct!' : 'It was Tiger. No worries — just a practice!';
          setTimeout(function(){ pracDone(stage, done); }, 1400);
        });
        ch.appendChild(btn);
      });
      stage.appendChild(ch);
      stage.appendChild(fb);
    }, 5000);
  }

  // --- 5. Pattern puzzles ---
  function pracMatrix(stage, done) {
    // Simple 3×3: all cells are ◆ except bottom-right (missing)
    var sym = '◆';
    var cells = [sym, sym, sym, sym, sym, sym, sym, sym, '?'];
    clear(stage);
    pracBanner(stage, 'Find the piece that completes the pattern.');
    var grid = el('<div class="cog-matrix-grid"></div>');
    cells.forEach(function(c) {
      grid.appendChild(el('<div class="cog-matrix-cell' + (c === '?' ? ' cog-missing' : '') + '">' + (c === '?' ? '' : c) + '</div>'));
    });
    stage.appendChild(grid);
    var opts2 = el('<div class="cog-options"></div>');
    var answers = shuffle([{ h: sym, correct: true }, { h: '●', correct: false }, { h: '▲', correct: false }]);
    var fb = el('<div class="cog-feedback" style="margin-top:10px;"></div>');
    answers.forEach(function(a) {
      var opt = el('<div class="cog-option">' + a.h + '</div>');
      opt.addEventListener('click', function() {
        fb.textContent = a.correct ? '✓ Correct!' : 'Not quite — the pattern repeats ◆. Let\'s continue!';
        setTimeout(function(){ pracDone(stage, done); }, 1400);
      });
      opts2.appendChild(opt);
    });
    stage.appendChild(opts2);
    stage.appendChild(fb);
  }

  // --- 6. Trail A ---
  function pracTrailA(stage, done) {
    var positions = [{x:30,y:30},{x:65,y:55},{x:40,y:72},{x:72,y:22}];
    clear(stage);
    pracBanner(stage, 'Tap the numbered circles in order: 1 → 2 → 3 → 4');
    runTrail(stage, ['1','2','3','4'], function() { pracDone(stage, done); });
  }

  // --- 7. Trail B ---
  function pracTrailB(stage, done) {
    clear(stage);
    pracBanner(stage, 'Alternate numbers and letters: 1 → A → 2 → B');
    runTrail(stage, ['1','A','2','B'], function() { pracDone(stage, done); });
  }

  // ============================================================
  // Battery controller
  // ============================================================
  var BATTERY = [
    { field: 'cog_rt', name: 'Reaction time', run: testReactionTime, prac: pracRT,
      instr: '<p>Two cards will appear side by side. Press the <strong>MATCH</strong> button as quickly as you can <strong>only when the two cards are identical</strong>.</p><p class="cog-eg">Tip: don\'t press when they differ — wait for a true match.</p>' },
    { field: 'cog_numeric', name: 'Numeric memory', run: testNumericMemory, prac: pracNumeric,
      instr: '<p>A number will flash on screen. When it disappears, type it back exactly. Each correct answer makes the next number one digit longer.</p><p class="cog-eg">It continues until you make a mistake.</p>' },
    { field: 'cog_symbol', name: 'Symbol-digit matching', run: testSymbolDigit, prac: pracSymbol,
      instr: '<p>You\'ll see a key pairing six symbols with the digits 1–6. For each symbol shown, tap the matching digit as fast as you can.</p><p class="cog-eg">You have 60 seconds — get as many correct as possible.</p>' },
    { field: 'cog_pal', name: 'Word-pair memory', run: testPairedAssociate, prac: pracPAL,
      instr: '<p>You\'ll be shown several pairs of words to memorise. Then, for each first word, choose the word it was paired with.</p><p class="cog-eg">You have 15 seconds to study the pairs.</p>' },
    { field: 'cog_matrix', name: 'Pattern puzzles', run: testMatrices, prac: pracMatrix,
      instr: '<p>Each puzzle shows a 3×3 grid with one piece missing. Work out the pattern and choose the piece that completes it.</p><p class="cog-eg">There are five puzzles of increasing difficulty.</p>' },
    { field: 'cog_tmta', name: 'Trail making (numbers)', run: testTrailA, prac: pracTrailA,
      instr: '<p>Numbered circles are scattered on the board. Tap them in order: 1, 2, 3 … as fast as you can.</p><p class="cog-eg">We measure how long it takes you to complete the path.</p>' },
    { field: 'cog_tmtb', name: 'Trail making (alternating)', run: testTrailB, prac: pracTrailB,
      instr: '<p>Now tap circles alternating numbers and letters in order: 1, A, 2, B, 3, C … as fast as you can.</p><p class="cog-eg">We measure how long it takes you to complete the path.</p>' }
  ];

  function start(container, opts) {
    opts = opts || {};
    var results = {};
    var i = 0;
    var battery = shuffle(BATTERY.slice());
    var total = battery.length;
    var taskStartedAt;

    function showInstructions() {
      if (i >= total) { if (opts.onComplete) opts.onComplete(results); return; }
      var task = battery[i];
      if (opts.onProgress) opts.onProgress(i, total);
      if (opts.practice && task.prac) {
        showPractice(task, function() { showRealInstructions(task); });
      } else {
        showRealInstructions(task);
      }
    }
    function showPractice(task, done) {
      clear(container);
      var wrap = el('<div class="cog-wrap"></div>');
      wrap.appendChild(el('<div class="cog-progress">Task ' + (i + 1) + ' of ' + total + ' — Practice</div>'));
      var stage = el('<div class="cog-stage"></div>');
      wrap.appendChild(stage);
      container.appendChild(wrap);
      task.prac(stage, done);
    }
    function showRealInstructions(task) {
      clear(container);
      var wrap = el('<div class="cog-wrap"></div>');
      wrap.appendChild(el('<div class="cog-progress">Task ' + (i + 1) + ' of ' + total + '</div>'));
      wrap.appendChild(el('<div class="cog-instructions">' + task.instr + '</div>'));
      var actions = el('<div class="cog-actions"></div>');
      var begin = el('<button class="cog-btn" type="button">Start</button>');
      actions.appendChild(begin);
      wrap.appendChild(actions);
      container.appendChild(wrap);
      begin.addEventListener('click', function() { taskStartedAt = new Date().toISOString(); runTask(); });
    }
    function runTask() {
      var task = battery[i];
      var startMs = now();
      clear(container);
      var wrap = el('<div class="cog-wrap"></div>');
      wrap.appendChild(el('<div class="cog-progress">' + task.name + '</div>'));
      var stage = el('<div class="cog-stage"></div>');
      wrap.appendChild(stage);
      container.appendChild(wrap);
      task.run(stage, function (value, raw) {
        var endMs = now();
        results[task.field] = (value === null || value === undefined) ? '' : value;
        results[task.field + '_start'] = taskStartedAt;
        results[task.field + '_duration_ms'] = Math.round(endMs - startMs);
        if (raw) results[task.field + '_raw'] = JSON.stringify(raw);
        i++;
        showInstructions();
      });
    }
    showInstructions();
  }

  global.CognitiveTests = { start: start, fields: BATTERY.map(function (t) { return t.field; }) };
})(window);
