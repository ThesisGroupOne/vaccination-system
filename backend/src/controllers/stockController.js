const path = require('path');
const prisma = require(path.join(__dirname, '../../config/db'));

const getStocks = async (req, res) => {
  try {
    const stocks = await prisma.vaccineStock.findMany({
      include: { vaccine: true, supplier: true },
    });
    res.json(stocks);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const createStock = async (req, res) => {
  const { vaccine_id, supplier_id, batch_number, quantity_purchased, purchase_price, purchase_date, expiry_date } = req.body;
  try {
    const stock = await prisma.vaccineStock.create({
      data: {
        vaccine_id,
        supplier_id,
        batch_number,
        quantity_purchased,
        quantity_remaining: quantity_purchased,
        purchase_price,
        purchase_date: new Date(purchase_date),
        expiry_date: new Date(expiry_date),
      },
    });
    res.status(201).json(stock);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = { getStocks, createStock };