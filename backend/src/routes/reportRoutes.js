const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const { getVaccinationReport } = require('../controllers/reportController');

const router = express.Router();

router.get('/vaccinations', authMiddleware, roleMiddleware(['Admin', 'Doctor']), getVaccinationReport);

module.exports = router;

