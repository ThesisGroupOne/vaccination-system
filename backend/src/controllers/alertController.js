const path = require('path');
const prisma = require(path.join(__dirname, '../../config/db'));
const { sendEmergencyAlertNotification } = require('../services/emailService');

const getAlerts = async (req, res) => {
    try {
        const role = req.user?.role;
        const userId = req.user?.userId;

        // Unauthorized doctors: can log in but must not see medical alerts
        if (role === 'Doctor' && userId) {
            const me = await prisma.user.findUnique({
                where: { user_id: userId },
                select: { is_authorized: true },
            });
            if (!me?.is_authorized) {
                return res.json([]);
            }
        }

        let where = {};
        // Farm Workers: show all farm alerts they can track (legacy rows were
        // wrongly saved as user_id=1; new ones use JWT reporter id).
        // Doctors (authorized): see all pending workflow alerts.
        // Admin: all.
        if (role === 'Farm Worker' && userId) {
            where = {
                OR: [{ user_id: userId }, { user_id: 1 }],
            };
        }

        const alerts = await prisma.alert.findMany({
            where,
            include: { 
                animal: {
                    include: {
                        vaccinations: { orderBy: { date_administered: 'desc' }, take: 1 },
                        routineRecords: { orderBy: { date_administered: 'desc' }, take: 1 }
                    }
                }, 
                farm: true, 
                user: true 
            },
            orderBy: { created_at: 'desc' },
        });
        res.json(alerts);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const createAlert = async (req, res) => {
    const { animal_id, farm_id, symptoms } = req.body;
    try {
        // Always attribute alert to the logged-in reporter (ignore client user_id)
        const reporterId = req.user?.userId;
        if (!reporterId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const alert = await prisma.alert.create({
            data: {
                animal_id,
                farm_id,
                user_id: reporterId,
                symptoms,
            },
            include: {
                animal: true,
                farm: true,
                user: { select: { full_name: true } },
            }
        });

        // Gmail only to authorized Doctor(s) — not all doctors
        const authorizedDoctors = await prisma.user.findMany({
            where: { role: 'Doctor', is_authorized: true, is_active: true },
            select: { email: true, full_name: true },
        });

        const authorizedEmails = authorizedDoctors.map((d) => d.email).filter(Boolean);
        let email_notification = {
            ok: false,
            reason: 'no_recipients',
            sent: 0,
            failed: 0,
            recipients: [],
        };

        if (authorizedEmails.length > 0) {
            const alertDetails = {
                alert_id: alert.alert_id,
                animal_id: alert.animal.animal_id,
                animal_type: alert.animal.animal_type,
                farm_name: alert.farm.farm_name,
                symptoms: alert.symptoms,
                created_at: alert.created_at,
                reported_by_name: alert.user?.full_name || null,
            };
            email_notification = await sendEmergencyAlertNotification(authorizedEmails, alertDetails);
        } else {
            email_notification.reason = 'no_authorized_doctor';
            console.warn(
                `[Alert #${alert.alert_id}] No authorized Doctor — Gmail skipped. Authorize a Doctor on Roles → User assigned.`
            );
        }

        res.status(201).json({ ...alert, email_notification });
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
