const path = require('path');
const prisma = require(path.join(__dirname, '../../config/db'));
const { logActivity } = require('./activityLogController');

/**
 * POST /api/delegations
 * Delegator wuxuu u diraa shaqo user kale
 */
const createDelegation = async (req, res) => {
  const { schedule_id, to_user_id, reason, from_user_id: body_from_user_id } = req.body;
  const from_user_id = body_from_user_id ? parseInt(body_from_user_id) : req.user?.userId;

  try {
    if (!schedule_id || !reason) {
      return res.status(400).json({ error: 'schedule_id and reason are required.' });
    }
    if (to_user_id && parseInt(to_user_id) === from_user_id) {
      return res.status(400).json({ error: 'Cannot delegate a task to yourself.' });
    }

    // Check schedule exists and is still Pending
    const schedule = await prisma.vaccinationSchedule.findUnique({
      where: { schedule_id: parseInt(schedule_id) },
      include: { animal: true, vaccine: true },
    });
    if (!schedule) return res.status(404).json({ error: 'Schedule not found.' });
    if (schedule.status === 'Completed') {
      return res.status(409).json({ error: 'Cannot delegate a completed schedule.' });
    }

    // Check no active delegation already exists for this schedule
    const existing = await prisma.taskDelegation.findFirst({
      where: { schedule_id: parseInt(schedule_id), status: 'Pending' },
    });
    if (existing) {
      return res.status(409).json({ error: 'This schedule already has a pending delegation.' });
    }

    // Check target user exists if provided
    let toUser = null;
    if (to_user_id) {
      toUser = await prisma.user.findUnique({ where: { user_id: parseInt(to_user_id) } });
      if (!toUser) return res.status(404).json({ error: 'Target user not found.' });
      if (toUser.role !== 'Doctor' || !toUser.is_authorized) {
        return res.status(400).json({
          error: 'You can only delegate to an authorized Doctor. Ask Admin to authorize them first.',
        });
      }
    }

    const delegation = await prisma.taskDelegation.create({
      data: {
        schedule_id: parseInt(schedule_id),
        from_user_id,
        to_user_id: to_user_id ? parseInt(to_user_id) : null,
        reason,
      },
      include: {
        schedule: { include: { animal: true, vaccine: true } },
        from_user: { select: { user_id: true, full_name: true, role: true } },
        to_user: { select: { user_id: true, full_name: true, role: true } },
      },
    });

    if (to_user_id) {
      // Wareejinta rasmiga ah ee shaqada (Immediate Transfer) haddii loo diray qof gaar ah
      await prisma.vaccinationSchedule.update({
        where: { schedule_id: parseInt(schedule_id) },
        data: { doctor_id: parseInt(to_user_id) }
      });
    }

    await logActivity({
      action: 'DELEGATE',
      entity: 'TaskDelegation',
      entity_id: delegation.id,
      description: `User delegated schedule #${schedule_id}${toUser ? ' to ' + toUser.full_name : ''}. Reason: ${reason}`,
      user_id: from_user_id,
      user_name: req.user?.name,
      user_role: req.user?.role,
    });

    res.status(201).json(delegation);
  } catch (error) {
    console.error('createDelegation error:', error);
    res.status(400).json({ error: error.message });
  }
};

/**
 * GET /api/delegations/received
 * Delegations la soo diray current user
 */
const getReceivedDelegations = async (req, res) => {
  const userId = req.user?.userId;
  try {
    const delegations = await prisma.taskDelegation.findMany({
      where: { to_user_id: userId },
      include: {
        schedule: { include: { animal: true, vaccine: true } },
        from_user: { select: { user_id: true, full_name: true, role: true } },
        to_user: { select: { user_id: true, full_name: true, role: true } },
      },
      orderBy: { created_at: 'desc' },
    });
    res.json(delegations);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * GET /api/delegations/sent
 * Delegations current user uu u diray kuwa kale
 */
const getSentDelegations = async (req, res) => {
  const userId = req.user?.userId;
  try {
    const delegations = await prisma.taskDelegation.findMany({
      where: { from_user_id: userId },
      include: {
        schedule: { include: { animal: true, vaccine: true } },
        from_user: { select: { user_id: true, full_name: true, role: true } },
        to_user: { select: { user_id: true, full_name: true, role: true } },
      },
      orderBy: { created_at: 'desc' },
    });
    res.json(delegations);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * GET /api/delegations/all  (Admin only)
 */
const getAllDelegations = async (req, res) => {
  try {
    const delegations = await prisma.taskDelegation.findMany({
      include: {
        schedule: { include: { animal: true, vaccine: true } },
        from_user: { select: { user_id: true, full_name: true, role: true } },
        to_user: { select: { user_id: true, full_name: true, role: true } },
      },
      orderBy: { created_at: 'desc' },
    });
    res.json(delegations);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * PATCH /api/delegations/:id/respond
 * body: { status: 'Accepted' | 'Rejected' }
 * Only the to_user can respond
 */
const respondDelegation = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const userId = req.user?.userId;

  if (!['Accepted', 'Rejected'].includes(status)) {
    return res.status(400).json({ error: 'status must be Accepted or Rejected.' });
  }

  try {
    const delegation = await prisma.taskDelegation.findUnique({
      where: { id: parseInt(id) },
      include: { to_user: true, from_user: true, schedule: { include: { vaccine: true, animal: true } } },
    });
    if (!delegation) return res.status(404).json({ error: 'Delegation not found.' });
    if (delegation.to_user_id !== userId) {
      return res.status(403).json({ error: 'Only the assigned user can respond to this delegation.' });
    }
    if (delegation.status !== 'Pending') {
      return res.status(409).json({ error: `Delegation already ${delegation.status}.` });
    }

    const updated = await prisma.taskDelegation.update({
      where: { id: parseInt(id) },
      data: { status, responded_at: new Date() },
      include: {
        schedule: { include: { animal: true, vaccine: true } },
        from_user: { select: { user_id: true, full_name: true, role: true } },
        to_user: { select: { user_id: true, full_name: true, role: true } },
      },
    });

    // Haddii la diiday (Rejected), ku celi shaqada qofkii hore (from_user_id)
    if (status === 'Rejected') {
      await prisma.vaccinationSchedule.update({
        where: { schedule_id: delegation.schedule_id },
        data: { doctor_id: delegation.from_user_id }
      });
    }

    await logActivity({
      action: 'DELEGATE_RESPOND',
      entity: 'TaskDelegation',
      entity_id: parseInt(id),
      description: `${req.user?.name} ${status.toLowerCase()} delegation #${id} from ${delegation.from_user.full_name}`,
      user_id: userId,
      user_name: req.user?.name,
      user_role: req.user?.role,
    });

    res.json(updated);
  } catch (error) {
    console.error('respondDelegation error:', error);
    res.status(400).json({ error: error.message });
  }
};

/**
 * DELETE /api/delegations/:id  (cancel by sender)
 */
const cancelDelegation = async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.userId;
  try {
    const delegation = await prisma.taskDelegation.findUnique({ where: { id: parseInt(id) } });
    if (!delegation) return res.status(404).json({ error: 'Delegation not found.' });
    if (delegation.from_user_id !== userId) {
      return res.status(403).json({ error: 'Only the delegator can cancel this delegation.' });
    }
    if (delegation.status !== 'Pending') {
      return res.status(409).json({ error: `Cannot cancel a delegation that is already ${delegation.status}.` });
    }
    await prisma.taskDelegation.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'Delegation cancelled.' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * PATCH /api/delegations/:id/assign  (Admin only)
 * body: { to_user_id: number }
 */
const assignDelegation = async (req, res) => {
  const { id } = req.params;
  const { to_user_id } = req.body;

  if (req.user?.role !== 'Admin') {
    return res.status(403).json({ error: 'Only admins can assign delegations.' });
  }

  if (!to_user_id) {
    return res.status(400).json({ error: 'to_user_id is required.' });
  }

  try {
    const delegation = await prisma.taskDelegation.findUnique({
      where: { id: parseInt(id) }
    });
    if (!delegation) return res.status(404).json({ error: 'Delegation not found.' });

    const toUser = await prisma.user.findUnique({ where: { user_id: parseInt(to_user_id) } });
    if (!toUser) return res.status(404).json({ error: 'Target user not found.' });

    const updated = await prisma.taskDelegation.update({
      where: { id: parseInt(id) },
      data: { to_user_id: parseInt(to_user_id), status: 'Accepted' }, // Automatically accepted when Admin assigns
      include: {
        schedule: { include: { animal: true, vaccine: true } },
        from_user: { select: { user_id: true, full_name: true, role: true } },
        to_user: { select: { user_id: true, full_name: true, role: true } },
      },
    });

    // Wareeji shaqada rasmiga ah
    await prisma.vaccinationSchedule.update({
      where: { schedule_id: delegation.schedule_id },
      data: { doctor_id: parseInt(to_user_id) }
    });

    await logActivity({
      action: 'DELEGATE_ASSIGN',
      entity: 'TaskDelegation',
      entity_id: parseInt(id),
      description: `Admin assigned delegation #${id} to ${toUser.full_name}`,
      user_id: req.user?.userId,
      user_name: req.user?.name,
      user_role: req.user?.role,
    });

    res.json(updated);
  } catch (error) {
    console.error('assignDelegation error:', error);
    res.status(400).json({ error: error.message });
  }
};

module.exports = {
  createDelegation,
  getReceivedDelegations,
  getSentDelegations,
  getAllDelegations,
  respondDelegation,
  cancelDelegation,
  assignDelegation,
};
