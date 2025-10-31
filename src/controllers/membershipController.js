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
      bookIssueLimit,
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
    const {  semester, course, cardStatus, search } = req.query;
    const filter={};
    // Apply filters
    if (cardStatus && cardStatus !== 'all') {
      filter.Status = cardStatus;
    }
    
    if (course && course !== 'all') {
      filter.Course = course.toUpperCase();
    }
    
    if (semester && semester !== 'all') {
      filter.Semester = semester;
    }
    if (search && search.trim()) {
  const regex = new RegExp(search, "i");
  filter.$or = [
    { memberId: regex},
    { firstName: regex },
    { surname: regex },
    { enrollment_number: regex },
    { fullName: regex },
  ];
}

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

export const getMemberByMemberId = async (req, res)  => {
  try{
    const { memberId } = req.query; 
    console.log(req.query, memberId);
    if (!memberId) {
      return res.status(400).json({ message: "memberId is required" });
    }
    const member = await Member.findOne({ memberId })
    .populate({
    path: 'issuedBooks',
    select: '_id accession_number tile' 
    });
    
    if (!member) {
      return res.status(404).json({ message: "Member not found" });
    }
     res.status(200).json({ success: true, data: member });
  } catch (error) {
    console.log(req.query);
    res.status(500).json({ message: "Error fetching member", error: error });
  }

}

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
