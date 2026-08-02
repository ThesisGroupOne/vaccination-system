const path = require('path');
const prisma = require(path.join(__dirname, '../../config/db'));
const bcrypt = require('bcryptjs');
const { logActivity } = require('./activityLogController');
const { sendDoctorAuthorizedEmail } = require('../services/emailService');

const getUsers = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                user_id: true,
                full_name: true,
                email: true,
                role: true,
                phone: true,
                is_active: true,
                is_authorized: true,
                created_at: true,
            },
            orderBy: { created_at: 'desc' },
        });
        res.json(users);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const createUser = async (req, res) => {
    const { full_name, email, password, role, phone, is_active } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password || 'password123', 10);
        const user = await prisma.user.create({
            data: {
                full_name,
                email,
                password: hashedPassword,
                role,
                phone: phone || '',
                is_active: is_active !== undefined ? Boolean(is_active) : true,
            },
            select: { user_id: true, full_name: true, email: true, role: true, phone: true, is_active: true, is_authorized: true }
        });
        await logActivity({
            action: 'CREATE', entity: 'User', entity_id: user.user_id,
            description: `Created new user "${full_name}" with role ${role}`,
            user_id: req.user?.userId, user_name: req.user?.name, user_role: req.user?.role,
        });
        res.status(201).json(user);
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(409).json({ error: 'This email is already registered in the system. Please use a different one.' });
        }
        res.status(400).json({ error: error.message });
    }
};

const updateUser = async (req, res) => {
    const { id } = req.params;
    const { full_name, email, password, role, phone, is_active } = req.body;
    try {
        const userId = parseInt(id);
        const existing = await prisma.user.findUnique({ where: { user_id: userId } });
        if (!existing) return res.status(404).json({ error: 'User not found.' });

        // Protect last active Admin from being disabled or demoted
        if (existing.role === 'Admin') {
            const adminCount = await prisma.user.count({ where: { role: 'Admin', is_active: true } });
            const demoting = role && role !== 'Admin';
            const disabling = is_active === false || is_active === 'false';
            if (adminCount <= 1 && (demoting || disabling)) {
                return res.status(400).json({ error: 'Cannot disable or demote the last active Admin.' });
            }
        }

        const data = {};
        if (full_name !== undefined) data.full_name = full_name;
        if (email !== undefined) data.email = email;
        if (role !== undefined) data.role = role;
        if (phone !== undefined) data.phone = phone;
        if (is_active !== undefined) data.is_active = Boolean(is_active);
        if (password) data.password = await bcrypt.hash(password, 10);

        const user = await prisma.user.update({
            where: { user_id: userId },
            data,
            select: { user_id: true, full_name: true, email: true, role: true, phone: true, is_active: true, is_authorized: true }
        });
        await logActivity({
            action: 'UPDATE', entity: 'User', entity_id: userId,
            description: `Updated user "${user.full_name}" (Role: ${user.role}, Active: ${user.is_active})`,
            user_id: req.user?.userId, user_name: req.user?.name, user_role: req.user?.role,
        });
        res.json(user);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const deleteUser = async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.user.delete({ where: { user_id: parseInt(id) } });
        await logActivity({
            action: 'DELETE', entity: 'User', entity_id: parseInt(id),
            description: `Deleted user #${id}`,
            user_id: req.user?.userId, user_name: req.user?.name, user_role: req.user?.role,
        });
        res.status(204).send();
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const getProfile = async (req, res) => {
    try {
        const userId = req.user.userId;
        const user = await prisma.user.findUnique({
            where: { user_id: userId },
            select: { user_id: true, full_name: true, email: true, role: true, phone: true, profile_image: true, created_at: true }
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const updateProfile = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { full_name, email, phone } = req.body;

        if (email) {
            const existingUser = await prisma.user.findFirst({
                where: {
                    email,
                    NOT: { user_id: userId }
                }
            });
            if (existingUser) {
                return res.status(400).json({ error: 'Email already in use.' });
            }
        }

        const user = await prisma.user.update({
            where: { user_id: userId },
            data: { full_name, email, phone },
            select: { user_id: true, full_name: true, email: true, role: true, phone: true, profile_image: true }
        });

        await logActivity({
            action: 'UPDATE', entity: 'User', entity_id: userId,
            description: `Updated profile for "${full_name}"`,
            user_id: userId, user_name: full_name, user_role: user.role,
        });

        res.json(user);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const uploadProfileImage = async (req, res) => {
    try {
        const userId = req.user.userId;
        if (!req.file) {
            return res.status(400).json({ error: 'Please upload an image' });
        }

        const imagePath = `/uploads/profiles/${req.file.filename}`;

        const user = await prisma.user.update({
            where: { user_id: userId },
            data: { profile_image: imagePath },
            select: { user_id: true, full_name: true, email: true, role: true, phone: true, profile_image: true }
        });

        await logActivity({
            action: 'UPDATE', entity: 'User', entity_id: userId,
            description: `Updated profile picture for user #${userId}`,
            user_id: userId, user_name: user.full_name, user_role: user.role,
        });

        res.json(user);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

/**
 * Admin sets the single authorized Doctor (or revokes all).
 * Open jobs are moved to that Doctor; others can log in but see no work.
 */
const setDoctorAuthorization = async (req, res) => {
    try {
        if (req.user?.role !== 'Admin') {
            return res.status(403).json({ error: 'Only Admin can set doctor work authorization.' });
        }

        const { user_id, is_authorized } = req.body;
        const authorize = is_authorized === true || is_authorized === 'true';

        if (authorize) {
            if (user_id == null || user_id === '') {
                return res.status(400).json({ error: 'user_id is required to authorize a doctor.' });
            }
            const doctorId = parseInt(user_id);
            const doctor = await prisma.user.findUnique({ where: { user_id: doctorId } });
            if (!doctor || doctor.role !== 'Doctor') {
                return res.status(400).json({ error: 'Selected user must be a Doctor.' });
            }
            if (doctor.is_active === false) {
                return res.status(400).json({ error: 'Cannot authorize a disabled account.' });
            }

            await prisma.$transaction([
                prisma.user.updateMany({
                    where: { role: 'Doctor', is_authorized: true },
                    data: { is_authorized: false },
                }),
                prisma.user.update({
                    where: { user_id: doctorId },
                    data: { is_authorized: true },
                }),
                prisma.vaccinationSchedule.updateMany({
                    where: { status: { not: 'Completed' } },
                    data: { doctor_id: doctorId },
                }),
            ]);

            let email_notification = null;
            try {
                email_notification = await sendDoctorAuthorizedEmail(doctor.email, doctor.full_name);
            } catch (e) {
                console.warn('Authorization email failed:', e.message);
            }

            await logActivity({
                action: 'UPDATE',
                entity: 'User',
                entity_id: doctorId,
                description: `Authorized Doctor "${doctor.full_name}" for doctor work (others revoked)`,
                user_id: req.user?.userId,
                user_name: req.user?.name,
                user_role: req.user?.role,
            });

            const updated = await prisma.user.findUnique({
                where: { user_id: doctorId },
                select: {
                    user_id: true,
                    full_name: true,
                    email: true,
                    role: true,
                    phone: true,
                    is_active: true,
                    is_authorized: true,
                },
            });

            return res.json({
                message: `${doctor.full_name} is now authorized for doctor work. Open jobs were moved to them.`,
                user: updated,
                email_notification,
            });
        }

        // Revoke all doctor authorization
        await prisma.user.updateMany({
            where: { role: 'Doctor', is_authorized: true },
            data: { is_authorized: false },
        });

        await logActivity({
            action: 'UPDATE',
            entity: 'User',
            entity_id: 0,
            description: 'Revoked all Doctor work authorizations',
            user_id: req.user?.userId,
            user_name: req.user?.name,
            user_role: req.user?.role,
        });

        return res.json({
            message: 'All doctor work authorizations revoked. Doctors can log in but will not see jobs until authorized.',
            user: null,
        });
    } catch (error) {
        console.error('setDoctorAuthorization error:', error);
        res.status(400).json({ error: error.message });
    }
};

module.exports = {
    getUsers,
    createUser,
    updateUser,
    deleteUser,
    getProfile,
    updateProfile,
    uploadProfileImage,
    setDoctorAuthorization,
};
