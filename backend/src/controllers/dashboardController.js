const path = require('path');
const prisma = require(path.join(__dirname, '../../config/db'));

exports.getStats = async (req, res) => {
    try {
        console.log("API: Fetching dashboard statistics...");
        const totalAnimals = await prisma.animal.count();

        const stockData = await prisma.vaccineStock.aggregate({
            _sum: {
                quantity_remaining: true
            }
        });
        const totalVaccines = stockData._sum.quantity_remaining || 0;

        const totalStaff = await prisma.user.count();

        const medicalAlerts = await prisma.alert.count({
            where: { status: 'Pending' }
        });

        const totalVaccinations = await prisma.vaccination.count();

        res.json({
            totalAnimals,
            totalVaccines,
            totalStaff,
            medicalAlerts,
            totalVaccinations
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
};
