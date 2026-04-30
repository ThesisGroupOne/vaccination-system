const path = require('path');
const prisma = require(path.join(__dirname, '../../config/db'));

const getSchedules = async (req, res) => {
  try {
    const schedules = await prisma.vaccinationSchedule.findMany({
      include: { animal: true, farm: true, vaccine: true },
    });
    res.json(schedules);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const createSchedule = async (req, res) => {
  const { vaccine_id, farm_id, animal_id, schedule_type, scheduled_date } = req.body;
  try {
    const schedule = await prisma.vaccinationSchedule.create({
      data: {
        vaccine_id: parseInt(vaccine_id),
        farm_id: farm_id ? parseInt(farm_id) : null,
        animal_id: animal_id ? parseInt(animal_id) : null,
        schedule_type,
        scheduled_date: new Date(scheduled_date),
      },
    });
    res.status(201).json(schedule);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const deleteSchedule = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.vaccinationSchedule.delete({ where: { schedule_id: parseInt(id) } });
    res.json({ message: 'Schedule deleted' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const updateScheduleStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const updatedSchedule = await prisma.vaccinationSchedule.update({
      where: { schedule_id: parseInt(id) },
      data: { status },
    });
    res.json(updatedSchedule);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = { getSchedules, createSchedule, deleteSchedule, updateScheduleStatus };
