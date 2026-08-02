const path = require('path');
const prisma = require(path.join(__dirname, '../../config/db'));
const COOLDOWN_DAYS = 7;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

function dayKey(dateValue) {
  return new Date(dateValue).toISOString().slice(0, 10);
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function todayLocalYmd() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function dateLocalYmd(d) {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

async function getAuthorizedDoctorId() {
  const doctor = await prisma.user.findFirst({
    where: { role: 'Doctor', is_authorized: true, is_active: true },
    select: { user_id: true },
  });
  return doctor?.user_id ?? null;
}

const getSchedules = async (req, res) => {
  try {
    const role = req.user?.role;
    const userId = req.user?.userId;

    let whereClause = {};
    if (role === 'Doctor') {
      const me = await prisma.user.findUnique({
        where: { user_id: userId },
        select: { is_authorized: true },
      });
      // Unauthorized doctors: can log in but see no jobs
      if (!me?.is_authorized) {
        return res.json([]);
      }
      whereClause = { doctor_id: userId };
    } else if (role !== 'Admin') {
      whereClause = { doctor_id: userId };
    }
    // Admin: all schedules

    const schedules = await prisma.vaccinationSchedule.findMany({
      where: whereClause,
      include: {
        animal: true,
        farm: true,
        vaccine: true,
        doctor: { select: { user_id: true, full_name: true, role: true } },
      },
      orderBy: { scheduled_date: 'asc' },
    });
    res.json(schedules);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const createSchedule = async (req, res) => {
  const { vaccine_id, farm_id, animal_id, schedule_type, scheduled_date, doctor_id } = req.body;
  try {
    const vaccineId = parseInt(vaccine_id);
    const farmId = farm_id ? parseInt(farm_id) : null;
    const animalId = animal_id ? parseInt(animal_id) : null;

    if (!vaccineId || !scheduled_date) {
      return res.status(400).json({ error: 'vaccine_id and scheduled_date are required.' });
    }

    const scheduledAt = new Date(scheduled_date);
    if (Number.isNaN(scheduledAt.getTime())) {
      return res.status(400).json({ error: 'scheduled_date is invalid.' });
    }

    // Date restriction: only allow scheduling for today's local date
    const scheduledYmd = dateLocalYmd(scheduledAt);
    const todayYmd = todayLocalYmd();
    if (scheduledYmd !== todayYmd) {
      return res.status(400).json({ error: 'Date must be today only (past and future dates are not allowed).' });
    }

    // Authorization: only the authorized Doctor (or Admin) may create doctor work;
    // new jobs auto-go to the authorized Doctor.
    const authorizedId = await getAuthorizedDoctorId();
    let assignedDoctorId = null;

    if (req.user?.role === 'Doctor') {
      const me = await prisma.user.findUnique({
        where: { user_id: req.user.userId },
        select: { is_authorized: true },
      });
      if (!me?.is_authorized) {
        return res.status(403).json({
          error: 'You are not authorized for doctor work. Ask Admin to authorize you first.',
        });
      }
      assignedDoctorId = req.user.userId;
    } else if (doctor_id != null && doctor_id !== '' && req.user?.role === 'Admin') {
      assignedDoctorId = parseInt(doctor_id);
      const doctor = await prisma.user.findUnique({ where: { user_id: assignedDoctorId } });
      if (!doctor || doctor.role !== 'Doctor') {
        return res.status(400).json({ error: 'Assigned user must be a Doctor.' });
      }
      if (!doctor.is_authorized) {
        return res.status(400).json({
          error: 'That Doctor is not authorized. Authorize them on Roles → User assigned first.',
        });
      }
    } else {
      assignedDoctorId = authorizedId;
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
        doctor_id: assignedDoctorId,
      },
      include: {
        doctor: { select: { user_id: true, full_name: true, role: true } },
        animal: true,
        vaccine: true,
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
  const userId = req.user?.userId;
  const role = req.user?.role;
  try {
    const scheduleId = parseInt(id);
    const existing = await prisma.vaccinationSchedule.findUnique({
      where: { schedule_id: scheduleId },
    });
    if (!existing) return res.status(404).json({ error: 'Schedule not found.' });

    // Only authorized + assigned doctor (or Admin) may complete / update the job
    if (role === 'Doctor') {
      const me = await prisma.user.findUnique({
        where: { user_id: userId },
        select: { is_authorized: true },
      });
      if (!me?.is_authorized) {
        return res.status(403).json({
          error: 'You are not authorized for doctor work.',
        });
      }
    }
    if (role !== 'Admin' && existing.doctor_id && existing.doctor_id !== userId) {
      return res.status(403).json({
        error: 'This job is assigned to another user. You cannot perform it.',
      });
    }
    if (role === 'Doctor' && !existing.doctor_id) {
      return res.status(403).json({
        error: 'This job has no authorized doctor yet. Ask Admin to authorize a Doctor first.',
      });
    }

    const dataToUpdate = { status };
    if (status === 'Completed' && role === 'Doctor') {
      dataToUpdate.doctor_id = userId;
    }

    const updatedSchedule = await prisma.vaccinationSchedule.update({
      where: { schedule_id: scheduleId },
      data: dataToUpdate,
    });

    // Emergency complete → resolve all open alerts for that animal (Pending or Scheduled)
    if (status === 'Completed' && updatedSchedule.schedule_type === 'Emergency' && updatedSchedule.animal_id) {
      await prisma.alert.updateMany({
        where: {
          animal_id: updatedSchedule.animal_id,
          status: { in: ['Pending', 'Scheduled'] },
        },
        data: { status: 'Resolved' },
      });
    }

    res.json(updatedSchedule);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

/** @deprecated Prefer user authorization (PATCH /api/users/authorization). Kept for Admin emergency reassign. */
const assignSchedule = async (req, res) => {
  const { id } = req.params;
  const { doctor_id } = req.body;
  try {
    if (req.user?.role !== 'Admin') {
      return res.status(403).json({ error: 'Only Admin can assign jobs to users.' });
    }

    const scheduleId = parseInt(id);
    const schedule = await prisma.vaccinationSchedule.findUnique({
      where: { schedule_id: scheduleId },
      include: { animal: true, vaccine: true },
    });
    if (!schedule) return res.status(404).json({ error: 'Schedule not found.' });
    if (schedule.status === 'Completed') {
      return res.status(409).json({ error: 'Cannot assign a completed schedule.' });
    }

    let assignedDoctorId = null;
    if (doctor_id != null && doctor_id !== '' && doctor_id !== 'null') {
      assignedDoctorId = parseInt(doctor_id);
      const doctor = await prisma.user.findUnique({
        where: { user_id: assignedDoctorId },
        select: { user_id: true, full_name: true, role: true, is_active: true, is_authorized: true },
      });
      if (!doctor || doctor.role !== 'Doctor') {
        return res.status(400).json({ error: 'Assigned user must be a Doctor.' });
      }
      if (doctor.is_active === false) {
        return res.status(400).json({ error: 'Cannot assign to a disabled account.' });
      }
      if (!doctor.is_authorized) {
        return res.status(400).json({
          error: 'That Doctor is not authorized. Authorize them on Roles → User assigned first.',
        });
      }
    }

    const updated = await prisma.vaccinationSchedule.update({
      where: { schedule_id: scheduleId },
      data: { doctor_id: assignedDoctorId },
      include: {
        doctor: { select: { user_id: true, full_name: true, role: true, email: true } },
        animal: { select: { animal_id: true, nickname: true, animal_type: true } },
        vaccine: { select: { vaccine_name: true } },
      },
    });

    res.json({
      message: assignedDoctorId
        ? `Job assigned to ${updated.doctor?.full_name}.`
        : 'Job unassigned.',
      schedule: updated,
    });
  } catch (error) {
    console.error('assignSchedule error:', error);
    res.status(400).json({ error: error.message });
  }
};

module.exports = {
  getSchedules,
  createSchedule,
  deleteSchedule,
  updateScheduleStatus,
  assignSchedule,
};
