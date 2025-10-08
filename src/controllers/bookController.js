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
    const { searchBy, query, page = 1, limit = 1 } = req.query;

    let filter = {};

    // If search parameters are provided
    if (searchBy && query) {
      const searchQuery = query.trim();

      switch (searchBy) {
        case "title":
          filter.title = new RegExp(searchQuery, 'i');
          break;
        case "author":
          filter.author_name = new RegExp(searchQuery, 'i');
          break;
        case "publication":
          filter.publication = new RegExp(searchQuery, 'i');
          break;
        case "accession":
          filter.accession_number = new RegExp(searchQuery, 'i');
          break;
        case "supplier":
          filter.supplier = new RegExp(searchQuery, 'i');
          break;
        case "bill":
          filter.bill_number = new RegExp(searchQuery, 'i');
          break;
        default:
          filter.$or = [
            { title: new RegExp(searchQuery, 'i') },
            { author_name: new RegExp(searchQuery, 'i') },
            { publication: new RegExp(searchQuery, 'i') },
            { accession_number: new RegExp(searchQuery, 'i') }
          ];
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const books = await Book.find(filter)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ title: 1 });

    const totalBooks = await Book.countDocuments(filter);

    res.json({
      success: true,
      count: books.length,
      totalBooks: totalBooks,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalBooks / parseInt(limit)),
      books: books
    });

  } catch (error) {
    console.error("Error fetching books:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching books",
      error: error.message
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
