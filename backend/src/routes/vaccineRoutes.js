const express = require('express');
const { getVaccines, createVaccine, updateVaccine, deleteVaccine } = require('../controllers/vaccineController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

router.get('/', authMiddleware, getVaccines);
router.post('/', authMiddleware, roleMiddleware([]), createVaccine);
router.put('/:id', authMiddleware, roleMiddleware([]), updateVaccine);
router.delete('/:id', authMiddleware, roleMiddleware([]), deleteVaccine);

module.exports = router;
