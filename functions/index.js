const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

const RESEND_API_KEY = defineSecret('RESEND_API_KEY');

// ══════════════════════════════════════════════════════════
// FORM SUBMISSIONS — replaces Formspree
// POST { form: "<id>", data: { ... } } → Firestore + Resend email
// ══════════════════════════════════════════════════════════

// TARGET: both of these should be team@onecarbon.com. Blocked until
// onecarbon.com is verified at resend.com/domains — until then Resend rejects
// the domain as a sender, and its shared test sender below will only deliver
// to the account owner's own address. Flip both to team@onecarbon.com the
// moment verification goes through (that also fixes sendReminders).
const NOTIFY_TO = 'yizhou0421@gmail.com';
const NOTIFY_FROM = 'OneCarbon Forms <onboarding@resend.dev>';

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
  const rows = config.summary
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
      from: 'OneCarbon <reminders@onecarbon.com>',
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
