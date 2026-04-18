const path = require('path');
const prisma = require(path.join(__dirname, '../../config/db'));

const getVaccinations = async (req, res) => {
  try {
    const vaccinations = await prisma.vaccination.findMany({
      include: { animal: true, vaccine: true, user: true, stock: true },
    });
    res.json(vaccinations);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const createVaccination = async (req, res) => {
  const { animal_id, vaccine_id, administered_by, stock_id, date_administered } = req.body;
  try {
    // 1. Check if animal is Active
    const animal = await prisma.animal.findUnique({ where: { animal_id } });
    if (!animal || animal.status !== 'Active') {
      return res.status(400).json({ error: `Cannot vaccinate animal with status: ${animal?.status || 'Unknown'}` });
    }

    // 2. Get vaccine validity period
    const vaccine = await prisma.vaccine.findUnique({ where: { vaccine_id } });
    if (!vaccine) return res.status(404).json({ error: 'Vaccine not found' });

    const next_due_date = new Date(date_administered);
    next_due_date.setDate(next_due_date.getDate() + vaccine.validity_period_days);

    // 3. Check stock availability
    const stock = await prisma.vaccineStock.findUnique({ where: { stock_id } });
    if (!stock || stock.quantity_remaining <= 0) {
      return res.status(400).json({ error: 'Insufficient vaccine stock' });
    }

    // 4. Create vaccination record
    const vaccination = await prisma.vaccination.create({
      data: {
        animal_id,
        vaccine_id,
        administered_by,
        stock_id,
        date_administered: new Date(date_administered),
        next_due_date,
      },
    });

    // 5. Reduce stock quantity_remaining
    await prisma.vaccineStock.update({
      where: { stock_id },
      data: { quantity_remaining: { decrement: 1 } },
    });

    res.status(201).json(vaccination);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = { getVaccinations, createVaccination };