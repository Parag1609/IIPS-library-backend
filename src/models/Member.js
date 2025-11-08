import mongoose from "mongoose";

const memberSchema = new mongoose.Schema({
  // Unified ID for all member types (used for barcode)
  membershipId: { 
    type: String, 
    unique: true, 
    trim: true,
  },
  
  // Member Type
  memberType: {
    type: String,
    required: true,
    enum: ["student", "faculty", "special"],
    default: "student"
  },
  
  // Personal Information
  name: { 
    type: String, 
    required: true, 
    trim: true 
  },
  
  fatherName: { 
    type: String, 
    trim: true 
  },
  
  // Roll number for students and auto-generated for others
  memberNumber: { 
    type: String,
    trim: true,
    uppercase: true,
  },
  
  course: { 
    type: String,
    trim: true,
    required: function() {
      return this.memberType === "student";
    }
  },
  
  yearOfJoining: {
    type: Number,
    required: true,
    min: 2000,
    max: new Date().getFullYear() + 1
  },
  
  // Contact Information
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
  
  // Photo
  photo: { 
    type: String,
  },
  
  // Library Status
  cardStatus: { 
    type: String, 
    enum: ["active", "inactive"], 
    default: "active" 
  },
  
  // Book Management - Different limits based on member type
  bookIssueLimit: { 
    type: Number,
    default: function() {
      switch(this.memberType) {
        case "faculty": return 10;
        case "special": return 5;
        case "student": 
        default: return 3;
      }
    },
    min: 1 
  },
  
  // Issued Books
  issuedBooks: [
    {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Book",
        required: true
    }
  ],
  
}, { 
  timestamps: true 
});

// Indexes
memberSchema.index({ memberType: 1 });
memberSchema.index({ memberNumber: 1 }, { unique: true });
memberSchema.index({ cardStatus: 1 });

// Virtual for available slots
memberSchema.virtual('availableSlots').get(function() {
  return this.bookIssueLimit - this.issuedBooks.length;
});

// Method to check if member can issue more books
memberSchema.methods.canIssueMoreBooks = function() {
  return this.issuedBooks.length < this.bookIssueLimit;
};

// Pre-validation check for issued books
memberSchema.pre("validate", function (next) {
  if (this.issuedBooks.length > this.bookIssueLimit) {
    return next(new Error(`A member cannot have more than ${this.bookIssueLimit} issued books at a time.`));
  }
  next();
});

memberSchema.pre("save", async function (next) {
  try {
    const Member = mongoose.model("Member");

    // ---- Auto-generate memberNumber ----
    if (!this.memberNumber && (this.memberType === "faculty" || this.memberType === "special")) {
      const year = this.yearOfJoining || new Date().getFullYear();
      const prefix = this.memberType === "faculty" ? "FAC" : "SPL";
      const count = await Member.countDocuments({ memberType: this.memberType });
      this.memberNumber = `${prefix}${year}${String(count + 1).padStart(4, "0")}`;
    }

    // ---- Auto-generate membershipId ----
    if (!this.membershipId) {
      const timestamp = Date.now().toString().slice(-6); // last 6 digits for uniqueness
      const prefix = this.memberType === "student" ? "MST" 
                     : this.memberType === "faculty" ? "MFC"
                     : "MSP";
      this.membershipId = `${prefix}${timestamp}${Math.floor(Math.random() * 90 + 10)}`;
    }

    next();
  } catch (err) {
    next(err);
  }
});

export default mongoose.model("Member", memberSchema);
