const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const prisma = require(path.join(__dirname, '../../config/db'));

// In-memory store for OTPs: { email: { otp: string, expires: number } }
const otpStore = new Map();

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

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'If the email exists, an OTP has been sent.' }); // Don't leak user existence usually, but returning 404 is okay here for user feedback.
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store OTP with 15 mins expiration
    otpStore.set(email, {
      otp,
      expires: Date.now() + 15 * 60 * 1000
    });

    // In a real app, send email here. For now, print to console.
    console.log(`\n=========================================\n`);
    console.log(`🔐 PASSWORD RESET OTP FOR: ${email}`);
    console.log(`🔢 OTP CODE: ${otp}`);
    console.log(`=========================================\n`);

    res.json({ message: 'OTP sent successfully (Check terminal)' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;
  try {
    const record = otpStore.get(email);
    if (!record) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    if (Date.now() > record.expires) {
      otpStore.delete(email);
      return res.status(400).json({ error: 'OTP has expired' });
    }

    if (record.otp !== otp) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    // Hash new password and update
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword }
    });

    // Clear OTP
    otpStore.delete(email);

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = { register, login, forgotPassword, resetPassword };