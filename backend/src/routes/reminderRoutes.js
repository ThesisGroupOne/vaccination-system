const express = require('express');
const router = express.Router();
const reminderController = require('../controllers/reminderController');
const authMiddleware = require('../middleware/authMiddleware');

// Protect reminders endpoint
router.get('/', authMiddleware, reminderController.getReminders);

module.exports = router;
