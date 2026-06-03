const express = require('express');
const { getStocks, createStock, updateStock, deleteStock } = require('../controllers/stockController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

router.get('/', authMiddleware, getStocks);
router.post('/', authMiddleware, roleMiddleware([]), createStock);
router.put('/:id', authMiddleware, roleMiddleware([]), updateStock);
router.delete('/:id', authMiddleware, roleMiddleware([]), deleteStock);

module.exports = router;