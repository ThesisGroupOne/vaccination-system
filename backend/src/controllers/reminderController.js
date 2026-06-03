const path = require('path');
const prisma = require(path.join(__dirname, '../../config/db'));

exports.getReminders = async (req, res) => {
    try {
        const reminders = [];
        const today = new Date();
        
        // Thresholds
        const expiryThreshold = new Date();
        expiryThreshold.setDate(today.getDate() + 30); // 30 days

        const scheduleThreshold = new Date();
        scheduleThreshold.setDate(today.getDate() + 3); // 3 days

        // 1. Vaccine Expiry Reminder
        const expiringStocks = await prisma.vaccineStock.findMany({
            where: {
                quantity_remaining: { gt: 0 },
                expiry_date: { lte: expiryThreshold }
            },
            include: { vaccine: true }
        });

        expiringStocks.forEach(stock => {
            const isExpired = stock.expiry_date < today;
            reminders.push({
                id: `exp_${stock.stock_id}`,
                type: 'expiry',
                urgency: isExpired ? 'high' : 'medium',
                title: isExpired ? 'Vaccine Expired' : 'Vaccine Expiring Soon',
                description: `Batch "${stock.batch_number || 'N/A'}" of ${stock.vaccine?.vaccine_name || 'Vaccine'} ${isExpired ? 'expired on' : 'expires on'} ${stock.expiry_date.toLocaleDateString()}`,
                date: stock.expiry_date
            });
        });

        // 2. Stock Depletion Reminder
        const lowStocks = await prisma.vaccineStock.findMany({
            where: {
                quantity_remaining: { lt: 50, gt: 0 }
            },
            include: { vaccine: true }
        });

        lowStocks.forEach(stock => {
            reminders.push({
                id: `dep_${stock.stock_id}`,
                type: 'stock',
                urgency: stock.quantity_remaining < 20 ? 'high' : 'medium',
                title: 'Low Vaccine Stock',
                description: `Only ${stock.quantity_remaining} doses left for ${stock.vaccine?.vaccine_name || 'Vaccine'} (Batch: ${stock.batch_number || 'N/A'})`,
                date: new Date() // Current time for stock alerts
            });
        });

        const zeroStocks = await prisma.vaccineStock.findMany({
            where: { quantity_remaining: 0 },
            include: { vaccine: true }
        });

        zeroStocks.forEach(stock => {
            reminders.push({
                id: `zero_${stock.stock_id}`,
                type: 'stock',
                urgency: 'high',
                title: 'Vaccine Out of Stock',
                description: `${stock.vaccine?.vaccine_name || 'Vaccine'} (Batch: ${stock.batch_number || 'N/A'}) is completely out of stock!`,
                date: new Date()
            });
        });

        // 3. Scheduled Vaccination Reminder
        const upcomingSchedules = await prisma.vaccinationSchedule.findMany({
            where: {
                status: 'Pending',
                scheduled_date: { lte: scheduleThreshold }
            },
            include: { vaccine: true, animal: true, farm: true }
        });

        upcomingSchedules.forEach(schedule => {
            const isOverdue = schedule.scheduled_date < today;
            const target = schedule.animal ? `Animal #${schedule.animal_id} (${schedule.animal.animal_type})` : (schedule.farm ? `Farm: ${schedule.farm.farm_name}` : 'Unknown Target');
            
            reminders.push({
                id: `sched_${schedule.schedule_id}`,
                type: 'schedule',
                urgency: isOverdue ? 'high' : 'medium',
                title: isOverdue ? 'Overdue Vaccination' : 'Upcoming Vaccination',
                description: `${schedule.vaccine?.vaccine_name || 'Vaccine'} is scheduled for ${target} ${isOverdue ? 'was due on' : 'is due on'} ${schedule.scheduled_date.toLocaleDateString()}`,
                date: schedule.scheduled_date
            });
        });

        // Sort reminders by urgency (high first) then date
        reminders.sort((a, b) => {
            if (a.urgency === 'high' && b.urgency !== 'high') return -1;
            if (a.urgency !== 'high' && b.urgency === 'high') return 1;
            return b.date - a.date; // Newest first
        });

        res.json({ reminders });
    } catch (error) {
        console.error("Error fetching reminders:", error);
        res.status(500).json({ error: 'Failed to fetch reminders' });
    }
};
