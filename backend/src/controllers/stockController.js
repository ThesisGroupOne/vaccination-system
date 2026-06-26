const path = require('path');
const prisma = require(path.join(__dirname, '../../config/db'));
const { logActivity } = require('./activityLogController');

const getStocks = async (req, res) => {
  try {
    const stocks = await prisma.vaccineStock.findMany({
      include: { vaccine: true },
    });
    res.json(stocks);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const createStock = async (req, res) => {
  const { vaccine_id, supplier_name, batch_number, quantity_purchased, purchase_price, purchase_date, expiry_date } = req.body;
  try {
    const stock = await prisma.vaccineStock.create({
      data: {
        vaccine_id,
        supplier_name,
        batch_number,
        quantity_purchased,
        quantity_remaining: quantity_purchased,
        purchase_price,
        purchase_date: new Date(purchase_date),
        expiry_date: new Date(expiry_date),
      },
    });
    await logActivity({
      action: 'CREATE', entity: 'Stock', entity_id: stock.stock_id,
      description: `Added stock: ${quantity_purchased} doses (Batch: ${batch_number || 'N/A'})`,
      user_id: req.user?.userId, user_name: req.user?.name, user_role: req.user?.role,
    });
    res.status(201).json(stock);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const updateStock = async (req, res) => {
  const { id } = req.params;
  const { vaccine_id, supplier_name, batch_number, quantity_purchased, purchase_price, purchase_date, expiry_date } = req.body;
  try {
    const stock = await prisma.vaccineStock.update({
      where: { stock_id: parseInt(id) },
      data: {
        vaccine_id,
        supplier_name,
        batch_number,
        quantity_purchased,
        purchase_price,
        purchase_date: new Date(purchase_date),
        expiry_date: new Date(expiry_date),
      },
    });
    await logActivity({
      action: 'UPDATE', entity: 'Stock', entity_id: parseInt(id),
      description: `Updated stock #${id} (Batch: ${batch_number || 'N/A'})`,
      user_id: req.user?.userId, user_name: req.user?.name, user_role: req.user?.role,
    });
    res.json(stock);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const deleteStock = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.vaccineStock.delete({ where: { stock_id: parseInt(id) } });
    await logActivity({
      action: 'DELETE', entity: 'Stock', entity_id: parseInt(id),
      description: `Deleted stock #${id}`,
      user_id: req.user?.userId, user_name: req.user?.name, user_role: req.user?.role,
    });
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = { getStocks, createStock, updateStock, deleteStock };