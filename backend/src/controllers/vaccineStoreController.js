const path = require('path');
const prisma = require(path.join(__dirname, '../../config/db'));

const getStores = async (req, res) => {
  try {
    const stores = await prisma.vaccineStore.findMany({
      orderBy: { created_at: 'desc' },
    });
    res.json(stores);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getStoreById = async (req, res) => {
  try {
    const store = await prisma.vaccineStore.findUnique({
      where: { store_id: parseInt(req.params.id, 10) },
    });
    if (!store) return res.status(404).json({ error: 'Store not found.' });
    res.json(store);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const createStore = async (req, res) => {
  const { store_name, store_address } = req.body;
  if (!store_name?.trim() || !store_address?.trim()) {
    return res.status(400).json({ error: 'Store name and store address are required.' });
  }
  try {
    const store = await prisma.vaccineStore.create({
      data: {
        store_name: store_name.trim(),
        store_address: store_address.trim(),
      },
    });
    res.status(201).json(store);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const updateStore = async (req, res) => {
  const { store_name, store_address } = req.body;
  if (!store_name?.trim() || !store_address?.trim()) {
    return res.status(400).json({ error: 'Store name and store address are required.' });
  }
  try {
    const store = await prisma.vaccineStore.update({
      where: { store_id: parseInt(req.params.id, 10) },
      data: {
        store_name: store_name.trim(),
        store_address: store_address.trim(),
      },
    });
    res.json(store);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const deleteStore = async (req, res) => {
  try {
    await prisma.vaccineStore.delete({
      where: { store_id: parseInt(req.params.id, 10) },
    });
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = {
  getStores,
  getStoreById,
  createStore,
  updateStore,
  deleteStore,
};
