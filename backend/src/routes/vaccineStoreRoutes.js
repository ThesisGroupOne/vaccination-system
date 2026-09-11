const express = require('express');
const {
  getStores,
  getStoreById,
  createStore,
  updateStore,
  deleteStore,
} = require('../controllers/vaccineStoreController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

router.get('/', authMiddleware, getStores);
router.get('/:id', authMiddleware, getStoreById);
router.post('/', authMiddleware, roleMiddleware(['Admin']), createStore);
router.put('/:id', authMiddleware, roleMiddleware(['Admin']), updateStore);
router.delete('/:id', authMiddleware, roleMiddleware(['Admin']), deleteStore);

module.exports = router;
