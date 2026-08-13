/* ══════════════════════════════════════════════════════════
   Campaign attribution (UTM capture)

   UTM parameters only exist in the URL someone first lands on. As soon
   as they click through to another page they are gone, so reading them
   at submit time would miss nearly every conversion. This captures them
   on landing and holds them for the tab, so js/forms.js can attach them
   to whatever form eventually gets submitted.

   FIRST-TOUCH: the first campaign in a session wins. If someone arrives
   from LinkedIn, wanders off, and comes back via a newsletter link, the
   credit stays with LinkedIn — that is the click that actually found
   them. Change WIN to 'last' below to flip it.

   Storage is sessionStorage, not a cookie: it is scoped to the tab,
   cleared when the tab closes, never sent to another site, and is not a
   persistent identifier. Include js/utm.js BEFORE js/forms.js.
   ══════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var KEY = 'oc_attribution';
  var WIN = 'first'; // 'first' | 'last'

  var UTM_FIELDS = [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content',
  ];

  // Ad-platform click ids. Worth keeping — they survive when a link gets
  // shared without its UTMs, and they are how you reconcile with the ad
  // platform's own reporting later.
  var CLICK_IDS = ['gclid', 'fbclid', 'li_fat_id', 'msclkid'];

  function read() {
    try {
      return JSON.parse(sessionStorage.getItem(KEY)) || null;
    } catch (e) {
      return null; // private mode, storage disabled — attribution is optional
    }
  }

  function write(value) {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(value));
    } catch (e) {
      /* nothing we can do, and nothing that should break the form */
    }
  }

  function fromUrl() {
    var params;
    try {
      params = new URLSearchParams(global.location.search);
    } catch (e) {
      return null;
    }

    var found = {};
    var hasAny = false;

    UTM_FIELDS.concat(CLICK_IDS).forEach(function (field) {
      var value = params.get(field);
      if (value) {
        // Cap length so a junk or hostile query string can't bloat the
        // Firestore document.
        found[field] = value.slice(0, 200);
        hasAny = true;
      }
    });

    if (!hasAny) return null;

    found.landing_page = (global.location.pathname || '').slice(0, 200);
    found.captured_at = new Date().toISOString();
    return found;
  }

  function capture() {
    var incoming = fromUrl();
    if (!incoming) return;
    if (WIN === 'first' && read()) return; // already credited this session
    write(incoming);
  }

  // Referrer is worth recording even with no UTMs at all — it is the only
  // signal for untagged traffic (someone sharing a bare link, a press
  // mention that didn't use your campaign URL).
  function referrer() {
    var ref = document.referrer || '';
    if (!ref) return '';
    try {
      var host = new URL(ref).hostname;
      return host === global.location.hostname ? '' : host.slice(0, 200);
    } catch (e) {
      return '';
    }
  }

  capture();

  global.OCAttribution = {
    // Returns the fields to merge into a submission. Always safe to call.
    get: function () {
      var stored = read() || {};
      var out = {};
      Object.keys(stored).forEach(function (k) {
        out[k] = stored[k];
      });
      var ref = referrer();
      if (ref && !out.referrer_host) out.referrer_host = ref;
      return out;
    },
    clear: function () {
      try {
        sessionStorage.removeItem(KEY);
      } catch (e) {}
    },
  };
})(window);
