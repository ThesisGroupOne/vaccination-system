const path = require('path');
const prisma = require(path.join(__dirname, '../../config/db'));
const { logActivity } = require('./activityLogController');

const getStocks = async (req, res) => {
  try {
    const stocks = await prisma.vaccineStock.findMany({
      where: { is_archived: false },
      include: { vaccine: true },
      orderBy: { created_at: 'desc' },
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
    const stockId = parseInt(id);
    const stock = await prisma.vaccineStock.findUnique({ where: { stock_id: stockId } });
    if (!stock) {
      return res.status(404).json({ error: 'Stock not found.' });
    }

    const [vaccCount, routineCount] = await Promise.all([
      prisma.vaccination.count({ where: { stock_id: stockId } }),
      prisma.routineVaccinationRecord.count({ where: { stock_id: stockId } }),
    ]);

    // Used in history → archive (hide from inventory) so vaccination history stays valid
    if (vaccCount > 0 || routineCount > 0) {
      await prisma.vaccineStock.update({
        where: { stock_id: stockId },
        data: { is_archived: true },
      });
      await logActivity({
        action: 'DELETE',
        entity: 'Stock',
        entity_id: stockId,
        description: `Archived stock #${stockId} (used in ${vaccCount + routineCount} vaccination record(s))`,
        user_id: req.user?.userId,
        user_name: req.user?.name,
        user_role: req.user?.role,
      });
      return res.json({
        archived: true,
        message: 'Stock removed from inventory. Vaccination history was kept.',
      });
    }

    await prisma.vaccineStock.delete({ where: { stock_id: stockId } });
    await logActivity({
      action: 'DELETE',
      entity: 'Stock',
      entity_id: stockId,
      description: `Deleted stock #${stockId}`,
      user_id: req.user?.userId,
      user_name: req.user?.name,
      user_role: req.user?.role,
    });
    res.json({ archived: false, message: 'Stock deleted successfully.' });
  } catch (error) {
    console.error('deleteStock error:', error);
    res.status(400).json({ error: error.message });
  }
};

module.exports = { getStocks, createStock, updateStock, deleteStock };