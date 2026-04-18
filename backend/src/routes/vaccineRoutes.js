const express = require('express');
const { getVaccines, createVaccine } = require('../controllers/vaccineController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', authMiddleware, getVaccines);
router.post('/', authMiddleware, createVaccine);

module.exports = router;
