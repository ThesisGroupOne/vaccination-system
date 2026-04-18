const express = require('express');
const { getVaccinations, createVaccination } = require('../controllers/vaccinationController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', authMiddleware, getVaccinations);
router.post('/', authMiddleware, createVaccination);

module.exports = router;