const path = require('path');
const prisma = require(path.join(__dirname, '../../config/db'));
const COOLDOWN_DAYS = 7;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

function dayKey(dateValue) {
  return new Date(dateValue).toISOString().slice(0, 10);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function daysBetween(a, b) {
  return Math.ceil((new Date(a) - new Date(b)) / (1000 * 60 * 60 * 24));
}

// ── GET /api/routine-campaigns ───────────────────────────────────────────────
// Admin: dhammaan campaigns
// Doctor / Farm Worker: campaigns Active ah
const getCampaigns = async (req, res) => {
  try {
    const campaigns = await prisma.routineVaccinationCampaign.findMany({
      include: {
        vaccine: true,
        template: true,
        doctor: { select: { user_id: true, full_name: true } },
        records: { select: { id: true } },
      },
      orderBy: { due_date: 'asc' },
    });

    // Ku dar days_remaining computed field
    const now = new Date();
    const enriched = campaigns.map(c => ({
      ...c,
      days_remaining: daysBetween(c.due_date, now),
      records_count: c.records.length,
    }));

    res.json(enriched);
  } catch (error) {
    console.error('getCampaigns error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ── GET /api/routine-campaigns/:id ──────────────────────────────────────────
// Details + list of animals due (active, same type, not pregnant)
const getCampaignById = async (req, res) => {
  const { id } = req.params;
  try {
    const campaign = await prisma.routineVaccinationCampaign.findUnique({
      where: { id: parseInt(id) },
      include: {
        vaccine: true,
        template: true,
        doctor: { select: { user_id: true, full_name: true } },
        records: {
          include: { animal: { include: { farm: { select: { farm_name: true } } } } },
        },
      },
    });

    if (!campaign) return res.status(404).json({ error: 'Campaign ma jirto.' });

    // Dhammaan xoolaha active ee noocan (pregnant laga reebay)
    const animals = await prisma.animal.findMany({
      where: {
        animal_type: campaign.animal_type,
        status: 'Active',
        is_pregnant: false,
      },
      include: { farm: { select: { farm_name: true } } },
    });

    // Tirada xoolaha hore loogu tallaalay campaign-kan
    const vaccinatedIds = campaign.records.map(r => r.animal_id);
    // NOTE: next_due_date for routine must follow template frequency (not vaccine validity days)
    const normalizedRecords = campaign.records.map((r) => ({
      ...r,
      next_due_date: addMonths(r.date_administered, campaign.template.frequency_months),
    }));

    res.json({
      ...campaign,
      days_remaining: daysBetween(campaign.due_date, new Date()),
      animals,
      vaccinated_animal_ids: vaccinatedIds,
      records: normalizedRecords,
    });
  } catch (error) {
    console.error('getCampaignById error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ── PATCH /api/routine-campaigns/:id/schedule ────────────────────────────────
// Doctor wuxuu set-gareeyaa taariikhda tallaalka
const scheduleCampaign = async (req, res) => {
  const { id } = req.params;
  const { scheduled_date, doctor_id } = req.body;
  try {
    const updated = await prisma.routineVaccinationCampaign.update({
      where: { id: parseInt(id) },
      data: {
        scheduled_date: new Date(scheduled_date),
        status: 'Scheduled',
        doctor_id: doctor_id ? parseInt(doctor_id) : undefined,
      },
    });
    res.json(updated);
  } catch (error) {
    console.error('scheduleCampaign error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ── PATCH /api/routine-campaigns/:id/start ───────────────────────────────────
// Doctor wuxuu bilaabaa tallaalka → InProgress
const startCampaign = async (req, res) => {
  const { id } = req.params;
  try {
    const updated = await prisma.routineVaccinationCampaign.update({
      where: { id: parseInt(id) },
      data: { status: 'InProgress' },
    });
    res.json(updated);
  } catch (error) {
    console.error('startCampaign error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ── POST /api/routine-campaigns/:id/complete ─────────────────────────────────
// Doctor wuxuu dhameeynayaa campaign-ka.
// Payload: { stock_id, administered_by, date_administered }
// System si otomaatig ah wuxuu:
//   1. Akhriiyaa dhammaan xoolaha active ee noocan (pregnant laga reebay)
//   2. Kasta wuxuu abuuraa RoutineVaccinationRecord
//   3. Wuxuu ka jari stock-ka (1 per animal)
//   4. Wuxuu xisaabiyaa next_due_date
//   5. Campaign-ka wuxuu ku dhigaa Completed
const completeCampaign = async (req, res) => {
  const { id } = req.params;
  const { stock_id, administered_by, date_administered, selected_animal_ids, dosage_ml } = req.body;

  try {
    const campaignId = parseInt(id);
    const stockId = parseInt(stock_id);
    const administeredBy = parseInt(administered_by);
    const administered = new Date(date_administered);
    const requestedDosage = dosage_ml != null && dosage_ml !== '' ? parseFloat(dosage_ml) : null;

    if (!stockId || !administeredBy || Number.isNaN(administered.getTime())) {
      return res.status(400).json({ error: 'stock_id, administered_by and valid date_administered are required.' });
    }

    const campaign = await prisma.routineVaccinationCampaign.findUnique({
      where: { id: campaignId },
      include: { vaccine: true, template: true },
    });
    if (!campaign) return res.status(404).json({ error: 'Campaign ma jirto.' });

    // 1. Hel stock
    const stock = await prisma.vaccineStock.findUnique({ where: { stock_id: stockId } });
    if (!stock) return res.status(404).json({ error: 'Stock ma jirto.' });
    if (new Date(stock.expiry_date) < administered) {
      return res.status(400).json({ error: 'Tallaalkan waa expired – lama siin karo.' });
    }

    // 2. Xoolaha eligible by type/status/pregnancy
    const animals = await prisma.animal.findMany({
      where: {
        animal_type: campaign.animal_type,
        status: 'Active',
        is_pregnant: false,
      },
    });
    const animalIds = animals.map((a) => a.animal_id);

    if (animalIds.length === 0) {
      return res.status(400).json({ error: 'No eligible animals found for this campaign.' });
    }

    // 2.1 Ha dib loogu tallaalin xoolaha campaign-kan horey loogu diiwaan galiyay
    const existingRecords = await prisma.routineVaccinationRecord.findMany({
      where: { campaign_id: campaignId },
      select: { animal_id: true },
    });
    const alreadyVaccinatedIds = new Set(existingRecords.map((r) => r.animal_id));
    const unvaccinatedAnimals = animals.filter((a) => !alreadyVaccinatedIds.has(a.animal_id));

    if (unvaccinatedAnimals.length === 0) {
      return res.status(409).json({ error: 'All campaign animals are already vaccinated.' });
    }

    // 2.5 Cooldown block per animal (cross-source: standard + routine)
    const [recentStandard, recentRoutine] = await Promise.all([
      prisma.vaccination.findMany({
        where: { animal_id: { in: unvaccinatedAnimals.map((a) => a.animal_id) } },
        orderBy: { date_administered: 'desc' },
        select: { animal_id: true, date_administered: true },
      }),
      prisma.routineVaccinationRecord.findMany({
        where: { animal_id: { in: unvaccinatedAnimals.map((a) => a.animal_id) } },
        orderBy: { date_administered: 'desc' },
        select: { animal_id: true, date_administered: true },
      }),
    ]);

    const latestByAnimal = new Map();
    for (const r of [...recentStandard, ...recentRoutine]) {
      const current = latestByAnimal.get(r.animal_id);
      if (!current || new Date(r.date_administered) > new Date(current)) {
        latestByAnimal.set(r.animal_id, r.date_administered);
      }
    }

    const skippedByCooldown = [];
    const skippedBySameDay = [];
    const eligibleAnimals = unvaccinatedAnimals.filter((a) => {
      const last = latestByAnimal.get(a.animal_id);
      if (!last) return true;
      if (dayKey(last) === dayKey(administered)) {
        skippedBySameDay.push(a.animal_id);
        return false;
      }
      const daysSince = Math.floor((administered - new Date(last)) / MS_PER_DAY);
      if (daysSince < 0) {
        skippedByCooldown.push(a.animal_id);
        return false;
      }
      if (daysSince < COOLDOWN_DAYS) {
        skippedByCooldown.push(a.animal_id);
        return false;
      }
      return true;
    });

    if (eligibleAnimals.length === 0) {
      return res.status(409).json({
        error: `No animals eligible right now (same-day blocked: ${skippedBySameDay.length}, cooldown blocked: ${skippedByCooldown.length}).`,
      });
    }

    // 2.6 Selective mode: haddii selected_animal_ids la keenay, ku koob kuwa la xushay
    let selectedIds = null;
    if (Array.isArray(selected_animal_ids) && selected_animal_ids.length > 0) {
      selectedIds = new Set(
        selected_animal_ids
          .map((x) => parseInt(x))
          .filter((n) => Number.isInteger(n))
      );
    }

    const animalsToVaccinate = selectedIds
      ? eligibleAnimals.filter((a) => selectedIds.has(a.animal_id))
      : eligibleAnimals;

    if (animalsToVaccinate.length === 0) {
      return res.status(409).json({
        error: 'No selectable animals are eligible for vaccination right now.',
      });
    }

    // Dosage rule:
    // - Single animal: doctor picks dosage
    // - Multiple animals: fixed 1 dose per animal
    let dosagePerAnimal = 1;
    if (animalsToVaccinate.length === 1) {
      if (requestedDosage == null || Number.isNaN(requestedDosage) || requestedDosage <= 0) {
        return res.status(400).json({ error: 'Please enter a valid dosage for single-animal vaccination.' });
      }
      dosagePerAnimal = requestedDosage;
    }

    if (stock.quantity_remaining < animalsToVaccinate.length) {
      return res.status(400).json({
        error: `Stock ma filayo. Selected xoolaha: ${animalsToVaccinate.length}, Stock-ka: ${stock.quantity_remaining}`,
      });
    }

    // Next due = taariikhda la siiyay + frequency-ga routine-ka (bilaha) – si ay ula mid noqoto wareegga campaign-ka
    const next_due = addMonths(administered, campaign.template.frequency_months);

    // 3. Abuur records + jar stock – transaction
    await prisma.$transaction(async (tx) => {
      for (const animal of animalsToVaccinate) {
        await tx.routineVaccinationRecord.create({
          data: {
            campaign_id: campaign.id,
            animal_id: animal.animal_id,
            vaccine_id: campaign.vaccine_id,
            administered_by: administeredBy,
            stock_id: stockId,
            dosage_ml: dosagePerAnimal,
            date_administered: administered,
            next_due_date: next_due,
          },
        });
      }

      // Jar stock – animalsToVaccinate.length doses
      await tx.vaccineStock.update({
        where: { stock_id: stockId },
        data: { quantity_remaining: { decrement: animalsToVaccinate.length } },
      });

      // Campaign status: haddii dhammaan la dhameeyay → Completed, haddii kale ha sii ahaado InProgress
      const totalVaccinatedAfter = existingRecords.length + animalsToVaccinate.length;
      const totalTarget = animals.length;
      const isCompleted = totalVaccinatedAfter >= totalTarget;

      await tx.routineVaccinationCampaign.update({
        where: { id: campaignId },
        data: {
          status: isCompleted ? 'Completed' : 'InProgress',
          completed_date: isCompleted ? administered : null,
        },
      });
    });

    const totalSkipped = skippedByCooldown.length + skippedBySameDay.length + (selectedIds ? eligibleAnimals.length - animalsToVaccinate.length : 0);
    const totalVaccinatedAfter = existingRecords.length + animalsToVaccinate.length;
    const totalTarget = animals.length;
    const remaining = Math.max(totalTarget - totalVaccinatedAfter, 0);

    res.json({
      message: totalSkipped
        ? `Vaccinated ${animalsToVaccinate.length} animal(s). Remaining: ${remaining}. Skipped ${skippedByCooldown.length} cooldown, ${skippedBySameDay.length} same-day.`
        : `Vaccinated ${animalsToVaccinate.length} animal(s). Remaining: ${remaining}.`,
      animals_vaccinated: animalsToVaccinate.length,
      dosage_mode: animalsToVaccinate.length > 1 ? 'bulk_1_dose_each' : 'single_custom',
      dosage_per_animal: dosagePerAnimal,
      remaining_animals: remaining,
      skipped_due_to_cooldown: skippedByCooldown,
      skipped_due_to_same_day: skippedBySameDay,
    });
  } catch (error) {
    console.error('completeCampaign error:', error);
    if (error?.name === 'PrismaClientValidationError') {
      return res.status(400).json({ error: 'Validation failed while saving routine vaccination record.' });
    }
    res.status(500).json({ error: 'Failed to complete campaign.' });
  }
};

// ── POST /api/routine-campaigns/trigger-check ────────────────────────────────
// Manual trigger (test / admin use) – same logic as cron
const triggerCheck = async (req, res) => {
  try {
    await runRoutineCheck();
    res.json({ message: 'Routine check la dhameeyay – campaigns la cusboonaysiiyay.' });
  } catch (error) {
    console.error('triggerCheck error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ── Shared cron logic (exported for cron service) ────────────────────────────
async function runRoutineCheck() {
  const today = new Date();

  const templates = await prisma.routineVaccinationTemplate.findMany({
    where: { status: 'Active' },
    include: { campaigns: { orderBy: { due_date: 'desc' }, take: 1 } },
  });

  for (const t of templates) {
    const lastCampaign = t.campaigns[0];

    let nextDue;
    if (!lastCampaign) {
      // Wareegga 1aad – ku bilow start_date-ka template-ka
      nextDue = new Date(t.start_date);
    } else if (lastCampaign.status === 'Completed') {
      // Wareegga xiga – ka xisaabi taariikhda DHABTA AH ee la talaalay (haddii la waayo, due_date)
      const base = lastCampaign.completed_date || lastCampaign.due_date;
      nextDue = addMonths(base, t.frequency_months);
    } else {
      // Campaign-kii hore weli lama dhammaystirin – ha abuurin mid cusub ilaa la siiyo
      continue;
    }

    const daysLeft = daysBetween(nextDue, today);

    if (daysLeft <= t.reminder_days_before) {
      // Hubi in campaign aan weli la aburin for this due_date
      const existing = await prisma.routineVaccinationCampaign.findFirst({
        where: {
          template_id: t.id,
          due_date: nextDue,
        },
      });

      if (!existing) {
        const animalsCount = await prisma.animal.count({
          where: { animal_type: t.animal_type, status: 'Active', is_pregnant: false },
        });

        await prisma.routineVaccinationCampaign.create({
          data: {
            template_id: t.id,
            campaign_name: t.campaign_name,
            animal_type: t.animal_type,
            vaccine_id: t.vaccine_id,
            due_date: nextDue,
            animals_due: animalsCount,
            status: 'Upcoming',
          },
        });

        console.log(`✔ Campaign cusub la abuuray: ${t.campaign_name} (${nextDue.toDateString()}) – ${animalsCount} xoolo`);
      }
    }
  }
}

module.exports = {
  getCampaigns,
  getCampaignById,
  scheduleCampaign,
  startCampaign,
  completeCampaign,
  triggerCheck,
  runRoutineCheck,
};
