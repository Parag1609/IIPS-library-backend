import MembershipRequest from "../models/membershipRequestModel.js";
import Member from "../models/memberModel.js";

/**
 * @desc Create a new membership request
 * @route POST /api/membership-requests
 */
export const createRequest = async (req, res) => {
  try {
    const {
      enrollment_number,
      firstName,
      surname,
      fatherName,
      semester,
      course,
      mobile,
      address,
    } = req.body;

    // Check duplicates (in requests & members)
    const existingRequest = await MembershipRequest.findOne({ enrollment_number });
    const existingMember = await Member.findOne({ enrollment: enrollment_number });

    if (existingRequest || existingMember) {
      return res.status(400).json({ message: "Enrollment number already exists in system" });
    }

    // File upload paths (via multer)
    const photo = req.files?.photo ? req.files.photo[0].path : null;
    const fee_receipt = req.files?.fee_receipt ? req.files.fee_receipt[0].path : null;

    const newRequest = new MembershipRequest({
      enrollment_number,
      firstName,
      surname,
      fatherName,
      semester,
      course,
      mobile,
      address,
      photo,
      fee_receipt,
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
    const requests = await MembershipRequest.find().sort({ createdAt: -1 });
    res.status(200).json(requests);
  } catch (error) {
    res.status(500).json({ message: "Error fetching requests", error: error.message });
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

    if (request.status === "approved") {
      return res.status(400).json({ message: "Request already approved" });
    }

    // Check if already a member
    const existingMember = await Member.findOne({ enrollment: request.enrollment_number });
    if (existingMember) {
      return res.status(400).json({ message: "This enrollment is already a member" });
    }

    // Generate unique library memberId
    const memberId = `LIB-${Date.now()}`;

    const newMember = new Member({
      memberId,
      enrollment: request.enrollment_number,
      firstName: request.firstName,
      surname: request.surname,
      fatherName: request.fatherName,
      semester: request.semester,
      course: request.course,
      mobile: request.mobile,
      address: request.address,
      photo: request.photo,
    });

    await newMember.save();

    // Update request status
    request.status = "approved";
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

    if (request.status === "rejected") {
      return res.status(400).json({ message: "Request already rejected" });
    }

    request.status = "rejected";
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
