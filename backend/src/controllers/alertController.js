const path = require('path');
const prisma = require(path.join(__dirname, '../../config/db'));

const getAlerts = async (req, res) => {
    try {
        const alerts = await prisma.alert.findMany({
            include: { animal: true, farm: true, user: true },
            orderBy: { created_at: 'desc' },
        });
        res.json(alerts);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const createAlert = async (req, res) => {
    const { animal_id, farm_id, user_id, symptoms } = req.body;
    try {
        const alert = await prisma.alert.create({
            data: {
                animal_id,
                farm_id,
                user_id,
                symptoms,
            },
        });
        res.status(201).json(alert);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const updateAlertStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        const alert = await prisma.alert.update({
            where: { alert_id: parseInt(id) },
            data: { status },
        });
        res.json(alert);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

module.exports = { getAlerts, createAlert, updateAlertStatus };
