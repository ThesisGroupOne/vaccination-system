const express = require('express');
const { getSuppliers, createSupplier } = require('../controllers/supplierController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', authMiddleware, getSuppliers);
router.post('/', authMiddleware, createSupplier);

module.exports = router;
