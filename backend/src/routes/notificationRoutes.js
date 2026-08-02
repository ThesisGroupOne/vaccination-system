const express = require('express');
const router = express.Router();
const { getNotifications } = require('../controllers/notificationController');

// Add authMiddleware if needed, but assuming simple fetch for now based on other routes
// You could also add `const authMiddleware = require('../middleware/authMiddleware');`
// router.get('/', authMiddleware, getNotifications);

router.get('/', getNotifications);

module.exports = router;
