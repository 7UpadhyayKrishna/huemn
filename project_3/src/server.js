const express = require('express');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const connectDB = require('./config/database');
const userRoutes = require('./routes/userRoutes');
const bookRoutes = require('./routes/bookRoutes');
const borrowRoutes = require('./routes/borrowRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const { authMiddleware, getAuthenticatedUser } = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');
const typeDefs = require('./graphql/schema');
const resolvers = require('./graphql/resolvers');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
}));
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Library Management API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// REST API Routes
app.use('/api/users', userRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/borrows', borrowRoutes);
app.use('/api/analytics', analyticsRoutes);

// GraphQL Server Setup
async function startServer() {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    introspection: process.env.NODE_ENV !== 'production',
    playground: process.env.NODE_ENV !== 'production',
    formatError: (error) => {
      console.error('GraphQL Error:', error);
      return {
        message: error.message,
        code: error.extensions?.code,
        path: error.path,
      };
    },
  });

  await server.start();

  app.use(
    '/graphql',
    cors(),
    express.json(),
    expressMiddleware(server, {
      context: async ({ req }) => {
        // Get authenticated user for GraphQL context
        const user = await getAuthenticatedUser(req);
        return {
          user,
          req,
        };
      },
    })
  );

  // Error handling middleware (must be last)
  app.use(errorHandler);

  // Root route
  app.get('/', (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Welcome to Library Management API',
      version: '1.0.0',
      endpoints: {
        health: '/health',
        users: '/api/users',
        books: '/api/books',
        borrows: '/api/borrows',
        analytics: '/api/analytics',
        graphql: '/graphql'
      },
      documentation: 'Please refer to the API documentation for detailed information'
    });
  });

  // 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({ 
      success: false,
      error: 'Route not found',
      message: `Cannot ${req.method} ${req.originalUrl}`
    });
  });

  app.listen(PORT, () => {
    console.log(`🚀 Library Management API running on http://localhost:${PORT}`);
    console.log(`📊 GraphQL playground available at http://localhost:${PORT}/graphql`);
    console.log(`🏥 Health check available at http://localhost:${PORT}/health`);
    console.log(`📈 Analytics endpoints available at http://localhost:${PORT}/api/analytics`);
  });
}

startServer().catch((error) => {
  console.error('Error starting server:', error);
  process.exit(1);
});