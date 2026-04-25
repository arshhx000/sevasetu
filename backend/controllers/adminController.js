const Complaint = require('../models/Complaint');
const User = require('../models/User');

exports.getCitizens = async (_req, res) => {
  try {
    const citizens = await User.find({ role: 'citizen' })
      .select('name firstName lastName email phone ward isActive createdAt')
      .sort({ createdAt: -1 });
    return res.json({ citizens });
  } catch (error) {
    return res.status(500).json({ message: 'Could not load citizens', error: error.message });
  }
};

exports.getOfficerPerformance = async (_req, res) => {
  try {
    const [officers, agg] = await Promise.all([
      User.find({ role: 'officer' }).select('name email employeeId department isActive'),
      Complaint.aggregate([
        {
          $group: {
            _id: '$assignedTo',
            totalAssigned: { $sum: 1 },
            resolvedCount: {
              $sum: {
                $cond: [{ $eq: ['$status', 'Resolved'] }, 1, 0]
              }
            },
            inProgressCount: {
              $sum: {
                $cond: [{ $eq: ['$status', 'In Progress'] }, 1, 0]
              }
            }
          }
        }
      ])
    ]);

    const byOfficerId = new Map(
      agg
        .filter((row) => row._id)
        .map((row) => [String(row._id), row])
    );

    const performance = officers.map((officer) => {
      const row = byOfficerId.get(String(officer._id));
      return {
        officer,
        totalAssigned: row?.totalAssigned || 0,
        resolvedCount: row?.resolvedCount || 0,
        inProgressCount: row?.inProgressCount || 0
      };
    });

    return res.json({ performance });
  } catch (error) {
    return res.status(500).json({ message: 'Could not load officer performance', error: error.message });
  }
};
