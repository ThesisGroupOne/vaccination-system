const path = require('path');
const prisma = require(path.join(__dirname, '../../config/db'));

// Helper: Log an activity (call this from other controllers)
const logActivity = async ({ action, entity, entity_id, description, user_id, user_name, user_role, ip_address }) => {
  try {
    await prisma.activityLog.create({
      data: { action, entity, entity_id, description, user_id, user_name, user_role, ip_address }
    });
  } catch (err) {
    console.error('Failed to log activity:', err.message);
  }
};

// GET /api/activity-logs
const getActivityLogs = async (req, res) => {
  try {
    const { page = 1, limit = 30, action, entity, user_id, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (action) where.action = action;
    if (entity) where.entity = entity;
    if (user_id) where.user_id = parseInt(user_id);
    if (search) {
      where.description = { contains: search, mode: 'insensitive' };
    }

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.activityLog.count({ where }),
    ]);

    res.json({
      logs,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({ error: 'Failed to fetch activity logs' });
  }
};

// GET /api/activity-logs/stats
const getActivityStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalToday, totalAll, byAction, byEntity] = await Promise.all([
      prisma.activityLog.count({ where: { created_at: { gte: today } } }),
      prisma.activityLog.count(),
      prisma.activityLog.groupBy({ by: ['action'], _count: { id: true }, orderBy: { _count: { id: 'desc' } } }),
      prisma.activityLog.groupBy({ by: ['entity'], _count: { id: true }, orderBy: { _count: { id: 'desc' } } }),
    ]);

    res.json({
      totalToday,
      totalAll,
      byAction: byAction.map(a => ({ action: a.action, count: a._count.id })),
      byEntity: byEntity.map(e => ({ entity: e.entity, count: e._count.id })),
    });
  } catch (error) {
    console.error('Error fetching activity stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};

module.exports = { logActivity, getActivityLogs, getActivityStats };
