import mongoose from "mongoose";

const bookSchema = new mongoose.Schema({
  accession_number: {
    type: String,
    required: true,
    unique: true, // Primary identifier, already indexed
    trim: true,
    uppercase: true 
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  author_name: {
    type: String,
    required: true,
    trim: true
  },
  edition: {
    type: String,
    trim: true,
    default: "1" 
  },
  publication: {
    type: String,
    trim: true
  },
  pages: {
    type: Number,
    min: [1, "Pages must be at least 1"]
  },
  rate: {
    type: Number,
    min: [0, "Rate cannot be negative"]
  },
  supplier: {
    type: String,
    trim: true,
    lowercase: true 
  },
  bill_number: {
    type: String,
    trim: true
  },
  availabilityStatus: {
    type: String,
    enum: ["available", "issued", "lost", "write-off"],
    default: "available"
  }
}, { timestamps: true });

// --- Performance Indices ---
// Index 1: Status filtering (critical for Dashboard and Book Reports)
bookSchema.index({ availabilityStatus: 1 });
// Index 2: Text search (existing)
bookSchema.index({ title: "text", author_name: "text" });

export default mongoose.model("Book", bookSchema);