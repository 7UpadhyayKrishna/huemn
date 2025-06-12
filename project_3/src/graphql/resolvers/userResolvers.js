const User = require('../../models/User');
const AppError = require('../../utils/appError');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET || 'fallback-secret', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

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

const userResolvers = {
  Query: {
    users: async (parent, { page = 1, limit = 10 }, { user }) => {
      try {
        requireAdmin(user);

        const skip = (page - 1) * limit;
        
        const users = await User.find({ isActive: true })
          .populate('activeBorrowCount')
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 });

        const total = await User.countDocuments({ isActive: true });

        return {
          success: true,
          count: users.length,
          total,
          page,
          pages: Math.ceil(total / limit),
          data: users,
        };
      } catch (error) {
        throw new Error(`Failed to fetch users: ${error.message}`);
      }
    },

    user: async (parent, { id }, { user: currentUser }) => {
      try {
        requireAuth(currentUser);

        // Users can only view their own profile unless they're admin
        if (currentUser.role !== 'Admin' && currentUser.id !== id) {
          throw new Error('Access denied');
        }

        const user = await User.findById(id).populate('activeBorrowCount');

        if (!user || !user.isActive) {
          throw new Error('User not found');
        }

        return {
          success: true,
          data: user,
        };
      } catch (error) {
        throw new Error(`Failed to fetch user: ${error.message}`);
      }
    },

    me: async (parent, args, { user: currentUser }) => {
      try {
        requireAuth(currentUser);

        const user = await User.findById(currentUser.id).populate('activeBorrowCount');

        if (!user) {
          throw new Error('User not found');
        }

        return {
          success: true,
          data: user,
        };
      } catch (error) {
        throw new Error(`Failed to fetch user profile: ${error.message}`);
      }
    },
  },

  Mutation: {
    login: async (parent, { input }) => {
      try {
        const { email, password } = input;

        // Find user and include password for comparison
        const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

        if (!user || !user.isActive) {
          throw new Error('Invalid credentials');
        }

        // Check password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
          throw new Error('Invalid credentials');
        }

        // Generate token
        const token = generateToken(user._id);

        return {
          success: true,
          message: 'Login successful',
          token,
          data: user.toPublicJSON(),
        };
      } catch (error) {
        throw new Error(`Login failed: ${error.message}`);
      }
    },

    register: async (parent, { input }) => {
      try {
        const user = await User.create(input);
        const token = generateToken(user._id);

        return {
          success: true,
          message: 'Registration successful',
          token,
          data: user.toPublicJSON(),
        };
      } catch (error) {
        if (error.code === 11000) {
          throw new Error('Email already exists');
        }
        throw new Error(`Registration failed: ${error.message}`);
      }
    },

    createUser: async (parent, { input }, { user }) => {
      try {
        requireAdmin(user);

        const newUser = await User.create(input);

        return {
          success: true,
          message: 'User created successfully',
          data: newUser.toPublicJSON(),
        };
      } catch (error) {
        if (error.code === 11000) {
          throw new Error('Email already exists');
        }
        throw new Error(`Failed to create user: ${error.message}`);
      }
    },

    updateUser: async (parent, { id, input }, { user: currentUser }) => {
      try {
        requireAuth(currentUser);

        // Users can only update their own profile unless they're admin
        if (currentUser.role !== 'Admin' && currentUser.id !== id) {
          throw new Error('Access denied');
        }

        // Only admins can change roles
        if (input.role && currentUser.role !== 'Admin') {
          delete input.role;
        }

        const user = await User.findByIdAndUpdate(
          id,
          input,
          {
            new: true,
            runValidators: true,
          }
        );

        if (!user) {
          throw new Error('User not found');
        }

        return {
          success: true,
          message: 'User updated successfully',
          data: user,
        };
      } catch (error) {
        throw new Error(`Failed to update user: ${error.message}`);
      }
    },

    deleteUser: async (parent, { id }, { user: currentUser }) => {
      try {
        requireAdmin(currentUser);

        const user = await User.findById(id);

        if (!user) {
          throw new Error('User not found');
        }

        // Prevent admin from deleting themselves
        if (user._id.toString() === currentUser.id) {
          throw new Error('Cannot delete your own account');
        }

        // Soft delete
        user.isActive = false;
        await user.save();

        return {
          success: true,
          message: 'User deleted successfully',
          data: user,
        };
      } catch (error) {
        throw new Error(`Failed to delete user: ${error.message}`);
      }
    },
  },
};

module.exports = userResolvers;