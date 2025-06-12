const express = require('express');
const {
  getBorrowRecords,
  getBorrowRecord,
  createBorrowRecord,
  updateBorrowRecord,
  deleteBorrowRecord
} = require('../controllers/borrowController');
const { authMiddleware } = require('../middleware/auth');
const validateBorrow = require('../middleware/validateBorrow');

const router = express.Router();

// All borrow routes require authentication
router.use(authMiddleware);

router.route('/')
  .get(getBorrowRecords)
  .post(validateBorrow, createBorrowRecord);

router.route('/:id')
  .get(getBorrowRecord)
  .put(validateBorrow, updateBorrowRecord)
  .delete(deleteBorrowRecord);

module.exports = router;
