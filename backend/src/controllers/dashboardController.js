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

        let totalVaccinations = 0;
        const uid = req.user?.userId || req.user?.user_id;
        
        if (req.user?.role === 'Doctor' && uid) {
            const emergency = await prisma.vaccination.count({ where: { administered_by: uid } });
            const routine = await prisma.routineVaccinationRecord.count({ where: { administered_by: uid } });
            totalVaccinations = emergency + routine;
        } else {
            const emergency = await prisma.vaccination.count();
            const routine = await prisma.routineVaccinationRecord.count();
            totalVaccinations = emergency + routine;
        }

        // 1. Top 4 Vaccine Stocks
        const vaccineInventory = await prisma.vaccineStock.findMany({
            where: { is_archived: false },
            include: { vaccine: true },
            orderBy: { created_at: 'desc' },
            take: 4
        });

        // 2. Recent Activities (Combining Animals and Stocks)
        const recentAnimals = await prisma.animal.findMany({
            include: { farm: true },
            orderBy: { created_at: 'desc' },
            take: 5
        });
        const recentStocks = await prisma.vaccineStock.findMany({
            where: { is_archived: false },
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

        // 3. Animals Overview + Vaccination Activity (same year window)
        const currentYear = new Date().getFullYear();
        const startOfYear = new Date(`${currentYear}-01-01`);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        const [animalsThisYear, emergencyDoses, routineDoses, prevEmergency, prevRoutine] = await Promise.all([
            prisma.animal.findMany({
                where: { created_at: { gte: startOfYear } },
                select: { created_at: true }
            }),
            prisma.vaccination.findMany({
                where: { date_administered: { gte: startOfYear } },
                select: { date_administered: true, animal: { select: { animal_type: true } } }
            }),
            prisma.routineVaccinationRecord.findMany({
                where: { date_administered: { gte: startOfYear } },
                select: { date_administered: true, animal: { select: { animal_type: true } } }
            }),
            prisma.vaccination.count({
                where: {
                    date_administered: {
                        gte: new Date(`${currentYear - 1}-01-01`),
                        lt: startOfYear
                    }
                }
            }),
            prisma.routineVaccinationRecord.count({
                where: {
                    date_administered: {
                        gte: new Date(`${currentYear - 1}-01-01`),
                        lt: startOfYear
                    }
                }
            })
        ]);

        const chartDataMap = {};
        months.forEach(m => { chartDataMap[m] = 0; });
        animalsThisYear.forEach(a => {
            chartDataMap[months[a.created_at.getMonth()]]++;
        });
        const chartData = months.map(m => ({ month: m, animals: chartDataMap[m] }));

        // Vaccinations per month by animal type (Goat / Cattle / Camel)
        const normalizeType = (t) => {
            const x = String(t || '').trim();
            if (x === 'Goat') return 'Goat';
            if (x === 'Cattle' || x === 'Cow') return 'Cattle';
            if (x === 'Camel') return 'Camel';
            return null;
        };

        const vacMap = {};
        months.forEach(m => { vacMap[m] = { Goat: 0, Cattle: 0, Camel: 0 }; });

        const bumpVac = (date, type) => {
            const key = normalizeType(type);
            if (!key || !date) return;
            const m = months[date.getMonth()];
            if (vacMap[m]) vacMap[m][key]++;
        };

        emergencyDoses.forEach(d => bumpVac(d.date_administered, d.animal?.animal_type));
        routineDoses.forEach(d => bumpVac(d.date_administered, d.animal?.animal_type));

        const vaccinationChartData = months.map(m => ({
            month: m,
            Goat: vacMap[m].Goat,
            Cattle: vacMap[m].Cattle,
            Camel: vacMap[m].Camel
        }));

        const vaccinationPrevYearTotal = prevEmergency + prevRoutine;

        res.json({
            totalAnimals,
            totalVaccines,
            totalStaff,
            medicalAlerts,
            totalVaccinations,
            vaccineInventory,
            recentActivities,
            chartData,
            vaccinationChartData,
            vaccinationPrevYearTotal
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
};
