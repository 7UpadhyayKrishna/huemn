const User = require('../../models/User');
const Book = require('../../models/Book');
const BorrowRecord = require('../../models/BorrowRecord');

const requireAuth = (user) => {
  if (!user) {
    throw new Error('Authentication required');
  }
};

const requireAdmin = (user) => {
  requireAuth(user);
  if (user.role !== 'Admin') {
    throw new Error('Admin access required');
  }
};

const statsResolvers = {
  Query: {
    libraryStats: async (parent, args, { user }) => {
      try {
        requireAdmin(user);

        const [
          totalUsers,
          totalBooks,
          totalBorrows,
          activeBorrows,
          overdueBorrows,
          fineAggregation,
        ] = await Promise.all([
          User.countDocuments({ isActive: true }),
          Book.countDocuments({ isActive: true }),
          BorrowRecord.countDocuments(),
          BorrowRecord.countDocuments({ status: 'active' }),
          BorrowRecord.countDocuments({
            status: 'active',
            dueDate: { $lt: new Date() },
          }),
          BorrowRecord.aggregate([
            { $group: { _id: null, totalFines: { $sum: '$fine' } } },
          ]),
        ]);

        const totalFines = fineAggregation.length > 0 ? fineAggregation[0].totalFines : 0;

        return {
          totalUsers,
          totalBooks,
          totalBorrows,
          activeBorrows,
          overdueBorrows,
          totalFines,
        };
      } catch (error) {
        throw new Error(`Failed to fetch library statistics: ${error.message}`);
      }
    },
  },
};

module.exports = statsResolvers;