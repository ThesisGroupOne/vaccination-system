const express = require('express');
const { getAlerts, createAlert, updateAlertStatus } = require('../controllers/alertController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

router.get('/', authMiddleware, getAlerts);
router.post('/', authMiddleware, roleMiddleware(['Doctor', 'Farm Worker']), createAlert);
router.put('/:id', authMiddleware, roleMiddleware(['Doctor', 'Farm Worker']), updateAlertStatus);

module.exports = router;
