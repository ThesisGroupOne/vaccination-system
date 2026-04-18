const express = require('express');
const { getStocks, createStock } = require('../controllers/stockController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', authMiddleware, getStocks);
router.post('/', authMiddleware, createStock);

module.exports = router;