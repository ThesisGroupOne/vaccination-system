const cron = require('node-cron');
const { runRoutineCheck } = require('../controllers/routineCampaignController');

/**
 * Cron job – wuxuu shaqeeyaa maalin kasta 00:00 (midnight).
 * Wuxuu hubiaya dhammaan Active templates oo wuxuu abuura campaigns
 * marka reminder_days_before ay gaaraan.
 */
function startRoutineVaccinationCron() {
  console.log('[Cron] Routine Vaccination Cron bilaabmay ✔');

  // Maalin kasta 00:00
  cron.schedule('0 0 * * *', async () => {
    console.log(`[Cron] ${new Date().toISOString()} – Routine check bilaabmay...`);
    try {
      await runRoutineCheck();
      console.log('[Cron] Routine check guul ah ✔');
    } catch (err) {
      console.error('[Cron] Routine check khalad:', err.message);
    }
  });
}

module.exports = { startRoutineVaccinationCron };
