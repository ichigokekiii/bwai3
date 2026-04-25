const nodemailer = require("nodemailer");
require("dotenv").config();

let transporter;

function env(...keys) {
  for (const key of keys) {
    if (process.env[key] !== undefined && process.env[key] !== "") {
      return process.env[key];
    }
  }

  return undefined;
}

function getEmailTransport() {
  return env("EMAIL_TRANSPORT", "MAIL_MAILER") || "smtp";
}

function getSmtpConfig() {
  const host = env("SMTP_HOST", "MAIL_HOST");
  const port = Number(env("SMTP_PORT", "MAIL_PORT") || 587);
  const user = env("SMTP_USER", "MAIL_USERNAME");
  const pass = env("SMTP_PASS", "MAIL_PASSWORD");
  const from = env("SMTP_FROM");
  const fromAddress = env("MAIL_FROM_ADDRESS");
  const fromName = env("MAIL_FROM_NAME") || "Walang Pasok Panic Agent";
  const encryption = String(env("MAIL_ENCRYPTION") || "").toLowerCase();
  const secureFlag = String(env("SMTP_SECURE") || "").toLowerCase();

  return {
    host,
    port,
    user,
    pass,
    encryption,
    from: from || (fromAddress ? `${fromName} <${fromAddress}>` : undefined),
    secure:
      secureFlag === "true" ||
      secureFlag === "1" ||
      port === 465 ||
      encryption === "ssl"
  };
}

function getTransporter() {
  if (transporter) {
    return transporter;
  }

  const transport = getEmailTransport();
  const smtp = getSmtpConfig();

  if (transport === "mock" || !smtp.host) {
    transporter = nodemailer.createTransport({
      jsonTransport: true
    });
    return transporter;
  }

  transporter = nodemailer.createTransport({
    service: smtp.host && smtp.host.includes("gmail.com") ? "gmail" : undefined,
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    requireTLS: smtp.encryption === "tls",
    auth: smtp.user
      ? {
          user: smtp.user,
          pass: smtp.pass
        }
      : undefined,
    tls: {
      minVersion: "TLSv1.2"
    }
  });

  return transporter;
}

async function verifyEmailTransport() {
  const transport = getEmailTransport();
  const smtp = getSmtpConfig();

  if (transport === "mock" || !smtp.host) {
    return {
      ok: true,
      mode: "mock"
    };
  }

  await getTransporter().verify();

  return {
    ok: true,
    mode: transport
  };
}

function formatManilaDateTime(value) {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  }).format(new Date(value));
}

function buildAlertEmail({
  recipientName,
  analysis,
  alertLevel,
  alertUrl,
  repeatSeconds,
  maxMinutes,
  endsAt
}) {
  const subject = `Walang Pasok Alert: ${alertLevel} mode activated`;
  const activeUntil = formatManilaDateTime(endsAt);
  const text = `Hi ${recipientName},

The Walang Pasok Panic Agent detected a possible class suspension announcement.

Status: ${analysis.isLikelyOfficial ? "Likely Official" : "Needs Verification"}
Confidence: ${analysis.confidenceScore}%
Affected Area: ${analysis.affectedLocation}
Affected Levels: ${analysis.affectedLevels}
Date Covered: ${analysis.dateCovered}

Summary:
${analysis.summaryForStudent}

AI Message:
${analysis.alertMessage}

Stay-home advice:
${analysis.attendanceAdvice || "Please verify before leaving for school."}

Reason:
${analysis.reason}

Action:
Please confirm if you saw this alert.
Reminder window: ${maxMinutes} minute(s)
Browser/audio reminders every: ${repeatSeconds} second(s)
Email delivery: sent once immediately for safety
Active until: ${activeUntil} (Manila time)
Open Alert Room: ${alertUrl}

This is an automated alert from your Barkada Alert Circle.`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a; max-width: 620px; margin: 0 auto;">
      <h2 style="margin-bottom: 8px;">Walang Pasok Alert: ${alertLevel} mode activated</h2>
      <p>Hi ${recipientName},</p>
      <p>The Walang Pasok Panic Agent detected a possible class suspension announcement.</p>
      <p><strong>Status:</strong> ${analysis.isLikelyOfficial ? "Likely Official" : "Needs Verification"}<br />
      <strong>Confidence:</strong> ${analysis.confidenceScore}%<br />
      <strong>Affected Area:</strong> ${analysis.affectedLocation}<br />
      <strong>Affected Levels:</strong> ${analysis.affectedLevels}<br />
      <strong>Date Covered:</strong> ${analysis.dateCovered}<br />
      <strong>Reminder Window:</strong> ${maxMinutes} minute(s)<br />
      <strong>Stay-Home Advice:</strong> ${analysis.attendanceAdvice || "Please verify before leaving for school."}<br />
      <strong>Browser/Audio Reminders:</strong> Every ${repeatSeconds} second(s)<br />
      <strong>Email Delivery:</strong> Sent once immediately for safety<br />
      <strong>Active Until:</strong> ${activeUntil} (Manila time)</p>
      <p><strong>Summary:</strong><br />${analysis.summaryForStudent}</p>
      <p><strong>AI Message:</strong><br />${analysis.alertMessage}</p>
      <p><strong>Reason:</strong><br />${analysis.reason}</p>
      <p><strong>Action:</strong><br />Please confirm if you saw this alert.</p>
      <p style="margin: 24px 0;">
        <a
          href="${alertUrl}"
          style="display: inline-block; background: #84cc16; color: #0f172a; text-decoration: none; padding: 14px 22px; border-radius: 999px; font-weight: 700;"
        >
          Open Alert Room
        </a>
      </p>
      <p style="font-size: 13px; color: #475569;">This button opens the alert room and stays relevant until ${activeUntil} (Manila time).</p>
      <p>This is an automated alert from your Barkada Alert Circle.</p>
    </div>
  `;

  return { subject, text, html };
}

async function sendAlertEmail({
  recipientName,
  recipientEmail,
  analysis,
  alertLevel,
  alertId,
  repeatSeconds,
  maxMinutes,
  endsAt
}) {
  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
  const alertUrl = `${clientUrl}/alerts/${alertId}?recipient=${encodeURIComponent(recipientEmail)}`;
  const message = buildAlertEmail({
    recipientName,
    analysis,
    alertLevel,
    alertUrl,
    repeatSeconds,
    maxMinutes,
    endsAt
  });

  const smtp = getSmtpConfig();

  const info = await getTransporter().sendMail({
    from: smtp.from || "Walang Pasok Panic Agent <alerts@example.com>",
    to: recipientEmail,
    subject: message.subject,
    text: message.text,
    html: message.html
  });

  return {
    transport: getEmailTransport(),
    messageId: info.messageId || "mock-message",
    accepted: info.accepted || [],
    rejected: info.rejected || [],
    preview: info.message || null,
    alertUrl
  };
}

module.exports = {
  sendAlertEmail,
  verifyEmailTransport
};
