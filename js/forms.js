/* ══════════════════════════════════════════════════════════
   OneCarbon form submissions → Firebase Cloud Function
   Replaces Formspree. See functions/index.js → submitForm.

   Two ways to use it:

   1. Declarative — add data-oc-form="<id>" to a <form>. This file
      intercepts the submit, POSTs the fields, and swaps the form for
      the element named in data-oc-success (or an inline message).

   2. Programmatic — OCForms.submit('<id>', { ...fields }) returns a
      promise. Use this where the page already owns the submit flow
      (quiz.html, the index quiz email capture).

   Valid ids: profile · newsletter · contact · quiz · feedback
   ══════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var ENDPOINT = 'https://us-central1-onecarbon-app.cloudfunctions.net/submitForm';

  function submit(formId, data) {
    return fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ form: formId, data: data || {} }),
    }).then(function (resp) {
      if (!resp.ok) throw new Error('Submission failed (' + resp.status + ')');
      return resp.json();
    });
  }

  function fieldsOf(form) {
    var data = {};
    new FormData(form).forEach(function (value, key) {
      // Formspree's underscore-prefixed control fields are meaningless here —
      // the function derives subject and reply-to itself. Keep _gotcha, which
      // is the honeypot the function checks.
      if (key.charAt(0) === '_' && key !== '_gotcha') return;
      if (data[key] === undefined) data[key] = value;
      else data[key] = data[key] + ', ' + value;
    });
    return data;
  }

  function showSuccess(form) {
    var targetId = form.getAttribute('data-oc-success');
    var target = targetId && document.getElementById(targetId);
    if (target) {
      form.style.display = 'none';
      target.style.display = 'block';
      return;
    }
    var msg = document.createElement('p');
    msg.className = 'oc-form-sent';
    msg.textContent = form.getAttribute('data-oc-sent') || 'Thanks — we\'ll be in touch.';
    msg.style.cssText =
      'margin:16px 0 0;font-weight:600;color:var(--accent,#1f355a);' +
      (form.getAttribute('data-oc-sent-style') || '');
    form.parentNode.insertBefore(msg, form.nextSibling);
    form.style.display = 'none';
  }

  function bind(form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = form.querySelector('[type="submit"]');
      var label = btn && btn.textContent;
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Sending…';
      }
      submit(form.getAttribute('data-oc-form'), fieldsOf(form))
        .then(function () {
          form.reset();
          showSuccess(form);
        })
        .catch(function () {
          if (btn) {
            btn.disabled = false;
            btn.textContent = label;
          }
          alert('Something went wrong. Please try again, or email us at yizhou@onecarbon.com.');
        });
    });
  }

  function init() {
    var forms = document.querySelectorAll('form[data-oc-form]');
    for (var i = 0; i < forms.length; i++) bind(forms[i]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  global.OCForms = { submit: submit, endpoint: ENDPOINT };
})(window);
