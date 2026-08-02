const path = require('path');
const prisma = require(path.join(__dirname, '../../config/db'));
const PDFDocument = require('pdfkit');
const { logActivity } = require('./activityLogController');

const getAnimals = async (req, res) => {
  try {
    const animals = await prisma.animal.findMany({
      include: {
        farm: true,
        vaccinations: true,
        routineRecords: true,
      },
      orderBy: { animal_id: 'desc' },
    });
    // total_doses = emergency/standard + routine (Animals Directory badge)
    const enriched = animals.map((a) => ({
      ...a,
      total_doses: (a.vaccinations?.length || 0) + (a.routineRecords?.length || 0),
    }));
    res.json(enriched);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const createAnimal = async (req, res) => {
  const { nickname, animal_type, age_months, weight, biological_type, is_pregnant, farm_id, status } = req.body;

  // Allowed values
  const allowedAnimalTypes = ['Camel', 'Cattle', 'Goat'];
  const allowedBiologicalTypes = [
    'Rii (Female)', 'Orgi (Male)',       // Goat
    'Sac (Female)', 'Dibi (Male)',       // Cattle
    'Nirig (Female)', 'Awr (Male)',      // Camel
  ];

  let minMonths = 1;
  if (animal_type === 'Goat') minMonths = 3;
  else if (animal_type === 'Cattle') minMonths = 4;
  else if (animal_type === 'Camel') minMonths = 6;

  // Age validation: must be between minMonths and 180 months (15 years)
  if (typeof age_months !== 'number' || age_months < minMonths || age_months > 180) {
    return res.status(400).json({ error: `Age must be between ${minMonths} and 180 months for ${animal_type}` });
  }
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

  // Convert months to years for storage
  const age = parseFloat((age_months / 12).toFixed(4));

  try {
    const animal = await prisma.animal.create({
      data: { nickname, animal_type, age, weight, biological_type, is_pregnant, farm_id, status: status || 'Active' },
    });
    await logActivity({
      action: 'CREATE', entity: 'Animal', entity_id: animal.animal_id,
      description: `Registered new ${animal_type} "${nickname || 'Unnamed'}" (Age: ${age_months} months, Bio: ${biological_type})`,
      user_id: req.user?.userId, user_name: req.user?.name, user_role: req.user?.role,
    });
    res.status(201).json(animal);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const updateAnimal = async (req, res) => {
  const { id } = req.params;
  const { nickname, animal_type, age_months, weight, biological_type, is_pregnant, farm_id, status } = req.body;

  // Allowed values
  const allowedAnimalTypes = ['Camel', 'Cattle', 'Goat'];
  const allowedBiologicalTypes = [
    'Rii (Female)', 'Orgi (Male)',       // Goat
    'Sac (Female)', 'Dibi (Male)',       // Cattle
    'Nirig (Female)', 'Awr (Male)',      // Camel
  ];

  let minMonths = 1;
  if (animal_type === 'Goat') minMonths = 3;
  else if (animal_type === 'Cattle') minMonths = 4;
  else if (animal_type === 'Camel') minMonths = 6;

  let age;
  if (age_months !== undefined) {
    if (typeof age_months !== 'number' || age_months < minMonths || age_months > 180) {
      return res.status(400).json({ error: `Age must be between ${minMonths} and 180 months for ${animal_type}` });
    }
    age = parseFloat((age_months / 12).toFixed(4));
  }
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

  try {
    const animal = await prisma.animal.update({
      where: { animal_id: parseInt(id) },
      data: { nickname, animal_type, age, weight, biological_type, is_pregnant, farm_id, status },
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
  const { id } = req.params;
  try {
    await prisma.animal.delete({ where: { animal_id: parseInt(id) } });
    await logActivity({
      action: 'DELETE', entity: 'Animal', entity_id: parseInt(id),
      description: `Deleted animal #${id}`,
      user_id: req.user?.userId, user_name: req.user?.name, user_role: req.user?.role,
    });
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: error.message });
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