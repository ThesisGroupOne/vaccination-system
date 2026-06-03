const express = require('express');
const { getVaccinations, createVaccination } = require('../controllers/vaccinationController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

router.get('/', authMiddleware, getVaccinations);
router.post('/', authMiddleware, roleMiddleware(['Doctor']), createVaccination);

module.exports = router;