import PDFDocument from "pdfkit";
import bwipjs from "bwip-js";
import Book from "../models/Book.js";

export const downloadBarcodesGridPDF = async (req, res) => {
  try {
    const { fromAcc, toAcc, author_name } = req.query;
    const filter = {};

    // Filter on accession number range and author name
    if (fromAcc || toAcc) {
      filter.accession_number = {};
      if (fromAcc) filter.accession_number.$gte = fromAcc;
      if (toAcc) filter.accession_number.$lte = toAcc;
    }
    if (author_name) filter.author_name = new RegExp(author_name, "i");

    // Query books: Uses accession_number index for efficient range filtering and sorting
    const books = await Book.find(filter).sort({ accession_number: 1 });

    if (!books.length) {
      return res.status(404).json({ message: "No books found for given filters" });
    }

    // PDF generation logic follows...
    const doc = new PDFDocument({ size: "A4", margin: 30 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=barcodes-grid.pdf");
    doc.pipe(res);

    // Grid config
    const cols = 4;
    const rows = 10;
    const cellWidth = (doc.page.width - 60) / cols;  // subtract margins
    const cellHeight = (doc.page.height - 60) / rows;
    let col = 0, row = 0;

    for (let book of books) {
      // Generate barcode in memory
      const barcodeBuffer = await bwipjs.toBuffer({
        bcid: "code128",
        text: book.accession_number,
        scale: 2,
        height: 10,
        includetext: true,
        textxalign: "center",
      });

      // Position in grid
      const x = 30 + col * cellWidth;
      const y = 30 + row * cellHeight;

      // Draw box (optional for debug)
      // doc.rect(x, y, cellWidth, cellHeight).stroke();

      // Place barcode
      doc.image(barcodeBuffer, x + 10, y + 5, { fit: [cellWidth - 20, cellHeight - 40] });

     /* // Book info below barcode
      doc.fontSize(8).text(
        `${book.title || ""}`,
        x,
        y + cellHeight - 25,
        { width: cellWidth, align: "center" }
      ); 
      doc.fontSize(8).text(
        `${book.accession_number}`,
        x,
        y + cellHeight - 12,
        { width: cellWidth, align: "center" }
      );
*/
      // Next cell
      col++;
      if (col >= cols) {
        col = 0;
        row++;
        if (row >= rows) {
          row = 0;
          doc.addPage(); // new page if full
        }
      }
    }

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).send("Error generating barcode PDF");
  }
};
