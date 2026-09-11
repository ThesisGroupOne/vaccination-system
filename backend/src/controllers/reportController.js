const path = require('path');
const PDFDocument = require('pdfkit-table');
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

/** PDF report branding (matches system / example layout) */
const PDF_BRAND = {
  centerName: process.env.CENTER_NAME || 'Mumin Group',
  systemName: process.env.CENTER_SYSTEM || 'Livestock Vaccination System',
  address: process.env.CENTER_ADDRESS || 'Mogadishu, Somalia',
  phone: process.env.CENTER_PHONE || '',
  email: process.env.CENTER_EMAIL || '',
  authorizedTitle: process.env.CENTER_AUTHORIZED || 'Center Manager',
  brandBlue: '#2563EB', // Sidebar from-blue-600 — project branding
};

const MODULE_PDF_LABELS = {
  animals: 'Animal Registration Report',
  vaccinated_animals: 'Vaccinated Animals Report',
  animal_status: 'Animal Status Report',
  unvaccinated_animals: 'Unvaccinated Animals Report',
  routine_vaccinations: 'Routine Vaccination Report',
  emergency_vaccinations: 'Emergency Vaccination Report',
  overdue_vaccinations: 'Overdue / Due Soon Report',
  vaccination_coverage: 'Vaccination Coverage Report',
  decision_insights: 'Decision Insights Report',
  farms: 'Farm Report',
  stock: 'Vaccine Stock Report',
  stock_risk: 'Stock Risk Report',
  schedules: 'Vaccination Schedule Report',
  queue: 'Vaccination Queue Report',
  mortality: 'Mortality Report',
  alerts: 'Alert Report',
};

const PDF_SUMMABLE_KEYS = new Set([
  'animals_count', 'alerts_count', 'schedules_count',
  'emergency_doses', 'routine_doses', 'total_doses',
  'purchased', 'remaining', 'dosage_ml',
  'total_animals', 'vaccinated', 'unvaccinated',
  'age', 'qty', 'quantity',
]);

const PDF_AVERAGE_KEYS = new Set(['coverage_pct', 'avg_animals_per_farm']);

function getPdfReportTitle(moduleName, reportType) {
  const base = MODULE_PDF_LABELS[moduleName] || `${String(moduleName).replace(/_/g, ' ')} Report`;
  if (reportType === 'all') return `All ${base}`;
  if (reportType === 'between') return `${base} (Between Dates)`;
  return `Single ${base}`;
}

function formatPdfLongDate(date = new Date()) {
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function buildPdfTotalsRow(columns, rows) {
  if (!columns.length) return [];
  return columns.map((col, index) => {
    if (index === 0) return 'TOTAL';
    if (PDF_AVERAGE_KEYS.has(col.key)) {
      const nums = rows
        .map((r) => Number(r[col.key]))
        .filter((n) => Number.isFinite(n));
      if (!nums.length) return '';
      const avg = nums.reduce((s, n) => s + n, 0) / nums.length;
      return Number(avg.toFixed(1)).toString();
    }
    if (!PDF_SUMMABLE_KEYS.has(col.key)) return '';
    const sum = rows.reduce((acc, r) => {
      const n = Number(r[col.key]);
      return acc + (Number.isFinite(n) ? n : 0);
    }, 0);
    if (col.key === 'dosage_ml') return Number(sum.toFixed(2)).toString();
    return Number.isInteger(sum) ? String(sum) : Number(sum.toFixed(2)).toString();
  });
}

function getPdfCenterContactLine() {
  return [PDF_BRAND.address, PDF_BRAND.phone, PDF_BRAND.email].filter(Boolean).join(' · ');
}

/** Animal filters used across report modules */
function buildAnimalFilterConditions({ farmId, animalType, gender, status, regFrom, regTo, ageMonths }) {
  const animalConditions = {};
  if (farmId) animalConditions.farm_id = farmId;
  if (animalType) animalConditions.animal_type = animalType;
  // DB stores values like "Orgi (Male)", "Rii (Female)" — match by contains
  if (gender) {
    animalConditions.biological_type = { contains: gender, mode: 'insensitive' };
  }
  if (status) {
    if (status === 'Completed') {
      animalConditions.status = 'Active';
    } else {
      animalConditions.status = status;
    }
  }
  if (regFrom || regTo) {
    Object.assign(animalConditions, parseDateRange(regFrom, regTo, 'created_at'));
  }
  // Age is stored in months (float). Filter one full month bucket, e.g. 6 → [6, 7).
  if (ageMonths != null && ageMonths !== '' && Number.isFinite(Number(ageMonths))) {
    const age = Number(ageMonths);
    if (age >= 0) {
      animalConditions.age = { gte: age, lt: age + 1 };
    }
  }
  return animalConditions;
}

/** Same rules as Inventory (Stock) UI: Expired > Out of Stock (0) > Low Stock (<10) > Normal */
const STOCK_LOW_THRESHOLD = 10;

function getStockInventoryStatus(expiryDate, quantityRemaining) {
  const expiry = new Date(expiryDate);
  if (!Number.isNaN(expiry.getTime()) && expiry < new Date()) return 'Expired';
  if (Number(quantityRemaining) <= 0) return 'Out of Stock';
  if (Number(quantityRemaining) < STOCK_LOW_THRESHOLD) return 'Low Stock';
  return 'Normal';
}

/** Enforce query type against real system filters */
function resolveQueryScope(reportType, singleId, from, to) {
  if (reportType === 'single') {
    return { singleId: singleId || null, from: null, to: null };
  }
  if (reportType === 'between') {
    return { singleId: null, from: from || null, to: to || null };
  }
  // all records — ignore single id and date range
  return { singleId: null, from: null, to: null };
}

function buildReportSummary(moduleName, rows) {
  const summary = { total: rows.length };

  if (['animals', 'vaccinated_animals', 'animal_status'].includes(moduleName)) {
    summary.active = rows.filter((r) => r.status === 'Active' || r.status === 'Completed').length;
    summary.sold = rows.filter((r) => r.status === 'Sold').length;
    summary.deceased = rows.filter((r) => r.status === 'Deceased').length;
  }

  if (moduleName === 'vaccinated_animals') {
    summary.emergency_doses = rows.reduce((sum, r) => sum + (Number(r.emergency_doses) || 0), 0);
    summary.routine_doses = rows.reduce((sum, r) => sum + (Number(r.routine_doses) || 0), 0);
    summary.total_doses = summary.emergency_doses + summary.routine_doses;
  }

  if (moduleName === 'stock') {
    summary.normal = rows.filter((r) => r.status === 'Normal').length;
    summary.low_stock = rows.filter((r) => r.status === 'Low Stock').length;
    summary.expired = rows.filter((r) => r.status === 'Expired').length;
    summary.total_remaining = rows.reduce((sum, r) => sum + (Number(r.remaining) || 0), 0);
    summary.total_purchased = rows.reduce((sum, r) => sum + (Number(r.purchased) || 0), 0);
  }

  if (moduleName === 'schedules') {
    summary.pending = rows.filter((r) => String(r.status).toLowerCase() === 'pending').length;
    summary.completed = rows.filter((r) => String(r.status).toLowerCase() === 'completed').length;
  }

  if (moduleName === 'queue') {
    summary.pending = rows.filter((r) => String(r.status).toLowerCase() === 'pending').length;
    summary.scheduled = rows.filter((r) => String(r.status).toLowerCase() === 'scheduled').length;
  }

  if (moduleName === 'alerts') {
    summary.pending = rows.filter((r) => String(r.status).toLowerCase() === 'pending').length;
    summary.scheduled = rows.filter((r) => String(r.status).toLowerCase() === 'scheduled').length;
    summary.resolved = rows.filter((r) => String(r.status).toLowerCase() === 'resolved').length;
  }

  if (['routine_vaccinations', 'emergency_vaccinations'].includes(moduleName)) {
    const doses = rows.reduce((sum, r) => sum + (Number(r.dosage_ml) || 0), 0);
    summary.total_doses = Number(doses.toFixed(2));
    summary.unique_animals = new Set(rows.map((r) => r.animal_id).filter((id) => id !== '-')).size;
  }
  if (moduleName === 'emergency_vaccinations') {
    summary.alert_resolved = rows.filter((r) => String(r.alert_status).toLowerCase() === 'resolved').length;
    summary.with_vaccination_record = rows.filter((r) => r.vaccination_id !== '-').length;
  }

  if (moduleName === 'farms') {
    summary.total_farms = rows.length;
    summary.total_animals = rows.reduce((sum, r) => sum + (Number(r.animals_count) || 0), 0);
    summary.total_alerts = rows.reduce((sum, r) => sum + (Number(r.alerts_count) || 0), 0);
    summary.total_schedules = rows.reduce((sum, r) => sum + (Number(r.schedules_count) || 0), 0);
    summary.avg_animals_per_farm = rows.length
      ? Number((summary.total_animals / rows.length).toFixed(1))
      : 0;
    // keep `total` for compatibility but UI will use total_farms
  }

  if (moduleName === 'mortality') {
    summary.total_deaths = rows.length;
    const causeCounts = {};
    for (const r of rows) {
      const c = String(r.cause_of_death || 'Unknown');
      causeCounts[c] = (causeCounts[c] || 0) + 1;
    }
    const top = Object.entries(causeCounts).sort((a, b) => b[1] - a[1])[0];
    if (top) {
      summary.top_cause_count = top[1];
      summary.top_cause_pct = rows.length ? Number(((top[1] / rows.length) * 100).toFixed(0)) : 0;
    }
  }

  if (moduleName === 'unvaccinated_animals') {
    summary.active = rows.filter((r) => r.status === 'Active' || r.status === 'Completed').length;
    summary.needs_vaccination = rows.length;
  }

  if (moduleName === 'overdue_vaccinations') {
    summary.overdue = rows.filter((r) => String(r.urgency).toLowerCase() === 'overdue').length;
    summary.due_soon = rows.filter((r) => String(r.urgency).toLowerCase() === 'due soon').length;
  }

  if (moduleName === 'vaccination_coverage') {
    const totals = rows.reduce(
      (acc, r) => {
        acc.animals += Number(r.total_animals) || 0;
        acc.vaccinated += Number(r.vaccinated) || 0;
        return acc;
      },
      { animals: 0, vaccinated: 0 }
    );
    summary.total_animals = totals.animals;
    summary.vaccinated = totals.vaccinated;
    summary.unvaccinated = Math.max(0, totals.animals - totals.vaccinated);
    summary.avg_coverage_pct = rows.length
      ? Number(
          (
            rows.reduce((sum, r) => sum + (Number(r.coverage_pct) || 0), 0) / rows.length
          ).toFixed(1)
        )
      : 0;
  }

  if (moduleName === 'stock_risk') {
    summary.expired = rows.filter((r) => String(r.risk_level).toLowerCase() === 'expired').length;
    summary.expiring_soon = rows.filter((r) => String(r.risk_level).toLowerCase() === 'expiring soon').length;
    summary.low_stock = rows.filter((r) => String(r.risk_level).toLowerCase() === 'low stock').length;
    summary.out_of_stock = rows.filter((r) => String(r.risk_level).toLowerCase() === 'out of stock').length;
  }

  return summary;
}


function buildIdFilter(reportType, singleId, idField, hasAnimalRelation = false) {
  if (reportType !== 'single' || !singleId) return {};
  const num = parseInt(singleId, 10);
  
  // Direct animal table
  if (idField === 'animal_id' && !hasAnimalRelation) {
    if (!isNaN(num)) {
      return { OR: [{ animal_id: num }, { nickname: { contains: singleId, mode: 'insensitive' } }] };
    }
    return { nickname: { contains: singleId, mode: 'insensitive' } };
  }
  
  // Table with animal relation (e.g. Vaccinations, Schedules, Alerts)
  if (hasAnimalRelation) {
    if (!isNaN(num)) {
      return { OR: [{ [idField]: num }, { animal: { nickname: { contains: singleId, mode: 'insensitive' } } }] };
    }
    return { animal: { nickname: { contains: singleId, mode: 'insensitive' } } };
  }
  
  // Non-animal tables (Farms, Users, Stock)
  if (!isNaN(num)) return { [idField]: num };
  return { [idField]: -1 }; // Force no match
}

async function buildVaccinationReport({ reportType, singleId, from, to, farmId, animalType, gender, status, regFrom, regTo, ageMonths }) {
  const commonDateFilter = parseDateRange(from, to, 'date_administered');
  const animalIdFilter = buildIdFilter(reportType, singleId, 'animal_id', true);

  const animalConditions = buildAnimalFilterConditions({ farmId, animalType, gender, status, regFrom, regTo, ageMonths });

  const whereCondition = {
    ...animalIdFilter,
    ...commonDateFilter,
  };

  if (Object.keys(animalConditions).length > 0) {
    whereCondition.animal = animalConditions;
  }

  const [standardRows, routineRows] = await Promise.all([
    prisma.vaccination.findMany({
      where: whereCondition,
      include: {
        animal: { include: { farm: { select: { farm_name: true } } } },
        vaccine: { select: { vaccine_name: true } },
        user: { select: { full_name: true } },
      },
      orderBy: { date_administered: 'desc' },
    }),
    prisma.routineVaccinationRecord.findMany({
      where: whereCondition,
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
  const idFilter = buildIdFilter(reportType, singleId, 'id', true);

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

async function buildEmergencyAlertReport({ reportType, singleId, from, to, farmId, animalType, gender, status, regFrom, regTo, ageMonths }) {
  const commonDateFilter = parseDateRange(from, to, 'created_at');
  const idFilter = buildIdFilter(reportType, singleId, 'alert_id', true);

  const whereCondition = {
    ...idFilter,
    ...commonDateFilter,
  };

  if (farmId) whereCondition.farm_id = farmId;

  const animalConditions = buildAnimalFilterConditions({ animalType, gender, status, regFrom, regTo, ageMonths });
  // farm already applied on alert; don't duplicate farm_id on animal unless needed
  if (Object.keys(animalConditions).length > 0) {
    whereCondition.animal = animalConditions;
  }

  const alerts = await prisma.alert.findMany({
    where: whereCondition,
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

async function buildStockReport({ reportType, singleId, from, to, vaccineId }) {
  // Mirror Inventory (Stock) page: all batches with same status rules
  const commonDateFilter = parseDateRange(from, to, 'purchase_date');
  const idFilter = buildIdFilter(reportType, singleId, 'stock_id', false);
  const whereCondition = { ...idFilter, ...commonDateFilter };
  if (vaccineId) whereCondition.vaccine_id = vaccineId;

  const stocks = await prisma.vaccineStock.findMany({
    where: whereCondition,
    include: { vaccine: { select: { vaccine_name: true } } },
    orderBy: { stock_id: 'desc' },
  });

  const rows = stocks.map((s) => {
    const status = getStockInventoryStatus(s.expiry_date, s.quantity_remaining);
    return {
      stock_id: s.stock_id,
      vaccine: s.vaccine?.vaccine_name || '-',
      batch_number: s.batch_number || '-',
      supplier: s.supplier_name || '-',
      purchased: s.quantity_purchased,
      remaining: s.quantity_remaining,
      stock_level: `${s.quantity_remaining} / ${s.quantity_purchased} doses`,
      purchase_price: s.purchase_price,
      purchase_date: s.purchase_date,
      expiry_date: s.expiry_date,
      status,
    };
  });

  const columns = [
    { key: 'vaccine', label: 'Vaccine' },
    { key: 'batch_number', label: 'Batch' },
    { key: 'supplier', label: 'Supplier' },
    { key: 'stock_level', label: 'Remaining Stock' },
    { key: 'remaining', label: 'Remaining Qty' },
    { key: 'purchased', label: 'Purchased Qty' },
    { key: 'expiry_date', label: 'Expiry Date' },
    { key: 'status', label: 'Status' },
    { key: 'purchase_date', label: 'Purchase Date' },
    { key: 'purchase_price', label: 'Price' },
    { key: 'stock_id', label: 'Stock ID' },
  ];

  return { columns, rows };
}

async function buildFarmReport({ reportType, singleId, from, to, farmId }) {
  const commonDateFilter = parseDateRange(from, to, 'created_at');
  const idFilter = buildIdFilter(reportType, singleId, 'farm_id', false);
  const locationFilter = farmId ? { farm_id: farmId } : {};

  const farms = await prisma.farm.findMany({
    where: { ...idFilter, ...locationFilter, ...commonDateFilter },
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

async function buildAnimalReport({ reportType, singleId, from, to, farmId, animalType, gender, status, regFrom, regTo, ageMonths }) {
  const commonDateFilter = parseDateRange(from, to, 'created_at');
  const idFilter = buildIdFilter(reportType, singleId, 'animal_id', false);

  const whereCondition = {
    ...idFilter,
    ...commonDateFilter,
    ...buildAnimalFilterConditions({ farmId, animalType, gender, status, regFrom, regTo, ageMonths }),
  };

  const animals = await prisma.animal.findMany({
    where: whereCondition,
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
    biological_type: a.biological_type || '-',
    age: a.age,
    status: a.status,
    farm: a.farm?.farm_name || '-',
    routine_doses: a._count.routineRecords,
    emergency_doses: a._count.vaccinations,
    total_doses: a._count.vaccinations + a._count.routineRecords,
    alerts_count: a._count.alerts,
    schedules_count: a._count.schedules,
    created_at: a.created_at,
  }));

  const columns = [
    { key: 'animal_id', label: 'Animal ID' },
    { key: 'nickname', label: 'Nickname' },
    { key: 'animal_type', label: 'Animal Type' },
    { key: 'biological_type', label: 'Gender / Type' },
    { key: 'age', label: 'Age' },
    { key: 'status', label: 'Status' },
    { key: 'farm', label: 'Farm' },
    { key: 'emergency_doses', label: 'Emergency Doses' },
    { key: 'routine_doses', label: 'Routine Doses' },
    { key: 'total_doses', label: 'Total Doses' },
    { key: 'alerts_count', label: 'Alerts' },
    { key: 'schedules_count', label: 'Schedules' },
    { key: 'created_at', label: 'Created At' },
  ];

  return { columns, rows };
}

async function buildUpcomingVaccinations({ reportType, singleId, from, to, farmId, animalType, gender, status, regFrom, regTo, ageMonths }) {
  const commonDateFilter = parseDateRange(from, to, 'scheduled_date');
  const animalIdFilter = buildIdFilter(reportType, singleId, 'animal_id', true);

  const animalConditions = buildAnimalFilterConditions({ farmId, animalType, gender, status, regFrom, regTo, ageMonths });

  const whereCondition = {
    ...animalIdFilter,
    ...commonDateFilter,
    status: 'Pending',
  };
  if (Object.keys(animalConditions).length > 0) whereCondition.animal = animalConditions;

  const schedules = await prisma.vaccinationSchedule.findMany({
    where: whereCondition,
    include: {
      animal: { include: { farm: { select: { farm_name: true } } } },
      vaccine: { select: { vaccine_name: true } },
    },
    orderBy: { scheduled_date: 'asc' },
  });

  const rows = schedules.map(s => ({
    schedule_id: s.schedule_id,
    animal_id: s.animal_id,
    nickname: s.animal?.nickname || '-',
    animal_type: s.animal?.animal_type || '-',
    farm_name: s.animal?.farm?.farm_name || '-',
    vaccine: s.vaccine?.vaccine_name || '-',
    schedule_type: s.schedule_type,
    scheduled_date: s.scheduled_date,
    status: s.status,
  }));
  const columns = [
    { key: 'schedule_id', label: 'Schedule ID' },
    { key: 'animal_id', label: 'Animal ID' },
    { key: 'nickname', label: 'Nickname' },
    { key: 'animal_type', label: 'Animal Type' },
    { key: 'farm_name', label: 'Farm' },
    { key: 'vaccine', label: 'Vaccine' },
    { key: 'schedule_type', label: 'Type' },
    { key: 'scheduled_date', label: 'Due Date' },
    { key: 'status', label: 'Status' }
  ];
  return { columns, rows };
}

async function buildPendingAlerts({ reportType, singleId, from, to, farmId, animalType, gender, status, regFrom, regTo, ageMonths }) {
  const commonDateFilter = parseDateRange(from, to, 'created_at');
  const idFilter = buildIdFilter(reportType, singleId, 'alert_id', true);

  const whereCondition = {
    ...idFilter,
    ...commonDateFilter,
    status: 'Pending',
  };
  if (farmId) whereCondition.farm_id = farmId;

  const animalConditions = buildAnimalFilterConditions({ animalType, gender, status, regFrom, regTo, ageMonths });

  if (Object.keys(animalConditions).length > 0) whereCondition.animal = animalConditions;

  const alerts = await prisma.alert.findMany({
    where: whereCondition,
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

async function buildLowStock({ reportType, singleId, from, to }) {
  const commonDateFilter = parseDateRange(from, to, 'purchase_date');
  const idFilter = buildIdFilter(reportType, singleId, 'stock_id', false);

  const stocks = await prisma.vaccineStock.findMany({
    where: { 
      ...idFilter, 
      ...commonDateFilter,
      OR: [
        { quantity_remaining: { lte: 5 } },
        { expiry_date: { lt: new Date() } }
      ]
    },
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
        : 'Low Stock',
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

async function buildUsersReport({ reportType, singleId, from, to }) {
  const commonDateFilter = parseDateRange(from, to, 'created_at');
  const idFilter = buildIdFilter(reportType, singleId, 'user_id', false);

  const users = await prisma.user.findMany({
    where: { ...idFilter, ...commonDateFilter },
    orderBy: { created_at: 'desc' }
  });
  
  const rows = users.map(u => ({
    user_id: u.user_id,
    full_name: u.full_name,
    phone: u.phone,
    email: u.email,
    role: u.role,
    created_at: u.created_at,
  }));
  const columns = [
    { key: 'user_id', label: 'User ID' },
    { key: 'full_name', label: 'Full Name' },
    { key: 'phone', label: 'Phone' },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Role' },
    { key: 'created_at', label: 'Registered' }
  ];
  return { columns, rows };
}

async function buildVaccinatedAnimalsReport({ reportType, singleId, from, to, farmId, animalType, gender, status, regFrom, regTo, vaccineId, ageMonths }) {
  const idFilter = buildIdFilter(reportType, singleId, 'animal_id', false);

  // For Vaccinated Animals, the between dates should filter by vaccination date, not animal registration date
  const dateFilterObj = {};
  if (from || to) {
    if (from) dateFilterObj.gte = new Date(from);
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      dateFilterObj.lte = end;
    }
  }

  const whereCondition = {
    ...idFilter,
    ...buildAnimalFilterConditions({ farmId, animalType, gender, status, regFrom, regTo, ageMonths }),
  };

  const vacFilter = {};
  if (vaccineId) vacFilter.vaccine_id = vaccineId;
  if (from || to) vacFilter.date_administered = dateFilterObj;

  if (Object.keys(vacFilter).length > 0) {
    whereCondition.OR = [
      { vaccinations: { some: vacFilter } },
      { routineRecords: { some: vacFilter } },
    ];
  } else {
    whereCondition.OR = [
      { vaccinations: { some: {} } },
      { routineRecords: { some: {} } },
    ];
  }

  const animals = await prisma.animal.findMany({
    where: whereCondition,
    include: {
      farm: { select: { farm_name: true } },
      vaccinations: vaccineId
        ? {
            where: { vaccine_id: vaccineId },
            select: {
              vaccination_id: true,
              administered_by: true,
              vaccine: { select: { vaccine_name: true } },
              user: { select: { user_id: true, full_name: true } },
            },
          }
        : {
            select: {
              vaccination_id: true,
              administered_by: true,
              vaccine: { select: { vaccine_name: true } },
              user: { select: { user_id: true, full_name: true } },
            },
          },
      routineRecords: vaccineId
        ? {
            where: { vaccine_id: vaccineId },
            select: {
              id: true,
              administered_by: true,
              vaccine: { select: { vaccine_name: true } },
              administered_user: { select: { user_id: true, full_name: true } },
            },
          }
        : {
            select: {
              id: true,
              administered_by: true,
              vaccine: { select: { vaccine_name: true } },
              administered_user: { select: { user_id: true, full_name: true } },
            },
          },
      _count: { select: { alerts: true, schedules: true } },
    },
    orderBy: { created_at: 'desc' },
  });

  let vaccineName = null;
  if (vaccineId) {
    const v = await prisma.vaccine.findUnique({
      where: { vaccine_id: vaccineId },
      select: { vaccine_name: true },
    });
    vaccineName = v?.vaccine_name || `Vaccine #${vaccineId}`;
  }

  // Only fetch users who are actually Doctors
  const doctorUsers = await prisma.user.findMany({
    where: { role: { equals: 'Doctor', mode: 'insensitive' }, is_active: true },
    select: { user_id: true, full_name: true, role: true },
    orderBy: { full_name: 'asc' },
  });
  const doctorMap = new Map(
    doctorUsers.map((d) => [
      d.user_id,
      { name: d.full_name, role: d.role, emergency: 0, routine: 0, total: 0 },
    ])
  );
  for (const a of animals) {
    for (const v of a.vaccinations || []) {
      const id = v.user?.user_id || v.administered_by;
      if (!doctorMap.has(id)) continue;
      const d = doctorMap.get(id);
      d.emergency += 1;
      d.total += 1;
    }
    for (const r of a.routineRecords || []) {
      const id = r.administered_user?.user_id || r.administered_by;
      if (!doctorMap.has(id)) continue;
      const d = doctorMap.get(id);
      d.routine += 1;
      d.total += 1;
    }
  }
  const topDoctors = [...doctorMap.values()]
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))
    .map((d) => ({
      name: d.name,
      total: d.total,
      emergency: d.emergency,
      routine: d.routine,
    }));

  const rows = animals.map((a) => {
    const emergency = a.vaccinations.length;
    const routine = a.routineRecords.length;
    const names = [
      ...a.vaccinations.map((v) => v.vaccine?.vaccine_name).filter(Boolean),
      ...a.routineRecords.map((v) => v.vaccine?.vaccine_name).filter(Boolean),
    ];
    const uniqueVaccines = [...new Set(names)];
    return {
      animal_id: a.animal_id,
      nickname: a.nickname || '-',
      animal_type: a.animal_type,
      biological_type: a.biological_type || '-',
      age: a.age,
      status: a.status,
      farm: a.farm?.farm_name || '-',
      vaccine: vaccineName || (uniqueVaccines.length ? uniqueVaccines.join(', ') : '-'),
      emergency_doses: emergency,
      routine_doses: routine,
      total_doses: emergency + routine,
      alerts_count: a._count.alerts,
      schedules_count: a._count.schedules,
      created_at: a.created_at,
    };
  });

  const columns = [
    { key: 'animal_id', label: 'Animal ID' },
    { key: 'nickname', label: 'Nickname' },
    { key: 'animal_type', label: 'Animal Type' },
    { key: 'biological_type', label: 'Gender / Type' },
    { key: 'status', label: 'Status' },
    { key: 'farm', label: 'Farm' },
    { key: 'vaccine', label: 'Vaccine(s)' },
    { key: 'emergency_doses', label: 'Emergency Doses' },
    { key: 'routine_doses', label: 'Routine Doses' },
    { key: 'total_doses', label: 'Total Doses' },
    { key: 'created_at', label: 'Registered' },
  ];

  // Calculate age groups insight across ALL animals matching filters, not just vaccinated ones
  const animalWhereAll = buildAnimalFilterConditions({ farmId, animalType, gender, status, regFrom, regTo, ageMonths });
  const allAnimals = await prisma.animal.findMany({
    where: animalWhereAll,
    include: {
      vaccinations: vaccineId
        ? { where: { vaccine_id: vaccineId }, select: { vaccination_id: true } }
        : { select: { vaccination_id: true } },
      routineRecords: vaccineId
        ? { where: { vaccine_id: vaccineId }, select: { id: true } }
        : { select: { id: true } },
    }
  });

  const ageMap = new Map();
  for (const a of allAnimals) {
    const age = Math.round(Number(a.age) || 0);
    const isVacc = (a.vaccinations?.length || 0) + (a.routineRecords?.length || 0) > 0;
    if (!ageMap.has(age)) {
      ageMap.set(age, { name: `${age}`, vaccinated: 0, unvaccinated: 0, sortKey: age });
    }
    const bucket = ageMap.get(age);
    if (isVacc) bucket.vaccinated++;
    else bucket.unvaccinated++;
  }
  const age_groups = Array.from(ageMap.values())
    .sort((a, b) => a.sortKey - b.sortKey)
    .map(g => ({ name: g.name, vaccinated: g.vaccinated, unvaccinated: g.unvaccinated }));

  const speciesGenderMap = new Map();
  for (const a of allAnimals) {
    const isVacc = (a.vaccinations?.length || 0) + (a.routineRecords?.length || 0) > 0;
    if (isVacc) {
      const species = a.animal_type || 'Unknown';
      const gender = (a.biological_type || 'Unknown').toLowerCase();
      if (!speciesGenderMap.has(species)) {
        speciesGenderMap.set(species, { name: species, Male: 0, Female: 0 });
      }
      const stats = speciesGenderMap.get(species);
      if (gender.includes('female')) stats.Female++;
      else if (gender.includes('male')) stats.Male++;
      else stats.Female++; // Default to female if neither (edge case)
    }
  }
  const species_gender_distribution = Array.from(speciesGenderMap.values());

  return {
    columns,
    rows,
    insights: {
      top_doctors: topDoctors,
      top_doctor_name: topDoctors[0]?.name || '—',
      top_doctor_doses: topDoctors[0]?.total || 0,
      emergency_total: topDoctors.reduce((s, d) => s + d.emergency, 0),
      routine_total: topDoctors.reduce((s, d) => s + d.routine, 0),
      age_groups,
      species_gender_distribution,
    },
  };
}

async function buildAnimalStatusReport(args) {
  const result = await buildAnimalReport(args);
  const columns = [
    { key: 'animal_id', label: 'Animal ID' },
    { key: 'nickname', label: 'Nickname' },
    { key: 'animal_type', label: 'Animal Type' },
    { key: 'biological_type', label: 'Gender / Type' },
    { key: 'status', label: 'Status' },
    { key: 'farm', label: 'Farm' },
    { key: 'total_doses', label: 'Total Doses' },
    { key: 'alerts_count', label: 'Alerts' },
    { key: 'created_at', label: 'Registered' },
  ];
  const rows = result.rows.map((r) => ({
    animal_id: r.animal_id,
    nickname: r.nickname,
    animal_type: r.animal_type,
    biological_type: r.biological_type,
    status: r.status,
    farm: r.farm,
    total_doses: r.total_doses,
    alerts_count: r.alerts_count,
    created_at: r.created_at,
  }));
  return { columns, rows };
}

async function buildRoutineVaccinationsReport({ reportType, singleId, from, to, farmId, animalType, gender, status, regFrom, regTo, vaccineId, ageMonths }) {
  const commonDateFilter = parseDateRange(from, to, 'date_administered');
  const animalIdFilter = buildIdFilter(reportType, singleId, 'animal_id', true);

  const animalConditions = buildAnimalFilterConditions({ farmId, animalType, gender, status, regFrom, regTo, ageMonths });

  const whereCondition = { ...animalIdFilter, ...commonDateFilter };
  if (vaccineId) whereCondition.vaccine_id = vaccineId;
  if (Object.keys(animalConditions).length > 0) whereCondition.animal = animalConditions;

  const records = await prisma.routineVaccinationRecord.findMany({
    where: whereCondition,
    include: {
      animal: { include: { farm: { select: { farm_name: true } } } },
      vaccine: { select: { vaccine_name: true } },
      administered_user: { select: { full_name: true } },
      campaign: { select: { campaign_name: true, status: true } },
    },
    orderBy: { date_administered: 'desc' },
  });

  const rows = records.map((r) => ({
    record_id: r.id,
    campaign: r.campaign?.campaign_name || '-',
    animal_id: r.animal_id,
    nickname: r.animal?.nickname || '-',
    animal_type: r.animal?.animal_type || '-',
    gender: r.animal?.biological_type || '-',
    animal_status: r.animal?.status || '-',
    farm: r.animal?.farm?.farm_name || '-',
    vaccine: r.vaccine?.vaccine_name || '-',
    dosage_ml: r.dosage_ml != null ? r.dosage_ml : '-',
    date_given: r.date_administered,
    next_due: r.next_due_date,
    by_user: r.administered_user?.full_name || '-',
  }));

  const columns = [
    { key: 'record_id', label: 'Record ID' },
    { key: 'campaign', label: 'Campaign' },
    { key: 'animal_id', label: 'Animal ID' },
    { key: 'nickname', label: 'Nickname' },
    { key: 'animal_type', label: 'Animal Type' },
    { key: 'gender', label: 'Gender' },
    { key: 'animal_status', label: 'Animal Status' },
    { key: 'farm', label: 'Farm' },
    { key: 'vaccine', label: 'Vaccine' },
    { key: 'dosage_ml', label: 'Dose (ml)' },
    { key: 'date_given', label: 'Given On' },
    { key: 'next_due', label: 'Next Due' },
    { key: 'by_user', label: 'Administered By' },
  ];

  return { columns, rows };
}

async function buildEmergencyVaccinationsReport({ reportType, singleId, from, to, farmId, animalType, gender, status, regFrom, regTo, vaccineId, ageMonths }) {
  // Real Emergency flow: Alert → schedule_type=Emergency → doctor completes → Vaccination record
  // Report MUST use completed Emergency schedules (not every row in Vaccination table).
  const dateFilter = parseDateRange(from, to, 'scheduled_date');
  const idFilter = buildIdFilter(reportType, singleId, 'schedule_id', true) || {};


  // Filter farm via animal.farm_id — Emergency schedules often have null schedule.farm_id
  const animalConditions = buildAnimalFilterConditions({ farmId, animalType, gender, status, regFrom, regTo, ageMonths });

  const whereCondition = {
    schedule_type: 'Emergency',
    status: 'Completed',
    ...idFilter,
    ...dateFilter,
  };
  if (vaccineId) whereCondition.vaccine_id = vaccineId;
  if (Object.keys(animalConditions).length > 0) whereCondition.animal = animalConditions;

  const schedules = await prisma.vaccinationSchedule.findMany({
    where: whereCondition,
    include: {
      animal: { include: { farm: { select: { farm_name: true } } } },
      vaccine: { select: { vaccine_name: true } },
      doctor: { select: { full_name: true } },
      farm: { select: { farm_name: true } },
    },
    orderBy: { scheduled_date: 'desc' },
  });

  const animalIds = [...new Set(schedules.map((s) => s.animal_id).filter(Boolean))];
  const vaccineIds = [...new Set(schedules.map((s) => s.vaccine_id).filter(Boolean))];

  const vaccinations = animalIds.length
    ? await prisma.vaccination.findMany({
        where: {
          animal_id: { in: animalIds },
          vaccine_id: { in: vaccineIds },
        },
        include: { user: { select: { full_name: true } } },
        orderBy: { date_administered: 'desc' },
      })
    : [];

  const alerts = animalIds.length
    ? await prisma.alert.findMany({
        where: { animal_id: { in: animalIds } },
        select: { animal_id: true, alert_id: true, status: true, symptoms: true, created_at: true },
        orderBy: { created_at: 'desc' },
      })
    : [];

  const usedVaccinationIds = new Set();

  const rows = schedules.map((s) => {
    const scheduleDay = dayKeySafe(s.scheduled_date);
    const match = vaccinations.find((v) => {
      if (usedVaccinationIds.has(v.vaccination_id)) return false;
      if (v.animal_id !== s.animal_id || v.vaccine_id !== s.vaccine_id) return false;
      const vDay = dayKeySafe(v.date_administered);
      if (!scheduleDay || !vDay) return true;
      const diffDays = Math.abs(
        (new Date(vDay).getTime() - new Date(scheduleDay).getTime()) / (1000 * 60 * 60 * 24)
      );
      return diffDays <= 7;
    });
    if (match) usedVaccinationIds.add(match.vaccination_id);

    // Prefer open alerts closest to schedule date; only then fall back to nearest resolved/any
    const animalAlerts = alerts.filter((a) => a.animal_id === s.animal_id);
    const relatedAlert = pickRelatedAlert(animalAlerts, s.scheduled_date);

    return {
      schedule_id: s.schedule_id,
      vaccination_id: match?.vaccination_id ?? '-',
      animal_id: s.animal_id ?? '-',
      nickname: s.animal?.nickname || '-',
      animal_type: s.animal?.animal_type || '-',
      gender: s.animal?.biological_type || '-',
      animal_status: s.animal?.status || '-',
      farm: s.animal?.farm?.farm_name || s.farm?.farm_name || '-',
      vaccine: s.vaccine?.vaccine_name || '-',
      dosage_ml: match?.dosage_ml != null ? match.dosage_ml : '-',
      date_given: match?.date_administered || s.scheduled_date,
      next_due: match?.next_due_date || '-',
      alert_status: relatedAlert?.status || '-',
      symptoms: relatedAlert?.symptoms || '-',
      by_user: match?.user?.full_name || s.doctor?.full_name || '-',
      source: 'Emergency',
    };
  });

  const columns = [
    { key: 'schedule_id', label: 'Schedule ID' },
    { key: 'vaccination_id', label: 'Vaccination ID' },
    { key: 'animal_id', label: 'Animal ID' },
    { key: 'nickname', label: 'Nickname' },
    { key: 'animal_type', label: 'Animal Type' },
    { key: 'gender', label: 'Gender' },
    { key: 'animal_status', label: 'Animal Status' },
    { key: 'farm', label: 'Farm' },
    { key: 'vaccine', label: 'Vaccine' },
    { key: 'dosage_ml', label: 'Dose (ml)' },
    { key: 'date_given', label: 'Given On' },
    { key: 'next_due', label: 'Next Due' },
    { key: 'alert_status', label: 'Alert Status' },
    { key: 'symptoms', label: 'Symptoms' },
    { key: 'by_user', label: 'Administered By' },
  ];

  return { columns, rows };
}

function dayKeySafe(d) {
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return '';
  return x.toISOString().slice(0, 10);
}

function pickRelatedAlert(animalAlerts, scheduledDate) {
  if (!animalAlerts.length) return null;
  const open = animalAlerts.filter((a) =>
    ['scheduled', 'pending'].includes(String(a.status).toLowerCase())
  );
  const pool = open.length ? open : animalAlerts;
  if (!scheduledDate) return pool[0];
  const t = new Date(scheduledDate).getTime();
  return pool
    .slice()
    .sort(
      (a, b) =>
        Math.abs(new Date(a.created_at).getTime() - t) -
        Math.abs(new Date(b.created_at).getTime() - t)
    )[0];
}

async function buildScheduleReport({ reportType, singleId, from, to, farmId, animalType, gender, status, regFrom, regTo, ageMonths }) {
  const commonDateFilter = parseDateRange(from, to, 'scheduled_date');
  const idFilter = buildIdFilter(reportType, singleId, 'schedule_id', true);

  // Farm via animal — many Emergency rows have null schedule.farm_id
  const animalConditions = buildAnimalFilterConditions({ farmId, animalType, gender, status, regFrom, regTo, ageMonths });

  const whereCondition = { ...idFilter, ...commonDateFilter };
  if (Object.keys(animalConditions).length > 0) whereCondition.animal = animalConditions;

  const schedules = await prisma.vaccinationSchedule.findMany({
    where: whereCondition,
    include: {
      animal: { include: { farm: { select: { farm_name: true } } } },
      vaccine: { select: { vaccine_name: true } },
      doctor: { select: { full_name: true } },
      farm: { select: { farm_name: true } },
    },
    orderBy: { scheduled_date: 'desc' },
  });

  const rows = schedules.map((s) => ({
    schedule_id: s.schedule_id,
    animal_id: s.animal_id ?? '-',
    nickname: s.animal?.nickname || '-',
    animal_type: s.animal?.animal_type || '-',
    farm: s.animal?.farm?.farm_name || s.farm?.farm_name || '-',
    vaccine: s.vaccine?.vaccine_name || '-',
    schedule_type: s.schedule_type,
    scheduled_date: s.scheduled_date,
    status: s.status,
    doctor: s.doctor?.full_name || '-',
  }));

  const columns = [
    { key: 'schedule_id', label: 'Schedule ID' },
    { key: 'animal_id', label: 'Animal ID' },
    { key: 'nickname', label: 'Nickname' },
    { key: 'animal_type', label: 'Animal Type' },
    { key: 'farm', label: 'Farm' },
    { key: 'vaccine', label: 'Vaccine' },
    { key: 'schedule_type', label: 'Type' },
    { key: 'scheduled_date', label: 'Scheduled Date' },
    { key: 'status', label: 'Status' },
    { key: 'doctor', label: 'Doctor' },
  ];

  return { columns, rows };
}

async function buildQueueReport(args) {
  // Queue = pending schedules prioritized for doctor action
  const result = await buildScheduleReport(args);
  const rows = result.rows.filter((r) => String(r.status).toLowerCase() === 'pending' || String(r.status).toLowerCase() === 'scheduled');
  return { columns: result.columns, rows };
}

async function buildMortalityReport({ reportType, singleId, from, to, farmId, animalType, gender, status, regFrom, regTo, ageMonths }) {
  const commonDateFilter = parseDateRange(from, to, 'death_date');
  const idFilter = buildIdFilter(reportType, singleId, 'id', true);

  const animalConditions = buildAnimalFilterConditions({ farmId, animalType, gender, status, regFrom, regTo, ageMonths });

  const whereCondition = { ...idFilter, ...commonDateFilter };
  if (Object.keys(animalConditions).length > 0) whereCondition.animal = animalConditions;

  const records = await prisma.mortalityRecord.findMany({
    where: whereCondition,
    include: {
      animal: { include: { farm: { select: { farm_name: true } } } },
      user: { select: { full_name: true } },
    },
    orderBy: { death_date: 'desc' },
  });

  const rows = records.map((r) => ({
    mortality_id: r.id,
    animal_id: r.animal_id,
    nickname: r.animal?.nickname || '-',
    animal_type: r.animal?.animal_type || '-',
    farm: r.animal?.farm?.farm_name || '-',
    death_date: r.death_date,
    cause_of_death: r.cause_of_death,
    notes: r.notes || '-',
    reported_by: r.user?.full_name || '-',
    created_at: r.created_at,
  }));

  const columns = [
    { key: 'mortality_id', label: 'Record ID' },
    { key: 'animal_id', label: 'Animal ID' },
    { key: 'nickname', label: 'Nickname' },
    { key: 'animal_type', label: 'Animal Type' },
    { key: 'farm', label: 'Farm' },
    { key: 'death_date', label: 'Death Date' },
    { key: 'cause_of_death', label: 'Cause' },
    { key: 'notes', label: 'Notes' },
    { key: 'reported_by', label: 'Reported By' },
    { key: 'created_at', label: 'Recorded At' },
  ];

  return { columns, rows };
}

async function buildAlertsReport(args) {
  return buildEmergencyAlertReport(args);
}

/** Active animals with zero emergency + zero routine doses (decision: who still needs vaccination) */
async function buildUnvaccinatedAnimalsReport({ reportType, singleId, from, to, farmId, animalType, gender, status, regFrom, regTo, vaccineId, ageMonths }) {
  const commonDateFilter = parseDateRange(from, to, 'created_at');
  const idFilter = buildIdFilter(reportType, singleId, 'animal_id', false);

  const whereCondition = {
    ...idFilter,
    ...commonDateFilter,
    ...buildAnimalFilterConditions({
      farmId,
      animalType,
      gender,
      status: status || 'Active',
      regFrom,
      regTo,
      ageMonths,
    }),
  };

  const animals = await prisma.animal.findMany({
    where: whereCondition,
    include: {
      farm: { select: { farm_name: true } },
      vaccinations: vaccineId
        ? { where: { vaccine_id: vaccineId }, select: { vaccination_id: true } }
        : { select: { vaccination_id: true } },
      routineRecords: vaccineId
        ? { where: { vaccine_id: vaccineId }, select: { id: true } }
        : { select: { id: true } },
    },
    orderBy: { created_at: 'desc' },
  });

  const rows = animals
    .filter((a) => a.vaccinations.length === 0 && a.routineRecords.length === 0)
    .map((a) => ({
      animal_id: a.animal_id,
      nickname: a.nickname || '-',
      animal_type: a.animal_type,
      biological_type: a.biological_type || '-',
      age: a.age,
      status: a.status,
      farm: a.farm?.farm_name || '-',
      decision: 'Needs vaccination',
      created_at: a.created_at,
    }));

  const columns = [
    { key: 'animal_id', label: 'Animal ID' },
    { key: 'nickname', label: 'Nickname' },
    { key: 'animal_type', label: 'Animal Type' },
    { key: 'biological_type', label: 'Gender / Type' },
    { key: 'age', label: 'Age' },
    { key: 'status', label: 'Status' },
    { key: 'farm', label: 'Farm' },
    { key: 'decision', label: 'Decision' },
    { key: 'created_at', label: 'Registered' },
  ];

  return { columns, rows };
}

/** Pending schedules that are overdue or due within riskDays (decision: act now) */
async function buildOverdueVaccinationsReport({ reportType, singleId, from, to, farmId, animalType, gender, status, regFrom, regTo, vaccineId, riskDays, ageMonths }) {
  const days = Number.isFinite(Number(riskDays)) ? Math.max(0, parseInt(riskDays, 10)) : 0;
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const dueSoonEnd = new Date(startOfToday);
  dueSoonEnd.setDate(dueSoonEnd.getDate() + days);
  dueSoonEnd.setHours(23, 59, 59, 999);

  const dateFilter = parseDateRange(from, to, 'scheduled_date');
  const idFilter = buildIdFilter(reportType, singleId, 'schedule_id', true) || {};

  const animalConditions = buildAnimalFilterConditions({ farmId, animalType, gender, status, regFrom, regTo, ageMonths });
  const userRange = dateFilter.scheduled_date || {};
  const riskLte = days > 0 ? dueSoonEnd : startOfToday;
  const lte =
    userRange.lte != null
      ? new Date(Math.min(new Date(userRange.lte).getTime(), riskLte.getTime()))
      : riskLte;

  const whereCondition = {
    status: 'Pending',
    ...idFilter,
    scheduled_date: {
      ...userRange,
      lte,
    },
  };
  if (vaccineId) whereCondition.vaccine_id = vaccineId;
  if (Object.keys(animalConditions).length > 0) whereCondition.animal = animalConditions;

  const schedules = await prisma.vaccinationSchedule.findMany({
    where: whereCondition,
    include: {
      animal: { include: { farm: { select: { farm_name: true } } } },
      vaccine: { select: { vaccine_name: true } },
      doctor: { select: { full_name: true } },
      farm: { select: { farm_name: true } },
    },
    orderBy: { scheduled_date: 'asc' },
  });

  const rows = schedules.map((s) => {
    const due = new Date(s.scheduled_date);
    const overdue = due < startOfToday;
    const daysDiff = Math.floor((startOfToday - due) / (1000 * 60 * 60 * 24));
    return {
      schedule_id: s.schedule_id,
      animal_id: s.animal_id ?? '-',
      nickname: s.animal?.nickname || '-',
      animal_type: s.animal?.animal_type || '-',
      farm: s.animal?.farm?.farm_name || s.farm?.farm_name || '-',
      vaccine: s.vaccine?.vaccine_name || '-',
      schedule_type: s.schedule_type,
      scheduled_date: s.scheduled_date,
      days_overdue: overdue ? Math.max(0, daysDiff) : 0,
      urgency: overdue ? 'Overdue' : 'Due Soon',
      doctor: s.doctor?.full_name || '-',
      decision: overdue ? 'Vaccinate immediately' : 'Schedule soon',
    };
  });

  const columns = [
    { key: 'schedule_id', label: 'Schedule ID' },
    { key: 'animal_id', label: 'Animal ID' },
    { key: 'nickname', label: 'Nickname' },
    { key: 'animal_type', label: 'Animal Type' },
    { key: 'farm', label: 'Farm' },
    { key: 'vaccine', label: 'Vaccine' },
    { key: 'schedule_type', label: 'Type' },
    { key: 'scheduled_date', label: 'Scheduled Date' },
    { key: 'days_overdue', label: 'Days Overdue' },
    { key: 'urgency', label: 'Urgency' },
    { key: 'doctor', label: 'Doctor' },
    { key: 'decision', label: 'Decision' },
  ];

  return { columns, rows };
}

/** Coverage % by farm (+ animal type / vaccine filter) for management decisions */
async function buildVaccinationCoverageReport({ farmId, animalType, gender, status, vaccineId, ageMonths }) {
  const animalWhere = buildAnimalFilterConditions({
    farmId,
    animalType,
    gender,
    status: status || 'Active',
    ageMonths,
  });

  const animals = await prisma.animal.findMany({
    where: animalWhere,
    include: {
      farm: { select: { farm_id: true, farm_name: true } },
      vaccinations: vaccineId
        ? { where: { vaccine_id: vaccineId }, select: { vaccination_id: true } }
        : { select: { vaccination_id: true } },
      routineRecords: vaccineId
        ? { where: { vaccine_id: vaccineId }, select: { id: true } }
        : { select: { id: true } },
    },
  });

  let vaccineName = 'All Vaccines';
  if (vaccineId) {
    const v = await prisma.vaccine.findUnique({
      where: { vaccine_id: vaccineId },
      select: { vaccine_name: true },
    });
    vaccineName = v?.vaccine_name || `Vaccine #${vaccineId}`;
  }

  const groups = new Map();
  for (const a of animals) {
    const farmName = a.farm?.farm_name || 'Unknown Farm';
    const typeKey = animalType || a.animal_type || 'All';
    const key = `${farmName}||${typeKey}`;
    if (!groups.has(key)) {
      groups.set(key, {
        farm: farmName,
        animal_type: typeKey,
        vaccine: vaccineName,
        total_animals: 0,
        vaccinated: 0,
      });
    }
    const g = groups.get(key);
    g.total_animals += 1;
    const hasDose = (a.vaccinations?.length || 0) > 0 || (a.routineRecords?.length || 0) > 0;
    if (hasDose) g.vaccinated += 1;
  }

  const rows = [...groups.values()]
    .map((g) => {
      const coverage = g.total_animals > 0 ? (g.vaccinated / g.total_animals) * 100 : 0;
      return {
        farm: g.farm,
        animal_type: g.animal_type,
        vaccine: g.vaccine,
        total_animals: g.total_animals,
        vaccinated: g.vaccinated,
        unvaccinated: g.total_animals - g.vaccinated,
        coverage_pct: Number(coverage.toFixed(1)),
        decision: coverage >= 80 ? 'On track' : coverage >= 50 ? 'Improve coverage' : 'Priority action',
      };
    })
    .sort((a, b) => a.coverage_pct - b.coverage_pct);

  const columns = [
    { key: 'farm', label: 'Farm' },
    { key: 'animal_type', label: 'Animal Type' },
    { key: 'vaccine', label: 'Vaccine Scope' },
    { key: 'total_animals', label: 'Total Animals' },
    { key: 'vaccinated', label: 'Vaccinated' },
    { key: 'unvaccinated', label: 'Unvaccinated' },
    { key: 'coverage_pct', label: 'Coverage %' },
    { key: 'decision', label: 'Decision' },
  ];

  return { columns, rows };
}

/** Stock at risk: expired, expiring soon, low, or out of stock */
async function buildStockRiskReport({ reportType, singleId, from, to, vaccineId, riskDays }) {
  const days = Number.isFinite(Number(riskDays)) ? Math.max(1, parseInt(riskDays, 10)) : 30;
  const now = new Date();
  const soon = new Date(now);
  soon.setDate(soon.getDate() + days);
  soon.setHours(23, 59, 59, 999);

  const commonDateFilter = parseDateRange(from, to, 'purchase_date');
  const idFilter = buildIdFilter(reportType, singleId, 'stock_id', false);
  const whereCondition = { ...idFilter, ...commonDateFilter };
  if (vaccineId) whereCondition.vaccine_id = vaccineId;

  const stocks = await prisma.vaccineStock.findMany({
    where: whereCondition,
    include: { vaccine: { select: { vaccine_name: true } } },
    orderBy: { expiry_date: 'asc' },
  });

  const rows = stocks
    .map((s) => {
      const expiry = new Date(s.expiry_date);
      const remaining = s.quantity_remaining;
      let risk_level = 'OK';
      let decision = 'Monitor';
      let days_to_expiry = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));

      // Align with Inventory: Expired first, then low (<10), then expiring soon
      if (expiry < now) {
        risk_level = 'Expired';
        decision = 'Quarantine / dispose';
      } else if (remaining < STOCK_LOW_THRESHOLD) {
        risk_level = 'Low Stock';
        decision = remaining <= 0 ? 'Reorder immediately' : 'Plan restock';
      } else if (expiry <= soon) {
        risk_level = 'Expiring Soon';
        decision = 'Use before expiry';
      }

      return {
        stock_id: s.stock_id,
        vaccine: s.vaccine?.vaccine_name || '-',
        batch_number: s.batch_number || '-',
        supplier: s.supplier_name || '-',
        remaining,
        purchased: s.quantity_purchased,
        stock_level: `${remaining} / ${s.quantity_purchased} doses`,
        expiry_date: s.expiry_date,
        days_to_expiry,
        risk_window_days: days,
        risk_level,
        status: getStockInventoryStatus(s.expiry_date, remaining),
        decision,
      };
    })
    .filter((r) => r.risk_level !== 'OK');

  const columns = [
    { key: 'vaccine', label: 'Vaccine' },
    { key: 'batch_number', label: 'Batch' },
    { key: 'supplier', label: 'Supplier' },
    { key: 'stock_level', label: 'Remaining Stock' },
    { key: 'expiry_date', label: 'Expiry Date' },
    { key: 'days_to_expiry', label: 'Days To Expiry' },
    { key: 'status', label: 'Inventory Status' },
    { key: 'risk_level', label: 'Risk Level' },
    { key: 'decision', label: 'Decision' },
    { key: 'stock_id', label: 'Stock ID' },
  ];

  return { columns, rows };
}

/** Decision charts: age-group coverage, top doctors, emergency vs routine */
async function buildDecisionInsightsReport({ farmId, animalType, gender, status, ageMonths }) {
  const animalWhere = buildAnimalFilterConditions({
    farmId,
    animalType,
    gender,
    status: status || 'Active',
    ageMonths,
  });

  const animals = await prisma.animal.findMany({
    where: animalWhere,
    include: {
      vaccinations: { select: { vaccination_id: true, administered_by: true } },
      routineRecords: { select: { id: true, administered_by: true } },
    },
  });

  const ageMap = new Map();
  for (const a of animals) {
    const age = Math.round(Number(a.age) || 0);
    const isVacc = (a.vaccinations?.length || 0) + (a.routineRecords?.length || 0) > 0;
    if (!ageMap.has(age)) {
      ageMap.set(age, { name: `${age}`, vaccinated: 0, unvaccinated: 0, sortKey: age, total_animals: 0 });
    }
    const bucket = ageMap.get(age);
    bucket.total_animals++;
    if (isVacc) bucket.vaccinated++;
    else bucket.unvaccinated++;
  }
  
  const ageRows = Array.from(ageMap.values())
    .sort((a, b) => a.sortKey - b.sortKey)
    .map(g => {
      return {
        age_group: g.name,
        total_animals: g.total_animals,
        vaccinated: g.vaccinated,
        unvaccinated: g.unvaccinated,
        decision: g.total_animals === 0 ? 'No animals' : g.unvaccinated > g.vaccinated ? 'Prioritize this age group' : 'Coverage OK'
      };
    });

  const hasAnimalFilter = Object.keys(animalWhere).length > 0;
  const [emergencyRows, routineRows] = await Promise.all([
    prisma.vaccination.findMany({
      where: hasAnimalFilter ? { animal: animalWhere } : {},
      include: {
        user: { select: { user_id: true, full_name: true } },
      },
    }),
    prisma.routineVaccinationRecord.findMany({
      where: hasAnimalFilter ? { animal: animalWhere } : {},
      include: {
        administered_user: { select: { user_id: true, full_name: true } },
      },
    }),
  ]);

  const doctorUsers = await prisma.user.findMany({
    where: { role: { equals: 'Doctor', mode: 'insensitive' }, is_active: true },
    select: { user_id: true, full_name: true },
    orderBy: { full_name: 'asc' },
  });
  const doctorMap = new Map(
    doctorUsers.map((d) => [
      d.user_id,
      { doctor_id: d.user_id, doctor_name: d.full_name, emergency: 0, routine: 0, total: 0 },
    ])
  );
  for (const v of emergencyRows) {
    const id = v.user?.user_id || v.administered_by;
    if (!doctorMap.has(id)) continue;
    const d = doctorMap.get(id);
    d.emergency += 1;
    d.total += 1;
  }
  for (const r of routineRows) {
    const id = r.administered_user?.user_id || r.administered_by;
    if (!doctorMap.has(id)) continue;
    const d = doctorMap.get(id);
    d.routine += 1;
    d.total += 1;
  }

  const topDoctors = [...doctorMap.values()]
    .sort((a, b) => b.total - a.total || a.doctor_name.localeCompare(b.doctor_name));

  const byType = [
    { name: 'Emergency', value: emergencyRows.length },
    { name: 'Routine', value: routineRows.length },
  ];

  const mostNeedyAge = [...ageRows]
    .filter((r) => r.total_animals > 0)
    .sort((a, b) => b.unvaccinated - a.unvaccinated)[0];

  const columns = [
    { key: 'age_group', label: 'Age Group' },
    { key: 'total_animals', label: 'Animals' },
    { key: 'vaccinated', label: 'Vaccinated' },
    { key: 'unvaccinated', label: 'Unvaccinated' },
    { key: 'decision', label: 'Decision' },
  ];

  return {
    columns,
    rows: ageRows,
    insights: {
      age_groups: ageRows.map((r) => ({
        name: r.age_group,
        vaccinated: r.vaccinated,
        unvaccinated: r.unvaccinated,
      })),
      top_doctors: topDoctors.map((d) => ({
        name: d.doctor_name,
        total: d.total,
        emergency: d.emergency,
        routine: d.routine,
      })),
      by_vaccination_type: byType,
      top_doctor_name: topDoctors[0]?.doctor_name || '—',
      top_doctor_doses: topDoctors[0]?.total || 0,
      emergency_total: emergencyRows.length,
      routine_total: routineRows.length,
      priority_age_group: mostNeedyAge?.age_group || '—',
      priority_unvaccinated: mostNeedyAge?.unvaccinated || 0,
    },
  };
}

const getVaccinationReport = async (req, res) => {
  try {
    const moduleName = req.query.module || 'animals';
    const reportType = req.query.type || 'all'; // all | single | between
    const format = req.query.format || 'json'; // json | pdf
    const singleId = req.query.single_id || null;
    const from = req.query.from || null;
    const to = req.query.to || null;
    const farmId = req.query.farm_id ? parseInt(req.query.farm_id) : null;
    const animalType = req.query.animal_type || null;
    const gender = req.query.gender || null;
    const status = req.query.status || null;
    const regFrom = req.query.reg_from || null;
    const regTo = req.query.reg_to || null;
    const vaccineId = req.query.vaccine_id ? parseInt(req.query.vaccine_id, 10) : null;
    const riskDays = req.query.risk_days != null && req.query.risk_days !== ''
      ? parseInt(req.query.risk_days, 10)
      : null;
    const ageMonths = req.query.age != null && req.query.age !== ''
      ? parseFloat(req.query.age)
      : null;

    const allowedModules = [
      'animals',
      'vaccinated_animals',
      'animal_status',
      'unvaccinated_animals',
      'routine_vaccinations',
      'emergency_vaccinations',
      'overdue_vaccinations',
      'vaccination_coverage',
      'decision_insights',
      'farms',
      'stock',
      'stock_risk',
      'schedules',
      'queue',
      'mortality',
      'alerts',
    ];

    if (!allowedModules.includes(moduleName)) {
      return res.status(400).json({ error: 'Invalid report module.' });
    }
    if (!['all', 'single', 'between'].includes(reportType)) {
      return res.status(400).json({ error: 'Invalid report type.' });
    }
    if (reportType === 'single' && !singleId) {
      return res.status(400).json({ error: 'single_id is required for single report.' });
    }
    if (reportType === 'between' && !from && !to) {
      return res.status(400).json({ error: 'Please provide start and/or end date for Between Dates.' });
    }

    // Map query type to real DB filters (All ignores dates/id; Single uses id; Between uses dates)
    const scoped = resolveQueryScope(reportType, singleId, from, to);

    const builders = {
      animals: buildAnimalReport,
      vaccinated_animals: buildVaccinatedAnimalsReport,
      animal_status: buildAnimalStatusReport,
      unvaccinated_animals: buildUnvaccinatedAnimalsReport,
      routine_vaccinations: buildRoutineVaccinationsReport,
      emergency_vaccinations: buildEmergencyVaccinationsReport,
      overdue_vaccinations: buildOverdueVaccinationsReport,
      vaccination_coverage: buildVaccinationCoverageReport,
      decision_insights: buildDecisionInsightsReport,
      farms: buildFarmReport,
      stock: buildStockReport,
      stock_risk: buildStockRiskReport,
      schedules: buildScheduleReport,
      queue: buildQueueReport,
      mortality: buildMortalityReport,
      alerts: buildAlertsReport,
    };

    let { columns, rows, insights } = await builders[moduleName]({
      reportType,
      singleId: scoped.singleId,
      from: scoped.from,
      to: scoped.to,
      farmId,
      animalType,
      gender,
      status,
      regFrom,
      regTo,
      vaccineId,
      riskDays,
      ageMonths,
    });

    const summary = buildReportSummary(moduleName, rows);
    if (insights) {
      summary.emergency_total = insights.emergency_total;
      summary.routine_total = insights.routine_total;
      summary.top_doctor_doses = insights.top_doctor_doses;
      summary.priority_unvaccinated = insights.priority_unvaccinated;
    }

    // Animal Registration should be about the animal itself.
    // Hide vaccination/dose summary columns (Emergency/Routine/Total Doses, Alerts, Schedules).
    if (moduleName === 'animals') {
      const hiddenKeys = new Set([
        'emergency_doses',
        'routine_doses',
        'total_doses',
        'alerts_count',
        'schedules_count',
      ]);
      columns = (columns || []).filter((c) => !hiddenKeys.has(c.key));
    }

    if (format === 'pdf') {
      const pageMargin = 36;
      const footerReserve = 110;
      const doc = new PDFDocument({
        margin: pageMargin,
        size: 'A4',
        layout: 'landscape',
        bufferPages: true,
      });
      const fileName = `${moduleName}_report_${reportType}_${Date.now()}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      doc.pipe(res);

      const pageWidth = doc.page.width;
      const contentWidth = pageWidth - pageMargin * 2;
      const generatedAt = new Date();
      const generatedAtText = generatedAt.toLocaleString();
      const generatedBy = req.user?.name || 'System User';
      const reportedBy = req.user?.role || req.user?.name || 'Staff';
      const reportTitle = getPdfReportTitle(moduleName, reportType);

      // ---------- Header: logo + company name same line; project + report centered below ----------
      const logoPath = path.join(
        __dirname,
        '../../../frontend/public/img/463865371_8646484958778270_5136213218242522965_n-removebg-preview.png'
      );
      const logoSize = 52;
      const companyFontSize = 20;
      // Logo PNG has transparent padding — pull company name closer to the visible circle
      const companyGap = -4;
      doc.font('Helvetica-Bold').fontSize(companyFontSize);
      const companyWidth = doc.widthOfString(PDF_BRAND.centerName);
      const headerBlockWidth = logoSize + companyGap + companyWidth;
      const headerStartX = (pageWidth - headerBlockWidth) / 2;
      const companyNameX = headerStartX + logoSize + companyGap;
      let headerY = pageMargin;

      try {
        doc.image(logoPath, headerStartX, headerY, { width: logoSize, height: logoSize });
      } catch (e) {
        console.warn('Logo not found for PDF', e);
      }

      // Company name starts right beside the logo (user place)
      const companyTextY = headerY + (logoSize / 2) - (companyFontSize * 0.35);
      doc.font('Helvetica-Bold').fontSize(companyFontSize).fillColor('#0F172A')
        .text(PDF_BRAND.centerName, companyNameX, companyTextY, {
          width: companyWidth + 8,
          lineBreak: false,
        });

      headerY = headerY + logoSize + 8;
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#334155')
        .text(PDF_BRAND.systemName, pageMargin, headerY, { width: contentWidth, align: 'center' });
      headerY = doc.y + 2;
      doc.font('Helvetica-Bold').fontSize(13).fillColor('#0F172A')
        .text(reportTitle, pageMargin, headerY, { width: contentWidth, align: 'center' });

      // ---------- Metadata: Generated at (left) / Generated by (right) ----------
      const metaY = doc.y + 14;
      doc.font('Helvetica').fontSize(9).fillColor('#334155')
        .text(`Generated at: ${generatedAtText}`, pageMargin, metaY, { width: contentWidth / 2, align: 'left' });
      doc.font('Helvetica').fontSize(9).fillColor('#334155')
        .text(`Generated by: ${generatedBy}`, pageMargin + contentWidth / 2, metaY, {
          width: contentWidth / 2,
          align: 'right',
        });
      doc.y = metaY + 18;

      // ---------- Data table ----------
      const tableHeaders = columns.map((c) => ({
        label: c.label,
        headerColor: PDF_BRAND.brandBlue,
        headerOpacity: 1,
        align: 'left',
        headerAlign: 'left',
      }));
      const tableRows = rows.map((r) => columns.map((c) => toDisplayValue(r[c.key])));

      try {
        await doc.table(
          { headers: tableHeaders, rows: tableRows },
          {
            prepareHeader: () => {
              doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#FFFFFF');
            },
            prepareRow: (row, indexColumn, indexRow, rectRow) => {
              if (indexColumn === 0) {
                doc.addBackground(rectRow, indexRow % 2 ? '#F8FAFC' : '#FFFFFF');
              }
              doc.font('Helvetica').fontSize(7.5).fillColor('#0F172A');
            },
            x: pageMargin,
            width: contentWidth,
            padding: 4,
            columnsSize: undefined,
            margins: {
              top: pageMargin,
              bottom: footerReserve,
              left: pageMargin,
              right: pageMargin,
            },
          }
        );
      } catch (err) {
        console.error('PDF Table Generation Error:', err);
        doc.font('Helvetica').fontSize(10).fillColor('#EF4444')
          .text('Unable to render report table.', pageMargin, doc.y + 10);
      }

      // ---------- Total count under table (e.g. Total: 3) ----------
      const totalLineY = doc.y + 10;
      const neededForTotal = totalLineY + 36;
      const pageBottomLimit = doc.page.height - footerReserve;
      if (neededForTotal > pageBottomLimit) {
        doc.addPage();
      }
      const lineY = doc.y + 8;
      doc.strokeColor('#334155').lineWidth(1.2);
      doc.moveTo(pageMargin, lineY).lineTo(pageMargin + contentWidth, lineY).stroke();
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#0F172A')
        .text(`Total: ${rows.length}`, pageMargin, lineY + 8, {
          width: contentWidth,
          align: 'right',
        });
      doc.y = lineY + 28;

      // ---------- Signature / footer block on last page ----------
      const drawSignatureFooter = (pageIndex) => {
        doc.switchToPage(pageIndex);
        const pageH = doc.page.height;
        const pageW = doc.page.width;
        const colWidth = 200;
        const leftX = pageMargin;
        const rightX = pageW - pageMargin - colWidth;
        const lineY = pageH - 88;
        const textY = lineY + 6;

        doc.strokeColor('#94A3B8').lineWidth(0.8);
        doc.moveTo(leftX, lineY).lineTo(leftX + colWidth, lineY).stroke();
        doc.moveTo(rightX, lineY).lineTo(rightX + colWidth, lineY).stroke();

        doc.font('Helvetica').fontSize(9).fillColor('#0F172A')
          .text('Reported By: ', leftX, textY, { continued: true })
          .font('Helvetica-Bold').text(String(reportedBy));
        doc.font('Helvetica').fontSize(8).fillColor('#64748B')
          .text(`Date: ${formatPdfLongDate(generatedAt)}`, leftX, textY + 14);

        doc.font('Helvetica-Bold').fontSize(9).fillColor('#0F172A')
          .text('Authorized Signature & Stamp', rightX, textY, { width: colWidth });
        doc.font('Helvetica').fontSize(8).fillColor('#64748B')
          .text(PDF_BRAND.authorizedTitle, rightX, textY + 14, { width: colWidth });

        const contact = getPdfCenterContactLine();
        const centerY = pageH - 42;
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#0F172A')
          .text(PDF_BRAND.centerName, pageMargin, centerY, { width: contentWidth, align: 'center' });
        if (contact) {
          doc.font('Helvetica').fontSize(7.5).fillColor('#64748B')
            .text(contact, pageMargin, centerY + 12, { width: contentWidth, align: 'center' });
        }
      };

      const range = doc.bufferedPageRange();
      const lastPageIndex = range.start + range.count - 1;
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        const isLast = i === lastPageIndex;
        doc.fontSize(8).fillColor('#94A3B8').text(
          `Page ${i - range.start + 1} of ${range.count}`,
          pageMargin,
          isLast ? doc.page.height - 18 : doc.page.height - 28,
          {
            width: isLast ? 120 : contentWidth,
            align: isLast ? 'left' : 'center',
            lineBreak: false,
          }
        );
      }
      // Signature block on the last page only (like the example)
      drawSignatureFooter(lastPageIndex);

      doc.end();
      return;
    }

    res.json({
      module: moduleName,
      report_type: reportType,
      generated_at: new Date().toISOString(),
      total_rows: rows.length,
      summary,
      insights: insights || null,
      columns,
      rows,
    });
  } catch (error) {
    console.error('getVaccinationReport error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate report.' });
  }
};

module.exports = { getVaccinationReport };

