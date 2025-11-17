import MembershipRequest from "../models/MembershipRequest.js";
import Member from "../models/Member.js";

/**
 * @desc Create a new membership request
 * @route POST /api/membership-requests
 */
export const createRequest = async (req, res) => {
  try {
    const {
      memberNumber,
      name,
      fatherName,
      yearOfJoining,
      course,
      mobile,
      email,
      address,
    } = req.body;

    // Validate required fields
    if (!memberNumber || !name || !yearOfJoining || !course || !mobile || !address) {
      return res.status(400).json({ 
        success: false,
        message: "Please provide all required fields" 
      });
    }

    // Check for duplicates in both requests and members (fast check due to indices)
    const [existingRequest, existingMember] = await Promise.all([
      MembershipRequest.findOne({ memberNumber: memberNumber.toUpperCase() }),
      Member.findOne({ memberNumber: memberNumber.toUpperCase() })
    ]);

    if (existingRequest) {
      return res.status(400).json({ 
        success: false,
        message: "A membership request with this member number already exists" 
      });
    }

    if (existingMember) {
      return res.status(400).json({ 
        success: false,
        message: "This member number is already registered in the system" 
      });
    }

    // Check for duplicate mobile number (fast check due to new mobile index)
    const existingMobile = await MembershipRequest.findOne({ mobile });
    if (existingMobile) {
      return res.status(400).json({ 
        success: false,
        message: "A request with this mobile number already exists" 
      });
    }

    // File upload paths (via multer)
    const passportPhoto = req.files?.passportPhoto 
      ? req.files.passportPhoto[0].path 
      : null;
    const feeReceipt = req.files?.feeReceipt 
      ? req.files.fee_receipt[0].path 
      : null;

    // Validate file uploads
    if (!passportPhoto || !feeReceipt) {
      return res.status(400).json({ 
        success: false,
        message: "Please upload both passport photo and fee receipt" 
      });
    }

    // Create new request
    const newRequest = new MembershipRequest({
      memberNumber: memberNumber.toUpperCase(),
      name,
      fatherName,
      yearOfJoining,
      course,
      mobile,
      email,
      address,
      passportPhoto,
      feeReceipt,
    });

    await newRequest.save();

    res.status(201).json({ 
      success: true,
      message: "Membership request submitted successfully", 
      data: newRequest 
    });

  } catch (error) {
    console.error("Create request error:", error);
    res.status(500).json({ 
      success: false,
      message: "Error creating membership request", 
      error: error.message 
    });
  }
};

/**
 * @desc Get all membership requests with filters
 * @route GET /api/membership-requests
 */
export const getAllRequests = async (req, res) => {
  try {
    const { status, course, year, search } = req.query;
    
    const filter = {};
    
    // Filters leverage new indices: status, course, yearOfJoining
    if (status && status !== 'all') {
      filter.status = status;
    }
    
    if (course && course !== 'all') {
      filter.course = new RegExp(course, 'i');
    }
    
    if (year && year !== 'all') {
      filter.yearOfJoining = parseInt(year);
    }
    
    // Search by name or member number
    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [
        { name: regex },
        { memberNumber: regex },
        { fatherName: regex }
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
    console.error("Get all requests error:", error);
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
    
    if (!request) {
      return res.status(404).json({ 
        success: false,
        message: "Membership request not found" 
      });
    }

    res.status(200).json({
      success: true,
      data: request
    });

  } catch (error) {
    console.error("Get request by ID error:", error);
    res.status(500).json({ 
      success: false,
      message: "Error fetching membership request", 
      error: error.message 
    });
  }
};

/**
 * @desc Update membership request
 * @route PUT /api/membership-requests/:id
 */
export const updateRequest = async (req, res) => {
  try {
    const request = await MembershipRequest.findById(req.params.id);
    
    if (!request) {
      return res.status(404).json({ 
        success: false,
        message: "Membership request not found" 
      });
    }

    // Don't allow updates to approved/rejected requests
    if (request.status !== 'pending') {
      return res.status(400).json({ 
        success: false,
        message: `Cannot update ${request.status} request` 
      });
    }

    const {
      memberNumber,
      name,
      fatherName,
      yearOfJoining,
      course,
      mobile,
      email,
      address,
    } = req.body;

    // Check if new memberNumber conflicts with existing (fast check due to unique index)
    if (memberNumber && memberNumber !== request.memberNumber) {
      const [existingRequest, existingMember] = await Promise.all([
        MembershipRequest.findOne({ 
          memberNumber: memberNumber.toUpperCase(),
          _id: { $ne: req.params.id }
        }),
        Member.findOne({ memberNumber: memberNumber.toUpperCase() })
      ]);

      if (existingRequest || existingMember) {
        return res.status(400).json({ 
          success: false,
          message: "Member number already exists in system" 
        });
      }
    }

    // Update fields
    if (memberNumber) request.memberNumber = memberNumber.toUpperCase();
    if (name) request.name = name;
    if (fatherName !== undefined) request.fatherName = fatherName;
    if (yearOfJoining) request.yearOfJoining = yearOfJoining;
    if (course) request.course = course;
    if (mobile) request.mobile = mobile;
    if (email !== undefined) request.email = email;
    if (address) request.address = address;

    // Update files if uploaded
    if (req.files?.passportPhoto) {
      request.passportPhoto = req.files.passportPhoto[0].path;
    }
    if (req.files?.feeReceipt) {
      request.feeReceipt = req.files.feeReceipt[0].path;
    }

    await request.save();

    res.status(200).json({
      success: true,
      message: "Membership request updated successfully",
      data: request
    });

  } catch (error) {
    console.error("Update request error:", error);
    res.status(500).json({ 
      success: false,
      message: "Error updating membership request", 
      error: error.message 
    });
  }
};

/**
 * @desc Approve a membership request
 * @route POST /api/membership-requests/:id/approve
 */
export const approveRequest = async (req, res) => {
  try {
    const request = await MembershipRequest.findById(req.params.id);
    
    if (!request) {
      return res.status(404).json({ 
        success: false,
        message: "Membership request not found" 
      });
    }

    if (request.status === "approved") {
      return res.status(400).json({ 
        success: false,
        message: "Request already approved" 
      });
    }

    if (request.status === "rejected") {
      return res.status(400).json({ 
        success: false,
        message: "Cannot approve a rejected request" 
      });
    }

    // Check if member already exists (fast check due to unique index)
    const existingMember = await Member.findOne({ 
      memberNumber: request.memberNumber 
    });

    if (existingMember) {
      return res.status(400).json({ 
        success: false,
        message: "This member number is already registered" 
      });
    }

    // Create new member from request
    // NOTE: Keeping memberType hardcoded as "student" per user instruction.
    const newMember = new Member({
      memberNumber: request.memberNumber,
      name: request.name,
      fatherName: request.fatherName,
      yearOfJoining: request.yearOfJoining,
      course: request.course,
      mobile: request.mobile,
      email: request.email,
      address: request.address,
      photo: request.passportPhoto,
      memberType: "student", 
      cardStatus: "active",
    });

    await newMember.save();

    // Update request status
    request.status = "approved";
    await request.save();

    res.status(201).json({ 
      success: true,
      message: "Membership approved successfully", 
      data: {
        request,
        member: newMember
      }
    });

  } catch (error) {
    console.error("Approve request error:", error);
    res.status(500).json({ 
      success: false,
      message: "Error approving membership request", 
      error: error.message 
    });
  }
};

/**
 * @desc Reject a membership request
 * @route POST /api/membership-requests/:id/reject
 */
export const rejectRequest = async (req, res) => {
  try {
    const request = await MembershipRequest.findById(req.params.id);
    
    if (!request) {
      return res.status(404).json({ 
        success: false,
        message: "Membership request not found" 
      });
    }

    if (request.status === "rejected") {
      return res.status(400).json({ 
        success: false,
        message: "Request already rejected" 
      });
    }

    if (request.status === "approved") {
      return res.status(400).json({ 
        success: false,
        message: "Cannot reject an approved request" 
      });
    }

    request.status = "rejected";
    await request.save();

    res.status(200).json({ 
      success: true,
      message: "Membership request rejected",
      data: request
    });

  } catch (error) {
    console.error("Reject request error:", error);
    res.status(500).json({ 
      success: false,
      message: "Error rejecting membership request", 
      error: error.message 
    });
  }
};

/**
 * @desc Delete membership request permanently
 * @route DELETE /api/membership-requests/:id
 */
export const deleteRequest = async (req, res) => {
  try {
    const request = await MembershipRequest.findById(req.params.id);
    
    if (!request) {
      return res.status(404).json({ 
        success: false,
        message: "Membership request not found" 
      });
    }

    // Optional: Only allow deletion of rejected or pending requests
    if (request.status === "approved") {
      return res.status(400).json({ 
        success: false,
        message: "Cannot delete approved request. Please deactivate the member instead." 
      });
    }

    await MembershipRequest.findByIdAndDelete(req.params.id);

    res.status(200).json({ 
      success: true,
      message: "Membership request deleted successfully" 
    });

  } catch (error) {
    console.error("Delete request error:", error);
    res.status(500).json({ 
      success: false,
      message: "Error deleting membership request", 
      error: error.message 
    });
  }
};