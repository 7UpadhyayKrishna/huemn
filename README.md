# Library Management API

A robust REST and GraphQL API for library management built with Node.js, Express, and MongoDB.

## Features

- RESTful API endpoints for library management
- GraphQL API support
- MongoDB database integration
- JWT authentication
- Swagger API documentation
- Input validation
- Error handling middleware
- Security best practices

## Prerequisites

- Node.js (v14 or higher)
- MongoDB
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd library-management-api
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory and add the following variables:
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/library
JWT_SECRET=your_jwt_secret
NODE_ENV=development
```

4. Start the development server:
```bash
npm run dev
```

## API Documentation

### REST API Endpoints

#### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user

#### Books
- `GET /api/books` - Get all books
- `GET /api/books/:id` - Get book by ID
- `POST /api/books` - Create a new book
- `PUT /api/books/:id` - Update a book
- `DELETE /api/books/:id` - Delete a book

#### Users
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### GraphQL API

The GraphQL API is available at `/graphql`. You can use the GraphQL Playground to explore and test the API.

Example queries:

```graphql
# Get all books
query {
  books {
    id
    title
    author
    isbn
  }
}

# Get a specific book
query {
  book(id: "book_id") {
    title
    author
    isbn
    available
  }
}
```

## Testing

Run the test suite:
```bash
npm test
```

## API Documentation

Interactive API documentation is available at `/api-docs` when the server is running.

## Error Handling

The API uses a consistent error response format:

```json
{
  "status": "error",
  "message": "Error message",
  "errors": [] // Optional array of validation errors
}
```

## Security

- JWT authentication
- Password hashing with bcrypt
- Helmet for security headers
- CORS enabled
- Rate limiting
- Input validation

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 
