const path = require('path');
const prisma = require(path.join(__dirname, '../../config/db'));
const { liveAgeYears } = require('../utils/age');

const getFarms = async (req, res) => {
    try {
        const farms = await prisma.farm.findMany({
            include: { animals: true, alerts: true },
        });
        // Age is computed live from date_of_birth so it never goes stale
        const enriched = farms.map((f) => ({
            ...f,
            animals: (f.animals || []).map((a) => ({ ...a, age: liveAgeYears(a) })),
        }));
        res.json(enriched);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const createFarm = async (req, res) => {
    const { farm_name, location } = req.body;
    try {
        const farm = await prisma.farm.create({
            data: { farm_name, location },
        });
        res.status(201).json(farm);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const updateFarm = async (req, res) => {
    const { id } = req.params;
    const { farm_name, location } = req.body;
    try {
        const farm = await prisma.farm.update({
            where: { farm_id: parseInt(id) },
            data: { farm_name, location },
        });
        res.json(farm);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const deleteFarm = async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.farm.delete({ where: { farm_id: parseInt(id) } });
        res.status(204).send();
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

module.exports = { getFarms, createFarm, updateFarm, deleteFarm };
