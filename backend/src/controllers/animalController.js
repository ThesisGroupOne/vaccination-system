const path = require('path');
const prisma = require(path.join(__dirname, '../../config/db'));
const PDFDocument = require('pdfkit');
const { logActivity } = require('./activityLogController');

// ── Age helpers (age lives as date_of_birth; years value is computed) ────────
const AVG_DAYS_PER_MONTH = 30.44;

/** Live age in months from a date of birth */
function monthsFromDob(dob) {
  const diffMs = Date.now() - new Date(dob).getTime();
  if (diffMs <= 0) return 0;
  return diffMs / (1000 * 60 * 60 * 24 * AVG_DAYS_PER_MONTH);
}

/** Approximate DOB from an age given in months (registration without exact DOB) */
function dobFromMonths(months) {
  const d = new Date();
  d.setMonth(d.getMonth() - Math.round(months));
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Live age in years (float) — falls back to the stored snapshot */
function liveAgeYears(animal) {
  if (animal.date_of_birth) {
    return parseFloat((monthsFromDob(animal.date_of_birth) / 12).toFixed(4));
  }
  return animal.age;
}

const getAnimals = async (req, res) => {
  try {
    const animals = await prisma.animal.findMany({
      include: {
        farm: true,
        vaccinations: {
          include: { vaccine: true }
        },
        routineRecords: {
          include: { vaccine: true }
        },
      },
      orderBy: { animal_id: 'desc' },
    });
    // total_doses = emergency/standard + routine (Animals Directory badge)
    const enriched = animals.map((a) => {
      let pregnancy_months = null;
      if (a.is_pregnant && a.pregnancy_start_date) {
        pregnancy_months = monthsFromDob(a.pregnancy_start_date);
      }
      return {
        ...a,
        age: liveAgeYears(a),
        pregnancy_months,
        total_doses: (a.vaccinations?.length || 0) + (a.routineRecords?.length || 0),
      };
    });
    res.json(enriched);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * Resolve DOB + validated age from request body.
 * Accepts either `date_of_birth` (calendar) or `age_months` (plain value).
 * Returns { dob, ageMonths } or { error }.
 */
function resolveDobAndAge({ date_of_birth, age_months }, animal_type) {
  let minMonths = 1;
  if (animal_type === 'Goat') minMonths = 3;
  else if (animal_type === 'Cattle') minMonths = 4;
  else if (animal_type === 'Camel') minMonths = 6;

  let dob;
  if (date_of_birth) {
    dob = new Date(date_of_birth);
    if (Number.isNaN(dob.getTime())) {
      return { error: 'Invalid date of birth.' };
    }
    if (dob.getTime() > Date.now()) {
      return { error: 'Date of birth cannot be in the future.' };
    }
  } else if (typeof age_months === 'number' && Number.isFinite(age_months)) {
    dob = dobFromMonths(age_months);
  } else {
    return { error: 'Provide either age or date of birth.' };
  }

  const ageMonths = monthsFromDob(dob);
  if (ageMonths < minMonths || ageMonths > 180) {
    return { error: `Age must be between ${minMonths} and 180 months for ${animal_type}` };
  }
  return { dob, ageMonths };
}

const createAnimal = async (req, res) => {
  const { nickname, animal_type, age_months, date_of_birth, weight, biological_type, is_pregnant, pregnancy_start_date: req_pregnancy_start_date, farm_id, status } = req.body;

  // Allowed values
  const allowedAnimalTypes = ['Camel', 'Cattle', 'Goat'];
  const allowedBiologicalTypes = [
    'Rii (Female)', 'Orgi (Male)',       // Goat
    'Sac (Female)', 'Dibi (Male)',       // Cattle
    'Nirig (Female)', 'Awr (Male)',      // Camel
  ];

  // Nickname validation: letters and spaces only
  if (nickname && !/^[a-zA-Z\s]+$/.test(nickname)) {
    return res.status(400).json({ error: 'Nickname may contain only letters and spaces' });
  }
  // Animal type validation
  if (!animal_type || !allowedAnimalTypes.includes(animal_type)) {
    return res.status(400).json({ error: `Invalid animal type. Allowed: ${allowedAnimalTypes.join(', ')}` });
  }
  // Biological type validation
  if (!biological_type || !allowedBiologicalTypes.includes(biological_type)) {
    return res.status(400).json({ error: `Invalid biological type. Allowed: ${allowedBiologicalTypes.join(', ')}` });
  }

  const resolved = resolveDobAndAge({ date_of_birth, age_months }, animal_type);
  if (resolved.error) return res.status(400).json({ error: resolved.error });

  // Age snapshot in years (legacy column); live age is always derived from DOB
  const age = parseFloat((resolved.ageMonths / 12).toFixed(4));

  try {
    const pregnancy_start_date = is_pregnant 
      ? (req_pregnancy_start_date ? new Date(req_pregnancy_start_date) : new Date()) 
      : null;
    const animal = await prisma.animal.create({
      data: { nickname, animal_type, age, date_of_birth: resolved.dob, weight, biological_type, is_pregnant, pregnancy_start_date, farm_id, status: status || 'Active' },
    });
    await logActivity({
      action: 'CREATE', entity: 'Animal', entity_id: animal.animal_id,
      description: `Registered new ${animal_type} "${nickname || 'Unnamed'}" (Age: ${Math.round(resolved.ageMonths)} months, DOB: ${resolved.dob.toISOString().slice(0, 10)}, Bio: ${biological_type})`,
      user_id: req.user?.userId, user_name: req.user?.name, user_role: req.user?.role,
    });
    res.status(201).json(animal);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const updateAnimal = async (req, res) => {
  const { id } = req.params;
  const { nickname, animal_type, age_months, date_of_birth, weight, biological_type, is_pregnant, pregnancy_start_date: req_pregnancy_start_date, farm_id, status } = req.body;

  // Allowed values
  const allowedAnimalTypes = ['Camel', 'Cattle', 'Goat'];
  const allowedBiologicalTypes = [
    'Rii (Female)', 'Orgi (Male)',       // Goat
    'Sac (Female)', 'Dibi (Male)',       // Cattle
    'Nirig (Female)', 'Awr (Male)',      // Camel
  ];

  if (nickname && !/^[a-zA-Z\s]+$/.test(nickname)) {
    return res.status(400).json({ error: 'Nickname may contain only letters and spaces' });
  }
  // Animal type validation
  if (!animal_type || !allowedAnimalTypes.includes(animal_type)) {
    return res.status(400).json({ error: `Invalid animal type. Allowed: ${allowedAnimalTypes.join(', ')}` });
  }
  // Biological type validation
  if (!biological_type || !allowedBiologicalTypes.includes(biological_type)) {
    return res.status(400).json({ error: `Invalid biological type. Allowed: ${allowedBiologicalTypes.join(', ')}` });
  }

  let age;
  let dob;
  if (date_of_birth !== undefined || age_months !== undefined) {
    const resolved = resolveDobAndAge({ date_of_birth, age_months }, animal_type);
    if (resolved.error) return res.status(400).json({ error: resolved.error });
    dob = resolved.dob;
    age = parseFloat((resolved.ageMonths / 12).toFixed(4));
  }

  try {
    const existing = await prisma.animal.findUnique({ where: { animal_id: parseInt(id) } });
    let pregnancy_start_date = existing ? existing.pregnancy_start_date : null;
    
    if (is_pregnant === true) {
      if (req_pregnancy_start_date) {
        pregnancy_start_date = new Date(req_pregnancy_start_date);
      } else if (!existing || !existing.is_pregnant) {
        pregnancy_start_date = new Date();
      }
    } else if (is_pregnant === false) {
      pregnancy_start_date = null;
    }

    const animal = await prisma.animal.update({
      where: { animal_id: parseInt(id) },
      data: { nickname, animal_type, age, date_of_birth: dob, weight, biological_type, is_pregnant, pregnancy_start_date, farm_id, status },
    });
    await logActivity({
      action: 'UPDATE', entity: 'Animal', entity_id: animal.animal_id,
      description: `Updated animal #${id} "${nickname || 'Unnamed'}"`,
      user_id: req.user?.userId, user_name: req.user?.name, user_role: req.user?.role,
    });
    res.json(animal);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const deleteAnimal = async (req, res) => {
  const animalId = parseInt(req.params.id, 10);
  if (!Number.isFinite(animalId)) {
    return res.status(400).json({ error: 'Invalid animal id.' });
  }

  try {
    const animal = await prisma.animal.findUnique({ where: { animal_id: animalId } });
    if (!animal) {
      return res.status(404).json({ error: 'Animal not found.' });
    }

    // Cascade related rows first — hard delete fails when doses/alerts/schedules exist
    await prisma.$transaction(async (tx) => {
      const schedules = await tx.vaccinationSchedule.findMany({
        where: { animal_id: animalId },
        select: { schedule_id: true },
      });
      const scheduleIds = schedules.map((s) => s.schedule_id);
      if (scheduleIds.length) {
        await tx.taskDelegation.deleteMany({ where: { schedule_id: { in: scheduleIds } } });
      }

      await tx.mortalityRecord.deleteMany({ where: { animal_id: animalId } });
      await tx.vaccination.deleteMany({ where: { animal_id: animalId } });
      await tx.routineVaccinationRecord.deleteMany({ where: { animal_id: animalId } });
      await tx.alert.deleteMany({ where: { animal_id: animalId } });
      await tx.vaccinationSchedule.deleteMany({ where: { animal_id: animalId } });
      await tx.animal.delete({ where: { animal_id: animalId } });
    });

    await logActivity({
      action: 'DELETE',
      entity: 'Animal',
      entity_id: animalId,
      description: `Deleted animal #${animalId}${animal.nickname ? ` (${animal.nickname})` : ''}`,
      user_id: req.user?.userId,
      user_name: req.user?.name,
      user_role: req.user?.role,
    });
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: error.message || 'Failed to delete animal.' });
  }
};

const generateAnimalIDCard = async (req, res) => {
  const { id } = req.params;
  try {
    const animal = await prisma.animal.findUnique({
      where: { animal_id: parseInt(id) },
      include: { farm: true },
    });

    if (!animal) return res.status(404).json({ error: 'Animal not found' });

    const doc = new PDFDocument({ size: [300, 200], margin: 20 });
    let filename = `ID_Card_${animal.animal_id}.pdf`;

    res.setHeader('Content-disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-type', 'application/pdf');

    doc.pipe(res);

    // Design the ID Card
    doc.rect(0, 0, 300, 200).fill('#2FA4D7');
    doc.fillColor('white').fontSize(20).text('MUMIN GROUP', 20, 20, { align: 'center' });
    doc.fontSize(14).text('Livestock Vaccination System', 20, 50, { align: 'center' });

    doc.rect(20, 80, 260, 100).fill('white');
    doc.fillColor('black').fontSize(12);
    let prefix = 'ID';
    if (animal.animal_type === 'Goat') prefix = 'GT';
    else if (animal.animal_type === 'Cattle') prefix = 'CT';
    else if (animal.animal_type === 'Camel') prefix = 'CM';
    
    doc.text(`Animal ID: ${prefix}-${animal.animal_id}`, 40, 100);
    doc.text(`Nickname: ${animal.nickname || 'N/A'}`, 40, 120);
    doc.text(`Type: ${animal.animal_type}`, 40, 140);
    doc.text(`Farm: ${animal.farm.farm_name}`, 40, 160);

    doc.end();
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const updateAnimalStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const validStatuses = ['Active', 'Sold', 'Deceased'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status value' });
  }
  try {
    const animalId = parseInt(id);

    // If animal is restored from Deceased → Active/Sold, remove orphan mortality record
    // (animal_id is unique on MortalityRecord; leftover rows block future Report Death)
    if (status === 'Active' || status === 'Sold') {
      await prisma.mortalityRecord.deleteMany({ where: { animal_id: animalId } });
    }

    const animal = await prisma.animal.update({
      where: { animal_id: animalId },
      data: { status },
    });
    await logActivity({
      action: 'STATUS_CHANGE', entity: 'Animal', entity_id: animalId,
      description: `Changed animal #${id} status to "${status}"`,
      user_id: req.user?.userId, user_name: req.user?.name, user_role: req.user?.role,
    });
    res.json(animal);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const reportMortality = async (req, res) => {
  const { id } = req.params;
  const { death_date, cause_of_death, notes, vaccination_id, routine_record_id } = req.body;

  try {
    const animalId = parseInt(id);

    if (!death_date || !cause_of_death) {
      return res.status(400).json({ error: 'death_date and cause_of_death are required.' });
    }

    const existingAnimal = await prisma.animal.findUnique({
      where: { animal_id: animalId },
      include: { mortalityRecord: true },
    });
    if (!existingAnimal) {
      return res.status(404).json({ error: `Animal #${animalId} not found.` });
    }

    const mortalityData = {
      death_date: new Date(death_date),
      cause_of_death,
      notes: notes || null,
      vaccination_id: vaccination_id ? parseInt(vaccination_id) : null,
      routine_record_id: routine_record_id ? parseInt(routine_record_id) : null,
      reported_by: req.user.userId,
    };

    // Upsert: one animal can only have one mortality record (unique animal_id)
    const mortalityRecord = existingAnimal.mortalityRecord
      ? await prisma.mortalityRecord.update({
          where: { animal_id: animalId },
          data: mortalityData,
        })
      : await prisma.mortalityRecord.create({
          data: { animal_id: animalId, ...mortalityData },
        });

    const animal = await prisma.animal.update({
      where: { animal_id: animalId },
      data: { status: 'Deceased' },
    });

    await logActivity({
      action: 'UPDATE', entity: 'Animal', entity_id: animalId,
      description: `Reported mortality for animal #${animalId} due to ${cause_of_death}`,
      user_id: req.user?.userId, user_name: req.user?.name, user_role: req.user?.role,
    });

    res.status(existingAnimal.mortalityRecord ? 200 : 201).json({ mortalityRecord, animal });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = { getAnimals, createAnimal, updateAnimal, deleteAnimal, generateAnimalIDCard, updateAnimalStatus, reportMortality };