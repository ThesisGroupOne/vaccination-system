const express = require('express');
const router = express.Router();
const {
  getCampaigns,
  getCampaignById,
  scheduleCampaign,
  startCampaign,
  completeCampaign,
  triggerCheck,
} = require('../controllers/routineCampaignController');

router.get('/', getCampaigns);
router.get('/:id', getCampaignById);
router.patch('/:id/schedule', scheduleCampaign);
router.patch('/:id/start', startCampaign);
router.post('/:id/complete', completeCampaign);
router.post('/trigger-check', triggerCheck); // manual / test trigger

module.exports = router;
