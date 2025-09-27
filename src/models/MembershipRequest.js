import mongoose from "mongoose";

const membershipRequestSchema = new mongoose.Schema({
  Enrollment_Number: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
    uppercase: true 
  },
  First_Name: { type: String, required: true, trim: true },
  Surname: { type: String, required: true, trim: true },
  Fathers_Name: { type: String, required: true, trim: true },
  Semester: { type: String, required: true, trim: true },
  Course: { type: String, required: true, trim: true },
  Mobile: { 
    type: String, 
    required: true, 
    trim: true,
    match: [/^[6-9]\d{9}$/, "Please provide a valid 10-digit Indian mobile number"]
  },
  Address: { type: String, required: true, trim: true },
  Passport_Size_Photo: { type: String, required: true },  
  Fee_Receipt: { type: String, required: true },
  Status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" }
}, { timestamps: true });

export default mongoose.model("MembershipRequest", membershipRequestSchema);
