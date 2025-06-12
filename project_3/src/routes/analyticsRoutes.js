const express = require('express');
const {
  getMostBorrowedBooks,
  getMostActiveMembers,
  getBookAvailabilityReport,
  getGenreStats,
} = require('../controllers/analyticsController');
const { authMiddleware } = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');

const router = express.Router();

// All analytics routes require authentication and admin role
router.use(authMiddleware);
router.use(requireAdmin);

// Analytics routes
router.get('/most-borrowed-books', getMostBorrowedBooks);
router.get('/most-active-members', getMostActiveMembers);
router.get('/book-availability', getBookAvailabilityReport);
router.get('/genre-stats', getGenreStats);

module.exports = router;