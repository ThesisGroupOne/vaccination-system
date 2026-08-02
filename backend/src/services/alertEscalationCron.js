const cron = require('node-cron');
const path = require('path');
const prisma = require(path.join(__dirname, '../../config/db'));
const { logActivity } = require('../controllers/activityLogController');
const { sendEscalationReminderEmail } = require('./emailService');

const startAlertEscalationCron = () => {
  // Run every hour at minute 0
  cron.schedule('0 * * * *', async () => {
    try {
      // Find alerts pending for more than 24 hours
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const overdueAlerts = await prisma.alert.findMany({
        where: {
          status: 'Pending',
          escalated: false,
          created_at: {
            lt: twentyFourHoursAgo,
          },
        },
        include: {
          animal: true,
          farm: true,
          user: { select: { full_name: true } },
        },
      });

      if (overdueAlerts.length > 0) {
        console.log(`[Escalation Cron] Found ${overdueAlerts.length} overdue emergency alert(s). Escalating...`);

        // Escalate to Admins + any Doctor already assigned to an open schedule for this animal
        const admins = await prisma.user.findMany({
          where: { role: 'Admin' },
          select: { email: true },
        });
        const assignedSchedules = await prisma.vaccinationSchedule.findMany({
          where: {
            animal_id: { in: overdueAlerts.map((a) => a.animal_id) },
            status: { not: 'Completed' },
            doctor_id: { not: null },
          },
          include: { doctor: { select: { email: true } } },
        });
        const assignedEmailByAnimal = new Map();
        for (const s of assignedSchedules) {
          if (s.doctor?.email) assignedEmailByAnimal.set(s.animal_id, s.doctor.email);
        }
        const adminEmails = admins.map((d) => d.email).filter(Boolean);

        for (const alert of overdueAlerts) {
          // 1. Mark alert as escalated
          await prisma.alert.update({
            where: { alert_id: alert.alert_id },
            data: { escalated: true },
          });

          // 2. Log Activity (visible to Admin in Activity Log)
          await logActivity({
            action: 'SLA_VIOLATION',
            entity: 'Alert',
            entity_id: alert.alert_id,
            description: `Doctor failed to respond to Emergency Alert for Animal #${alert.animal_id} (${alert.animal?.nickname || 'Unnamed'}) within 24 hours!`,
            user_id: null,
            user_name: 'SYSTEM',
            user_role: 'System',
          });

          // 3. Email Admins + assigned doctor only (not all doctors)
          const recipients = [...adminEmails];
          const assignedEmail = assignedEmailByAnimal.get(alert.animal_id);
          if (assignedEmail && !recipients.includes(assignedEmail)) recipients.push(assignedEmail);

          if (recipients.length > 0) {
            const alertDetails = {
              alert_id: alert.alert_id,
              animal_id: alert.animal_id,
              animal_type: alert.animal?.animal_type || 'Unknown',
              farm_name: alert.farm?.farm_name || 'Unknown Farm',
              symptoms: alert.symptoms,
              created_at: alert.created_at,
              reported_by_name: alert.user?.full_name || null,
            };

            const emailResult = await sendEscalationReminderEmail(recipients, alertDetails);
            console.log(
              `[Escalation Cron] Alert #${alert.alert_id} escalation email: sent=${emailResult.sent}, failed=${emailResult.failed}`
            );
          } else {
            console.warn('[Escalation Cron] No recipient emails found. Skipping escalation email.');
          }
        }
      } else {
        console.log('[Escalation Cron] No overdue alerts found.');
      }
    } catch (error) {
      console.error('[Escalation Cron Error]', error);
    }
  });

  console.log('Alert Escalation Cron Job started (runs every hour).');
};

module.exports = { startAlertEscalationCron };

