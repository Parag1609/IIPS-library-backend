import mongoose from "mongoose";

const membershipRequestSchema = new mongoose.Schema({
  memberNumber: { 
    type: String,
    trim: true,
    uppercase: true,
    required: true
  },
  name: { type: String, required: true, trim: true },
  fatherName: { type: String, trim: true  },
  yearOfJoining: {
    type: Number,
    required: true,
    min: 2000,
    max: new Date().getFullYear() + 1
  },
  course: { 
    type: String,
    trim: true,
    required: true,
  },
   mobile: { 
    type: String, 
    required: true, 
    trim: true,
    match: [/^[6-9]\d{9}$/, "Please provide a valid 10-digit Indian mobile number"]
  },
  
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"]
  },
  address: { 
    type: String, 
    required: true, 
    trim: true 
  },
  passportPhoto: { type: String, required: true },  
  fee_receipt: { type: String, required: true },
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
}, { timestamps: true });

// --- Performance Indices ---
// Index 1: For filtering by status (MembershipRequestController.getAllRequests)
membershipRequestSchema.index({ status: 1 });
// Index 2: For filtering by course
membershipRequestSchema.index({ course: 1 });
// Index 3: For filtering by year
membershipRequestSchema.index({ yearOfJoining: 1 });
// Index 4: For fast checks of existing member number/mobile number
membershipRequestSchema.index({ memberNumber: 1 });
membershipRequestSchema.index({ mobile: 1 });

export default mongoose.model("MembershipRequest", membershipRequestSchema);