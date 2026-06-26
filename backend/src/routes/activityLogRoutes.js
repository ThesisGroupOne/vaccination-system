const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { getActivityLogs, getActivityStats } = require('../controllers/activityLogController');

router.get('/', authMiddleware, getActivityLogs);
router.get('/stats', authMiddleware, getActivityStats);

module.exports = router;
