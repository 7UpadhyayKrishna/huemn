// Book Controller Stubs

// Get all books
const getBooks = (req, res) => {
  res.status(200).json({ message: 'getBooks not implemented' });
};

// Get a single book by ID
const getBook = (req, res) => {
  res.status(200).json({ message: 'getBook not implemented' });
};

// Create a new book
const createBook = (req, res) => {
  res.status(201).json({ message: 'createBook not implemented' });
};

// Update a book by ID
const updateBook = (req, res) => {
  res.status(200).json({ message: 'updateBook not implemented' });
};

// Delete a book by ID
const deleteBook = (req, res) => {
  res.status(200).json({ message: 'deleteBook not implemented' });
};

module.exports = {
  getBooks,
  getBook,
  createBook,
  updateBook,
  deleteBook,
};
