#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════
   Export Firestore data to CSV — marketing submissions and app data.

   The Firebase console can't export a single collection — only a whole-
   database dump to a GCS bucket. This pulls the collections out directly
   and writes spreadsheet-ready CSV instead.

   Two unrelated trees live in this project (see CLAUDE.md):
     submissions/<form>/entries  — marketing leads, written by submitForm
     users/<uid>/…               — app accounts + cognitive test sessions

   Setup (once):
     Firebase console → Project settings → Service accounts →
     "Generate new private key". Save the JSON somewhere OUTSIDE this
     repo — it grants full admin access to the project.
     (Or use `gcloud auth application-default login` and skip the key.)

   Usage:
     export GOOGLE_APPLICATION_CREDENTIALS=~/onecarbon-key.json
     node scripts/export-firestore.js                    # everything
     node scripts/export-firestore.js contact            # one target
     node scripts/export-firestore.js users sessions     # app data only
     node scripts/export-firestore.js --out ~/somewhere  # elsewhere
     node scripts/export-firestore.js sessions --raw     # incl. trial-level data

   Targets: profile · newsletter · contact · quiz · feedback · users · sessions

   Output lands in exports/<target>-<date>.csv (gitignored) unless --out
   names another directory. Exports hold real contact details and health
   information — keep them out of git and out of anywhere shared more
   widely than the team.
   ══════════════════════════════════════════════════════════ */

const fs = require('fs');
const os = require('os');
const path = require('path');
// firebase-admin isn't a dependency of the site itself — borrow the copy
// the Cloud Functions already install.
const admin = require(path.join(__dirname, '..', 'functions', 'node_modules', 'firebase-admin'));

// Mirrors FORMS in functions/index.js. Anything not listed there can't be
// submitted, so these are the only collections that will ever have entries.
const ALL_FORMS = ['profile', 'newsletter', 'contact', 'quiz', 'feedback'];
const APP_TARGETS = ['users', 'sessions'];
const ALL_TARGETS = ALL_FORMS.concat(APP_TARGETS);

// Put the fields people actually read first; everything else follows
// alphabetically so the CSV is stable between runs.
const PREFERRED_ORDER = [
  // submissions
  'createdAt', 'name', 'email', 'message', 'location', 'age', 'questions',
  'gdpr_consent', 'source', 'utm_source', 'utm_medium', 'utm_campaign',
  'utm_term', 'utm_content', 'referrer_host', 'landing_page',
  // app
  'uid', 'sessionId', 'completedAt', 'lastSeen', 'probioticStart',
  'profile.name', 'profile.email', 'profile.age', 'profile.sex',
  'profile.education', 'profile.ethnicity', 'profile.medical_history',
  'profile.consent', 'profile.createdAt',
  // the seven cognitive task scores, in battery order
  'results.cog_rt', 'results.cog_numeric', 'results.cog_symbol',
  'results.cog_pal', 'results.cog_matrix', 'results.cog_tmta', 'results.cog_tmtb',
];

// ── Flattening ──

function isTimestamp(v) {
  return v && typeof v.toDate === 'function';
}

// Sessions nest results/sleep/probiotic one level deep. Flatten to dotted
// columns so each cognitive score and sleep answer gets its own column
// rather than a wall of JSON in a single cell.
function flatten(value, prefix, out) {
  Object.keys(value).forEach((key) => {
    const full = prefix ? prefix + '.' + key : key;
    const v = value[key];
    if (v !== null && typeof v === 'object' && !Array.isArray(v) && !isTimestamp(v)) {
      flatten(v, full, out);
    } else {
      out[full] = v;
    }
  });
  return out;
}

function toCell(value) {
  if (value === null || value === undefined) return '';
  // Firestore timestamps come back as objects — ISO is what spreadsheets
  // and every downstream tool actually parse.
  if (isTimestamp(value)) return value.toDate().toISOString();
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function toCsv(rows) {
  // Union of every key present — these documents are schemaless, and the
  // cognitive sessions in particular vary between app versions.
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

function write(target, rows, outDir) {
  if (!rows.length) {
    console.log(`  ${target}: no entries`);
    return;
  }
  const stamp = new Date().toISOString().slice(0, 10);
  const file = path.join(outDir, `${target}-${stamp}.csv`);
  fs.writeFileSync(file, toCsv(rows), 'utf8');
  const shown = path.relative(process.cwd(), file);
  console.log(`  ${target}: ${rows.length} rows → ${shown.startsWith('..') ? file : shown}`);
}

// ── Collectors ──

async function collectForm(db, formId) {
  const snap = await db
    .collection('submissions').doc(formId).collection('entries')
    .orderBy('createdAt', 'desc')
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

// One row per app account: the user doc plus its profile/data document,
// which is where onboarding puts age, sex, education and consent.
async function collectUsers(db) {
  const snap = await db.collection('users').get();
  const rows = [];
  for (const doc of snap.docs) {
    const profileSnap = await doc.ref.collection('profile').doc('data').get();
    const row = { uid: doc.id, ...doc.data() };
    if (profileSnap.exists) flatten(profileSnap.data(), 'profile', row);
    // Count sessions here so the user list alone answers "who is active?".
    const sessions = await doc.ref.collection('sessions').get();
    row.session_count = sessions.size;
    rows.push(row);
  }
  rows.sort((a, b) => String(b.lastSeen || '').localeCompare(String(a.lastSeen || '')));
  return rows;
}

// One row per completed cognitive session, carrying the user's name and
// email so the file stands alone without a manual join.
async function collectSessions(db, includeRaw) {
  const users = await db.collection('users').get();
  const rows = [];
  for (const user of users.docs) {
    const { name, email } = user.data();
    const snap = await user.ref.collection('sessions').orderBy('completedAt', 'desc').get();
    snap.docs.forEach((doc) => {
      const row = { uid: user.id, sessionId: doc.id, name, email };
      flatten(doc.data(), '', row);
      if (!includeRaw) {
        // cog_*_raw holds every keystroke and reaction time as a JSON blob —
        // hundreds of characters per column, useless in a spreadsheet. Kept
        // behind --raw for whoever is doing the actual analysis.
        Object.keys(row).forEach((k) => { if (k.endsWith('_raw')) delete row[k]; });
      }
      rows.push(row);
    });
  }
  rows.sort((a, b) => toCell(b.completedAt).localeCompare(toCell(a.completedAt)));
  return rows;
}

// ── Main ──

(async () => {
  const argv = process.argv.slice(2);

  // --out <dir> / --out=<dir> and --raw, anywhere in the arg list; the rest
  // are target names.
  let outDir = path.join(__dirname, '..', 'exports');
  let includeRaw = false;
  const requested = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--raw') {
      includeRaw = true;
    } else if (argv[i] === '--out') {
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
  if (outDir.startsWith('~')) outDir = path.join(os.homedir(), outDir.slice(1));

  const targets = requested.length ? requested : ALL_TARGETS;
  const unknown = targets.filter((t) => !ALL_TARGETS.includes(t));
  if (unknown.length) {
    console.error(`Unknown target(s): ${unknown.join(', ')}`);
    console.error(`Valid targets: ${ALL_TARGETS.join(', ')}`);
    process.exit(1);
  }

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    // Not fatal — gcloud application-default credentials work too, and the
    // SDK finds those on its own.
    console.warn(
      'No GOOGLE_APPLICATION_CREDENTIALS set — falling back to application ' +
      'default credentials.\n'
    );
  }

  admin.initializeApp({ projectId: 'onecarbon-app' });
  const db = admin.firestore();

  fs.mkdirSync(outDir, { recursive: true });
  console.log('Exporting from onecarbon-app:');

  for (const target of targets) {
    if (ALL_FORMS.includes(target)) write(target, await collectForm(db, target), outDir);
    else if (target === 'users') write('users', await collectUsers(db), outDir);
    else if (target === 'sessions') write('sessions', await collectSessions(db, includeRaw), outDir);
  }
  process.exit(0);
})().catch((err) => {
  console.error('Export failed:', err.message);
  process.exit(1);
});
