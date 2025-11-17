import Member from "../models/Member.js";
import Book from "../models/Book.js";
import Transaction from "../models/Transaction.js"; // Import Transaction model for deletion check

/**
 * @desc Create a new member manually (admin use)
 * @route POST /api/members
 */
export const createMember = async (req, res) => {
  try {
    const {
      name,
      fatherName,
      memberType,
      memberNumber,
      course,
      yearOfJoining,
      mobile,
      email,
      address,
      photo,
      cardStatus,
      bookIssueLimit
    } = req.body;

    // Prevent duplicate memberNumber (fast check due to unique index)
    const existing = await Member.findOne({ memberNumber });
    if (existing) {
      return res.status(400).json({ message: "Member with this member number already exists" });
    }

    const newMember = new Member({
      name,
      fatherName,
      memberType,
      memberNumber,
      course,
      yearOfJoining,
      mobile,
      email,
      address,
      photo,
      cardStatus: cardStatus || "active",
      bookIssueLimit
    });

    await newMember.save();
    res.status(201).json({ message: "Member created successfully", member: newMember });
  } catch (error) {
    res.status(500).json({ message: "Error creating member", error: error.message });
  }
};

/**
 * @desc Get all members (with optional filters)
 * @route GET /api/members
 */
export const getAllMembers = async (req, res) => {
  try {
    const { memberType, cardStatus, course, search } = req.query;
    const filter = {};

    // Filters: Benefit from new indices on memberType, cardStatus, course
    if (memberType && memberType !== "all") filter.memberType = memberType;
    if (cardStatus && cardStatus !== "all") filter.cardStatus = cardStatus;
    if (course && course !== "all") filter.course = course.toUpperCase();

    // Search filter: memberNumber/membershipId are fast (unique index)
    if (search && search.trim()) {
      const regex = new RegExp(search, "i");
      filter.$or = [
        { name: regex },
        { memberNumber: regex },
        { membershipId: regex },
      ];
    }

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
 * @desc Get member by MongoDB _id
 * @route GET /api/members/:id
 */
export const getMemberById = async (req, res) => {
  try {
    const member = await Member.findById(req.params.id).populate(
      "issuedBooks",
      "title accession_number author_name"
    );

    if (!member) return res.status(404).json({ message: "Member not found" });

    res.status(200).json(member);
  } catch (error) {
    res.status(500).json({ message: "Error fetching member", error: error.message });
  }
};

/**
 * @desc Get member by membershipId (barcode linked ID)
 * @route GET /api/members/memberid?membershipId=XYZ
 */
export const getMemberByMemberId = async (req, res) => {
  try {
    const { membershipId } = req.query;

    if (!membershipId) {
      return res.status(400).json({ message: "membershipId is required" });
    }

    // Query hits the new unique index on membershipId
    const member = await Member.findOne({ membershipId }).populate({
      path: "issuedBooks",
      select: "_id accession_number title",
    });

    if (!member) {
      return res.status(404).json({ message: "Member not found" });
    }

    res.status(200).json({ success: true, data: member });
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
 * @desc Activate/Deactivate member card
 * @route PATCH /api/members/:id/status
 */
export const updateCardStatus = async (req, res) => {
  try {
    const { cardStatus } = req.body;
    const { id } = req.params;

    if (!["active", "inactive"].includes(cardStatus)) {
      return res.status(400).json({ message: "Invalid card status" });
    }

    // Find the member and populate issuedBooks (fast lookup by _id)
    const member = await Member.findById(id).populate("issuedBooks", "_id title");

    if (!member) {
      return res.status(404).json({ message: "Member not found" });
    }

    // Prevent deactivation if books are still issued
    if (cardStatus === "inactive" && member.issuedBooks?.length > 0) {
      return res.status(400).json({
        message:
          "Cannot deactivate card — member still has issued books. Please return all books first.",
        issuedBooks: member.issuedBooks.map((b) => ({
          title: b.title,
          id: b._id,
        })),
      });
    }

    // Update card status
    member.cardStatus = cardStatus;
    await member.save();

    res.status(200).json({
      message: `Card ${cardStatus} successfully`,
      member,
    });
  } catch (error) {
    console.error("Error updating card status:", error);
    res.status(500).json({
      message: "Error updating card status",
      error: error.message,
    });
  }
};


/**
 * @desc Delete member
 * @route DELETE /api/members/:id
 */
export const deleteMember = async (req, res) => {
  try {
    const memberId = req.params.id;
    
    // --- NEW CHECK: Prevent deletion if member has outstanding transactions/books ---
    const member = await Member.findById(memberId);
    if (!member) return res.status(404).json({ message: "Member not found" });

    // 1. Check for actively issued books (fast check due to index on issuedBooks)
    if (member.issuedBooks && member.issuedBooks.length > 0) {
        return res.status(400).json({ 
            message: "Cannot delete member: They currently have books issued. Please ensure all books are returned first.",
            issuedCount: member.issuedBooks.length
        });
    }

    // 2. Check for historical transactions (fast check due to member index in Transaction schema)
    const transactionCount = await Transaction.countDocuments({ member: memberId });
    if (transactionCount > 0) {
        return res.status(400).json({
            message: `Cannot delete member: Member has ${transactionCount} historical transactions. Deletion is restricted to maintain data integrity. Please deactivate the card instead.`,
            transactionCount
        });
    }
    // --- END NEW CHECK ---

    const deletedMember = await Member.findByIdAndDelete(memberId);

    res.status(200).json({ message: "Member deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting member", error: error.message });
  }
};