/* ══════════════════════════════════════════════════════════
   Cookie consent + gated GA4 / Meta Pixel

   Under PECR and UK GDPR, analytics and advertising cookies need consent
   BEFORE they are set. So nothing Google- or Meta-related is requested
   until someone opts in — this doesn't use Consent Mode to load gtag in
   a denied state, it simply doesn't load gtag/fbq at all until there is
   a stored 'accepted'.

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
  // Firebase config — the marketing site and the app report into the
  // SAME GA4 property, by design.
  // ══════════════════════════════════════════════════════════
  var GA_ID = 'G-MT11J77CNR';

  // ══════════════════════════════════════════════════════════
  // Meta (Facebook) Pixel ID, for ad measurement. Same consent gate as
  // GA4 — nothing Meta-related loads until someone accepts.
  // ══════════════════════════════════════════════════════════
  var META_PIXEL_ID = '2146673852953684';

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
    // the _ga/_fbp cookies keep identifying the visitor for months or years.
    var host = global.location.hostname;
    var domains = ['', '; Domain=' + host, '; Domain=.' + host];
    document.cookie.split(';').forEach(function (entry) {
      var name = entry.split('=')[0].trim();
      if (name.indexOf('_ga') !== 0 && name.indexOf('_fb') !== 0) return;
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

  var metaPixelLoaded = false;

  function loadMetaPixel() {
    if (metaPixelLoaded || !META_PIXEL_ID) return;
    metaPixelLoaded = true;

    /* eslint-disable */
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
    n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(global,
    document,'script','https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */

    global.fbq('init', META_PIXEL_ID);
    global.fbq('track', 'PageView');
  }

  function loadAnalytics() {
    loadGA();
    loadMetaPixel();
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
    // The banner is fixed to the bottom, so on a short screen it sits on top
    // of whatever is down there — including the homepage quiz's Continue
    // button, which made the quiz impossible to complete on a phone. Reserve
    // its height at the bottom of anything scrollable so nothing is ever
    // covered. #qz-page is its own fixed, scrolling layer, so padding body
    // alone does not reach it.
    'html.oc-consent-open body{padding-bottom:var(--oc-consent-h,0px);}',
    'html.oc-consent-open #qz-page{padding-bottom:var(--oc-consent-h,0px);}',
  ].join('');

  function policyHref() {
    // Works from the root, /blog/, /legal/ and /trials/ alike.
    return global.location.pathname.split('/').length > 2
      ? '../legal/cookie.html'
      : 'legal/cookie.html';
  }

  var banner = null;

  // Publish the banner's height so the page can reserve space for it. Re-run
  // on resize and orientation change, where the banner reflows to a different
  // height and a stale value would leave content covered again.
  function reserveSpace() {
    if (!banner) return;
    var height = banner.getBoundingClientRect().height;
    document.documentElement.style.setProperty('--oc-consent-h', Math.ceil(height) + 'px');
  }

  function releaseSpace() {
    document.documentElement.classList.remove('oc-consent-open');
    document.documentElement.style.removeProperty('--oc-consent-h');
  }

  function hide() {
    if (banner && banner.parentNode) banner.parentNode.removeChild(banner);
    banner = null;
    releaseSpace();
    global.removeEventListener('resize', reserveSpace);
    global.removeEventListener('orientationchange', reserveSpace);
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
        '<p class="oc-consent-text">We\'d like to set analytics and advertising cookies to ' +
        'understand how people use this site and measure our ads. They are optional — the site ' +
        'works either way, and we won\'t set them unless you agree. See our ' +
        '<a href="' + policyHref() + '">Cookie Policy</a>.</p>' +
        '<div class="oc-consent-actions">' +
          '<button type="button" class="oc-reject">Reject</button>' +
          '<button type="button" class="oc-accept">Accept analytics</button>' +
        '</div>' +
      '</div>';

    banner.querySelector('.oc-accept').addEventListener('click', function () {
      writeConsent('accepted');
      hide();
      loadAnalytics();
    });

    banner.querySelector('.oc-reject').addEventListener('click', function () {
      writeConsent('rejected');
      hide();
      clearAnalyticsCookies();
    });

    document.body.appendChild(banner);

    document.documentElement.classList.add('oc-consent-open');
    reserveSpace();
    global.addEventListener('resize', reserveSpace);
    global.addEventListener('orientationchange', reserveSpace);
  }

  function init() {
    var stored = readConsent();
    if (stored === 'accepted') loadAnalytics();
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
