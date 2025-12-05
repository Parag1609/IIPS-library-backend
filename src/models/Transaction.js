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
 dueDate: {
    type: Date,
    default: null
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
transactionSchema.index({ member: 1, book: 1, status: 1 });
transactionSchema.index({ issueDate: 1 });
transactionSchema.index({ returnDate: 1 });
transactionSchema.index({ member: 1 }); 

export default mongoose.model("Transaction", transactionSchema);