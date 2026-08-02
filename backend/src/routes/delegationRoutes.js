const express = require('express');
const router = express.Router();
const {
  createDelegation,
  getReceivedDelegations,
  getSentDelegations,
  getAllDelegations,
  respondDelegation,
  cancelDelegation,
  assignDelegation,
} = require('../controllers/delegationController');

const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.post('/', createDelegation);
router.get('/received', getReceivedDelegations);
router.get('/sent', getSentDelegations);
router.get('/all', getAllDelegations);
router.patch('/:id/respond', respondDelegation);
router.patch('/:id/assign', assignDelegation);
router.delete('/:id', cancelDelegation);

module.exports = router;
