const path = require('path');
const prisma = require(path.join(__dirname, '../../config/db'));

const getVaccines = async (req, res) => {
    try {
        const vaccines = await prisma.vaccine.findMany();
        res.json(vaccines);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const createVaccine = async (req, res) => {
    const { vaccine_name, description, validity_period_days, recommended_interval_days } = req.body;
    try {
        const vaccine = await prisma.vaccine.create({
            data: {
                vaccine_name,
                description,
                validity_period_days: parseInt(validity_period_days),
                recommended_interval_days: parseInt(recommended_interval_days),
            },
        });
        res.status(201).json(vaccine);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

module.exports = { getVaccines, createVaccine };
