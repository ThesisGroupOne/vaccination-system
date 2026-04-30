const express = require('express');
const router = express.Router();
const { getSchedules, createSchedule, deleteSchedule, updateScheduleStatus } = require('../controllers/scheduleController');

router.get('/', getSchedules);
router.post('/', createSchedule);
router.patch('/:id/status', updateScheduleStatus);
router.delete('/:id', deleteSchedule);

module.exports = router;
