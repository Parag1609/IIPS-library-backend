import Transaction from "../models/Transaction.js";
import Member from "../models/LibraryCard.js";
import Book from "../models/Book.js";

// Get Single Transaction
export const getTransactionById = async (req, res) => {
  try {
    const txn = await Transaction.findById(req.params.id)
      .populate("member", "memberId firstName surname")
      .populate("book", "title accession_number author_name");

    if (!txn) return res.status(404).json({ message: "Transaction not found" });

    res.status(200).json({ success: true, data: txn });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching transaction", error: error.message });
  }
};

export const issueBook = async (req, res) => {
  try {
    const { memberId, bookId } = req.body;
    console.log(req.body)
    const member = await Member.findOne({ memberId: memberId });
    const book = await Book.findOne({ accession_number: bookId });

    if (!member) return res.status(404).json({ message: "Member not found" });
    if (!book) return res.status(404).json({ message: "Book not found" });

    // check if already issued
    if (member.issuedBooks.includes(bookId)) {
      return res.status(400).json({ message: "Book already issued to this member" });
    }

    // create transaction
    const txn = await Transaction.create({
      member: member._id,
      book: book._id,
      status: "issued",
      issueDate: new Date(),
    });

    // update member’s issued books
    member.issuedBooks.push(book._id);
    await member.save();

    res.status(201).json({ message: "Book issued successfully", transaction: txn });
  } catch (error) {
    console.log(req.body)
    res.status(500).json({ message: "Error issuing book", error:error.message });
  }
};

export const returnBook = async (req, res) => {
  try {
    const { transactionId } = req.params;

    const txn = await Transaction.findById(transactionId).populate("member book");

    if (!txn) return res.status(404).json({ message: "Transaction not found" });

    if (txn.status !== "issued") {
      return res.status(400).json({ message: "This transaction is already closed" });
    }

    // mark transaction as returned
    txn.status = "returned";
    txn.returnDate = new Date();
    await txn.save();

    // update member’s issued books
    const member = await Member.findById(txn.member._id);
    member.issuedBooks = member.issuedBooks.filter(
      (b) => b.toString() !== txn.book._id.toString()
    );
    await member.save();

    res.status(200).json({ message: "Book returned successfully", transaction: txn });
  } catch (error) {
    res.status(500).json({ message: "Error returning book", error: error.message });
  }
};

export const getTransactions = async (req, res) => {
  try {
    const { memberId, bookId, status, issueDateFrom, issueDateTo, returnDateFrom, returnDateTo } =
      req.query;

    const filter = {};

    if (memberId) filter.member = memberId;
    if (bookId) filter.book = bookId;
    if (status) filter.status = status;

    // Issue Date filter (range support)
    if (issueDateFrom || issueDateTo) {
      filter.issueDate = {};
      if (issueDateFrom) filter.issueDate.$gte = new Date(issueDateFrom);
      if (issueDateTo) filter.issueDate.$lte = new Date(issueDateTo);
    }

    // Return Date filter (range support)
    if (returnDateFrom || returnDateTo) {
      filter.returnDate = {};
      if (returnDateFrom) filter.returnDate.$gte = new Date(returnDateFrom);
      if (returnDateTo) filter.returnDate.$lte = new Date(returnDateTo);
    }

    const txns = await Transaction.find(filter)
      .populate("member", "memberId firstName surname")
      .populate("book", "title accession_number");

    res.status(200).json(txns);
  } catch (error) {
    res.status(500).json({ message: "Error fetching transactions", error: error.message });
  }
};
