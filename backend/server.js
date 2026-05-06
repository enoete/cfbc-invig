require('dotenv').config();
const express    = require('express');
const nodemailer = require('nodemailer');
const cors       = require('cors');

const app  = express();
const PORT = process.env.PORT || 3005;

// ── CORS ─────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',').map(s => s.trim()).filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (e.g. Postman, curl) and listed origins
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}));

app.use(express.json());

// ── SMTP CONFIG (live, overridable via /settings POST) ───────
let smtpConfig = {
  host:     process.env.SMTP_HOST     || 'smtp.gmail.com',
  port:     parseInt(process.env.SMTP_PORT) || 587,
  secure:   process.env.SMTP_SECURE === 'true',
  user:     process.env.SMTP_USER     || '',
  pass:     process.env.SMTP_PASS     || '',
  fromName: process.env.SMTP_FROM_NAME || 'CFBC Examinations Office',
};

function buildTransporter() {
  return nodemailer.createTransport({
    host: smtpConfig.host,
    port: smtpConfig.port,
    secure: smtpConfig.secure,
    auth: { user: smtpConfig.user, pass: smtpConfig.pass },
  });
}

// ── EMAIL TEMPLATE ───────────────────────────────────────────
function buildInvigEmail(person, exam, type = 'notification') {
  const isReminder = type === 'reminder';

  const headerBg    = isReminder ? '#856404' : '#0f2744';
  const headerTitle = isReminder
    ? '⏰ Invigilation Reminder — Tomorrow'
    : '📋 Invigilation Assignment';
  const headerSub   = 'Clarence Fitzroy Bryant College &nbsp;·&nbsp; Semester II &nbsp;·&nbsp; AY 2025/2026';
  const intro       = isReminder
    ? `This is your <strong>24-hour reminder</strong> for your invigilation assignment tomorrow.`
    : `You have been assigned to invigilate the following examination. A calendar event has been added to your Google Calendar automatically.`;

  const row = (label, value, shaded) => `
    <tr${shaded ? ' style="background:#eaf2fb"' : ''}>
      <td style="padding:11px 16px;font-weight:bold;width:36%;border-bottom:1px solid #dee2e6;color:#0f2744">${label}</td>
      <td style="padding:11px 16px;border-bottom:1px solid #dee2e6">${value}</td>
    </tr>`;

  const tableRows = [
    row('Course Code',     `<strong>${exam.code}</strong>`,                        true),
    row('Course Name',     exam.courseName,                                        false),
    row('Date &amp; Time', `<strong>${exam.date}</strong> at <strong>${exam.time}</strong>`, true),
    row('Room / Venue',    exam.room,                                              false),
    row('No. of Students', exam.students,                                          true),
    row('Co-Invigilator(s)', exam.coInvigs || 'None',                             false),
    row('Lecturer',        exam.lecturer,                                          true),
  ].join('');

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${headerTitle}</title></head>
<body style="margin:0;padding:0;background:#f4f6fa;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fa;padding:32px 0">
  <tr><td align="center">
    <table width="620" cellpadding="0" cellspacing="0" style="max-width:620px;width:100%;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #dde3ed">

      <!-- HEADER -->
      <tr><td style="background:${headerBg};padding:22px 28px">
        <div style="color:#ffffff;font-size:19px;font-weight:700;letter-spacing:0.3px">${headerTitle}</div>
        <div style="color:#a8c4e0;font-size:12px;margin-top:5px">${headerSub}</div>
      </td></tr>

      <!-- BODY -->
      <tr><td style="padding:24px 28px">
        <p style="margin:0 0 6px;font-size:15px">Dear <strong>${person.name}</strong>,</p>
        <p style="margin:0 0 22px;font-size:14px;color:#444;line-height:1.6">${intro}</p>

        <!-- DETAILS TABLE -->
        <table width="100%" cellpadding="0" cellspacing="0"
          style="border-collapse:collapse;font-size:14px;border:1px solid #dee2e6;border-radius:6px;overflow:hidden;margin-bottom:22px">
          <tbody>${tableRows}</tbody>
        </table>

        <!-- WARNING BOX -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px">
          <tr><td style="background:#fff8e1;border-left:4px solid #f5a623;padding:13px 16px;border-radius:4px;font-size:13px;line-height:1.5">
            ⚠️ Please arrive <strong>15 minutes before</strong> the scheduled start time to collect exam materials and sign the invigilation register.
          </td></tr>
        </table>

        <!-- FOOTER -->
        <p style="font-size:12px;color:#888;margin:0;border-top:1px solid #eee;padding-top:16px;line-height:1.6">
          This is an automated notification from the CFBC Examinations System.<br>
          Please <strong>do not reply</strong> to this email — contact the Examinations Office directly for queries.
        </p>
      </td></tr>

      <!-- BOTTOM BAR -->
      <tr><td style="background:#f4f6fa;padding:14px 28px;border-top:1px solid #dde3ed">
        <p style="margin:0;font-size:11px;color:#94a3b8;text-align:center">
          Clarence Fitzroy Bryant College &nbsp;|&nbsp; Technical &amp; Vocational Education &amp; Management Studies<br>
          Semester II Examinations &nbsp;·&nbsp; AY 2025/2026
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body></html>`;

  const text = `
CFBC Invigilation ${isReminder ? 'Reminder' : 'Assignment'}
Semester II — AY 2025/2026

Dear ${person.name},

${isReminder ? '24-HOUR REMINDER' : 'You have been assigned to invigilate the following examination.'}

Course Code:      ${exam.code}
Course Name:      ${exam.courseName}
Date & Time:      ${exam.date} at ${exam.time}
Room / Venue:     ${exam.room}
No. of Students:  ${exam.students}
Co-Invigilator(s):${exam.coInvigs || 'None'}
Lecturer:         ${exam.lecturer}

⚠ Please arrive 15 minutes early to collect materials and sign the register.

---
Automated notification — CFBC Examinations System. Do not reply.
  `.trim();

  return { html, text };
}

// ═══════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════

// ── Health check ─────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0', smtp: smtpConfig.user });
});

// ── Get current SMTP settings (password masked) ───────────────
app.get('/settings', (req, res) => {
  res.json({
    host:     smtpConfig.host,
    port:     smtpConfig.port,
    secure:   smtpConfig.secure,
    user:     smtpConfig.user,
    pass:     smtpConfig.pass ? '••••••••' : '',
    fromName: smtpConfig.fromName,
  });
});

// ── Update SMTP settings (live, no restart needed) ────────────
app.post('/settings', (req, res) => {
  const { host, port, secure, user, pass, fromName } = req.body;
  if (host)     smtpConfig.host     = host;
  if (port)     smtpConfig.port     = parseInt(port);
  if (secure !== undefined) smtpConfig.secure = !!secure;
  if (user)     smtpConfig.user     = user;
  if (pass && pass !== '••••••••') smtpConfig.pass = pass;
  if (fromName) smtpConfig.fromName = fromName;
  res.json({ ok: true, message: 'SMTP settings updated (until server restart — update .env to persist)' });
});

// ── Test SMTP connection ──────────────────────────────────────
app.post('/settings/test', async (req, res) => {
  try {
    const transporter = buildTransporter();
    await transporter.verify();
    res.json({ ok: true, message: `Connected to ${smtpConfig.host}:${smtpConfig.port} as ${smtpConfig.user}` });
  } catch (err) {
    res.status(400).json({ ok: false, message: err.message });
  }
});

// ── Send notifications ────────────────────────────────────────
// Body: { assignments: [{ person: {name, email}, exam: {...}, type: 'notification'|'reminder' }] }
app.post('/notify', async (req, res) => {
  const { assignments } = req.body;
  if (!Array.isArray(assignments) || assignments.length === 0) {
    return res.status(400).json({ ok: false, message: 'No assignments provided' });
  }

  const transporter = buildTransporter();
  const results = [];

  for (const { person, exam, type = 'notification' } of assignments) {
    if (!person?.email || !exam?.code) {
      results.push({ email: person?.email || '?', ok: false, error: 'Missing person or exam data' });
      continue;
    }

    const { html, text } = buildInvigEmail(person, exam, type);
    const isReminder = type === 'reminder';
    const subject = isReminder
      ? `⏰ REMINDER — Invigilation Tomorrow: ${exam.code} at ${exam.time}`
      : `📋 Invigilation Assignment — ${exam.code} | ${exam.date}`;

    try {
      await transporter.sendMail({
        from:    `"${smtpConfig.fromName}" <${smtpConfig.user}>`,
        to:      `"${person.name}" <${person.email}>`,
        subject,
        text,
        html,
      });
      results.push({ email: person.email, name: person.name, ok: true });
    } catch (err) {
      results.push({ email: person.email, name: person.name, ok: false, error: err.message });
    }
  }

  const allOk  = results.every(r => r.ok);
  const anyOk  = results.some(r => r.ok);
  res.status(allOk ? 200 : anyOk ? 207 : 500).json({
    ok: anyOk,
    sent:   results.filter(r =>  r.ok).length,
    failed: results.filter(r => !r.ok).length,
    results,
  });
});

// ── Start ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n╔══════════════════════════════════════════╗`);
  console.log(`║  CFBC Invigilation Backend               ║`);
  console.log(`║  Running on port ${PORT}                   ║`);
  console.log(`║  SMTP: ${smtpConfig.user.padEnd(34)}║`);
  console.log(`╚══════════════════════════════════════════╝\n`);
});
