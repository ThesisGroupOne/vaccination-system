const express = require('express');
const { getAlerts, createAlert, updateAlertStatus } = require('../controllers/alertController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', authMiddleware, getAlerts);
router.post('/', authMiddleware, createAlert);
router.put('/:id', authMiddleware, updateAlertStatus);

module.exports = router;
