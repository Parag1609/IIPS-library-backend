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
    required: true
  },
  returnDate: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ["issued", "returned", "overdue"],
    default: "issued"
  },
  fineAmount: {
    type: Number,
    default: 0,
    min: 0
  }
}, { timestamps: true });

/**
 * Middleware to auto-update status
 */
transactionSchema.pre("save", function (next) {
  if (this.returnDate) {
    this.status = "returned";
  } else {
    if (this.dueDate && this.dueDate < new Date()) {
      this.status = "overdue";
    } else {
      this.status = "issued";
    }
  }
  next();
});

transactionSchema.index({ member: 1, book: 1, status: 1 });
export default mongoose.model("Transaction", transactionSchema);
