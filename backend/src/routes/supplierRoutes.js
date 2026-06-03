const express = require('express');
const { getSuppliers, createSupplier } = require('../controllers/supplierController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

router.get('/', authMiddleware, getSuppliers);
router.post('/', authMiddleware, roleMiddleware([]), createSupplier);

module.exports = router;
