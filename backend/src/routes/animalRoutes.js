const express = require('express');
const { getAnimals, createAnimal, updateAnimal, deleteAnimal, generateAnimalIDCard, updateAnimalStatus } = require('../controllers/animalController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

router.get('/', authMiddleware, getAnimals);
router.post('/', authMiddleware, roleMiddleware(['Doctor']), createAnimal);
router.put('/:id', authMiddleware, roleMiddleware(['Doctor']), updateAnimal);
router.delete('/:id', authMiddleware, roleMiddleware(['Doctor']), deleteAnimal);
router.patch('/:id/status', authMiddleware, roleMiddleware(['Doctor']), updateAnimalStatus);
router.get('/:id/id-card', authMiddleware, generateAnimalIDCard);

module.exports = router;