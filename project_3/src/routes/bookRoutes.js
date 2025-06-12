const express = require('express');
const {
  getBooks,
  getBook,
  createBook,
  updateBook,
  deleteBook
} = require('../controllers/bookController');
const { authMiddleware } = require('../middleware/auth');
const validateBook = require('../middleware/validateBook');

const router = express.Router();

// All book routes require authentication
router.use(authMiddleware);

router.route('/')
  .get(getBooks)
  .post(validateBook, createBook);

router.route('/:id')
  .get(getBook)
  .put(validateBook, updateBook)
  .delete(deleteBook);

module.exports = router;
