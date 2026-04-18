const path = require('path');
const prisma = require(path.join(__dirname, '../../config/db'));
const bcrypt = require('bcryptjs');

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
        res.status(201).json(user);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

module.exports = { getUsers, createUser };
