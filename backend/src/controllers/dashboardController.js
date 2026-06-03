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

        // 1. Top 4 Farms
        const farms = await prisma.farm.findMany({
            include: { _count: { select: { animals: true } } },
            orderBy: { created_at: 'desc' },
            take: 4
        });

        // 2. Top 4 Vaccine Stocks
        const vaccineInventory = await prisma.vaccineStock.findMany({
            include: { vaccine: true },
            orderBy: { created_at: 'desc' },
            take: 4
        });

        // 3. Recent Activities (Combining Animals and Stocks)
        const recentAnimals = await prisma.animal.findMany({
            include: { farm: true },
            orderBy: { created_at: 'desc' },
            take: 5
        });
        const recentStocks = await prisma.vaccineStock.findMany({
            include: { vaccine: true },
            orderBy: { created_at: 'desc' },
            take: 5
        });

        const activities = [];
        recentAnimals.forEach(a => {
            activities.push({
                id: `anim_${a.animal_id}`,
                type: 'animal',
                title: 'Animal registered',
                description: `New ${a.animal_type} (ID: ${a.animal_id}) registered in ${a.farm?.farm_name || 'Farm'}`,
                created_at: a.created_at
            });
        });
        recentStocks.forEach(s => {
            activities.push({
                id: `stock_${s.stock_id}`,
                type: 'stock',
                title: 'New vaccine batch added',
                description: `Batch "${s.vaccine?.vaccine_name || 'Vaccine'}" added to inventory`,
                created_at: s.created_at
            });
        });
        
        // Sort activities by date desc and take top 5
        activities.sort((a, b) => b.created_at - a.created_at);
        const recentActivities = activities.slice(0, 5);

        // 4. Animals Overview Chart Data
        const currentYear = new Date().getFullYear();
        const startOfYear = new Date(`${currentYear}-01-01`);
        
        const animalsThisYear = await prisma.animal.findMany({
            where: { created_at: { gte: startOfYear } },
            select: { created_at: true }
        });

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const chartDataMap = {};
        months.forEach(m => chartDataMap[m] = 0);

        animalsThisYear.forEach(a => {
            const monthIndex = a.created_at.getMonth(); // 0 = Jan
            chartDataMap[months[monthIndex]]++;
        });

        const chartData = months.map(m => ({
            month: m,
            animals: chartDataMap[m]
        }));

        res.json({
            totalAnimals,
            totalVaccines,
            totalStaff,
            medicalAlerts,
            totalVaccinations,
            farms,
            vaccineInventory,
            recentActivities,
            chartData
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
};
