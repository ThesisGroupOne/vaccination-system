const express = require('express');
const {
  getVaccinations,
  createVaccination,
  getAnimalVaccinationSummary,
  getAnimalVaccinationHistory,
} = require('../controllers/vaccinationController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

router.get('/', authMiddleware, getVaccinations);
router.get('/animals-summary', authMiddleware, getAnimalVaccinationSummary);
router.get('/animals/:animalId/history', authMiddleware, getAnimalVaccinationHistory);
router.post('/', authMiddleware, roleMiddleware(['Doctor']), createVaccination);

module.exports = router;