const express = require('express');
const { getFarms, createFarm, updateFarm, deleteFarm } = require('../controllers/farmController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', authMiddleware, getFarms);
router.post('/', authMiddleware, createFarm);
router.put('/:id', authMiddleware, updateFarm);
router.delete('/:id', authMiddleware, deleteFarm);

module.exports = router;
