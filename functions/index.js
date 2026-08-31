const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const crypto = require('node:crypto');

admin.initializeApp();
const db = admin.firestore();

const RESEND_API_KEY = defineSecret('RESEND_API_KEY');

// ══════════════════════════════════════════════════════════
// FORM SUBMISSIONS — replaces Formspree
// POST { form: "<id>", data: { ... } } → Firestore + Resend email
// ══════════════════════════════════════════════════════════

// Sending is authenticated on the send.onecarbon.com subdomain, NOT the root
// domain — the root MX belongs to Microsoft 365 and must not be touched, and
// root SPF is `-all` without Resend. Every `from` address here has to stay
// @send.onecarbon.com or it will fail DMARC (p=quarantine).
const NOTIFY_TO = 'team@onecarbon.com';
const NOTIFY_FROM = 'OneCarbon Forms <forms@send.onecarbon.com>';

// Only these form ids are accepted. `subject` is the notification subject line;
// `summary` picks the fields worth putting in the email body (the full record
// always lands in Firestore).
const FORMS = {
  profile: {
    subject: 'PROFILE sign-up',
    summary: ['name', 'email', 'location', 'age', 'questions'],
  },
  newsletter: {
    subject: 'Mailing list sign-up',
    summary: ['email', 'gdpr_consent', 'source'],
  },
  contact: {
    subject: 'Contact form',
    summary: ['name', 'email', 'message'],
  },
  quiz: {
    subject: 'Brain health quiz',
    summary: ['email', 'name', 'age', 'cognitive_status'],
  },
  feedback: {
    subject: 'App feedback',
    summary: ['user', 'email', 'sessions', 'message'],
  },
};

// Firestore caps documents at 1 MiB; the quiz posts raw trial-level data, so
// leave headroom rather than letting a big payload fail the write.
const MAX_PAYLOAD_BYTES = 700 * 1024;

exports.submitForm = onRequest(
  { cors: true, secrets: [RESEND_API_KEY], maxInstances: 10 },
  async (req, res) => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'method_not_allowed' });
    }

    const body = req.body || {};
    const formId = String(body.form || '');
    const config = FORMS[formId];
    if (!config) {
      return res.status(400).json({ error: 'unknown_form' });
    }

    const data = body.data && typeof body.data === 'object' ? body.data : {};

    // Honeypot — bots fill it, humans never see it. Accept silently so the
    // bot has no signal that it was caught.
    if (data._gotcha) {
      return res.status(200).json({ ok: true });
    }
    delete data._gotcha;

    if (Buffer.byteLength(JSON.stringify(data), 'utf8') > MAX_PAYLOAD_BYTES) {
      return res.status(413).json({ error: 'payload_too_large' });
    }

    try {
      await db.collection('submissions').doc(formId).collection('entries').add({
        ...data,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        userAgent: String(req.get('user-agent') || '').slice(0, 300),
        referer: String(req.get('referer') || '').slice(0, 300),
      });
    } catch (err) {
      console.error(`Failed to store ${formId} submission:`, err);
      return res.status(500).json({ error: 'store_failed' });
    }

    // Email is best-effort — a failed notification must not lose the entry.
    try {
      await sendSubmissionEmail(formId, config, data, RESEND_API_KEY.value());
    } catch (err) {
      console.error(`Failed to notify for ${formId} submission:`, err);
    }

    return res.status(200).json({ ok: true });
  }
);

async function sendSubmissionEmail(formId, config, data, apiKey) {
  // Campaign fields ride along on every form (see js/utm.js), so append them
  // to whatever that form's own summary already lists.
  const ATTRIBUTION = [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content',
    'referrer_host',
    'landing_page',
  ];

  const rows = config.summary
    .concat(ATTRIBUTION)
    .filter((field) => data[field] !== undefined && data[field] !== '')
    .map(
      (field) =>
        `<tr><td style="padding:6px 16px 6px 0;color:#888;font-size:13px;vertical-align:top;">${field}</td>` +
        `<td style="padding:6px 0;font-size:14px;">${escapeHtml(String(data[field])).slice(0, 2000)}</td></tr>`
    )
    .join('');

  const replyTo = typeof data.email === 'string' && data.email.includes('@') ? data.email : undefined;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: NOTIFY_FROM,
      to: NOTIFY_TO,
      ...(replyTo ? { reply_to: replyTo } : {}),
      subject: `${config.subject} — onecarbon.com`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a1a18;">
          <h2 style="font-size:18px;font-weight:600;margin:0 0 16px;">${config.subject}</h2>
          <table style="border-collapse:collapse;width:100%;">${rows}</table>
          <p style="font-size:12px;color:#888;margin-top:24px;border-top:1px solid #eee;padding-top:14px;">
            Full record in Firestore → submissions/${formId}/entries
          </p>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    throw new Error(`Resend error: ${await res.text()}`);
  }
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Runs every day at 9am UTC
exports.sendReminders = onSchedule(
  { schedule: 'every day 09:00', secrets: [RESEND_API_KEY] },
  async () => {
    const now = Date.now();
    const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;

    // Get all users
    const usersSnap = await db.collection('users').get();

    for (const userDoc of usersSnap.docs) {
      const uid = userDoc.id;
      const { email, name } = userDoc.data();
      if (!email) continue;

      // Get their sessions, ordered by timestamp
      const sessionsSnap = await db
        .collection('users').doc(uid)
        .collection('sessions')
        .orderBy('completedAt', 'desc')
        .limit(1)
        .get();

      if (sessionsSnap.empty) continue; // never completed a session

      const lastSession = sessionsSnap.docs[0].data();
      const lastDate = lastSession.completedAt?.toDate?.() ?? null;
      if (!lastDate) continue;

      const daysSince = (now - lastDate.getTime()) / (24 * 60 * 60 * 1000);

      // Only remind on day 14 (within a 24h window to avoid double-sending)
      if (daysSince < 14 || daysSince >= 15) continue;

      const firstName = (name || email).split(/[\s@]/)[0];
      await sendReminderEmail(email, firstName, RESEND_API_KEY.value());
      console.log(`Reminder sent to ${email}`);
    }
  }
);

async function sendReminderEmail(to, firstName, apiKey) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'OneCarbon <reminders@send.onecarbon.com>',
      to,
      subject: "Time for your cognitive check-in",
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1a1a18;">
          <img src="https://onecarbon.com/media/logo-full.png" alt="OneCarbon" style="height:36px;margin-bottom:32px;">
          <h2 style="font-size:22px;font-weight:600;margin-bottom:12px;">Hi ${firstName},</h2>
          <p style="font-size:15px;line-height:1.6;color:#444;">
            It's been two weeks since your last cognitive assessment — time for your next check-in.
          </p>
          <p style="font-size:15px;line-height:1.6;color:#444;">
            Regular testing is what makes the data meaningful. Each session takes about 10 minutes.
          </p>
          <a href="https://onecarbon.com/app.html"
             style="display:inline-block;margin:24px 0;padding:14px 28px;background:#1f355a;color:#fff;text-decoration:none;border-radius:100px;font-size:15px;font-weight:600;">
            Start your assessment →
          </a>
          <p style="font-size:13px;color:#888;margin-top:32px;border-top:1px solid #eee;padding-top:16px;">
            You're receiving this because you signed up for longitudinal cognitive tracking at OneCarbon.
            <a href="mailto:team@onecarbon.com" style="color:#1f355a;">Unsubscribe</a>
          </p>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend error: ${err}`);
  }
}

// ══════════════════════════════════════════════════════════
// PASSWORDLESS SIGN-IN — six-digit email codes (OneCarbot app)
// POST { action: "request", email }        → emails a code
// POST { action: "verify", email, code }   → { token } for signInWithCustomToken
//
// Firebase's own email-link sign-in would need Universal Links and App Links
// wired to a Hosting domain. A typed code needs none of that, works when the
// email is read on a different device, and sends from send.onecarbon.com,
// which is already SPF/DKIM verified — see the Resend note in CLAUDE.md.
// ══════════════════════════════════════════════════════════

const AUTH_FROM = 'OneCarbot <auth@send.onecarbon.com>';
const CODE_TTL_MS = 10 * 60 * 1000;   // 10 minutes
const MAX_ATTEMPTS = 5;               // per issued code
const MAX_SENDS_PER_HOUR = 5;         // per email address

// Codes are hashed before storage, so a leaked database snapshot is not a pile
// of live login credentials. The pepper is the project's own secret.
const LOGIN_CODE_PEPPER = defineSecret('LOGIN_CODE_PEPPER');

function hashCode(email, code, pepper) {
  return crypto
    .createHash('sha256')
    .update(`${email.toLowerCase()}::${code}::${pepper}`)
    .digest('hex');
}

function normaliseEmail(raw) {
  if (typeof raw !== 'string') return null;
  const e = raw.trim().toLowerCase();
  // Deliberately loose — real addresses are stranger than most regexes allow.
  if (e.length < 5 || e.length > 254 || !e.includes('@') || /\s/.test(e)) return null;
  return e;
}

exports.loginCode = onRequest(
  { cors: true, secrets: [RESEND_API_KEY, LOGIN_CODE_PEPPER], maxInstances: 10 },
  async (req, res) => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'method_not_allowed' });
    }

    const body = req.body || {};
    const email = normaliseEmail(body.email);
    if (!email) return res.status(400).json({ error: 'bad_email' });

    const ref = db.collection('loginCodes').doc(email);

    // ── Send a code ──
    if (body.action === 'request') {
      const now = Date.now();
      const snap = await ref.get();
      const prev = snap.exists ? snap.data() : {};

      // Rate limit per address. Window resets an hour after the first send.
      const windowStart = prev.windowStart || 0;
      const sends = now - windowStart < 3600000 ? (prev.sends || 0) : 0;
      if (sends >= MAX_SENDS_PER_HOUR) {
        // Same shape as success — never tell a caller how far they have got.
        return res.json({ ok: true });
      }

      const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');

      await ref.set({
        hash: hashCode(email, code, LOGIN_CODE_PEPPER.value()),
        expiresAt: now + CODE_TTL_MS,
        attempts: 0,
        sends: sends + 1,
        windowStart: sends === 0 ? now : windowStart,
        updatedAt: new Date().toISOString(),
      });

      await sendLoginCodeEmail(email, code, RESEND_API_KEY.value());
      return res.json({ ok: true });
    }

    // ── Check a code ──
    if (body.action === 'verify') {
      const code = typeof body.code === 'string' ? body.code.replace(/\D/g, '') : '';
      if (code.length !== 6) return res.status(400).json({ error: 'bad_code' });

      const snap = await ref.get();
      if (!snap.exists) return res.status(400).json({ error: 'invalid_code' });

      const rec = snap.data();
      if (Date.now() > (rec.expiresAt || 0)) {
        await ref.delete();
        return res.status(400).json({ error: 'expired' });
      }
      if ((rec.attempts || 0) >= MAX_ATTEMPTS) {
        await ref.delete();
        return res.status(429).json({ error: 'too_many_attempts' });
      }

      const expected = rec.hash || '';
      const given = hashCode(email, code, LOGIN_CODE_PEPPER.value());
      // Both are fixed-length hex digests, so timingSafeEqual is safe to call.
      const match =
        expected.length === given.length &&
        crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(given));

      if (!match) {
        await ref.update({ attempts: (rec.attempts || 0) + 1 });
        return res.status(400).json({ error: 'invalid_code' });
      }

      // Correct — burn the code so it cannot be replayed.
      await ref.delete();

      // Reuse the existing account when there is one, so a participant who
      // started on app.html keeps the same uid and their whole session history.
      let user;
      try {
        user = await admin.auth().getUserByEmail(email);
      } catch (e) {
        if (e.code !== 'auth/user-not-found') throw e;
        user = await admin.auth().createUser({ email, emailVerified: true });
      }

      // Reaching a code sent to that address is itself proof of control.
      if (!user.emailVerified) {
        await admin.auth().updateUser(user.uid, { emailVerified: true });
      }

      const token = await admin.auth().createCustomToken(user.uid);
      return res.json({ token });
    }

    return res.status(400).json({ error: 'bad_action' });
  }
);

async function sendLoginCodeEmail(email, code, apiKey) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: AUTH_FROM,
      to: email,
      subject: `${code} is your OneCarbot sign-in code`,
      html: `
        <div style="font-family:sans-serif;max-width:460px;margin:0 auto;color:#1a1a18;">
          <p style="font-size:15px;margin:0 0 20px;">Here is your sign-in code for OneCarbot.</p>
          <p style="font-size:34px;font-weight:600;letter-spacing:8px;margin:0 0 20px;color:#1f355a;">${code}</p>
          <p style="font-size:14px;color:#555;margin:0 0 8px;">It expires in 10 minutes.</p>
          <p style="font-size:13px;color:#888;margin:0;">
            If you didn't ask to sign in, you can ignore this email — nobody can
            get into your account without this code.
          </p>
        </div>
      `,
      text:
        `Your OneCarbot sign-in code is ${code}. It expires in 10 minutes.\n\n` +
        `If you didn't ask to sign in, ignore this email.`,
    }),
  });

  if (!res.ok) {
    throw new Error(`Resend error: ${await res.text()}`);
  }
}

// ══════════════════════════════════════════════════════════
// ACCOUNT DELETION — App Store guideline 5.1.1(v)
// POST { }  with  Authorization: Bearer <Firebase ID token>
//
// Any app that lets you create an account must let you delete it from inside
// the app. A client SDK cannot do this itself: deleting users/<uid> leaves the
// profile and sessions subcollections orphaned, and a client cannot enumerate
// them for deletion under our rules. So the Admin SDK does it here.
//
// The uid comes from the verified ID token and NEVER from the request body —
// otherwise this endpoint would delete anyone's account on request.
// ══════════════════════════════════════════════════════════

exports.deleteAccount = onRequest(
  { cors: true, maxInstances: 5 },
  async (req, res) => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'method_not_allowed' });
    }

    const header = req.get('Authorization') || '';
    const match = header.match(/^Bearer (.+)$/);
    if (!match) return res.status(401).json({ error: 'no_token' });

    let uid;
    let email;
    try {
      // checkRevoked: a token from a session that has since been revoked must
      // not be able to delete an account.
      const decoded = await admin.auth().verifyIdToken(match[1], true);
      uid = decoded.uid;
      email = decoded.email || null;
    } catch (e) {
      return res.status(401).json({ error: 'bad_token' });
    }

    try {
      // Firestore first. If this half fails we still have the auth user, so the
      // participant can sign in and retry — the reverse would strand data that
      // nobody can reach or delete.
      await db.recursiveDelete(db.collection('users').doc(uid));

      // Any pending sign-in code for that address is now meaningless.
      if (email) {
        await db.collection('loginCodes').doc(email.toLowerCase()).delete().catch(() => {});
      }

      await admin.auth().deleteUser(uid);

      console.log(`Account deleted: ${uid}`);
      return res.json({ ok: true });
    } catch (e) {
      console.error('Account deletion failed', uid, e);
      return res.status(500).json({ error: 'delete_failed' });
    }
  }
);
