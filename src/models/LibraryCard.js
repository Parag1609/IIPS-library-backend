import mongoose from "mongoose";

const memberSchema = new mongoose.Schema({
  memberId: { type: String, required: true, unique: true, trim: true },
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
  cardStatus: { type: String, enum: ["active", "inactive"], default: "active" },
  bookIssueLimit: { type: Number, default: 3, min: 1 },

  issuedBooks: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Book"
    }
  ]
}, { timestamps: true });

memberSchema.pre("validate", function (next) {
  if (this.issuedBooks.length > this.bookIssueLimit) {
    return next(new Error(`A member cannot have more than ${this.bookIssueLimit} issued books at a time.`));
  }
  next();
});

export default mongoose.model("Member", memberSchema);
