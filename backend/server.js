const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 9999;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
const authRoutes = require('./src/routes/authRoutes');
const animalRoutes = require('./src/routes/animalRoutes');
const vaccinationRoutes = require('./src/routes/vaccinationRoutes');
const stockRoutes = require('./src/routes/stockRoutes');
const userRoutes = require('./src/routes/userRoutes');
const supplierRoutes = require('./src/routes/supplierRoutes');
const vaccineRoutes = require('./src/routes/vaccineRoutes');
const alertRoutes = require('./src/routes/alertRoutes');
const farmRoutes = require('./src/routes/farmRoutes');
const dashboardRoutes = require('./src/routes/dashboardRoutes');
const scheduleRoutes = require('./src/routes/scheduleRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/animals', animalRoutes);
app.use('/api/vaccinations', vaccinationRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/users', userRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/vaccines', vaccineRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/farms', farmRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/schedules', scheduleRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});