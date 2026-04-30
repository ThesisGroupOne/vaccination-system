const path = require('path');
const prisma = require(path.join(__dirname, '../../config/db'));
const PDFDocument = require('pdfkit');

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
  try {
    const animal = await prisma.animal.create({
      data: { nickname, animal_type, age, biological_type, is_pregnant, farm_id, status: status || 'Active' },
    });
    res.status(201).json(animal);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const updateAnimal = async (req, res) => {
  const { id } = req.params;
  const { nickname, animal_type, age, biological_type, is_pregnant, farm_id, status } = req.body;
  try {
    const animal = await prisma.animal.update({
      where: { animal_id: parseInt(id) },
      data: { nickname, animal_type, age, biological_type, is_pregnant, farm_id, status },
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
    res.json(animal);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = { getAnimals, createAnimal, updateAnimal, deleteAnimal, generateAnimalIDCard, updateAnimalStatus };;