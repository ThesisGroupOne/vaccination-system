const express = require('express');
const { createVaccineRequest, getVaccineRequests } = require('../controllers/requestVaccineController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

router.get('/', getVaccineRequests);

// POST endpoint for doctors (auth disabled for now)
router.post('/', /* authMiddleware, roleMiddleware(['doctor']), */ createVaccineRequest);

module.exports = router;
