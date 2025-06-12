const BorrowRecord = require('../../models/BorrowRecord');
const Book = require('../../models/Book');
const User = require('../../models/User');
const AppError = require('../../utils/appError');

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

const borrowResolvers = {
  Query: {
    borrows: async (parent, { page = 1, limit = 10, filter = {} }, { user }) => {
      try {
        requireAuth(user);

        const skip = (page - 1) * limit;
        
        // Build filter query
        let query = {};
        
        if (filter.userId) {
          query.user = filter.userId;
        }
        if (filter.bookId) {
          query.book = filter.bookId;
        }
        if (filter.status) {
          query.status = filter.status;
        }
        if (filter.overdue === true) {
          query.dueDate = { $lt: new Date() };
          query.status = 'active';
        }

        // Non-admin users can only see their own borrows
        if (user.role !== 'Admin') {
          query.user = user.id;
        }

        const borrows = await BorrowRecord.find(query)
          .populate('user', 'name email')
          .populate('book', 'title author isbn')
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 });

        const total = await BorrowRecord.countDocuments(query);

        return {
          success: true,
          count: borrows.length,
          total,
          page,
          pages: Math.ceil(total / limit),
          data: borrows,
        };
      } catch (error) {
        throw new Error(`Failed to fetch borrows: ${error.message}`);
      }
    },

    borrow: async (parent, { id }, { user }) => {
      try {
        requireAuth(user);

        const borrow = await BorrowRecord.findById(id)
          .populate('user', 'name email')
          .populate('book', 'title author isbn');

        if (!borrow) {
          throw new Error('Borrow record not found');
        }

        // Non-admin users can only see their own borrows
        if (user.role !== 'Admin' && borrow.user._id.toString() !== user.id) {
          throw new Error('Access denied');
        }

        return {
          success: true,
          data: borrow,
        };
      } catch (error) {
        throw new Error(`Failed to fetch borrow: ${error.message}`);
      }
    },

    myBorrows: async (parent, { page = 1, limit = 10 }, { user }) => {
      try {
        requireAuth(user);

        const skip = (page - 1) * limit;

        const borrows = await BorrowRecord.find({ user: user.id })
          .populate('book', 'title author isbn')
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 });

        const total = await BorrowRecord.countDocuments({ user: user.id });

        return {
          success: true,
          count: borrows.length,
          total,
          page,
          pages: Math.ceil(total / limit),
          data: borrows,
        };
      } catch (error) {
        throw new Error(`Failed to fetch your borrows: ${error.message}`);
      }
    },

    overdueBorrows: async (parent, { page = 1, limit = 10 }, { user }) => {
      try {
        requireAdmin(user);

        const skip = (page - 1) * limit;

        const borrows = await BorrowRecord.findOverdue()
          .populate('user', 'name email')
          .populate('book', 'title author isbn')
          .skip(skip)
          .limit(limit)
          .sort({ dueDate: 1 });

        const total = await BorrowRecord.countDocuments({
          dueDate: { $lt: new Date() },
          status: 'active',
        });

        return {
          success: true,
          count: borrows.length,
          total,
          page,
          pages: Math.ceil(total / limit),
          data: borrows,
        };
      } catch (error) {
        throw new Error(`Failed to fetch overdue borrows: ${error.message}`);
      }
    },
  },

  Mutation: {
    borrowBook: async (parent, { input }, { user }) => {
      try {
        requireAuth(user);

        const { userId, bookId, notes } = input;

        // Non-admin users can only borrow for themselves
        const targetUserId = user.role === 'Admin' ? userId : user.id;

        // Check if user can borrow more books
        const canBorrow = await BorrowRecord.canUserBorrow(targetUserId);
        if (!canBorrow) {
          throw new Error('User has reached maximum borrow limit or has overdue books');
        }

        // Check if book is available
        const book = await Book.findById(bookId);
        if (!book || !book.isBookAvailable()) {
          throw new Error('Book is not available for borrowing');
        }

        // Create borrow record
        const borrowData = {
          user: targetUserId,
          book: bookId,
          notes,
        };

        const borrow = await BorrowRecord.create(borrowData);

        // Update book availability
        await book.borrowCopy();

        const populatedBorrow = await BorrowRecord.findById(borrow._id)
          .populate('user', 'name email')
          .populate('book', 'title author isbn');

        return {
          success: true,
          message: 'Book borrowed successfully',
          data: populatedBorrow,
        };
      } catch (error) {
        throw new Error(`Failed to borrow book: ${error.message}`);
      }
    },

    returnBook: async (parent, { id, input = {} }, { user }) => {
      try {
        requireAuth(user);

        const borrow = await BorrowRecord.findById(id)
          .populate('user', 'name email')
          .populate('book', 'title author isbn');

        if (!borrow) {
          throw new Error('Borrow record not found');
        }

        // Non-admin users can only return their own books
        if (user.role !== 'Admin' && borrow.user._id.toString() !== user.id) {
          throw new Error('Access denied');
        }

        if (borrow.status !== 'active') {
          throw new Error('Book has already been returned');
        }

        // Return the book
        const returnedBorrow = await borrow.returnBook();

        // Update any additional fields if provided
        if (input.notes) {
          returnedBorrow.notes = input.notes;
          await returnedBorrow.save();
        }

        return {
          success: true,
          message: 'Book returned successfully',
          data: returnedBorrow,
        };
      } catch (error) {
        throw new Error(`Failed to return book: ${error.message}`);
      }
    },

    renewBook: async (parent, { id }, { user }) => {
      try {
        requireAuth(user);

        const borrow = await BorrowRecord.findById(id)
          .populate('user', 'name email')
          .populate('book', 'title author isbn');

        if (!borrow) {
          throw new Error('Borrow record not found');
        }

        // Non-admin users can only renew their own books
        if (user.role !== 'Admin' && borrow.user._id.toString() !== user.id) {
          throw new Error('Access denied');
        }

        const renewedBorrow = await borrow.renewBook();

        return {
          success: true,
          message: 'Book renewed successfully',
          data: renewedBorrow,
        };
      } catch (error) {
        throw new Error(`Failed to renew book: ${error.message}`);
      }
    },

    updateBorrow: async (parent, { id, input }, { user }) => {
      try {
        requireAdmin(user);

        const borrow = await BorrowRecord.findByIdAndUpdate(
          id,
          input,
          {
            new: true,
            runValidators: true,
          }
        )
          .populate('user', 'name email')
          .populate('book', 'title author isbn');

        if (!borrow) {
          throw new Error('Borrow record not found');
        }

        return {
          success: true,
          message: 'Borrow record updated successfully',
          data: borrow,
        };
      } catch (error) {
        throw new Error(`Failed to update borrow: ${error.message}`);
      }
    },
  },
};

module.exports = borrowResolvers;