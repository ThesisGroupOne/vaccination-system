const path = require('path');
const prisma = require(path.join(__dirname, '../../config/db'));
const { logActivity } = require('./activityLogController');
const COOLDOWN_DAYS = 7;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

function dayKey(dateValue) {
  return new Date(dateValue).toISOString().slice(0, 10);
}

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

const getVaccinations = async (req, res) => {
  try {
    const vaccinations = await prisma.vaccination.findMany({
      include: { animal: true, vaccine: true, user: true, stock: true },
    });
    res.json(vaccinations);
  } catch (error) {
    console.error('getAnimalVaccinationSummary error:', error);
    res.status(400).json({ error: error.message });
  }
};

const getAnimalVaccinationSummary = async (req, res) => {
  try {
    const animals = await prisma.animal.findMany({
      include: {
        farm: { select: { farm_name: true } },
        vaccinations: {
          take: 1,
          orderBy: { date_administered: 'desc' },
          include: { vaccine: { select: { vaccine_name: true } } },
        },
        routineRecords: {
          take: 1,
          orderBy: { date_administered: 'desc' },
          include: {
            vaccine: { select: { vaccine_name: true } },
            campaign: { select: { template: { select: { frequency_months: true } } } },
          },
        },
        _count: { select: { vaccinations: true, routineRecords: true } },
      },
      orderBy: { animal_id: 'asc' },
    });

    const animalIds = animals.map((a) => a.animal_id);

    // Open emergency/standard schedules per animal
    const openSchedules = await prisma.vaccinationSchedule.findMany({
      where: {
        animal_id: { in: animalIds },
        status: { not: 'Completed' },
      },
      select: {
        animal_id: true,
        schedule_type: true,
        scheduled_date: true,
        status: true,
      },
    });

    const completedEmergencySchedules = await prisma.vaccinationSchedule.findMany({
      where: {
        animal_id: { in: animalIds },
        schedule_type: 'Emergency',
        status: 'Completed',
      },
      select: { animal_id: true },
    });

    // Open routine campaigns and per-animal completion check
    const openRoutineCampaigns = await prisma.routineVaccinationCampaign.findMany({
      where: { status: { in: ['Upcoming', 'Scheduled', 'InProgress'] } },
      select: { id: true, animal_type: true, due_date: true, status: true },
    });

    const openCampaignIds = openRoutineCampaigns.map((c) => c.id);
    const openRoutineRecords = openCampaignIds.length
      ? await prisma.routineVaccinationRecord.findMany({
          where: { campaign_id: { in: openCampaignIds } },
          select: { campaign_id: true, animal_id: true },
        })
      : [];

    const routineDoneSet = new Set(openRoutineRecords.map((r) => `${r.campaign_id}:${r.animal_id}`));

    const schedulesByAnimal = new Map();
    for (const s of openSchedules) {
      const key = s.animal_id;
      if (!schedulesByAnimal.has(key)) schedulesByAnimal.set(key, []);
      schedulesByAnimal.get(key).push(s);
    }

    const completedEmergencyCountByAnimal = new Map();
    for (const s of completedEmergencySchedules) {
      completedEmergencyCountByAnimal.set(
        s.animal_id,
        (completedEmergencyCountByAnimal.get(s.animal_id) || 0) + 1
      );
    }

    const summary = animals.map((animal) => {
      const latestStandard = animal.vaccinations[0] || null;
      const latestRoutine = animal.routineRecords[0] || null;

      let latest = null;
      if (latestStandard && latestRoutine) {
        latest = new Date(latestStandard.date_administered) >= new Date(latestRoutine.date_administered)
          ? latestStandard
          : latestRoutine;
      } else {
        latest = latestStandard || latestRoutine;
      }

      const standardDoses = animal._count.vaccinations;
      const routineDoses = animal._count.routineRecords;
      const latestDosage =
        latest === latestStandard
          ? (latestStandard?.dosage_ml ?? null)
          : (latestRoutine?.dosage_ml ?? null);
      const latestSource = latest
        ? (latest === latestStandard ? 'Emergency/Standard' : 'Routine')
        : null;

      const animalSchedules = schedulesByAnimal.get(animal.animal_id) || [];
      const emergencySchedules = animalSchedules.filter((s) => s.schedule_type === 'Emergency');
      const nextEmergencyDate = emergencySchedules.length
        ? emergencySchedules
            .map((s) => s.scheduled_date)
            .sort((a, b) => new Date(a) - new Date(b))[0]
        : null;

      const pendingRoutineCampaigns = (animal.status === 'Active' && !animal.is_pregnant)
        ? openRoutineCampaigns.filter((c) =>
            c.animal_type === animal.animal_type &&
            !routineDoneSet.has(`${c.id}:${animal.animal_id}`)
          )
        : [];
      const nextRoutineDate = pendingRoutineCampaigns.length
        ? pendingRoutineCampaigns
            .map((c) => c.due_date)
            .sort((a, b) => new Date(a) - new Date(b))[0]
        : null;

      // Priority status for decision-making
      const emergencyCompletedCount = completedEmergencyCountByAnimal.get(animal.animal_id) || 0;
      const hasEmergencyComplete = emergencyCompletedCount > 0;
      const hasRoutineComplete = routineDoses > 0;

      let status_label = 'No Record';
      if (nextEmergencyDate) {
        status_label = 'Emergency Scheduled';
      } else if (nextRoutineDate) {
        status_label = 'Routine Pending';
      } else if (hasEmergencyComplete && hasRoutineComplete) {
        status_label = 'Emergency + Routine Complete';
      } else if (hasRoutineComplete) {
        status_label = 'Routine Complete';
      } else if (hasEmergencyComplete) {
        status_label = 'Emergency Complete';
      }

      const normalizedRoutineNextDue = latestRoutine
        ? addMonths(
            latestRoutine.date_administered,
            latestRoutine.campaign?.template?.frequency_months || 0
          )
        : null;

      const latestNextDue = (latest === latestRoutine && normalizedRoutineNextDue)
        ? normalizedRoutineNextDue
        : (latest?.next_due_date || null);
      const effectiveNextDue = nextEmergencyDate || nextRoutineDate || latestNextDue || null;

      return {
        animal_id: animal.animal_id,
        nickname: animal.nickname,
        animal_type: animal.animal_type,
        biological_type: animal.biological_type,
        farm_name: animal.farm?.farm_name || null,
        standard_doses: standardDoses,
        routine_doses: routineDoses,
        total_doses: standardDoses + routineDoses,
        last_source: latestSource,
        last_vaccine_name: latest?.vaccine?.vaccine_name || null,
        last_vaccinated_at: latest?.date_administered || null,
        last_dosage_ml: latestDosage,
        next_due_date: effectiveNextDue,
        next_emergency_date: nextEmergencyDate,
        next_routine_date: nextRoutineDate,
        pending_emergency_count: emergencySchedules.length,
        pending_routine_count: pendingRoutineCampaigns.length,
        completed_emergency_count: emergencyCompletedCount,
        status_label,
      };
    });

    res.json(summary);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getAnimalVaccinationHistory = async (req, res) => {
  const animalId = parseInt(req.params.animalId);
  try {
    const animal = await prisma.animal.findUnique({
      where: { animal_id: animalId },
      include: {
        farm: { select: { farm_name: true } },
        vaccinations: {
          include: {
            vaccine: { select: { vaccine_name: true } },
            user: { select: { full_name: true } },
          },
          orderBy: { date_administered: 'desc' },
        },
        routineRecords: {
          include: {
            vaccine: { select: { vaccine_name: true } },
            administered_user: { select: { full_name: true } },
            campaign: { select: { template: { select: { frequency_months: true } } } },
          },
          orderBy: { date_administered: 'desc' },
        },
      },
    });

    if (!animal) return res.status(404).json({ error: 'Animal not found' });

    const standard = animal.vaccinations.map((v) => ({
      id: v.vaccination_id,
      source: 'Standard',
      vaccine_name: v.vaccine?.vaccine_name || null,
      date_administered: v.date_administered,
      next_due_date: v.next_due_date,
      dosage_ml: v.dosage_ml,
      administered_by_name: v.user?.full_name || null,
    }));

    const routine = animal.routineRecords.map((r) => ({
      id: r.id,
      source: 'Routine',
      vaccine_name: r.vaccine?.vaccine_name || null,
      date_administered: r.date_administered,
      next_due_date: addMonths(r.date_administered, r.campaign?.template?.frequency_months || 0),
      dosage_ml: r.dosage_ml ?? null,
      administered_by_name: r.administered_user?.full_name || null,
    }));

    const history = [...standard, ...routine].sort(
      (a, b) => new Date(b.date_administered).getTime() - new Date(a.date_administered).getTime()
    );

    res.json({
      animal: {
        animal_id: animal.animal_id,
        nickname: animal.nickname,
        animal_type: animal.animal_type,
        biological_type: animal.biological_type,
        farm_name: animal.farm?.farm_name || null,
      },
      history,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const createVaccination = async (req, res) => {
  const { animal_id, vaccine_id, administered_by, stock_id, dosage_ml, date_administered } = req.body;
  try {
    const animalId = parseInt(animal_id);
    const vaccineId = parseInt(vaccine_id);
    const administeredBy = parseInt(administered_by);
    const stockId = parseInt(stock_id);
    const administeredAt = new Date(date_administered || new Date());

    if (!animalId || !vaccineId || !administeredBy || !stockId || !dosage_ml) {
      return res.status(400).json({ error: 'animal_id, vaccine_id, administered_by, stock_id and dosage_ml are required.' });
    }

    // 1. Check if animal is Active
    const animal = await prisma.animal.findUnique({ where: { animal_id: animalId } });
    if (!animal || animal.status !== 'Active') {
      return res.status(400).json({ error: `Cannot vaccinate animal with status: ${animal?.status || 'Unknown'}` });
    }
    
    // 1.5. Medical Safety (Pregnancy Block)
    if (animal.is_pregnant) {
      return res.status(400).json({ error: 'Medical Block: Cannot vaccinate a pregnant animal.' });
    }

    // 2. Cooldown block (across Standard + Routine)
    const [lastStandard, lastRoutine] = await Promise.all([
      prisma.vaccination.findFirst({
        where: { animal_id: animalId },
        orderBy: { date_administered: 'desc' },
        select: { date_administered: true },
      }),
      prisma.routineVaccinationRecord.findFirst({
        where: { animal_id: animalId },
        orderBy: { date_administered: 'desc' },
        select: { date_administered: true },
      }),
    ]);

    const latestDate = [lastStandard?.date_administered, lastRoutine?.date_administered]
      .filter(Boolean)
      .sort((a, b) => new Date(b) - new Date(a))[0];

    if (latestDate) {
      // Hard block: hal maalin laba talaal lama ogola (cross-source)
      if (dayKey(latestDate) === dayKey(administeredAt)) {
        return res.status(409).json({
          error: `Same-day block: animal #${animalId} already has a vaccination record on ${dayKey(latestDate)}.`,
        });
      }

      const daysSince = Math.floor((administeredAt - new Date(latestDate)) / MS_PER_DAY);
      if (daysSince < 0) {
        return res.status(409).json({
          error: `Vaccination date is before latest recorded vaccination for animal #${animalId}.`,
        });
      }
      if (daysSince < COOLDOWN_DAYS) {
        return res.status(409).json({
          error: `Cooldown active: animal #${animalId} was vaccinated ${daysSince} day(s) ago. Wait ${COOLDOWN_DAYS - daysSince} more day(s).`,
        });
      }
    }

    // 3. Get vaccine validity period
    const vaccine = await prisma.vaccine.findUnique({ where: { vaccine_id: vaccineId } });
    if (!vaccine) return res.status(404).json({ error: 'Vaccine not found' });

    const next_due_date = new Date(administeredAt);
    next_due_date.setDate(next_due_date.getDate() + vaccine.validity_period_days);

    // 4. Check stock availability
    const stock = await prisma.vaccineStock.findUnique({ where: { stock_id: stockId } });
    if (!stock || stock.quantity_remaining <= 0) {
      return res.status(400).json({ error: 'Insufficient vaccine stock' });
    }

    // 4.5 Check if stock is expired
    if (new Date(stock.expiry_date) < administeredAt) {
      return res.status(400).json({ error: 'Tallaalkan lama siin karo sababto ah waa expired' });
    }

    // 5. Create vaccination record
    const vaccination = await prisma.vaccination.create({
      data: {
        animal_id: animalId,
        vaccine_id: vaccineId,
        administered_by: administeredBy,
        stock_id: stockId,
        dosage_ml: parseFloat(dosage_ml),
        date_administered: administeredAt,
        next_due_date,
      },
    });

    // 6. Reduce stock quantity_remaining
    await prisma.vaccineStock.update({
      where: { stock_id: stockId },
      data: { quantity_remaining: { decrement: 1 } },
    });

    await logActivity({
      action: 'VACCINATE', entity: 'Vaccination', entity_id: vaccination.vaccination_id,
      description: `Vaccinated animal #${animalId} with ${vaccine.vaccine_name} (${dosage_ml}ml)`,
      user_id: req.user?.userId, user_name: req.user?.name, user_role: req.user?.role,
    });
    res.status(201).json(vaccination);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = {
  getVaccinations,
  createVaccination,
  getAnimalVaccinationSummary,
  getAnimalVaccinationHistory,
};