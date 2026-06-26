const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Create a new vaccine request
// Expected payload: { doctorName, vaccineType, quantity, notes }
const createVaccineRequest = async (req, res) => {
  const { doctorName, vaccineType, quantity, notes } = req.body;
  try {
    // Store the request in the new VaccineRequest table
    const request = await prisma.vaccineRequest.create({
      data: {
        doctorName,
        vaccineType,
        quantity,
        notes,
      },
    });
    res.status(201).json(request);
  } catch (error) {
    console.error('Error creating vaccine request:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
};

const getVaccineRequests = async (req, res) => {
  try {
    const requests = await prisma.vaccineRequest.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.status(200).json(requests);
  } catch (error) {
    console.error('Error fetching vaccine requests:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
};

module.exports = { createVaccineRequest, getVaccineRequests };
