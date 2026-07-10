const { onSchedule } = require('firebase-functions/v2/scheduler');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

const RESEND_API_KEY = defineSecret('RESEND_API_KEY');

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
