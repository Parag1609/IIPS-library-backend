import fs from "fs";
import csv from "fast-csv";
import Book from "../models/Book.js";
import MembershipRequest from "../models/MembershipRequest.js"

export const importBooksFromCSV = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Please upload a CSV file" });
    }

    const filePath = req.file.path;
    const results = [];

    fs.createReadStream(filePath)
      .pipe(csv.parse({ headers: true, trim: true }))
      .on("error", (err) => console.error("CSV Parse Error:", err))
      .on("data", (row) => results.push(row))
      .on("end", async () => {
        try {
          const booksToInsert = results.map((record) => ({
            accession_number: record.accession_number?.trim().toUpperCase(),
            title: record.title?.trim(),
            author_name: record.author_name?.trim(),
            edition: record.edition || "1",
            publication: record.publication || "",
            pages: record.pages ? Number(record.pages) : undefined,
            rate: record.rate ? Number(record.rate) : undefined,
            supplier: record.supplier || "",
            bill_number: record.bill_number || "",
            availabilityStatus: record.availabilityStatus || "available",
          }));

          const inserted = await Book.insertMany(booksToInsert, {
            ordered: false,
          });

          fs.unlinkSync(filePath);

          res.status(201).json({
            message: "CSV Import Completed",
            inserted: inserted.length,
            requests: inserted,
            skipped: results.length - inserted.length,
          });
        } catch (err) {
          fs.unlinkSync(filePath);

          if (err.writeErrors) {
            const insertedCount = results.length - err.writeErrors.length;
            res.status(201).json({
              message: "CSV Import Completed (with some duplicates skipped)",
              inserted: insertedCount,
              skipped: err.writeErrors.length,
              error: err,
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
      .json({ message: "Error importing books", error: error.message });
  }
};

export const importMembershipRequestsFromCSV = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Please upload a CSV file" });

    const filePath = req.file.path;
    const results = [];

    fs.createReadStream(filePath)
      .pipe(csv.parse({ headers: true, trim: true }))
      .on("error", (err) => console.error("CSV Parse Error:", err))
      .on("data", (row) => results.push(row))
      .on("end", async () => {
        try {
          const requestsToInsert = results.map((record) => ({
            Enrollment_Number: record.Enrollment_Number?.trim().toUpperCase(),
            First_Name: record.First_Name?.trim(),
            Surname: record.Surname?.trim(),
            Fathers_Name: record.Fathers_Name?.trim(),
            Semester: record.Semester?.trim(),
            Course: record.Course?.trim(),
            Mobile: record.Mobile?.trim(),
            Address: record.Address?.trim(),
            Passport_Size_Photo: record.Passport_Size_Photo?.trim(),
            Fee_Receipt: record.Fee_Receipt?.trim(),
            Status: record.Status || "pending"
          }));

          const inserted = await MembershipRequest.insertMany(requestsToInsert, { ordered: false });
          fs.unlinkSync(filePath);

          res.status(201).json({
            message: "Membership Requests CSV Import Completed",
            inserted: inserted.length,
            skipped: results.length - inserted.length,
          });

        } catch (err) {
          fs.unlinkSync(filePath);
          if (err.writeErrors) {
            const insertedCount = results.length - err.writeErrors.length;
            res.status(201).json({
              message: "Membership Requests CSV Import Completed (with some duplicates skipped)",
              inserted: insertedCount,
              skipped: err.writeErrors.length,
              error:err,
            });
          } else {
            res.status(500).json({ message: "Error importing membership requests", error: err.message });
          }
        }
      });

  } catch (error) {
    res.status(500).json({ message: "Error importing membership requests", error: error.message });
  }
};

