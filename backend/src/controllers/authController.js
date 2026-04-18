const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const prisma = require(path.join(__dirname, '../../config/db'));

const register = async (req, res) => {
  const { full_name, phone, email, password, role } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { full_name, phone, email, password: hashedPassword, role },
    });
    res.status(201).json(user);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Email already exists. Please use a different email.' });
    }
    res.status(400).json({ error: error.message });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ userId: user.user_id, role: user.role }, process.env.JWT_SECRET);
    res.json({ token, role: user.role, name: user.full_name });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = { register, login };