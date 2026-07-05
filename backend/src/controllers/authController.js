const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const nodemailer = require('nodemailer');
const prisma = require(path.join(__dirname, '../../config/db'));

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

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
    const token = jwt.sign({ userId: user.user_id, role: user.role, name: user.full_name }, process.env.JWT_SECRET);

    // Log login activity
    const { logActivity } = require('./activityLogController');
    await logActivity({
      action: 'LOGIN', entity: 'User', entity_id: user.user_id,
      description: `${user.full_name} (${user.role}) logged in`,
      user_id: user.user_id, user_name: user.full_name, user_role: user.role,
    });

    res.json({ token, role: user.role, name: user.full_name, user_id: user.user_id, profile_image: user.profile_image });
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

    const mailOptions = {
      from: `"Mumin Group" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Your Password Reset OTP',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #2563eb;">Mumin Group Livestock System</h2>
          <p>Hello,</p>
          <p>You have requested to reset your password. Please use the following 6-digit OTP code to complete the process:</p>
          <div style="font-size: 24px; font-weight: bold; margin: 20px 0; padding: 15px; background: #f1f5f9; display: inline-block; letter-spacing: 5px; border-radius: 8px;">
            ${otp}
          </div>
          <p>This code will expire in 15 minutes.</p>
          <p>If you did not request a password reset, please ignore this email.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    res.json({ message: 'OTP sent to your email successfully.' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;
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

    res.json({ message: 'OTP verified successfully' });
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

module.exports = { register, login, forgotPassword, verifyOtp, resetPassword };