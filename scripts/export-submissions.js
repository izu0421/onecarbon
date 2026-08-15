#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════
   Export form submissions from Firestore to CSV.

   The Firebase console can't export a single collection — only a whole-
   database dump to a GCS bucket. This pulls submissions/<form>/entries
   straight out and writes a spreadsheet-ready CSV instead.

   Setup (once):
     Firebase console → Project settings → Service accounts →
     "Generate new private key". Save the JSON somewhere OUTSIDE this
     repo — it grants full admin access to the project. ~/ is fine.

   Usage:
     export GOOGLE_APPLICATION_CREDENTIALS=~/onecarbon-key.json
     node scripts/export-submissions.js                 # every form
     node scripts/export-submissions.js profile         # one form
     node scripts/export-submissions.js contact profile # several
     node scripts/export-submissions.js --out ~/somewhere   # elsewhere

   Output lands in exports/<form>-<date>.csv (gitignored) unless --out
   names another directory. Exports hold real contact details — keep them
   out of git and out of anywhere shared more widely than the team.
   ══════════════════════════════════════════════════════════ */

const fs = require('fs');
const path = require('path');
// firebase-admin isn't a dependency of the site itself — borrow the copy
// the Cloud Functions already install.
const admin = require(path.join(__dirname, '..', 'functions', 'node_modules', 'firebase-admin'));

// Mirrors FORMS in functions/index.js. Anything not listed there can't be
// submitted, so these are the only collections that will ever have entries.
const ALL_FORMS = ['profile', 'newsletter', 'contact', 'quiz', 'feedback'];

// Put the fields people actually read first; everything else follows
// alphabetically so the CSV is stable between runs.
const PREFERRED_ORDER = [
  'createdAt', 'name', 'email', 'message', 'location', 'age', 'questions',
  'gdpr_consent', 'source', 'utm_source', 'utm_medium', 'utm_campaign',
  'utm_term', 'utm_content', 'referrer_host', 'landing_page',
];

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error(
    'Missing GOOGLE_APPLICATION_CREDENTIALS.\n' +
    'Point it at your service account JSON, e.g.\n' +
    '  export GOOGLE_APPLICATION_CREDENTIALS=~/onecarbon-key.json'
  );
  process.exit(1);
}

admin.initializeApp({ projectId: 'onecarbon-app' });
const db = admin.firestore();

function toCell(value) {
  if (value === null || value === undefined) return '';
  // Firestore timestamps come back as objects — ISO is what spreadsheets
  // and every downstream tool actually parse.
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function toCsv(rows) {
  // Union of every key present — submissions are schemaless, and the quiz
  // in particular adds fields that other forms never have.
  const seen = new Set();
  rows.forEach((row) => Object.keys(row).forEach((k) => seen.add(k)));
  const headers = PREFERRED_ORDER.filter((h) => seen.has(h))
    .concat([...seen].filter((h) => !PREFERRED_ORDER.includes(h)).sort());

  const escape = (cell) => '"' + cell.replace(/"/g, '""') + '"';
  const lines = [headers.map(escape).join(',')];
  rows.forEach((row) => {
    lines.push(headers.map((h) => escape(toCell(row[h]))).join(','));
  });
  // BOM so Excel opens UTF-8 (accented names, Chinese) without mangling it.
  return '﻿' + lines.join('\r\n') + '\r\n';
}

async function exportForm(formId, outDir) {
  const snap = await db
    .collection('submissions').doc(formId).collection('entries')
    .orderBy('createdAt', 'desc')
    .get();

  if (snap.empty) {
    console.log(`  ${formId}: no entries`);
    return;
  }

  const rows = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  const stamp = new Date().toISOString().slice(0, 10);
  const file = path.join(outDir, `${formId}-${stamp}.csv`);
  fs.writeFileSync(file, toCsv(rows), 'utf8');
  console.log(`  ${formId}: ${rows.length} entries → ${path.relative(process.cwd(), file)}`);
}

(async () => {
  const argv = process.argv.slice(2);

  // --out <dir> / --out=<dir>, anywhere in the arg list; the rest are form ids.
  let outDir = path.join(__dirname, '..', 'exports');
  const requested = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--out') {
      if (!argv[i + 1]) {
        console.error('--out needs a directory.');
        process.exit(1);
      }
      outDir = argv[++i];
    } else if (argv[i].startsWith('--out=')) {
      outDir = argv[i].slice('--out='.length);
    } else {
      requested.push(argv[i]);
    }
  }
  // Shells don't expand ~ inside quotes, and it's the natural way to type a
  // home-relative path — resolve it rather than creating a literal "~" dir.
  if (outDir.startsWith('~')) {
    outDir = path.join(require('os').homedir(), outDir.slice(1));
  }

  const forms = requested.length ? requested : ALL_FORMS;

  const unknown = forms.filter((f) => !ALL_FORMS.includes(f));
  if (unknown.length) {
    console.error(`Unknown form id(s): ${unknown.join(', ')}`);
    console.error(`Valid ids: ${ALL_FORMS.join(', ')}`);
    process.exit(1);
  }

  fs.mkdirSync(outDir, { recursive: true });

  console.log(`Exporting from onecarbon-app:`);
  for (const formId of forms) await exportForm(formId, outDir);
  process.exit(0);
})().catch((err) => {
  console.error('Export failed:', err.message);
  process.exit(1);
});
