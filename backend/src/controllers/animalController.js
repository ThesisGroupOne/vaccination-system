const path = require('path');
const prisma = require(path.join(__dirname, '../../config/db'));
const PDFDocument = require('pdfkit');
const { logActivity } = require('./activityLogController');

const getAnimals = async (req, res) => {
  try {
    const animals = await prisma.animal.findMany({ include: { farm: true, vaccinations: true } });
    res.json(animals);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const createAnimal = async (req, res) => {
  const { nickname, animal_type, age, biological_type, is_pregnant, farm_id, status } = req.body;

  // Allowed values
  const allowedAnimalTypes = ['Camel', 'Cattle', 'Goat'];
  const allowedBiologicalTypes = [
    'Rii (Female)', 'Orgi (Male)',       // Goat
    'Sac (Female)', 'Dibi (Male)',       // Cattle
    'Nirig (Female)', 'Awr (Male)',      // Camel
  ];

  // Age validation: must be 1-15
  if (typeof age !== 'number' || age < 1 || age > 15) {
    return res.status(400).json({ error: 'Age must be a number between 1 and 15 years' });
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

  try {
    const animal = await prisma.animal.create({
      data: { nickname, animal_type, age, biological_type, is_pregnant, farm_id, status: status || 'Active' },
    });
    await logActivity({
      action: 'CREATE', entity: 'Animal', entity_id: animal.animal_id,
      description: `Registered new ${animal_type} "${nickname || 'Unnamed'}" (Age: ${age}, Bio: ${biological_type})`,
      user_id: req.user?.userId, user_name: req.user?.name, user_role: req.user?.role,
    });
    res.status(201).json(animal);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const updateAnimal = async (req, res) => {
  const { id } = req.params;
  const { nickname, animal_type, age, biological_type, is_pregnant, farm_id, status } = req.body;

  // Allowed values
  const allowedAnimalTypes = ['Camel', 'Cattle', 'Goat'];
  const allowedBiologicalTypes = [
    'Rii (Female)', 'Orgi (Male)',       // Goat
    'Sac (Female)', 'Dibi (Male)',       // Cattle
    'Nirig (Female)', 'Awr (Male)',      // Camel
  ];

  // Age validation: must be 1-15
  if (typeof age !== 'number' || age < 1 || age > 15) {
    return res.status(400).json({ error: 'Age must be a number between 1 and 15 years' });
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

  try {
    const animal = await prisma.animal.update({
      where: { animal_id: parseInt(id) },
      data: { nickname, animal_type, age, biological_type, is_pregnant, farm_id, status },
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
    doc.text(`Animal ID: #${animal.animal_id}`, 40, 100);
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
    const animal = await prisma.animal.update({
      where: { animal_id: parseInt(id) },
      data: { status },
    });
    await logActivity({
      action: 'STATUS_CHANGE', entity: 'Animal', entity_id: parseInt(id),
      description: `Changed animal #${id} status to "${status}"`,
      user_id: req.user?.userId, user_name: req.user?.name, user_role: req.user?.role,
    });
    res.json(animal);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = { getAnimals, createAnimal, updateAnimal, deleteAnimal, generateAnimalIDCard, updateAnimalStatus };;