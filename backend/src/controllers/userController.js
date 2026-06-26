const path = require('path');
const prisma = require(path.join(__dirname, '../../config/db'));
const bcrypt = require('bcryptjs');
const { logActivity } = require('./activityLogController');

const getUsers = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: { user_id: true, full_name: true, email: true, role: true, phone: true, created_at: true }
        });
        res.json(users);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const createUser = async (req, res) => {
    const { full_name, email, password, role, phone } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password || 'password123', 10);
        const user = await prisma.user.create({
            data: {
                full_name,
                email,
                password: hashedPassword,
                role,
                phone: phone || '',
            },
            select: { user_id: true, full_name: true, email: true, role: true, phone: true }
        });
        await logActivity({
            action: 'CREATE', entity: 'User', entity_id: user.user_id,
            description: `Created new user "${full_name}" with role ${role}`,
            user_id: req.user?.userId, user_name: req.user?.name, user_role: req.user?.role,
        });
        res.status(201).json(user);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const updateUser = async (req, res) => {
    const { id } = req.params;
    const { full_name, email, password, role, phone } = req.body;
    try {
        const data = { full_name, email, role, phone };
        if (password) {
            data.password = await bcrypt.hash(password, 10);
        }
        const user = await prisma.user.update({
            where: { user_id: parseInt(id) },
            data,
            select: { user_id: true, full_name: true, email: true, role: true, phone: true }
        });
        await logActivity({
            action: 'UPDATE', entity: 'User', entity_id: parseInt(id),
            description: `Updated user "${full_name}" (Role: ${role})`,
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

module.exports = { getUsers, createUser, updateUser, deleteUser };
