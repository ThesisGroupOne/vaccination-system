const express = require('express');
const { getFarms, createFarm, updateFarm, deleteFarm } = require('../controllers/farmController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

router.get('/', authMiddleware, getFarms);
router.post('/', authMiddleware, roleMiddleware([]), createFarm);
router.put('/:id', authMiddleware, roleMiddleware([]), updateFarm);
router.delete('/:id', authMiddleware, roleMiddleware([]), deleteFarm);

module.exports = router;
