import fs from "fs";
import csv from "fast-csv";
import Book from "../models/Book.js";
import MembershipRequest from "../models/MembershipRequest.js";
import Member from "../models/Member.js"; // Import Member model for cross-validation

/**
 * Helper function for safe number parsing
 * @param {string} value The string value from the CSV
 * @returns {number|undefined} Parsed number or undefined if invalid
 */
const safeParseFloat = (value) => {
    if (value === null || value === undefined || value.trim() === '') return undefined;
    
    // Attempt to clean and parse the float
    const cleanedValue = value.toString().replace(/[$,]/g, '').trim();
    const parsed = parseFloat(cleanedValue);
    
    // Return the parsed number only if it's not NaN
    return isNaN(parsed) ? undefined : parsed;
};

/**
 * @desc Imports book records from a CSV file using insertMany for bulk operation
 * @route POST /api/import/books
 */
export const importBooksFromCSV = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Please upload a CSV file" });
    }

    const filePath = req.file.path;
    const results = [];
    let totalRecords = 0;

    fs.createReadStream(filePath)
      .pipe(csv.parse({ headers: true, trim: true }))
      .on("error", (err) => console.error("CSV Parse Error:", err))
      .on("data", (row) => {
            totalRecords++;
            results.push(row);
        })
      .on("end", async () => {
        try {
          const booksToInsert = results.map((record) => ({
            accession_number: record.accession_number?.trim().toUpperCase(),
            title: record.title?.trim(),
            author_name: record.author_name?.trim(),
            edition: record.edition || "1",
            publication: record.publication || "",
            // Safely parse numbers
            pages: safeParseFloat(record.pages),
            rate: safeParseFloat(record.rate),
            supplier: record.supplier || "",
            bill_number: record.bill_number || "",
            // Ensure status is valid or default to 'available'
            availabilityStatus: record.availabilityStatus?.toLowerCase() || "available",
          })).filter(book => book.accession_number); // Filter out records missing the unique identifier

          // Use insertMany with ordered: false for bulk inserts and duplicate skipping
          const inserted = await Book.insertMany(booksToInsert, {
            ordered: false,
            rawResult: true // Get detailed results
          });
          
          fs.unlinkSync(filePath);

          res.status(201).json({
            message: "Book Import Completed Successfully",
            inserted: inserted.insertedCount,
            totalRecordsProcessed: totalRecords,
            skipped: totalRecords - inserted.insertedCount,
          });
        } catch (err) {
          fs.unlinkSync(filePath);

          // Handle bulkWriteError which contains writeErrors for duplicates
          if (err.writeErrors) {
            const insertedCount = totalRecords - err.writeErrors.length;
            res.status(201).json({
              message: "Book Import Completed (with validation/duplicate errors)",
              inserted: insertedCount,
              skipped: err.writeErrors.length,
              error: err.message,
            });
          } else {
            res
              .status(500)
              .json({ message: "Error importing books", error: err.message });
          }
        }
      });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error importing books (server error)", error: error.message });
  }
};

/**
 * @desc Imports membership request records from a CSV file
 * @route POST /api/import/membership-requests
 */
export const importMembershipRequestsFromCSV = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Please upload a CSV file" });

    const filePath = req.file.path;
    const results = [];
    let totalRecords = 0;

    fs.createReadStream(filePath)
      .pipe(csv.parse({ headers: true, trim: true }))
      .on("error", (err) => console.error("CSV Parse Error:", err))
      .on("data", (row) => {
            totalRecords++;
            results.push(row);
        })
      .on("end", async () => {
        try {
          // 1. Pre-process records and validate required fields
          const validRequests = results.map((record) => {
                const memberNumber = record.Roll_Number?.trim().toUpperCase();
                const yearOfJoining = parseInt(record.YearOfJoining);

                if (!memberNumber || !record.name || !record.course || !record.mobile) {
                    return null; // Skip records missing critical fields
                }

                return {
                    memberNumber: memberNumber, // FIXED: Used defined variable
                    name: record.Name?.trim(),
                    fatherName: record.Fathers_Name?.trim() || undefined,
                    // FIXED: Explicitly convert to Number (required by schema)
                    yearOfJoining: isNaN(yearOfJoining) ? undefined : yearOfJoining, 
                    course: record.Course?.trim(),
                    mobile: record.Mobile?.trim(),
                    email: record.Gmail_Id?.trim() || undefined,
                    address: record.Address?.trim(),
                    // Note: Assuming passportPhoto and feeReceipt are file paths provided in the CSV
                    passportPhoto: record.Passport_Size_Photo?.trim(),
                    fee_receipt: record.Fee_Receipt?.trim(), // Schema uses fee_receipt
                    status: "pending"
                };
          }).filter(r => r !== null && r.memberNumber);
          
          const memberNumbersToProcess = validRequests.map(r => r.memberNumber);
          
          // 2. CRITICAL CHECK: Filter out member numbers already existing in the APPROVED Member collection
          const existingMembers = await Member.find({ 
              memberNumber: { $in: memberNumbersToProcess } 
          }, 'memberNumber');

          const existingMemberNumbers = new Set(existingMembers.map(m => m.memberNumber));

          const requestsToInsert = validRequests.filter(r => !existingMemberNumbers.has(r.memberNumber));
          
          const membersAlreadyRegisteredCount = validRequests.length - requestsToInsert.length;
          
          // 3. Perform the bulk insert
          const inserted = await MembershipRequest.insertMany(requestsToInsert, { ordered: false, rawResult: true });
          fs.unlinkSync(filePath);
          
          const successfulInserts = inserted.insertedCount;
          const totalSkipped = totalRecords - successfulInserts;

          res.status(201).json({
            message: "Membership Requests CSV Import Completed",
            inserted: successfulInserts,
            skipped: totalSkipped,
             details: {
                 invalidRecords: totalRecords - validRequests.length,
                 alreadyApprovedMembers: membersAlreadyRegisteredCount,
                 duplicateRequestsSkipped: requestsToInsert.length - successfulInserts,
             }
          });

        } catch (err) {
          fs.unlinkSync(filePath);
          if (err.writeErrors) {
            const insertedCount = totalRecords - err.writeErrors.length;
            res.status(201).json({
              message: "Membership Requests CSV Import Completed (with errors)",
              inserted: insertedCount,
              skipped: err.writeErrors.length,
              error:err.message,
            });
          } else {
            res.status(500).json({ message: "Error importing membership requests", error: err.message });
          }
        }
      });

  } catch (error) {
    res.status(500).json({ message: "Error importing membership requests (server error)", error: error.message });
  }
};