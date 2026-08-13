/* ══════════════════════════════════════════════════════════
   Cookie consent + gated GA4

   Under PECR and UK GDPR, analytics cookies need consent BEFORE they are
   set. So nothing Google-related is requested until someone opts in —
   this doesn't use Consent Mode to load gtag in a denied state, it
   simply doesn't load gtag at all until there is a stored 'accepted'.

   ICO guidance the banner is built around:
   - Reject must be as easy as accept (same prominence, one click, no
     hunting through a settings pane).
   - No pre-ticked boxes, no implied consent from scrolling or dismissing.
   - The choice must be changeable later — OCConsent.reopen(), linked
     from the cookie policy.

   Include on every public page. Order relative to js/utm.js and
   js/forms.js does not matter; this owns its own storage.
   ══════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  // ══════════════════════════════════════════════════════════
  // GA4 measurement ID. This is the ID already present in app.html's
  // Firebase config — the marketing site and the app will therefore
  // report into the SAME GA4 property. If you'd rather keep them apart,
  // create a second property and swap the ID here.
  // ══════════════════════════════════════════════════════════
  var GA_ID = 'G-MT11J77CNR';

  var COOKIE = 'cookie_consent';
  var MAX_AGE = 60 * 60 * 24 * 182; // ~6 months, then we ask again

  function readConsent() {
    var match = document.cookie.match(/(?:^|;\s*)cookie_consent=([^;]*)/);
    return match ? decodeURIComponent(match[1]) : null;
  }

  function writeConsent(value) {
    var secure = global.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie =
      COOKIE + '=' + encodeURIComponent(value) +
      '; Path=/; Max-Age=' + MAX_AGE + '; SameSite=Lax' + secure;
  }

  function clearAnalyticsCookies() {
    // Withdrawing consent has to actually remove what was set, otherwise
    // the _ga cookie keeps identifying the visitor for two years.
    var host = global.location.hostname;
    var domains = ['', '; Domain=' + host, '; Domain=.' + host];
    document.cookie.split(';').forEach(function (entry) {
      var name = entry.split('=')[0].trim();
      if (name.indexOf('_ga') !== 0) return;
      domains.forEach(function (domain) {
        document.cookie = name + '=; Path=/; Max-Age=0' + domain;
      });
    });
  }

  var gaLoaded = false;

  function loadGA() {
    if (gaLoaded || !GA_ID) return;
    gaLoaded = true;

    global.dataLayer = global.dataLayer || [];
    global.gtag = function () { global.dataLayer.push(arguments); };
    global.gtag('js', new Date());
    // anonymize_ip is redundant on GA4 (IPs are always truncated) but
    // harmless, and makes the intent explicit to anyone auditing this.
    global.gtag('config', GA_ID, { anonymize_ip: true });

    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA_ID);
    document.head.appendChild(s);
  }

  // ── Banner ──

  var STYLE = [
    '.oc-consent{position:fixed;left:0;right:0;bottom:0;z-index:9999;',
    'background:#fff;border-top:1px solid #e4e1da;',
    'box-shadow:0 -6px 28px rgba(0,0,0,0.10);',
    "font-family:'Outfit',sans-serif;color:#1a1a18;padding:20px 24px;}",
    '.oc-consent-inner{max-width:1100px;margin:0 auto;display:flex;',
    'align-items:center;gap:28px;flex-wrap:wrap;}',
    '.oc-consent-text{flex:1 1 380px;font-size:14.5px;line-height:1.55;margin:0;color:#444;}',
    '.oc-consent-text a{color:#1f355a;font-weight:600;text-underline-offset:3px;}',
    '.oc-consent-actions{display:flex;gap:10px;flex-wrap:wrap;}',
    ".oc-consent button{font-family:'Outfit',sans-serif;font-size:14.5px;",
    'font-weight:600;padding:11px 24px;border-radius:100px;cursor:pointer;',
    'border:1.5px solid #1f355a;transition:background .15s,color .15s;}',
    '.oc-consent .oc-accept{background:#1f355a;color:#fff;}',
    '.oc-consent .oc-accept:hover{background:#162844;border-color:#162844;}',
    '.oc-consent .oc-reject{background:transparent;color:#1f355a;}',
    '.oc-consent .oc-reject:hover{background:rgba(31,53,90,0.07);}',
    '@media(max-width:560px){.oc-consent{padding:18px 18px 22px;}',
    '.oc-consent-actions{width:100%;}.oc-consent-actions button{flex:1;}}',
  ].join('');

  function policyHref() {
    // Works from the root, /blog/, /legal/ and /trials/ alike.
    return global.location.pathname.split('/').length > 2
      ? '../legal/cookie.html'
      : 'legal/cookie.html';
  }

  var banner = null;

  function hide() {
    if (banner && banner.parentNode) banner.parentNode.removeChild(banner);
    banner = null;
  }

  function show() {
    if (banner) return;

    if (!document.getElementById('oc-consent-style')) {
      var style = document.createElement('style');
      style.id = 'oc-consent-style';
      style.textContent = STYLE;
      document.head.appendChild(style);
    }

    banner = document.createElement('div');
    banner.className = 'oc-consent';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Cookie choices');
    banner.innerHTML =
      '<div class="oc-consent-inner">' +
        '<p class="oc-consent-text">We\'d like to set analytics cookies to understand how ' +
        'people use this site. They are optional — the site works either way, and we won\'t ' +
        'set them unless you agree. See our <a href="' + policyHref() + '">Cookie Policy</a>.</p>' +
        '<div class="oc-consent-actions">' +
          '<button type="button" class="oc-reject">Reject</button>' +
          '<button type="button" class="oc-accept">Accept analytics</button>' +
        '</div>' +
      '</div>';

    banner.querySelector('.oc-accept').addEventListener('click', function () {
      writeConsent('accepted');
      hide();
      loadGA();
    });

    banner.querySelector('.oc-reject').addEventListener('click', function () {
      writeConsent('rejected');
      hide();
      clearAnalyticsCookies();
    });

    document.body.appendChild(banner);
  }

  function init() {
    var stored = readConsent();
    if (stored === 'accepted') loadGA();
    else if (stored !== 'rejected') show(); // no choice recorded yet
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  global.OCConsent = {
    get: readConsent,
    reopen: function () { hide(); show(); },
    revoke: function () {
      writeConsent('rejected');
      clearAnalyticsCookies();
      hide();
    },
  };
})(window);
