const express = require('express');
const router = express.Router();
const {
  getSchedules,
  createSchedule,
  deleteSchedule,
  updateScheduleStatus,
  assignSchedule,
} = require('../controllers/scheduleController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/', authMiddleware, getSchedules);
router.post('/', authMiddleware, createSchedule);
router.patch('/:id/status', authMiddleware, updateScheduleStatus);
router.patch('/:id/assign', authMiddleware, assignSchedule);
router.delete('/:id', authMiddleware, deleteSchedule);

module.exports = router;
