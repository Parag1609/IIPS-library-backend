import Transaction from "../models/Transaction.js";
import Member from "../models/Member.js";
import Book from "../models/Book.js";
import mongoose from "mongoose";

/**
 * @desc Issue a book to a member
 * @route POST /api/transactions/issue
 * // This is the important concurrency protection.
    //
    // MongoDB will update the book ONLY IF:
    // accession_number matches AND
    // availabilityStatus is still "available".
    //
    // If another librarian has already issued it,
    // this query will return null.
    //
    const book = await Book.findOneAndUpdate(
      {
        accession_number: bookId,
        availabilityStatus: "available"
      },
      {
        $set: {
          availabilityStatus: "issued"
        }
      },
      {
        new: true,
        session
      }
    );
    // 5. Book was already issued / unavailable
    if (!book) {
      await session.abortTransaction();

      return res.status(409).json({
        success: false,
        message: "Book is no longer available for issue"
      });
    }

 */
export const issueBook = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { memberId, bookId } = req.body; // memberId = membershipId
    console.log('Issue request:', req.body);

    if (!memberId || !bookId) {
      return res.status(400).json({ 
        success: false,
        message: "membershipId and bookId are required" 
      });
    }

    // Find member and book
    const member = await Member.findOne({ membershipId: memberId }).session(session);
    const book = await Book.findOne({ accession_number: bookId }).session(session);

    if (!member) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: "Member not found" });
    }

    if (!book) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: "Book not found" });
    }

    if (member.cardStatus !== 'active') {
      await session.abortTransaction();
      return res.status(403).json({ success: false, message: "Member card is not active" });
    }

    // Check book limit
    const maxBooksAllowed = member.bookIssueLimit || 3;
    if (member.issuedBooks.length >= maxBooksAllowed) {
      await session.abortTransaction();
      return res.status(400).json({ 
        success: false,
        message: `Member has reached maximum book limit (${maxBooksAllowed})` 
      });
    }

    if (book.availabilityStatus !== 'available') {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: "Book is not available for issue" });
    }

    // Prevent duplicate issue
    const alreadyIssued = member.issuedBooks.some(
      bookRef => bookRef.toString() === book._id.toString()
    );
    if (alreadyIssued) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: "Book already issued to this member" });
    }

    const issueDate = new Date();
    const txn = await Transaction.create([{
      member: member._id,
      book: book._id,
      status: "issued",
      issueDate: issueDate,
    }], { session });

    member.issuedBooks.push(book._id);
    await member.save({ session });

    book.availabilityStatus = 'issued';
    await book.save({ session });

    await session.commitTransaction();

    const populatedTxn = await Transaction.findById(txn[0]._id)
      .populate('member', 'membershipId name memberType memberNumber')
      .populate('book', 'title accession_number author_name');

    res.status(201).json({ 
      success: true,
      message: "Book issued successfully", 
      transaction: populatedTxn,
      member: {
        membershipId: member.membershipId,
        name: member.name,
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
    res.status(500).json({ success: false, message: "Error issuing book", error: error.message });
  } finally {
    session.endSession();
  }
};


/**
 * @desc Return a book
 * @route PATCH /api/transactions/return
 */
export const returnBook = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { memberId, bookId } = req.body;

    if (!memberId || !bookId) {
      return res.status(400).json({ success: false, message: "membershipId and bookId are required" });
    }

    const member = await Member.findOne({ membershipId: memberId }).session(session);
    const book = await Book.findOne({ accession_number: bookId }).session(session);

    if (!member) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: "Member not found" });
    }

    if (!book) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: "Book not found" });
    }

    const txn = await Transaction.findOne({
      member: member._id,
      book: book._id,
      status: "issued"
    })
      .populate("member", "membershipId name memberType")
      .populate("book", "title accession_number author_name")
      .session(session);

    if (!txn) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: "No active transaction found" });
    }

    txn.status = "returned";
    txn.returnDate = new Date();
    await txn.save({ session });

    member.issuedBooks = member.issuedBooks.filter(
      bookRef => bookRef.toString() !== book._id.toString()
    );
    await member.save({ session });

    book.availabilityStatus = 'available';
    await book.save({ session });

    await session.commitTransaction();

    res.status(200).json({ 
      success: true,
      message: "Book returned successfully",
      transaction: txn,
      member: {
        membershipId: member.membershipId,
        name: member.name,
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
    res.status(500).json({ success: false, message: "Error returning book", error: error.message });
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
    const { memberId, bookId, status, issueDateFrom, issueDateTo, returnDateFrom, returnDateTo, page = 1, limit = 50 } = req.query;

    const filter = {};

    if (memberId) {
      const member = await Member.findOne({ membershipId: memberId });
      if (member) filter.member = member._id;
    }

    if (bookId) {
      const book = await Book.findOne({ accession_number: bookId });
      if (book) filter.book = book._id;
    }

    if (status) filter.status = status;

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
        .populate("member", "membershipId name memberType memberNumber mobile issuedBooks")
        .populate("book", "title accession_number author_name")
        .sort({ issueDate: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Transaction.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      count: transactions.length,
      totalCount,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalCount / parseInt(limit)),
      transactions
    });

  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ success: false, message: "Error fetching transactions", error: error.message });
  }
};


/**
 * @desc Get single transaction by ID
 * @route GET /api/transactions/:id
 */
export const getTransactionById = async (req, res) => {
  try {
    const txn = await Transaction.findById(req.params.id)
      .populate("member", "membershipId name memberType memberNumber mobile issuedBooks")
      .populate("book", "title accession_number author_name");

    if (!txn) {
      return res.status(404).json({ success: false, message: "Transaction not found" });
    }

    res.status(200).json({ success: true, data: txn });

  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching transaction", error: error.message });
  }
};
