import mongoose from "mongoose";

const membershipRequestSchema = new mongoose.Schema({
  enrollment_number: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
    uppercase: true 
  },
  firstName: { type: String, required: true, trim: true },
  surname: { type: String, required: true, trim: true },
  fatherName: { type: String, required: true, trim: true },
  semester: { type: String, required: true, trim: true },
  course: { type: String, required: true, trim: true },
  mobile: { 
    type: String, 
    required: true, 
    trim: true,
    match: [/^[6-9]\d{9}$/, "Please provide a valid 10-digit Indian mobile number"]
  },
  address: { type: String, required: true, trim: true },
  photo: { type: String, required: true },  
  fee_receipt: { type: String, required: true },
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" }
}, { timestamps: true });

export default mongoose.model("MembershipRequest", membershipRequestSchema);
