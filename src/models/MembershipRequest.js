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
  Status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  Full_Name: { type: String }
}, { timestamps: true });

membershipRequestSchema.pre("save", function (next) {
  this.Full_Name = `${this.First_Name} ${this.Surname}`.trim();
  next();
});

membershipRequestSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate();

  if (update.First_Name || update.Surname) {
    const firstName = update.First_Name || this.getQuery().First_Name;
    const surname = update.Surname || this.getQuery().Surname;

    update.Full_Name = `${firstName || ""} ${surname || ""}`.trim();
    this.setUpdate(update);
  }
  next();
});



export default mongoose.model("MembershipRequest", membershipRequestSchema);
