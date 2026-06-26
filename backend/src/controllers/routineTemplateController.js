const path = require('path');
const prisma = require(path.join(__dirname, '../../config/db'));

// GET /api/routine-templates – dhammaan templates
const getTemplates = async (req, res) => {
  try {
    const templates = await prisma.routineVaccinationTemplate.findMany({
      include: { vaccine: true, campaigns: { orderBy: { created_at: 'desc' }, take: 1 } },
      orderBy: { created_at: 'desc' },
    });
    res.json(templates);
  } catch (error) {
    console.error('getTemplates error:', error);
    res.status(500).json({ error: error.message });
  }
};

// POST /api/routine-templates – abuur template cusub (Admin)
const createTemplate = async (req, res) => {
  const { campaign_name, animal_type, vaccine_id, frequency_months, reminder_days_before, start_date } = req.body;
  try {
    if (!campaign_name || !animal_type || !vaccine_id || !frequency_months || !start_date) {
      return res.status(400).json({ error: 'Dhammaan fields-ka loo baahan yahay waa in la buuxiyaa.' });
    }
    const template = await prisma.routineVaccinationTemplate.create({
      data: {
        campaign_name,
        animal_type,
        vaccine_id: parseInt(vaccine_id),
        frequency_months: parseInt(frequency_months),
        reminder_days_before: reminder_days_before ? parseInt(reminder_days_before) : 30,
        start_date: new Date(start_date),
        status: 'Active',
      },
      include: { vaccine: true },
    });
    res.status(201).json(template);
  } catch (error) {
    console.error('createTemplate error:', error);
    res.status(500).json({ error: error.message });
  }
};

// PUT /api/routine-templates/:id – edit template
const updateTemplate = async (req, res) => {
  const { id } = req.params;
  const { campaign_name, animal_type, vaccine_id, frequency_months, reminder_days_before, start_date } = req.body;
  try {
    const template = await prisma.routineVaccinationTemplate.update({
      where: { id: parseInt(id) },
      data: {
        campaign_name,
        animal_type,
        vaccine_id: vaccine_id ? parseInt(vaccine_id) : undefined,
        frequency_months: frequency_months ? parseInt(frequency_months) : undefined,
        reminder_days_before: reminder_days_before ? parseInt(reminder_days_before) : undefined,
        start_date: start_date ? new Date(start_date) : undefined,
      },
      include: { vaccine: true },
    });
    res.json(template);
  } catch (error) {
    console.error('updateTemplate error:', error);
    res.status(500).json({ error: error.message });
  }
};

// PATCH /api/routine-templates/:id/status – activate/deactivate
const toggleTemplateStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // "Active" | "Inactive"
  try {
    const template = await prisma.routineVaccinationTemplate.update({
      where: { id: parseInt(id) },
      data: { status },
    });
    res.json(template);
  } catch (error) {
    console.error('toggleTemplateStatus error:', error);
    res.status(500).json({ error: error.message });
  }
};

// DELETE /api/routine-templates/:id
const deleteTemplate = async (req, res) => {
  const templateId = parseInt(req.params.id);
  try {
    // Cascade: tirtir records + campaigns ee template-ka ka horeeya template-ka laftiisa
    await prisma.$transaction(async (tx) => {
      const campaigns = await tx.routineVaccinationCampaign.findMany({
        where: { template_id: templateId },
        select: { id: true },
      });
      const campaignIds = campaigns.map((c) => c.id);
      if (campaignIds.length) {
        await tx.routineVaccinationRecord.deleteMany({ where: { campaign_id: { in: campaignIds } } });
        await tx.routineVaccinationCampaign.deleteMany({ where: { id: { in: campaignIds } } });
      }
      await tx.routineVaccinationTemplate.delete({ where: { id: templateId } });
    });
    res.json({ message: 'Template deleted successfully.' });
  } catch (error) {
    console.error('deleteTemplate error:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getTemplates, createTemplate, updateTemplate, toggleTemplateStatus, deleteTemplate };
