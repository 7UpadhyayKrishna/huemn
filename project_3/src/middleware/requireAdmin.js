const AppError = require('../utils/appError');

const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return next(new AppError('Authentication required', 401));
  }

  if (req.user.role !== 'Admin') {
    return next(new AppError('Admin access required', 403));
  }

  next();
};

module.exports = requireAdmin;