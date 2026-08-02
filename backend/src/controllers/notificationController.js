const path = require('path');
const prisma = require(path.join(__dirname, '../../config/db'));

exports.getNotifications = async (req, res) => {
    try {
        const notifications = [];
        let idCounter = 1;
        const role = req.user?.role;
        const userId = req.user?.userId;
        const isDoctor = role === 'Doctor';

        // Doctors: only if authorized — then only their jobs (no shared pool)
        if (isDoctor && userId) {
            const me = await prisma.user.findUnique({
                where: { user_id: userId },
                select: { is_authorized: true },
            });
            if (!me?.is_authorized) {
                return res.json([]);
            }

            const myJobs = await prisma.vaccinationSchedule.findMany({
                where: {
                    doctor_id: userId,
                    status: { not: 'Completed' },
                },
                include: {
                    animal: { include: { farm: true } },
                    vaccine: true,
                },
                orderBy: { scheduled_date: 'desc' },
                take: 30,
            });

            myJobs.forEach((job) => {
                notifications.push({
                    id: idCounter++,
                    original_id: job.schedule_id,
                    type: job.schedule_type === 'Emergency' ? 'emergency' : 'schedule',
                    title: job.schedule_type === 'Emergency' ? 'Authorized Emergency Job' : 'Authorized Vaccination Job',
                    message: `Animal #${job.animal_id} (${job.animal?.nickname || 'Unnamed'}) — ${job.vaccine?.vaccine_name || 'Vaccine'} is assigned to you.`,
                    time: job.scheduled_date || job.created_at,
                    isRead: false,
                });
            });

            notifications.sort((a, b) => new Date(b.time) - new Date(a.time));
            return res.json(notifications);
        }

        // Admin / others: full feed
        const alerts = await prisma.alert.findMany({
            where: { status: 'Pending' },
            include: { animal: { include: { farm: true } } },
            orderBy: { created_at: 'desc' }
        });

        alerts.forEach(alert => {
            notifications.push({
                id: idCounter++,
                original_id: alert.alert_id,
                type: 'emergency',
                title: 'Emergency Alert',
                message: `Animal ID ${alert.animal_id} at ${alert.animal?.farm?.farm_name || 'Farm'} has symptoms: ${alert.symptoms}.`,
                time: alert.created_at,
                isRead: false
            });
        });

        // Jobs with no doctor (no authorized doctor was set when created)
        const unassigned = await prisma.vaccinationSchedule.findMany({
            where: {
                doctor_id: null,
                status: { not: 'Completed' },
            },
            include: {
                animal: { include: { farm: true } },
                vaccine: true,
            },
            orderBy: { scheduled_date: 'desc' },
            take: 20,
        });

        unassigned.forEach((job) => {
            notifications.push({
                id: idCounter++,
                original_id: job.schedule_id,
                type: 'schedule',
                title: 'Job Needs Authorized Doctor',
                message: `Schedule #${job.schedule_id} for Animal #${job.animal_id} (${job.vaccine?.vaccine_name || 'Vaccine'}) — authorize a Doctor on Roles → User assigned.`,
                time: job.scheduled_date || job.created_at,
                isRead: false,
            });
        });

        const lowStocks = await prisma.vaccineStock.findMany({
            where: { is_archived: false, quantity_remaining: { lt: 100 } },
            include: { vaccine: true },
            orderBy: { created_at: 'desc' }
        });

        lowStocks.forEach(stock => {
            notifications.push({
                id: idCounter++,
                original_id: stock.stock_id,
                type: 'stock',
                title: `Low Stock: ${stock.vaccine?.vaccine_name || 'Vaccine'}`,
                message: `Stock has dropped to ${stock.quantity_remaining} doses. Please restock immediately.`,
                time: stock.created_at,
                isRead: false
            });
        });

        const recentVaccinations = await prisma.routineVaccinationRecord.findMany({
            include: { animal: { include: { farm: true } }, vaccine: true },
            orderBy: { created_at: 'desc' },
            take: 5
        });

        recentVaccinations.forEach(record => {
            notifications.push({
                id: idCounter++,
                original_id: record.id,
                type: 'vaccination',
                title: 'Routine Vaccination Completed',
                message: `Animal ID ${record.animal_id} at ${record.animal?.farm?.farm_name || 'Farm'} was vaccinated for ${record.vaccine?.vaccine_name || 'Vaccine'}.`,
                time: record.created_at,
                isRead: true
            });
        });

        const recentAnimals = await prisma.animal.findMany({
            include: { farm: true },
            orderBy: { created_at: 'desc' },
            take: 5
        });

        recentAnimals.forEach(animal => {
            notifications.push({
                id: idCounter++,
                original_id: animal.animal_id,
                type: 'alert',
                title: 'New Animal Registered',
                message: `A new ${animal.animal_type} (ID: ${animal.animal_id}) was registered at ${animal.farm?.farm_name || 'Farm'}.`,
                time: animal.created_at,
                isRead: true
            });
        });

        const recentRequests = await prisma.vaccineRequest.findMany({
            orderBy: { createdAt: 'desc' },
            take: 10
        });

        recentRequests.forEach(reqItem => {
            notifications.push({
                id: idCounter++,
                original_id: reqItem.id,
                type: 'vaccine-request',
                title: 'New Vaccine Request',
                message: `Dr. ${String(reqItem.doctorName || '').replace('Dr. ', '')} requested ${reqItem.quantity} doses of ${reqItem.vaccineType}.`,
                time: reqItem.createdAt,
                isRead: false
            });
        });

        notifications.sort((a, b) => new Date(b.time) - new Date(a.time));
        res.json(notifications);
    } catch (error) {
        console.error("Error fetching notifications:", error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
};
