const Book = require('../../models/Book');
const AppError = require('../../utils/appError');

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

const bookResolvers = {
  Query: {
    books: async (parent, { page = 1, limit = 10, search = {} }) => {
      try {
        const skip = (page - 1) * limit;
        
        // Build search query
        let query = { isActive: true };
        
        if (search.title) {
          query.title = { $regex: search.title, $options: 'i' };
        }
        if (search.author) {
          query.author = { $regex: search.author, $options: 'i' };
        }
        if (search.genre) {
          query.genre = search.genre;
        }
        if (search.isbn) {
          query.isbn = search.isbn;
        }
        if (search.available === true) {
          query.availableCopies = { $gt: 0 };
        }

        const books = await Book.find(query)
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 });

        const total = await Book.countDocuments(query);

        return {
          success: true,
          count: books.length,
          total,
          page,
          pages: Math.ceil(total / limit),
          data: books,
        };
      } catch (error) {
        throw new Error(`Failed to fetch books: ${error.message}`);
      }
    },

    book: async (parent, { id }) => {
      try {
        const book = await Book.findById(id);

        if (!book || !book.isActive) {
          throw new Error('Book not found');
        }

        return {
          success: true,
          data: book,
        };
      } catch (error) {
        throw new Error(`Failed to fetch book: ${error.message}`);
      }
    },

    searchBooks: async (parent, { query, page = 1, limit = 10 }) => {
      try {
        const skip = (page - 1) * limit;

        const books = await Book.searchBooks(query, { skip, limit });
        const total = await Book.countDocuments({
          $text: { $search: query },
          isActive: true,
        });

        return {
          success: true,
          count: books.length,
          total,
          page,
          pages: Math.ceil(total / limit),
          data: books,
        };
      } catch (error) {
        throw new Error(`Failed to search books: ${error.message}`);
      }
    },
  },

  Mutation: {
    createBook: async (parent, { input }, { user }) => {
      try {
        requireAdmin(user);

        const book = await Book.create(input);

        return {
          success: true,
          message: 'Book created successfully',
          data: book,
        };
      } catch (error) {
        if (error.code === 11000) {
          throw new Error('ISBN already exists');
        }
        throw new Error(`Failed to create book: ${error.message}`);
      }
    },

    updateBook: async (parent, { id, input }, { user }) => {
      try {
        requireAdmin(user);

        const book = await Book.findByIdAndUpdate(
          id,
          input,
          {
            new: true,
            runValidators: true,
          }
        );

        if (!book) {
          throw new Error('Book not found');
        }

        return {
          success: true,
          message: 'Book updated successfully',
          data: book,
        };
      } catch (error) {
        throw new Error(`Failed to update book: ${error.message}`);
      }
    },

    deleteBook: async (parent, { id }, { user }) => {
      try {
        requireAdmin(user);

        const book = await Book.findById(id);

        if (!book) {
          throw new Error('Book not found');
        }

        // Check if book has active borrows
        const BorrowRecord = require('../../models/BorrowRecord');
        const activeBorrows = await BorrowRecord.countDocuments({
          book: id,
          status: 'active',
        });

        if (activeBorrows > 0) {
          throw new Error('Cannot delete book with active borrows');
        }

        // Soft delete
        book.isActive = false;
        await book.save();

        return {
          success: true,
          message: 'Book deleted successfully',
          data: book,
        };
      } catch (error) {
        throw new Error(`Failed to delete book: ${error.message}`);
      }
    },
  },
};

module.exports = bookResolvers;