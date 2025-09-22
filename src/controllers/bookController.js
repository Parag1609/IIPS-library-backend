import Book from "../models/Book.js";

/**
 * Add a new book
 */
export const addBook = async (req, res) => {
  try {
    const newBook = new Book(req.body);
    const savedBook = await newBook.save();
    res.status(201).json({
      success: true,
      message: "Book added successfully",
      data: savedBook,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Error adding book",
      error: error.message,
    });
  }
};

/**
 * Get all books (with optional filters like title/author)
 */
export const getBooks = async (req, res) => {
  try {
    const { title, author, accession_number, publication } = req.query;

    let filter = {};
    if (title) filter.title = new RegExp(title, "i");
    if (author) filter.author_name = new RegExp(author, "i");
    if (accession_number) filter.accession_number = accession_number;
    if (publication) filter.publication = new RegExp(publication, "i");

    const books = await Book.find(filter);
    res.status(200).json({ success: true, count: books.length, data: books });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching books",
      error: error.message,
    });
  }
};

/**
 * Get a single book by ID
 */
export const getBookById = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) {
      return res
        .status(404)
        .json({ success: false, message: "Book not found" });
    }
    res.status(200).json({ success: true, data: book });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching book",
      error: error.message,
    });
  }
};

/**
 * Update book details
 */
export const updateBook = async (req, res) => {
  try {
    const updatedBook = await Book.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updatedBook) {
      return res
        .status(404)
        .json({ success: false, message: "Book not found" });
    }
    res.status(200).json({
      success: true,
      message: "Book updated successfully",
      data: updatedBook,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Error updating book",
      error: error.message,
    });
  }
};

/**
 * Delete a book
 */
export const deleteBook = async (req, res) => {
  try {
    const deletedBook = await Book.findByIdAndDelete(req.params.id);
    if (!deletedBook) {
      return res
        .status(404)
        .json({ success: false, message: "Book not found" });
    }
    res.status(200).json({
      success: true,
      message: "Book deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting book",
      error: error.message,
    });
  }
};
