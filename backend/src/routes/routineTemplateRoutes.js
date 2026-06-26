const express = require('express');
const router = express.Router();
const {
  getTemplates,
  createTemplate,
  updateTemplate,
  toggleTemplateStatus,
  deleteTemplate,
} = require('../controllers/routineTemplateController');

router.get('/', getTemplates);
router.post('/', createTemplate);
router.put('/:id', updateTemplate);
router.patch('/:id/status', toggleTemplateStatus);
router.delete('/:id', deleteTemplate);

module.exports = router;
