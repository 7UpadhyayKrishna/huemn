const AppError = require('../utils/appError');

const validateUser = (req, res, next) => {
  const { name, email } = req.body;

  // Basic validation
  if (!name || name.trim().length === 0) {
    return next(new AppError('Name is required', 400));
  }

  if (!email || !email.includes('@')) {
    return next(new AppError('Valid email is required', 400));
  }

  // Sanitize input
  req.body.name = name.trim();
  req.body.email = email.toLowerCase().trim();

  next();
};

module.exports = validateUser;