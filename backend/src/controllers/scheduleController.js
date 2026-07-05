const path = require('path');
const prisma = require(path.join(__dirname, '../../config/db'));
const COOLDOWN_DAYS = 7;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

function dayKey(dateValue) {
  return new Date(dateValue).toISOString().slice(0, 10);
}

const getSchedules = async (req, res) => {
  try {
    const schedules = await prisma.vaccinationSchedule.findMany({
      include: { animal: true, farm: true, vaccine: true },
    });
    res.json(schedules);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const createSchedule = async (req, res) => {
  const { vaccine_id, farm_id, animal_id, schedule_type, scheduled_date } = req.body;
  try {
    const vaccineId = parseInt(vaccine_id);
    const farmId = farm_id ? parseInt(farm_id) : null;
    const animalId = animal_id ? parseInt(animal_id) : null;

    if (!vaccineId || !scheduled_date) {
      return res.status(400).json({ error: 'vaccine_id and scheduled_date are required.' });
    }

    if (animalId) {
      const animal = await prisma.animal.findUnique({ where: { animal_id: animalId } });
      if (!animal) return res.status(404).json({ error: 'Animal not found.' });

      // 1) Duplicate schedule block: ha abuuriin schedule cusub haddii horey u furan yahay
      const openSchedule = await prisma.vaccinationSchedule.findFirst({
        where: {
          animal_id: animalId,
          status: { not: 'Completed' },
        },
      });
      if (openSchedule) {
        return res.status(409).json({
          error: `Animal #${animalId} already has an open schedule (${openSchedule.status}).`,
        });
      }

      // 2) Emergency priority: haddii alert pending jiro, schedule non-emergency ha la joojiyo
      const pendingAlert = await prisma.alert.findFirst({
        where: { animal_id: animalId, status: 'Pending' },
      });
      if (pendingAlert && schedule_type !== 'Emergency') {
        return res.status(409).json({
          error: `Emergency alert is pending for animal #${animalId}. Handle emergency schedule first.`,
        });
      }

      // 3) Cooldown block: haddii dhowaan la tallaalay ha la jadwalin
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
        const scheduledAt = new Date(scheduled_date);

        // Hard block: hal maalin laba talaal lama ogola (cross-source)
        if (dayKey(latestDate) === dayKey(scheduledAt)) {
          return res.status(409).json({
            error: `Same-day block: animal #${animalId} already has a vaccination record on ${dayKey(latestDate)}.`,
          });
        }

        const daysSince = Math.floor((scheduledAt - new Date(latestDate)) / MS_PER_DAY);
        if (daysSince < 0) {
          return res.status(409).json({
            error: `Scheduled date is before the latest vaccination date for animal #${animalId}.`,
          });
        }
        if (daysSince < COOLDOWN_DAYS) {
          return res.status(409).json({
            error: `Cooldown active: animal #${animalId} was vaccinated ${daysSince} day(s) ago. Wait ${COOLDOWN_DAYS - daysSince} more day(s).`,
          });
        }
      }
    }

    const schedule = await prisma.vaccinationSchedule.create({
      data: {
        vaccine_id: vaccineId,
        farm_id: farmId,
        animal_id: animalId,
        schedule_type,
        scheduled_date: new Date(scheduled_date),
      },
    });
    res.status(201).json(schedule);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const deleteSchedule = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.vaccinationSchedule.delete({ where: { schedule_id: parseInt(id) } });
    res.json({ message: 'Schedule deleted' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const updateScheduleStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const updatedSchedule = await prisma.vaccinationSchedule.update({
      where: { schedule_id: parseInt(id) },
      data: { status },
    });

    // If an Emergency vaccination schedule is completed, mark the corresponding animal's active alert as Resolved
    if (status === 'Completed' && updatedSchedule.schedule_type === 'Emergency' && updatedSchedule.animal_id) {
      const activeAlert = await prisma.alert.findFirst({
        where: {
          animal_id: updatedSchedule.animal_id,
          status: 'Scheduled',
        },
      });
      if (activeAlert) {
        await prisma.alert.update({
          where: { alert_id: activeAlert.alert_id },
          data: { status: 'Resolved' },
        });
      }
    }

    res.json(updatedSchedule);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = { getSchedules, createSchedule, deleteSchedule, updateScheduleStatus };
