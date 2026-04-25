const Complaint = require('../models/Complaint');

exports.getStats = async (req, res) => {
  try {
    const base = req.user.role === 'citizen' ? { submittedBy: req.user.id } : {};
    const now = new Date();
    const monthStarts = [];

    for (let i = 5; i >= 0; i -= 1) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthStarts.push(monthDate);
    }

    const firstMonthStart = monthStarts[0];

    const [total, pending, inProgress, criticalEscalated, resolved, recent, monthlyAgg] = await Promise.all([
      Complaint.countDocuments(base),
      Complaint.countDocuments({ ...base, status: 'Pending' }),
      Complaint.countDocuments({ ...base, status: 'In Progress' }),
      Complaint.countDocuments({ ...base, $or: [{ priority: 'Critical' }, { status: 'Escalated' }] }),
      Complaint.countDocuments({ ...base, status: 'Resolved' }),
      Complaint.find(base).sort({ createdAt: -1 }).limit(5).populate('submittedBy', 'name').populate('assignedTo', 'name role'),
      Complaint.aggregate([
        { $match: { ...base, createdAt: { $gte: firstMonthStart } } },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            total: { $sum: 1 }
          }
        }
      ])
    ]);

    const monthlyMap = new Map(monthlyAgg.map((row) => [`${row._id.year}-${row._id.month}`, row.total]));
    const monthlyTrend = monthStarts.map((monthStart) => {
      const year = monthStart.getFullYear();
      const month = monthStart.getMonth() + 1;
      const label = monthStart.toLocaleString('en-US', { month: 'short' });
      const key = `${year}-${month}`;
      return {
        month: label,
        total: monthlyMap.get(key) || 0
      };
    });

    return res.json({ stats: { total, pending, inProgress, criticalEscalated, resolved }, recent, monthlyTrend });
  } catch (error) {
    return res.status(500).json({ message: 'Could not load dashboard stats', error: error.message });
  }
};
