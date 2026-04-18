const path = require('path');
const prisma = require(path.join(__dirname, '../../config/db'));

const getSuppliers = async (req, res) => {
    try {
        const suppliers = await prisma.supplier.findMany();
        res.json(suppliers);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const createSupplier = async (req, res) => {
    const { supplier_name, phone, address } = req.body;
    try {
        const supplier = await prisma.supplier.create({
            data: {
                supplier_name,
                phone,
                address,
            },
        });
        res.status(201).json(supplier);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

module.exports = { getSuppliers, createSupplier };
