const express = require('express');
const { getAnimals, createAnimal, updateAnimal, deleteAnimal, generateAnimalIDCard } = require('../controllers/animalController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', authMiddleware, getAnimals);
router.post('/', authMiddleware, createAnimal);
router.put('/:id', authMiddleware, updateAnimal);
router.delete('/:id', authMiddleware, deleteAnimal);
router.get('/:id/id-card', authMiddleware, generateAnimalIDCard);

module.exports = router;