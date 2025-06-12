const { gql } = require('apollo-server-express');

const typeDefs = gql`
  # User Types
  type User {
    id: ID!
    name: String!
    email: String!
    role: String!
    isActive: Boolean!
    membershipDate: String!
    activeBorrowCount: Int
    createdAt: String!
    updatedAt: String!
  }

  type UserResponse {
    success: Boolean!
    message: String
    data: User
  }

  type UsersResponse {
    success: Boolean!
    count: Int!
    total: Int!
    page: Int!
    pages: Int!
    data: [User!]!
  }

  input CreateUserInput {
    name: String!
    email: String!
    password: String!
    role: String
  }

  input UpdateUserInput {
    name: String
    email: String
    role: String
    isActive: Boolean
  }

  # Book Types
  type Book {
    id: ID!
    title: String!
    author: String!
    isbn: String!
    publicationDate: String!
    genre: String!
    totalCopies: Int!
    availableCopies: Int!
    description: String
    publisher: String
    isActive: Boolean!
    createdAt: String!
    updatedAt: String!
  }

  type BookResponse {
    success: Boolean!
    message: String
    data: Book
  }

  type BooksResponse {
    success: Boolean!
    count: Int!
    total: Int!
    page: Int!
    pages: Int!
    data: [Book!]!
  }

  input CreateBookInput {
    title: String!
    author: String!
    isbn: String!
    publicationDate: String!
    genre: String!
    totalCopies: Int!
    description: String
    publisher: String
  }

  input UpdateBookInput {
    title: String
    author: String
    isbn: String
    publicationDate: String
    genre: String
    totalCopies: Int
    description: String
    publisher: String
    isActive: Boolean
  }

  # BorrowRecord Types
  type BorrowRecord {
    id: ID!
    user: User!
    book: Book!
    borrowDate: String!
    dueDate: String!
    returnDate: String
    status: String!
    fine: Float!
    renewalCount: Int!
    notes: String
    createdAt: String!
    updatedAt: String!
  }

  type BorrowResponse {
    success: Boolean!
    message: String
    data: BorrowRecord
  }

  type BorrowsResponse {
    success: Boolean!
    count: Int!
    total: Int!
    page: Int!
    pages: Int!
    data: [BorrowRecord!]!
  }

  input CreateBorrowInput {
    userId: ID!
    bookId: ID!
    notes: String
  }

  input UpdateBorrowInput {
    returnDate: String
    status: String
    fine: Float
    notes: String
  }

  # Authentication Types
  type AuthResponse {
    success: Boolean!
    message: String
    token: String
    data: User
  }

  input LoginInput {
    email: String!
    password: String!
  }

  # Search and Filter Types
  input BookSearchInput {
    title: String
    author: String
    genre: String
    isbn: String
    available: Boolean
  }

  input BorrowFilterInput {
    userId: ID
    bookId: ID
    status: String
    overdue: Boolean
  }

  # Statistics Types
  type LibraryStats {
    totalUsers: Int!
    totalBooks: Int!
    totalBorrows: Int!
    activeBorrows: Int!
    overdueBorrows: Int!
    totalFines: Float!
  }

  # Analytics Types
  type BookPopularity {
    book: Book!
    borrowCount: Int!
    activeBorrows: Int!
    totalFines: Float!
    popularityScore: Float!
  }

  type MostBorrowedBooksResponse {
    success: Boolean!
    count: Int!
    data: [BookPopularity!]!
  }

  type MemberActivity {
    user: User!
    totalBorrows: Int!
    activeBorrows: Int!
    returnedBooks: Int!
    overdueBooks: Int!
    totalFines: Float!
    totalRenewals: Int!
    avgBorrowDuration: Float
    activityScore: Float!
  }

  type MostActiveMembersResponse {
    success: Boolean!
    count: Int!
    data: [MemberActivity!]!
  }

  type BookAvailabilityItem {
    book: Book!
    borrowedCopies: Int!
    totalBorrows: Int!
    totalFinesGenerated: Float!
    availabilityPercentage: Float!
    status: String!
  }

  type AvailabilitySummary {
    totalBooks: Int!
    totalCopies: Int!
    totalAvailable: Int!
    totalBorrowed: Int!
    outOfStock: Int!
    lowStock: Int!
    availableBooks: Int!
    overallAvailability: Float!
  }

  type BookAvailabilityResponse {
    success: Boolean!
    summary: AvailabilitySummary!
    count: Int!
    data: [BookAvailabilityItem!]!
  }

  input AvailabilityFilterInput {
    genre: String
    author: String
    search: String
  }

  type GenreStats {
    genre: String!
    totalBooks: Int!
    totalCopies: Int!
    availableCopies: Int!
    borrowedCopies: Int!
    totalBorrows: Int!
    activeBorrows: Int!
    totalFines: Float!
    availabilityRate: Float!
    popularityScore: Float!
  }

  type GenreStatsResponse {
    success: Boolean!
    count: Int!
    data: [GenreStats!]!
  }

  type Query {
    # User Queries
    users(page: Int, limit: Int): UsersResponse!
    user(id: ID!): UserResponse!
    me: UserResponse!

    # Book Queries
    books(page: Int, limit: Int, search: BookSearchInput): BooksResponse!
    book(id: ID!): BookResponse!
    searchBooks(query: String!, page: Int, limit: Int): BooksResponse!

    # Borrow Queries
    borrows(page: Int, limit: Int, filter: BorrowFilterInput): BorrowsResponse!
    borrow(id: ID!): BorrowResponse!
    myBorrows(page: Int, limit: Int): BorrowsResponse!
    overdueBorrows(page: Int, limit: Int): BorrowsResponse!

    # Statistics (Admin only)
    libraryStats: LibraryStats!

    # Analytics Queries (Admin only)
    mostBorrowedBooks(limit: Int): MostBorrowedBooksResponse!
    mostActiveMembers(limit: Int): MostActiveMembersResponse!
    bookAvailabilityReport(filter: AvailabilityFilterInput): BookAvailabilityResponse!
    genreStats: GenreStatsResponse!
  }

  type Mutation {
    # Authentication
    login(input: LoginInput!): AuthResponse!
    register(input: CreateUserInput!): AuthResponse!

    # User Mutations
    createUser(input: CreateUserInput!): UserResponse!
    updateUser(id: ID!, input: UpdateUserInput!): UserResponse!
    deleteUser(id: ID!): UserResponse!

    # Book Mutations
    createBook(input: CreateBookInput!): BookResponse!
    updateBook(id: ID!, input: UpdateBookInput!): BookResponse!
    deleteBook(id: ID!): BookResponse!

    # Borrow Mutations
    borrowBook(input: CreateBorrowInput!): BorrowResponse!
    returnBook(id: ID!, input: UpdateBorrowInput): BorrowResponse!
    renewBook(id: ID!): BorrowResponse!
    updateBorrow(id: ID!, input: UpdateBorrowInput!): BorrowResponse!
  }
`;

module.exports = typeDefs;