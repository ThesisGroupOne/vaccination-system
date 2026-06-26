const path = require('path');
const PDFDocument = require('pdfkit');
const prisma = require(path.join(__dirname, '../../config/db'));

function parseDateRange(from, to, fieldName) {
  const where = {};
  if (from || to) {
    where[fieldName] = {};
    if (from) where[fieldName].gte = new Date(from);
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      where[fieldName].lte = end;
    }
  }
  return where;
}

function toDisplayValue(v) {
  if (v === null || v === undefined) return '-';
  if (v instanceof Date) return v.toLocaleDateString();
  return String(v);
}

async function buildVaccinationReport({ reportType, singleId, from, to }) {
  const commonDateFilter = parseDateRange(from, to, 'date_administered');
  const animalFilter = reportType === 'single' && singleId ? { animal_id: singleId } : {};

  const [standardRows, routineRows] = await Promise.all([
    prisma.vaccination.findMany({
      where: { ...animalFilter, ...commonDateFilter },
      include: {
        animal: { include: { farm: { select: { farm_name: true } } } },
        vaccine: { select: { vaccine_name: true } },
        user: { select: { full_name: true } },
      },
      orderBy: { date_administered: 'desc' },
    }),
    prisma.routineVaccinationRecord.findMany({
      where: { ...animalFilter, ...commonDateFilter },
      include: {
        animal: { include: { farm: { select: { farm_name: true } } } },
        vaccine: { select: { vaccine_name: true } },
        administered_user: { select: { full_name: true } },
      },
      orderBy: { date_administered: 'desc' },
    }),
  ]);

  const rows = [
    ...standardRows.map((r) => ({
      source: 'Emergency/Standard',
      record_id: r.vaccination_id,
      animal_id: r.animal_id,
      nickname: r.animal?.nickname || '-',
      animal_type: r.animal?.animal_type || '-',
      farm_name: r.animal?.farm?.farm_name || '-',
      vaccine: r.vaccine?.vaccine_name || '-',
      dosage_ml: r.dosage_ml ?? '-',
      date_given: r.date_administered,
      next_due: r.next_due_date,
      by_user: r.user?.full_name || '-',
    })),
    ...routineRows.map((r) => ({
      source: 'Routine',
      record_id: r.id,
      animal_id: r.animal_id,
      nickname: r.animal?.nickname || '-',
      animal_type: r.animal?.animal_type || '-',
      farm_name: r.animal?.farm?.farm_name || '-',
      vaccine: r.vaccine?.vaccine_name || '-',
      dosage_ml: r.dosage_ml ?? '-',
      date_given: r.date_administered,
      next_due: r.next_due_date,
      by_user: r.administered_user?.full_name || '-',
    })),
  ].sort((a, b) => new Date(b.date_given) - new Date(a.date_given));

  const columns = [
    { key: 'source', label: 'Source' },
    { key: 'animal_id', label: 'Animal ID' },
    { key: 'nickname', label: 'Nickname' },
    { key: 'animal_type', label: 'Animal Type' },
    { key: 'farm_name', label: 'Farm' },
    { key: 'vaccine', label: 'Vaccine' },
    { key: 'dosage_ml', label: 'Dose (ml)' },
    { key: 'date_given', label: 'Given On' },
    { key: 'next_due', label: 'Next Due' },
    { key: 'by_user', label: 'By' },
  ];

  return { columns, rows };
}

async function buildRoutineCampaignReport({ reportType, singleId, from, to }) {
  const commonDateFilter = parseDateRange(from, to, 'due_date');
  const idFilter = reportType === 'single' && singleId ? { id: singleId } : {};

  const campaigns = await prisma.routineVaccinationCampaign.findMany({
    where: { ...idFilter, ...commonDateFilter },
    include: {
      vaccine: { select: { vaccine_name: true } },
      template: { select: { frequency_months: true } },
      doctor: { select: { full_name: true } },
      _count: { select: { records: true } },
    },
    orderBy: { due_date: 'desc' },
  });

  const rows = campaigns.map((c) => ({
    campaign_id: c.id,
    campaign_name: c.campaign_name,
    animal_type: c.animal_type,
    vaccine: c.vaccine?.vaccine_name || '-',
    frequency_months: c.template?.frequency_months ?? '-',
    due_date: c.due_date,
    scheduled_date: c.scheduled_date,
    completed_date: c.completed_date,
    animals_due: c.animals_due,
    animals_vaccinated: c._count.records,
    status: c.status,
    doctor: c.doctor?.full_name || '-',
  }));

  const columns = [
    { key: 'campaign_id', label: 'Campaign ID' },
    { key: 'campaign_name', label: 'Campaign Name' },
    { key: 'animal_type', label: 'Animal Type' },
    { key: 'vaccine', label: 'Vaccine' },
    { key: 'frequency_months', label: 'Frequency (Months)' },
    { key: 'due_date', label: 'Due Date' },
    { key: 'scheduled_date', label: 'Scheduled Date' },
    { key: 'completed_date', label: 'Completed Date' },
    { key: 'animals_due', label: 'Animals Due' },
    { key: 'animals_vaccinated', label: 'Animals Vaccinated' },
    { key: 'status', label: 'Status' },
    { key: 'doctor', label: 'Doctor' },
  ];

  return { columns, rows };
}

async function buildEmergencyAlertReport({ reportType, singleId, from, to }) {
  const commonDateFilter = parseDateRange(from, to, 'created_at');
  const idFilter = reportType === 'single' && singleId ? { alert_id: singleId } : {};

  const alerts = await prisma.alert.findMany({
    where: { ...idFilter, ...commonDateFilter },
    include: {
      animal: { select: { animal_id: true, nickname: true, animal_type: true } },
      farm: { select: { farm_name: true } },
      user: { select: { full_name: true } },
    },
    orderBy: { created_at: 'desc' },
  });

  const rows = alerts.map((a) => ({
    alert_id: a.alert_id,
    animal_id: a.animal?.animal_id ?? '-',
    nickname: a.animal?.nickname || '-',
    animal_type: a.animal?.animal_type || '-',
    farm: a.farm?.farm_name || '-',
    symptoms: a.symptoms,
    status: a.status,
    reported_by: a.user?.full_name || '-',
    reported_at: a.created_at,
  }));

  const columns = [
    { key: 'alert_id', label: 'Alert ID' },
    { key: 'animal_id', label: 'Animal ID' },
    { key: 'nickname', label: 'Nickname' },
    { key: 'animal_type', label: 'Animal Type' },
    { key: 'farm', label: 'Farm' },
    { key: 'symptoms', label: 'Symptoms' },
    { key: 'status', label: 'Status' },
    { key: 'reported_by', label: 'Reported By' },
    { key: 'reported_at', label: 'Reported At' },
  ];

  return { columns, rows };
}

async function buildStockReport({ reportType, singleId, from, to }) {
  const commonDateFilter = parseDateRange(from, to, 'purchase_date');
  const idFilter = reportType === 'single' && singleId ? { stock_id: singleId } : {};

  const stocks = await prisma.vaccineStock.findMany({
    where: { ...idFilter, ...commonDateFilter },
    include: { vaccine: { select: { vaccine_name: true } } },
    orderBy: { purchase_date: 'desc' },
  });

  const rows = stocks.map((s) => ({
    stock_id: s.stock_id,
    vaccine: s.vaccine?.vaccine_name || '-',
    batch_number: s.batch_number || '-',
    supplier: s.supplier_name || '-',
    purchased: s.quantity_purchased,
    remaining: s.quantity_remaining,
    purchase_price: s.purchase_price,
    purchase_date: s.purchase_date,
    expiry_date: s.expiry_date,
    status: new Date(s.expiry_date) < new Date()
      ? 'Expired'
      : s.quantity_remaining <= 0
        ? 'Out of Stock'
        : s.quantity_remaining <= 5
          ? 'Low Stock'
          : 'Available',
  }));

  const columns = [
    { key: 'stock_id', label: 'Stock ID' },
    { key: 'vaccine', label: 'Vaccine' },
    { key: 'batch_number', label: 'Batch' },
    { key: 'supplier', label: 'Supplier' },
    { key: 'purchased', label: 'Purchased Qty' },
    { key: 'remaining', label: 'Remaining Qty' },
    { key: 'purchase_price', label: 'Price' },
    { key: 'purchase_date', label: 'Purchase Date' },
    { key: 'expiry_date', label: 'Expiry Date' },
    { key: 'status', label: 'Status' },
  ];

  return { columns, rows };
}

async function buildFarmReport({ reportType, singleId, from, to }) {
  const commonDateFilter = parseDateRange(from, to, 'created_at');
  const idFilter = reportType === 'single' && singleId ? { farm_id: singleId } : {};

  const farms = await prisma.farm.findMany({
    where: { ...idFilter, ...commonDateFilter },
    include: {
      _count: { select: { animals: true, alerts: true, schedules: true } },
    },
    orderBy: { created_at: 'desc' },
  });

  const rows = farms.map((f) => ({
    farm_id: f.farm_id,
    farm_name: f.farm_name,
    location: f.location,
    animals_count: f._count.animals,
    alerts_count: f._count.alerts,
    schedules_count: f._count.schedules,
    created_at: f.created_at,
  }));

  const columns = [
    { key: 'farm_id', label: 'Farm ID' },
    { key: 'farm_name', label: 'Farm Name' },
    { key: 'location', label: 'Location' },
    { key: 'animals_count', label: 'Animals' },
    { key: 'alerts_count', label: 'Alerts' },
    { key: 'schedules_count', label: 'Schedules' },
    { key: 'created_at', label: 'Created At' },
  ];

  return { columns, rows };
}

async function buildAnimalReport({ reportType, singleId, from, to }) {
  const commonDateFilter = parseDateRange(from, to, 'created_at');
  const idFilter = reportType === 'single' && singleId ? { animal_id: singleId } : {};

  const animals = await prisma.animal.findMany({
    where: { ...idFilter, ...commonDateFilter },
    include: {
      farm: { select: { farm_name: true } },
      _count: { select: { vaccinations: true, routineRecords: true, alerts: true, schedules: true } },
    },
    orderBy: { created_at: 'desc' },
  });

  const rows = animals.map((a) => ({
    animal_id: a.animal_id,
    nickname: a.nickname || '-',
    animal_type: a.animal_type,
    biological_type: a.biological_type,
    age: a.age,
    status: a.status,
    farm: a.farm?.farm_name || '-',
    routine_doses: a._count.routineRecords,
    total_doses: a._count.vaccinations + a._count.routineRecords,
    alerts_count: a._count.alerts,
    schedules_count: a._count.schedules,
    created_at: a.created_at,
  }));

  const columns = [
    { key: 'animal_id', label: 'Animal ID' },
    { key: 'nickname', label: 'Nickname' },
    { key: 'animal_type', label: 'Animal Type' },
    { key: 'biological_type', label: 'Biological Type' },
    { key: 'age', label: 'Age' },
    { key: 'status', label: 'Status' },
    { key: 'farm', label: 'Farm' },
    { key: 'routine_doses', label: 'Routine Doses' },
    { key: 'total_doses', label: 'Total Doses' },
    { key: 'alerts_count', label: 'Alerts' },
    { key: 'schedules_count', label: 'Schedules' },
    { key: 'created_at', label: 'Created At' },
  ];

  return { columns, rows };
}

const getVaccinationReport = async (req, res) => {
  try {
    const moduleName = req.query.module || 'vaccinations'; // vaccinations | routine_campaigns | emergency_alerts | stock | farms
    const reportType = req.query.type || 'all'; // all | single | between
    const format = req.query.format || 'json'; // json | pdf
    const singleId = req.query.single_id ? parseInt(req.query.single_id) : null;
    const from = req.query.from || null;
    const to = req.query.to || null;

    if (!['vaccinations', 'routine_campaigns', 'emergency_alerts', 'stock', 'farms', 'animals'].includes(moduleName)) {
      return res.status(400).json({ error: 'Invalid report module.' });
    }
    if (!['all', 'single', 'between'].includes(reportType)) {
      return res.status(400).json({ error: 'Invalid report type.' });
    }
    if (reportType === 'single' && !singleId) {
      return res.status(400).json({ error: 'single_id is required for single report.' });
    }
    if (reportType === 'between' && (!from || !to)) {
      return res.status(400).json({ error: 'from and to are required for between report.' });
    }

    const builders = {
      vaccinations: buildVaccinationReport,
      routine_campaigns: buildRoutineCampaignReport,
      emergency_alerts: buildEmergencyAlertReport,
      stock: buildStockReport,
      farms: buildFarmReport,
      animals: buildAnimalReport,
    };

    const { columns, rows } = await builders[moduleName]({ reportType, singleId, from, to });

    if (format === 'pdf') {
      const doc = new PDFDocument({ margin: 30, size: 'A4' });
      const fileName = `${moduleName}_report_${reportType}_${Date.now()}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      doc.pipe(res);

      doc.fontSize(16).text('Vaccination Report', { align: 'left' });
      doc.moveDown(0.3);
      doc.fontSize(10).fillColor('#555').text(`Module: ${moduleName.toUpperCase()}`);
      doc.text(`Type: ${reportType.toUpperCase()}`);
      if (singleId) doc.text(`Single ID: #${singleId}`);
      if (from || to) doc.text(`Range: ${from || '-'} to ${to || '-'}`);
      doc.text(`Generated: ${new Date().toLocaleString()}`);
      doc.text(`Rows: ${rows.length}`);
      doc.moveDown(0.7).fillColor('#111');

      rows.forEach((r, idx) => {
        const line = columns.map((c) => `${c.label}: ${toDisplayValue(r[c.key])}`).join(' | ');
        doc.fontSize(8).text(`${idx + 1}. ${line}`);
        if (doc.y > 760) doc.addPage();
      });

      doc.end();
      return;
    }

    res.json({
      module: moduleName,
      report_type: reportType,
      generated_at: new Date().toISOString(),
      total_rows: rows.length,
      columns,
      rows,
    });
  } catch (error) {
    console.error('getVaccinationReport error:', error);
    res.status(500).json({ error: 'Failed to generate report.' });
  }
};

module.exports = { getVaccinationReport };

