const express = require('express');
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
} = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');
const validateUser = require('../middleware/validateUser');

const router = express.Router();

router.route('/')
  .get(getUsers)
  .post(validateUser, createUser);

router.route('/:id')
  .get(getUser)
  .put(validateUser, updateUser)
  .delete(deleteUser);

module.exports = router;