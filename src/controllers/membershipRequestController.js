import MembershipRequest from "../models/MembershipRequest.js";
import Member from "../models/Member.js";

/**
 * @desc Create a new membership request
 * @route POST /api/membership-requests
 */
export const createRequest = async (req, res) => {
  try {
    const {
      Enrollment_Number,
      First_Name,
      Surname,
      Fathers_Name,
      Semester,
      Course,
      Mobile,
      Address,
    } = req.body;

    // Check duplicates (in requests & members)
    const existingRequest = await MembershipRequest.findOne({ Enrollment_Number });
    const existingMember = await Member.findOne({ enrollment_number: Enrollment_Number });

    if (existingRequest || existingMember) {
      return res.status(400).json({ message: "Enrollment number already exists in system" });
    }

    // File upload paths (via multer)
    const Passport_Size_Photo = req.files?.Passport_Size_Photo ? req.files.Passport_Size_Photo[0].path : null;
    const Fee_Receipt = req.files?.Fee_Receipt ? req.files.Fee_Receipt[0].path : null;

    const newRequest = new MembershipRequest({
      Enrollment_Number,
      First_Name,
      Surname,
      Fathers_Name,
      Semester,
      Course,
      Mobile,
      Address,
      Passport_Size_Photo,
      Fee_Receipt,
    });

    await newRequest.save();
    res.status(201).json({ message: "Membership request submitted", request: newRequest });
  } catch (error) {
    res.status(500).json({ message: "Error creating request", error: error.message });
  }
};

/**
 * @desc Get all membership requests
 * @route GET /api/membership-requests
 */
export const getAllRequests = async (req, res) => {
  try {
    const { status, course, semester, search } = req.query;
    
    const filter = {};
    
    // Apply filters
    if (status && status !== 'all') {
      filter.Status = status;
    }
    
    if (course && course !== 'all') {
      filter.Course = course.toUpperCase();
    }
    
    if (semester && semester !== 'all') {
      filter.Semester = semester;
    }
    
    // Search by name or enrollment number
    if (search && search.trim()) {
  const regex = new RegExp(search, "i");
  filter.$or = [
    { First_Name: regex },
    { Surname: regex },
    { Enrollment_Number: regex },
    { Full_Name: regex }  
  ];
}
    
    const requests = await MembershipRequest.find(filter)
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: requests.length,
      data: requests
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching membership requests",
      error: error.message
    });
  }
};


/**
 * @desc Get membership request by ID
 * @route GET /api/membership-requests/:id
 */
export const getRequestById = async (req, res) => {
  try {
    const request = await MembershipRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Request not found" });

    res.status(200).json(request);
  } catch (error) {
    res.status(500).json({ message: "Error fetching request", error: error.message });
  }
};

/**
 * @desc Approve a membership request
 * @route POST /api/membership-requests/:id/approve
 */
export const approveRequest = async (req, res) => {
  try {
    const request = await MembershipRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Request not found" });

    if (request.Status === "approved") {
      return res.status(400).json({ message: "Request already approved" });
    }

    // Check if already a member
    const existingMember = await Member.findOne({ enrollment_number: request.Enrollment_Number });
    if (existingMember) {
      return res.status(400).json({ message: "This enrollment is already a member" });
    }

    // Generate unique library memberId
    const memberId = `LIB-${Date.now()}`;

    const newMember = new Member({
      memberId,
      enrollment_number: request.Enrollment_Number,
      firstName: request.First_Name,
      surname: request.Surname,
      fatherName: request.Fathers_Name,
      semester: request.Semester,
      course: request.Course,
      mobile: request.Mobile,
      address: request.Address,
      photo: request.Passport_Size_Photo,
      fullName: request.Full_Name,
    });

    await newMember.save();

    // Update request status
    request.Status = "approved";
    await request.save();

    res.status(201).json({ message: "Membership approved", member: newMember });
  } catch (error) {
    res.status(500).json({ message: "Error approving request", error: error.message });
  }
};

/**
 * @desc Reject a membership request
 * @route POST /api/membership-requests/:id/reject
 */
export const rejectRequest = async (req, res) => {
  try {
    const request = await MembershipRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Request not found" });

    if (request.Status === "rejected") {
      return res.status(400).json({ message: "Request already rejected" });
    }

    request.Status = "rejected";
    await request.save();

    res.status(200).json({ message: "Membership request rejected" });
  } catch (error) {
    res.status(500).json({ message: "Error rejecting request", error: error.message });
  }
};

/**
 * @desc Delete membership request permanently
 * @route DELETE /api/membership-requests/:id
 */
export const deleteRequest = async (req, res) => {
  try {
    const request = await MembershipRequest.findByIdAndDelete(req.params.id);
    if (!request) return res.status(404).json({ message: "Request not found" });

    res.status(200).json({ message: "Membership request deleted" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting request", error: error.message });
  }
};
