const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

function getPriorityFromSymptoms(symptoms = '') {
  const s = symptoms.toLowerCase();
  const highSignals = ['bleeding', 'seizure', 'cannot stand', 'collapse', 'severe', 'critical'];
  const mediumSignals = ['fever', 'qandho', 'diarrhea', 'shuban', 'cough', 'infection', 'vomit', 'weak'];
  if (highSignals.some((k) => s.includes(k))) return 'High';
  if (mediumSignals.some((k) => s.includes(k))) return 'Medium';
  return 'Low';
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendWithRetry(mailOptions, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const info = await transporter.sendMail(mailOptions);
      return { ok: true, info, attempts: attempt };
    } catch (error) {
      if (attempt === maxAttempts) {
        return { ok: false, error, attempts: attempt };
      }
      await sleep(1000 * attempt);
    }
  }
  return { ok: false, error: new Error('Unknown mail failure'), attempts: maxAttempts };
}

const sendEmergencyAlertNotification = async (doctorEmails, alertDetails) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('Email credentials missing. Skipping email notification.');
    return {
      ok: false,
      reason: 'missing_credentials',
      sent: 0,
      failed: doctorEmails?.length || 0,
      recipients: [],
    };
  }

  if (!doctorEmails || doctorEmails.length === 0) {
    return {
      ok: false,
      reason: 'no_recipients',
      sent: 0,
      failed: 0,
      recipients: [],
    };
  }

  const {
    alert_id,
    animal_id,
    farm_name,
    symptoms,
    animal_type,
    created_at,
    reported_by_name,
  } = alertDetails;
  const priority = getPriorityFromSymptoms(symptoms);
  const appUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const openUrl = `${appUrl}/dashboard`;
  const badgeColor = priority === 'High' ? '#dc2626' : priority === 'Medium' ? '#d97706' : '#0284c7';

  const baseMailOptions = {
    from: `"Livestock Vaccine System" <${process.env.SMTP_USER}>`,
    subject: `🚨 [${priority}] Emergency Alert - ${animal_type} #${animal_id}`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.5;">
        <h2 style="margin-bottom: 8px;">Medical Emergency Alert</h2>
        <p style="margin-top: 0;">
          Priority:
          <span style="display:inline-block; padding:2px 8px; border-radius:12px; color:#fff; background:${badgeColor}; font-weight:700;">
            ${priority}
          </span>
        </p>
        <p>A new emergency alert has been created in the Livestock Vaccine System.</p>
        <table style="border-collapse: collapse; width: 100%; max-width: 560px;">
          <tr><td style="padding:6px 0;"><strong>Alert ID:</strong></td><td style="padding:6px 0;">#${alert_id || '-'}</td></tr>
          <tr><td style="padding:6px 0;"><strong>Animal:</strong></td><td style="padding:6px 0;">#${animal_id} (${animal_type})</td></tr>
          <tr><td style="padding:6px 0;"><strong>Farm:</strong></td><td style="padding:6px 0;">${farm_name}</td></tr>
          <tr><td style="padding:6px 0;"><strong>Symptoms:</strong></td><td style="padding:6px 0; color:#b91c1c; font-weight:600;">${symptoms}</td></tr>
          <tr><td style="padding:6px 0;"><strong>Reported By:</strong></td><td style="padding:6px 0;">${reported_by_name || '-'}</td></tr>
          <tr><td style="padding:6px 0;"><strong>Reported At:</strong></td><td style="padding:6px 0;">${created_at ? new Date(created_at).toLocaleString() : '-'}</td></tr>
        </table>
        <div style="margin-top: 16px;">
          <a href="${openUrl}" style="display:inline-block; background:#2563eb; color:#fff; text-decoration:none; padding:10px 16px; border-radius:8px; font-weight:700;">
            Open System
          </a>
        </div>
        <p style="margin-top:16px; color:#6b7280; font-size:12px;"><em>This is an automated notification.</em></p>
      </div>
    `,
  };

  const recipients = [];
  for (const email of doctorEmails) {
    const result = await sendWithRetry({ ...baseMailOptions, to: email }, 3);
    if (result.ok) {
      recipients.push({
        email,
        status: 'sent',
        attempts: result.attempts,
        messageId: result.info?.messageId || null,
      });
    } else {
      recipients.push({
        email,
        status: 'failed',
        attempts: result.attempts,
        error: result.error?.message || 'unknown_error',
      });
    }
  }

  const sent = recipients.filter((r) => r.status === 'sent').length;
  const failed = recipients.length - sent;
  const ok = failed === 0;
  if (ok) {
    console.log(`Email notification sent to ${sent}/${recipients.length} doctor(s).`);
  } else {
    console.error(`Email notification partial/failed: sent ${sent}, failed ${failed}.`);
  }

  return {
    ok,
    reason: ok ? 'sent' : 'partial_or_failed',
    sent,
    failed,
    recipients,
  };
};

/**
 * sendEscalationReminderEmail
 * Waxaa loo diraa doctor-yada marka alert-ku 24 saac ka badan yahay oo aan jawaabin.
 */
const sendEscalationReminderEmail = async (doctorEmails, alertDetails) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('[Escalation Email] SMTP credentials missing. Skipping escalation email.');
    return { ok: false, reason: 'missing_credentials', sent: 0, failed: doctorEmails?.length || 0 };
  }

  if (!doctorEmails || doctorEmails.length === 0) {
    return { ok: false, reason: 'no_recipients', sent: 0, failed: 0 };
  }

  const {
    alert_id,
    animal_id,
    farm_name,
    symptoms,
    animal_type,
    created_at,
    reported_by_name,
  } = alertDetails;

  const priority = getPriorityFromSymptoms(symptoms);
  const appUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const openUrl = `${appUrl}/dashboard`;
  const hoursElapsed = Math.floor((Date.now() - new Date(created_at).getTime()) / (1000 * 60 * 60));

  const baseMailOptions = {
    from: `"Livestock Vaccine System 🚨" <${process.env.SMTP_USER}>`,
    subject: `⏰ REMINDER: Emergency Alert STILL UNANSWERED — ${animal_type} #${animal_id} (${hoursElapsed}h elapsed)`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6; max-width: 600px; margin: auto;">

        <!-- Header Banner -->
        <div style="background: linear-gradient(135deg, #7f1d1d, #dc2626); color: #fff; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
          <div style="font-size: 40px; margin-bottom: 8px;">⏰</div>
          <h1 style="margin: 0; font-size: 22px; letter-spacing: 1px;">24-HOUR ESCALATION NOTICE</h1>
          <p style="margin: 6px 0 0; font-size: 14px; opacity: 0.9;">This emergency alert has NOT been responded to in <strong>${hoursElapsed} hours</strong></p>
        </div>

        <!-- Body -->
        <div style="background: #fff; border: 2px solid #fca5a5; border-top: none; padding: 24px; border-radius: 0 0 12px 12px;">

          <!-- Urgent badge -->
          <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 12px 16px; border-radius: 6px; margin-bottom: 20px;">
            <strong style="color: #dc2626;">🚨 URGENT ACTION REQUIRED</strong>
            <p style="margin: 4px 0 0; color: #7f1d1d; font-size: 14px;">An animal requires immediate medical attention. This alert was first reported over ${hoursElapsed} hours ago and remains unresolved.</p>
          </div>

          <!-- Alert Details Table -->
          <h3 style="color: #374151; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">Alert Details</h3>
          <table style="border-collapse: collapse; width: 100%; font-size: 14px;">
            <tr style="background: #f9fafb;">
              <td style="padding: 10px; font-weight: 700; color: #374151; width: 160px;">Alert ID:</td>
              <td style="padding: 10px; color: #111827;">#${alert_id || '-'}</td>
            </tr>
            <tr>
              <td style="padding: 10px; font-weight: 700; color: #374151;">Animal:</td>
              <td style="padding: 10px; color: #111827;">#${animal_id} — ${animal_type}</td>
            </tr>
            <tr style="background: #f9fafb;">
              <td style="padding: 10px; font-weight: 700; color: #374151;">Farm:</td>
              <td style="padding: 10px; color: #111827;">${farm_name}</td>
            </tr>
            <tr>
              <td style="padding: 10px; font-weight: 700; color: #374151;">Symptoms:</td>
              <td style="padding: 10px; color: #dc2626; font-weight: 700;">${symptoms}</td>
            </tr>
            <tr style="background: #f9fafb;">
              <td style="padding: 10px; font-weight: 700; color: #374151;">Reported By:</td>
              <td style="padding: 10px; color: #111827;">${reported_by_name || 'Unknown'}</td>
            </tr>
            <tr>
              <td style="padding: 10px; font-weight: 700; color: #374151;">First Reported:</td>
              <td style="padding: 10px; color: #111827;">${created_at ? new Date(created_at).toLocaleString() : '-'}</td>
            </tr>
            <tr style="background: #fef2f2;">
              <td style="padding: 10px; font-weight: 700; color: #dc2626;">Hours Elapsed:</td>
              <td style="padding: 10px; color: #dc2626; font-weight: 700;">${hoursElapsed} hours without response!</td>
            </tr>
          </table>

          <!-- CTA Button -->
          <div style="text-align: center; margin-top: 24px;">
            <a href="${openUrl}" style="display: inline-block; background: linear-gradient(135deg, #dc2626, #b91c1c); color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 700; font-size: 16px; letter-spacing: 0.5px; box-shadow: 0 4px 12px rgba(220,38,38,0.4);">
              🏥 Respond to Alert Now
            </a>
          </div>

          <p style="margin-top: 20px; color: #6b7280; font-size: 12px; text-align: center;">
            This is an automated 24-hour escalation notice from the Livestock Vaccine System.<br/>
            Please take immediate action to prevent further harm to the animal.
          </p>
        </div>
      </div>
    `,
  };

  const recipients = [];
  for (const email of doctorEmails) {
    const result = await sendWithRetry({ ...baseMailOptions, to: email }, 3);
    if (result.ok) {
      recipients.push({ email, status: 'sent', attempts: result.attempts });
    } else {
      recipients.push({ email, status: 'failed', attempts: result.attempts, error: result.error?.message || 'unknown_error' });
    }
  }

  const sent = recipients.filter((r) => r.status === 'sent').length;
  const failed = recipients.length - sent;
  const ok = failed === 0;

  console.log(`[Escalation Email] Sent ${sent}/${recipients.length} escalation reminder(s) for Alert #${alert_id}.`);

  return { ok, reason: ok ? 'sent' : 'partial_or_failed', sent, failed, recipients };
};

const sendDoctorAuthorizedEmail = async (doctorEmail, doctorName) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('Email credentials missing. Skipping authorization email.');
    return { ok: false, reason: 'missing_credentials' };
  }
  if (!doctorEmail) {
    return { ok: false, reason: 'no_recipients' };
  }

  const appUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const result = await sendWithRetry(
    {
      from: `"Livestock Vaccine System" <${process.env.SMTP_USER}>`,
      to: doctorEmail,
      subject: 'You are authorized for doctor work',
      html: `
        <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.5;">
          <h2 style="margin-bottom: 8px;">Work Authorization Granted</h2>
          <p>Hello ${doctorName || 'Doctor'},</p>
          <p>An Admin has authorized you to receive and perform vaccination / emergency doctor jobs in the Livestock Vaccine System.</p>
          <p>Other doctors can still log in, but they will not see active jobs or get notifications until they are authorized.</p>
          <div style="margin-top: 16px;">
            <a href="${appUrl}/dashboard" style="display:inline-block; background:#2563eb; color:#fff; text-decoration:none; padding:10px 16px; border-radius:8px; font-weight:700;">
              Open Dashboard
            </a>
          </div>
          <p style="margin-top:16px; color:#6b7280; font-size:12px;"><em>This is an automated notification.</em></p>
        </div>
      `,
    },
    3
  );

  return {
    ok: result.ok,
    reason: result.ok ? 'sent' : 'failed',
    attempts: result.attempts,
    error: result.error?.message,
  };
};

module.exports = {
  sendEmergencyAlertNotification,
  sendEscalationReminderEmail,
  sendDoctorAuthorizedEmail,
};
