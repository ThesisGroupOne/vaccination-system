const path = require('path');
const prisma = require(path.join(__dirname, '../../config/db'));

const getVaccines = async (req, res) => {
    try {
        const { animal_type } = req.query;
        let where = {};
        if (animal_type) {
            where.OR = [
                { target_animal: animal_type },
                { target_animal: 'All' }
            ];
        }
        const vaccines = await prisma.vaccine.findMany({ where });
        res.json(vaccines);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const createVaccine = async (req, res) => {
    const { vaccine_name, description, validity_period_days, recommended_interval_days, target_animal } = req.body;
    try {
        const vaccine = await prisma.vaccine.create({
            data: {
                vaccine_name,
                description,
                validity_period_days: parseInt(validity_period_days),
                recommended_interval_days: parseInt(recommended_interval_days),
                target_animal: target_animal || 'All',
            },
        });
        res.status(201).json(vaccine);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const updateVaccine = async (req, res) => {
    const { id } = req.params;
    const { vaccine_name, description, validity_period_days, recommended_interval_days, target_animal } = req.body;
    try {
        const vaccine = await prisma.vaccine.update({
            where: { vaccine_id: parseInt(id) },
            data: {
                vaccine_name,
                description,
                validity_period_days: parseInt(validity_period_days),
                recommended_interval_days: parseInt(recommended_interval_days),
                target_animal: target_animal || 'All',
            },
        });
        res.json(vaccine);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const deleteVaccine = async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.vaccine.delete({ where: { vaccine_id: parseInt(id) } });
        res.status(204).send();
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

module.exports = { getVaccines, createVaccine, updateVaccine, deleteVaccine };
