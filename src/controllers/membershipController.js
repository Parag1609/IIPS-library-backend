import Member from "../models/LibraryCard.js";
import Book from "../models/Book.js";
import Transaction from "../models/Transaction.js"; 

/**
 * @desc Create a new member manually (admin use)
 * @route POST /api/members
 */
export const createMember = async (req, res) => {
  try {
    const {
      memberId,
      enrollment_number,
      firstName,
      surname,
      fatherName,
      semester,
      course,
      mobile,
      address,
      photo,
      cardStatus,
      bookIssueLimit
    } = req.body;

    // check duplicate enrollment
    const existing = await Member.findOne({ enrollment_number });
    if (existing) {
      return res.status(400).json({ message: "Member with this enrollment number already exists" });
    }

    const newMember = new Member({
      memberId,
      enrollment_number,
      firstName,
      surname,
      fatherName,
      semester,
      course,
      mobile,
      address,
      photo,
      cardStatus: cardStatus || "active",
      bookIssueLimit: bookIssueLimit || 3
    });

    await newMember.save();
    res.status(201).json({ message: "Member created successfully", member: newMember });
  } catch (error) {
    res.status(500).json({ message: "Error creating member", error: error.message });
  }
};

/**
 * @desc Get all members
 * @route GET /api/members
 */
export const getAllMembers = async (req, res) => {
  try {
    // Extract possible query params
    const { memberId, firstName, surname, enrollment_number, semester, course, cardStatus } = req.query;

    // Build dynamic filter object
    let filter = {};
    if (memberId) filter.memberId = memberId; // exact match
    if (firstName) filter.firstName = new RegExp(firstName, "i"); // partial, case-insensitive
    if (surname) filter.surname = new RegExp(surname, "i");
    if (enrollment_number) filter.enrollment_number = enrollment_number; // exact match
    if (semester) filter.semester = semester;
    if (course) filter.course = course;
    if (cardStatus) filter.cardStatus = cardStatus;

    // Query members with optional filters and populate issuedBooks
    const members = await Member.find(filter).populate(
      "issuedBooks",
      "title accession_number author_name"
    );

    res.status(200).json({ success: true, count: members.length, data: members });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching members", error: error.message });
  }
};


/**
 * @desc Get member by ID
 * @route GET /api/members/:id
 */
export const getMemberById = async (req, res) => {
  try {
    const member = await Member.findById(req.params.id).populate("issuedBooks", "title accession_number author_name");
    if (!member) return res.status(404).json({ message: "Member not found" });
    res.status(200).json(member);
  } catch (error) {
    res.status(500).json({ message: "Error fetching member", error: error.message });
  }
};

/**
 * @desc Update member details
 * @route PUT /api/members/:id
 */
export const updateMember = async (req, res) => {
  try {
    const updatedMember = await Member.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedMember) return res.status(404).json({ message: "Member not found" });
    res.status(200).json(updatedMember);
  } catch (error) {
    res.status(500).json({ message: "Error updating member", error: error.message });
  }
};

/**
 * @desc Activate/Deactivate card
 * @route PATCH /api/members/:id/status
 */
export const updateCardStatus = async (req, res) => {
  try {
    const { cardStatus } = req.body;
    if (!["active", "inactive"].includes(cardStatus)) {
      return res.status(400).json({ message: "Invalid card status" });
    }

    const member = await Member.findByIdAndUpdate(
      req.params.id,
      { cardStatus },
      { new: true }
    );
    if (!member) return res.status(404).json({ message: "Member not found" });

    res.status(200).json({ message: `Card ${cardStatus} successfully`, member });
  } catch (error) {
    res.status(500).json({ message: "Error updating card status", error: error.message });
  }
};


/**
 * @desc Issue a book to member + transaction log
 * @route POST /api/members/:id/issue/:bookId
 
export const issueBook = async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);
    const book = await Book.findById(req.params.bookId);

    if (!member) return res.status(404).json({ message: "Member not found" });
    if (!book) return res.status(404).json({ message: "Book not found" });

    // Check if member is active
    if (member.cardStatus !== "active") {
      return res.status(400).json({ message: "Inactive member cannot issue books" });
    }

    // Check issue limit
    if (member.issuedBooks.length >= member.bookIssueLimit) {
      return res.status(400).json({ message: "Book issue limit reached" });
    }

    // Check if this member already issued this book
    if (member.issuedBooks.includes(book._id)) {
      return res.status(400).json({ message: "Book already issued to this member" });
    }

    // Check if book is already issued to another member (active transaction)
    const activeTxn = await Transaction.findOne({
      book: book._id,
      returnDate: null, // means not yet returned
    });

    if (activeTxn) {
      return res.status(400).json({ message: "Book is already issued to another member"});
    }

    // Proceed to issue
    member.issuedBooks.push(book._id);
    await member.save();

    const txn = new Transaction({
      member: member._id,
      book: book._id,
      status: "issued",
      issueDate: new Date(),
    });
    await txn.save();

    res.status(200).json({
      message: "Book issued successfully",
      member,
      transaction: txn,
    });
  } catch (error) {
    res.status(500).json({ message: "Error issuing book", error: error.message });
  }
};


 * @desc Return a book from member + transaction log
 * @route POST /api/members/:id/return/:bookId
 
export const returnBook = async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);
    const book = await Book.findById(req.params.bookId);

    if (!member) return res.status(404).json({ message: "Member not found" });
    if (!book) return res.status(404).json({ message: "Book not found" });

    if (!member.issuedBooks.includes(req.params.bookId)) {
      return res.status(400).json({ message: "This book is not issued to this member" });
    }

    member.issuedBooks = member.issuedBooks.filter(
      (bookId) => bookId.toString() !== req.params.bookId
    );
    await member.save();

    // update transaction (close the last issue transaction for this book)
    const txn = await Transaction.findOneAndUpdate(
      { member: member._id, book: book._id, status: "issued", returnDate: null },
      { returnDate: new Date() },
      { new: true }
    );

    res.status(200).json({ message: "Book returned successfully", member, transaction: txn });
  } catch (error) {
    res.status(500).json({ message: "Error returning book", error: error.message });
  }
};
*/
/**
 * @desc Delete member
 * @route DELETE /api/members/:id
 */
export const deleteMember = async (req, res) => {
  try {
    const member = await Member.findByIdAndDelete(req.params.id);
    if (!member) return res.status(404).json({ message: "Member not found" });

    res.status(200).json({ message: "Member deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting member", error: error.message });
  }
};
