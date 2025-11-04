import Book from "../models/Book.js";
import Member from "../models/LibraryCard.js";

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
 * Get all books with enhanced filters and pagination
 */
export const getBooks = async (req, res) => {
  try {
    const { 
      searchBy, 
      query, 
      availabilityStatus,
      page = 1, 
      limit = 20 
    } = req.query;

    let filter = {};

    // Apply availability status filter
    if (availabilityStatus && availabilityStatus !== 'all') {
      filter.availabilityStatus = availabilityStatus;
    }

    // If search parameters are provided
    if (searchBy && query && searchBy !== 'all') {
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
          // Search across multiple fields
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
      .sort({ accession_number: 1 }); // Sort by accession number

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
 * Delete a book - with proper cleanup of references
 */
export const deleteBook = async (req, res) => {
  try {
    const bookId = req.params.id;
    
    // Find the book first to check if it exists
    const book = await Book.findById(bookId);
    if (!book) {
      return res
        .status(404)
        .json({ success: false, message: "Book not found" });
    }

    // Check if book is currently issued
    const membersWithBook = await Member.find({
      'issuedBooks': bookId
    });

    if (membersWithBook.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete book. It is currently issued to one or more members.",
        issuedTo: membersWithBook.map(m => ({
          memberId: m._id,
          memberName: m.name,
          email: m.email
        }))
      });
    }

    // If not currently issued, proceed with deletion
    const deletedBook = await Book.findByIdAndDelete(bookId);
    
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

export const getBookStats = async (req, res) => {
  try {
    const totalBooks = await Book.countDocuments();
    const availableBooks = await Book.countDocuments({ availabilityStatus: 'available' });
    const issuedBooks = await Book.countDocuments({ availabilityStatus: 'issued' });
    const lostBooks = await Book.countDocuments({ availabilityStatus: 'lost' });

    res.status(200).json({
      success: true,
      stats: {
        total: totalBooks,
        available: availableBooks,
        issued: issuedBooks,
        lost: lostBooks
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching book statistics",
      error: error.message,
    });
  }
};