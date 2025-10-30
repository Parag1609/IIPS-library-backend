// controllers/transactionController.js
import Transaction from "../models/Transaction.js";
import Member from "../models/LibraryCard.js";
import Book from "../models/Book.js";
import mongoose from "mongoose";

/**
 * @desc Issue a book to a member
 * @route POST /api/transactions/issue
 */
export const issueBook = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { memberId, bookId } = req.body;
    console.log('Issue request:', req.body);

    if (!memberId || !bookId) {
      return res.status(400).json({ 
        success: false,
        message: "memberId and bookId are required" 
      });
    }

    // Find member and book
    const member = await Member.findOne({ memberId: memberId }).session(session);
    const book = await Book.findOne({ accession_number: bookId }).session(session);

    if (!member) {
      await session.abortTransaction();
      return res.status(404).json({ 
        success: false,
        message: "Member not found" 
      });
    }

    if (!book) {
      await session.abortTransaction();
      return res.status(404).json({ 
        success: false,
        message: "Book not found" 
      });
    }

    // Check if member card is active
    if (member.cardStatus !== 'active') {
      await session.abortTransaction();
      return res.status(403).json({ 
        success: false,
        message: "Member card is not active" 
      });
    }

    // Check if member has reached book limit
    const maxBooksAllowed = member.bookIssueLimit || 3;
    if (member.issuedBooks && member.issuedBooks.length >= maxBooksAllowed) {
      await session.abortTransaction();
      return res.status(400).json({ 
        success: false,
        message: `Member has reached maximum book limit (${maxBooksAllowed})` 
      });
    }

    // Check if book is available
    if (book.availabilityStatus !== 'available') {
      await session.abortTransaction();
      return res.status(400).json({ 
        success: false,
        message: "Book is not available for issue" 
      });
    }

    // Check if already issued to this member
    const alreadyIssued = member.issuedBooks.some(
      bookRef => bookRef.toString() === book._id.toString()
    );

    if (alreadyIssued) {
      await session.abortTransaction();
      return res.status(400).json({ 
        success: false,
        message: "Book already issued to this member" 
      });
    }

    // Calculate due date (15 days from now)
    const issueDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 15);

    // Create transaction
    const txn = await Transaction.create([{
      member: member._id,
      book: book._id,
      status: "issued",
      issueDate: issueDate,
    }], { session });

    // Update member's issued books
    if (!member.issuedBooks) {
      member.issuedBooks = [];
    }
    member.issuedBooks.push(book._id);
    await member.save({ session });

    // Update book availability
    book.availabilityStatus = 'issued';
    await book.save({ session });

    await session.commitTransaction();

    // Populate transaction for response
    const populatedTxn = await Transaction.findById(txn[0]._id)
      .populate('member', 'memberId firstName surname enrollment_number')
      .populate('book', 'title accession_number author_name');

    res.status(201).json({ 
      success: true,
      message: "Book issued successfully", 
      transaction: populatedTxn,
      member: {
        id: member.memberId,
        name: `${member.firstName} ${member.surname}`,
        booksIssued: member.issuedBooks.length,
        maxAllowed: maxBooksAllowed
      },
      book: {
        accessionNumber: book.accession_number,
        title: book.title
      }
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('Issue book error:', error);
    res.status(500).json({ 
      success: false,
      message: "Error issuing book", 
      error: error.message 
    });
  } finally {
    session.endSession();
  }
};

/**
 * @desc Return a book (find transaction by memberId and bookId)
 * @route PATCH /api/transactions/return
 */
export const returnBook = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { memberId, bookId } = req.body;
    console.log('Return request:', req.body);

    if (!memberId || !bookId) {
      return res.status(400).json({ 
        success: false,
        message: "memberId and bookId are required" 
      });
    }

    // Find member and book
    const member = await Member.findOne({ memberId: memberId }).session(session);
    const book = await Book.findOne({ accession_number: bookId }).session(session);

    if (!member) {
      await session.abortTransaction();
      return res.status(404).json({ 
        success: false,
        message: "Member not found" 
      });
    }

    if (!book) {
      await session.abortTransaction();
      return res.status(404).json({ 
        success: false,
        message: "Book not found" 
      });
    }

    // Find active transaction for this member and book
    const txn = await Transaction.findOne({
      member: member._id,
      book: book._id,
      status: "issued"
    })
      .populate("member", "memberId firstName surname")
      .populate("book", "title accession_number author_name")
      .session(session);

    if (!txn) {
      await session.abortTransaction();
      return res.status(404).json({ 
        success: false,
        message: "No active transaction found for this member and book" 
      });
    }
    const today = new Date();
    txn.status = "returned";
    txn.returnDate = today;
    await txn.save({ session });

    // Update member's issued books
    member.issuedBooks = member.issuedBooks.filter(
      bookRef => bookRef.toString() !== book._id.toString()
    );
    await member.save({ session });

    // Update book availability
    book.availabilityStatus = 'available';
    await book.save({ session });

    await session.commitTransaction();

    res.status(200).json({ 
      success: true,
      message: "Book returned successfully",
      transaction: txn,
      member: {
        id: member.memberId,
        name: `${member.firstName} ${member.surname}`,
        remainingBooks: member.issuedBooks.length
      },
      book: {
        accessionNumber: book.accession_number,
        title: book.title
      }
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('Return book error:', error);
    res.status(500).json({ 
      success: false,
      message: "Error returning book", 
      error: error.message 
    });
  } finally {
    session.endSession();
  }
};

/**
 * @desc Get all transactions with filters
 * @route GET /api/transactions
 */
export const getTransactions = async (req, res) => {
  try {
    const { 
      memberId, 
      bookId, 
      status, 
      issueDateFrom, 
      issueDateTo, 
      returnDateFrom, 
      returnDateTo,
      page = 1,
      limit = 50
    } = req.query;

    const filter = {};

    // Member filter (by custom memberId or MongoDB _id)
    if (memberId) {
      const member = await Member.findOne({ memberId: memberId });
      if (member) {
        filter.member = member._id;
      }
    }

    // Book filter (by accession number or MongoDB _id)
    if (bookId) {
      const book = await Book.findOne({ accession_number: bookId });
      if (book) {
        filter.book = book._id;
      }
    }

    if (status) filter.status = status;

    // Date filters
    if (issueDateFrom || issueDateTo) {
      filter.issueDate = {};
      if (issueDateFrom) filter.issueDate.$gte = new Date(issueDateFrom);
      if (issueDateTo) filter.issueDate.$lte = new Date(issueDateTo);
    }

    if (returnDateFrom || returnDateTo) {
      filter.returnDate = {};
      if (returnDateFrom) filter.returnDate.$gte = new Date(returnDateFrom);
      if (returnDateTo) filter.returnDate.$lte = new Date(returnDateTo);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [transactions, totalCount] = await Promise.all([
      Transaction.find(filter)
        .populate("member", "memberId firstName surname enrollment_number mobile issuedBooks")
        .populate("book", "title accession_number author_name")
        .sort({ issueDate: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Transaction.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      count: transactions.length,
      totalCount: totalCount,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalCount / parseInt(limit)),
      transactions: transactions
    });

  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ 
      success: false,
      message: "Error fetching transactions", 
      error: error.message 
    });
  }
};

/**
 * @desc Get single transaction by ID
 * @route GET /api/transactions/:id
 */
export const getTransactionById = async (req, res) => {
  try {
    const txn = await Transaction.findById(req.params.id)
      .populate("member", "memberId firstName surname enrollment_number mobile issuedBooks")
      .populate("book", "title accession_number author_name");

    if (!txn) {
      return res.status(404).json({ 
        success: false,
        message: "Transaction not found" 
      });
    }

    res.status(200).json({ 
      success: true, 
      data: txn 
    });

  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: "Error fetching transaction", 
      error: error.message 
    });
  }
};