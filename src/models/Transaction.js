import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
  member: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Member",
    required: true
  },
  book: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Book",
    required: true
  },
  issueDate: {
    type: Date,
    default: Date.now
  },
  returnDate: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ["issued", "returned"],
    default: "issued"
  }
}, { timestamps: true });

/**
 * Middleware to auto-update status
 */
transactionSchema.pre("save", function (next) {
  if (this.returnDate) {
    this.status = "returned";
  } else {
    this.status = "issued";

  }
  next();
});

// --- Performance Indices ---
// Index 1: Transaction lookup/uniqueness check (existing)
transactionSchema.index({ member: 1, book: 1, status: 1 });

// Index 2: Critical for all Date-Range reports (Daily, Weekly, Monthly, Custom)
transactionSchema.index({ issueDate: 1 });
transactionSchema.index({ returnDate: 1 });

// Index 3: Critical for Member Deletion check (Transaction.countDocuments({ member: memberId }))
transactionSchema.index({ member: 1 }); 

export default mongoose.model("Transaction", transactionSchema);