const Book = require('../models/Book');
const User = require('../models/User');
const BorrowRecord = require('../models/BorrowRecord');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/appError');

// @desc    Get most borrowed books
// @route   GET /api/analytics/most-borrowed-books
// @access  Admin
const getMostBorrowedBooks = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 10;

  const pipeline = [
    {
      $group: {
        _id: '$book',
        borrowCount: { $sum: 1 },
        activeBorrows: {
          $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
        },
        totalFines: { $sum: '$fine' }
      }
    },
    {
      $lookup: {
        from: 'books',
        localField: '_id',
        foreignField: '_id',
        as: 'bookDetails'
      }
    },
    {
      $unwind: '$bookDetails'
    },
    {
      $match: {
        'bookDetails.isActive': true
      }
    },
    {
      $project: {
        _id: 0,
        book: {
          id: '$bookDetails._id',
          title: '$bookDetails.title',
          author: '$bookDetails.author',
          isbn: '$bookDetails.isbn',
          genre: '$bookDetails.genre'
        },
        borrowCount: 1,
        activeBorrows: 1,
        totalFines: 1,
        popularityScore: {
          $add: [
            { $multiply: ['$borrowCount', 0.7] },
            { $multiply: ['$activeBorrows', 0.3] }
          ]
        }
      }
    },
    {
      $sort: { borrowCount: -1, popularityScore: -1 }
    },
    {
      $limit: limit
    }
  ];

  const results = await BorrowRecord.aggregate(pipeline);

  res.status(200).json({
    success: true,
    count: results.length,
    data: results,
  });
});

// @desc    Get most active members
// @route   GET /api/analytics/most-active-members
// @access  Admin
const getMostActiveMembers = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 10;

  const pipeline = [
    {
      $group: {
        _id: '$user',
        totalBorrows: { $sum: 1 },
        activeBorrows: {
          $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
        },
        returnedBooks: {
          $sum: { $cond: [{ $eq: ['$status', 'returned'] }, 1, 0] }
        },
        overdueBooks: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$status', 'active'] },
                  { $lt: ['$dueDate', new Date()] }
                ]
              },
              1,
              0
            ]
          }
        },
        totalFines: { $sum: '$fine' },
        totalRenewals: { $sum: '$renewalCount' },
        avgBorrowDuration: {
          $avg: {
            $cond: [
              { $ne: ['$returnDate', null] },
              {
                $divide: [
                  { $subtract: ['$returnDate', '$borrowDate'] },
                  1000 * 60 * 60 * 24 // Convert to days
                ]
              },
              null
            ]
          }
        }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'userDetails'
      }
    },
    {
      $unwind: '$userDetails'
    },
    {
      $match: {
        'userDetails.isActive': true
      }
    },
    {
      $project: {
        _id: 0,
        user: {
          id: '$userDetails._id',
          name: '$userDetails.name',
          email: '$userDetails.email',
          role: '$userDetails.role',
          membershipDate: '$userDetails.membershipDate'
        },
        totalBorrows: 1,
        activeBorrows: 1,
        returnedBooks: 1,
        overdueBooks: 1,
        totalFines: 1,
        totalRenewals: 1,
        avgBorrowDuration: { $round: ['$avgBorrowDuration', 1] },
        activityScore: {
          $add: [
            { $multiply: ['$totalBorrows', 0.4] },
            { $multiply: ['$returnedBooks', 0.3] },
            { $multiply: ['$totalRenewals', 0.2] },
            { $subtract: [0, { $multiply: ['$overdueBooks', 0.1] }] }
          ]
        }
      }
    },
    {
      $sort: { totalBorrows: -1, activityScore: -1 }
    },
    {
      $limit: limit
    }
  ];

  const results = await BorrowRecord.aggregate(pipeline);

  res.status(200).json({
    success: true,
    count: results.length,
    data: results,
  });
});

// @desc    Get book availability report
// @route   GET /api/analytics/book-availability
// @access  Admin
const getBookAvailabilityReport = asyncHandler(async (req, res) => {
  const { genre, author, search } = req.query;

  // Build match stage for filtering
  let matchStage = { isActive: true };
  
  if (genre) {
    matchStage.genre = genre;
  }
  
  if (author) {
    matchStage.author = { $regex: author, $options: 'i' };
  }
  
  if (search) {
    matchStage.$or = [
      { title: { $regex: search, $options: 'i' } },
      { author: { $regex: search, $options: 'i' } },
      { isbn: { $regex: search, $options: 'i' } }
    ];
  }

  const pipeline = [
    {
      $match: matchStage
    },
    {
      $lookup: {
        from: 'borrowrecords',
        let: { bookId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$book', '$$bookId'] },
                  { $eq: ['$status', 'active'] }
                ]
              }
            }
          }
        ],
        as: 'activeBorrows'
      }
    },
    {
      $lookup: {
        from: 'borrowrecords',
        let: { bookId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$book', '$$bookId'] }
            }
          },
          {
            $group: {
              _id: null,
              totalBorrows: { $sum: 1 },
              totalFines: { $sum: '$fine' }
            }
          }
        ],
        as: 'borrowStats'
      }
    },
    {
      $project: {
        _id: 1,
        title: 1,
        author: 1,
        isbn: 1,
        genre: 1,
        publisher: 1,
        totalCopies: 1,
        availableCopies: 1,
        borrowedCopies: { $size: '$activeBorrows' },
        totalBorrows: {
          $ifNull: [{ $arrayElemAt: ['$borrowStats.totalBorrows', 0] }, 0]
        },
        totalFinesGenerated: {
          $ifNull: [{ $arrayElemAt: ['$borrowStats.totalFines', 0] }, 0]
        },
        availabilityPercentage: {
          $multiply: [
            { $divide: ['$availableCopies', '$totalCopies'] },
            100
          ]
        },
        status: {
          $cond: [
            { $eq: ['$availableCopies', 0] },
            'Out of Stock',
            {
              $cond: [
                { $lt: ['$availableCopies', { $multiply: ['$totalCopies', 0.2] }] },
                'Low Stock',
                'Available'
              ]
            }
          ]
        }
      }
    },
    {
      $sort: { availabilityPercentage: 1, totalBorrows: -1 }
    }
  ];

  const books = await Book.aggregate(pipeline);

  // Summary statistics
  const summaryPipeline = [
    {
      $match: matchStage
    },
    {
      $group: {
        _id: null,
        totalBooks: { $sum: 1 },
        totalCopies: { $sum: '$totalCopies' },
        totalAvailable: { $sum: '$availableCopies' },
        outOfStock: {
          $sum: { $cond: [{ $eq: ['$availableCopies', 0] }, 1, 0] }
        },
        lowStock: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $gt: ['$availableCopies', 0] },
                  { $lt: ['$availableCopies', { $multiply: ['$totalCopies', 0.2] }] }
                ]
              },
              1,
              0
            ]
          }
        }
      }
    },
    {
      $project: {
        _id: 0,
        totalBooks: 1,
        totalCopies: 1,
        totalAvailable: 1,
        totalBorrowed: { $subtract: ['$totalCopies', '$totalAvailable'] },
        outOfStock: 1,
        lowStock: 1,
        availableBooks: { $subtract: ['$totalBooks', '$outOfStock'] },
        overallAvailability: {
          $multiply: [
            { $divide: ['$totalAvailable', '$totalCopies'] },
            100
          ]
        }
      }
    }
  ];

  const [summary] = await Book.aggregate(summaryPipeline);

  res.status(200).json({
    success: true,
    summary: summary || {
      totalBooks: 0,
      totalCopies: 0,
      totalAvailable: 0,
      totalBorrowed: 0,
      outOfStock: 0,
      lowStock: 0,
      availableBooks: 0,
      overallAvailability: 0
    },
    count: books.length,
    data: books,
  });
});

// @desc    Get genre-wise statistics
// @route   GET /api/analytics/genre-stats
// @access  Admin
const getGenreStats = asyncHandler(async (req, res) => {
  const pipeline = [
    {
      $match: { isActive: true }
    },
    {
      $lookup: {
        from: 'borrowrecords',
        localField: '_id',
        foreignField: 'book',
        as: 'borrows'
      }
    },
    {
      $group: {
        _id: '$genre',
        totalBooks: { $sum: 1 },
        totalCopies: { $sum: '$totalCopies' },
        availableCopies: { $sum: '$availableCopies' },
        totalBorrows: { $sum: { $size: '$borrows' } },
        activeBorrows: {
          $sum: {
            $size: {
              $filter: {
                input: '$borrows',
                cond: { $eq: ['$$this.status', 'active'] }
              }
            }
          }
        },
        totalFines: {
          $sum: {
            $reduce: {
              input: '$borrows',
              initialValue: 0,
              in: { $add: ['$$value', '$$this.fine'] }
            }
          }
        }
      }
    },
    {
      $project: {
        _id: 0,
        genre: '$_id',
        totalBooks: 1,
        totalCopies: 1,
        availableCopies: 1,
        borrowedCopies: { $subtract: ['$totalCopies', '$availableCopies'] },
        totalBorrows: 1,
        activeBorrows: 1,
        totalFines: 1,
        availabilityRate: {
          $multiply: [
            { $divide: ['$availableCopies', '$totalCopies'] },
            100
          ]
        },
        popularityScore: {
          $cond: [
            { $eq: ['$totalBooks', 0] },
            0,
            { $divide: ['$totalBorrows', '$totalBooks'] }
          ]
        }
      }
    },
    {
      $sort: { totalBorrows: -1, popularityScore: -1 }
    }
  ];

  const results = await Book.aggregate(pipeline);

  res.status(200).json({
    success: true,
    count: results.length,
    data: results,
  });
});

module.exports = {
  getMostBorrowedBooks,
  getMostActiveMembers,
  getBookAvailabilityReport,
  getGenreStats,
};