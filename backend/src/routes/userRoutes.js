const express = require('express');
const { getUsers, createUser, updateUser, deleteUser } = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

router.get('/', authMiddleware, getUsers);
router.post('/', authMiddleware, roleMiddleware([]), createUser);
router.put('/:id', authMiddleware, roleMiddleware([]), updateUser);
router.delete('/:id', authMiddleware, roleMiddleware([]), deleteUser);

module.exports = router;
