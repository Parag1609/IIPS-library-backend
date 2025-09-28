import PDFDocument from "pdfkit";
import Member from "../models/LibraryCard.js";
import {generateMemberCard} from "../helpers/generateCard.js"

export const downloadLibraryCardsPDF = async (req, res) => {
  try {
    const {
      semester,
      course,
    } = req.query;
    const filter = {};

    if (course) {
      filter.course = course.toUpperCase();
    }
    if (semester) {
      filter.semester = semester;
    }
    // Fetch members with filters
    const members = await Member.find(filter)
      .sort({  firstName: 1 });

    if (!members.length) {
      return res.status(404).json({
        message: "No members found for the given filters",
        appliedFilters: filter,
        totalMembers: 0
      });
    }
    const cols =2;
    const rows =4;

    const doc = new PDFDocument({
      size: "A4",
      margin: 20,
      info: {
        Title: `Library Cards - ${new Date().toLocaleDateString()}`,
        Subject: 'Library Member Cards',
        Keywords: 'library, cards, members'
      }
    });

    // Set response headers
    const filename = `library-cards-${new Date().toISOString().split('T')[0]}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    doc.pipe(res);

    // Card dimensions (credit card size: 85.6mm x 53.98mm)
    const cardWidth = 242; // ~85.6mm in points
    const cardHeight = 153; // ~53.98mm in points
    
    // Calculate spacing
    const pageWidth = doc.page.width - 40; // Subtract margins
    const pageHeight = doc.page.height - 40;
    const spacingX = (pageWidth - (cols * cardWidth)) / (cols + 1);
    const spacingY = (pageHeight - (rows * cardHeight)) / (rows + 1);

    let col = 0, row = 0, processedCount = 0;
    const errors = [];

    // Process each member
    for (const member of members) {
      try {
        // Calculate card position
        const x = 20 + spacingX + col * (cardWidth + spacingX);
        const y = 20 + spacingY + row * (cardHeight + spacingY);

        // Generate member card
        await generateMemberCard(doc, member, x, y, cardWidth, cardHeight);

        processedCount++;
        
        // Move to next position
        col++;
        if (col >= cols) {
          col = 0;
          row++;
          if (row >= rows) {
            row = 0;
            if (processedCount < members.length) {
              doc.addPage();
            }
          }
        }

        // Progress logging
        if (processedCount % 20 === 0) {
          console.log(`Generated ${processedCount}/${members.length} cards`);
        }

      } catch (error) {
        console.error(`Error generating card for member ${member.memberNumber}:`, error.message);
        errors.push({
          memberId: member.memberId,
          error: error.message
        });
      }
    }


    doc.end();
    console.log(`Card generation completed. Generated: ${processedCount}, Errors: ${errors.length}`);

  } catch (error) {
    console.error('Card Generation Error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        message: "Error generating library cards",
        error: error.message
      });
    }
  }
};


export const previewLibraryCardsPDF = async (req, res) => {
  try {
    const { semester, course} = req.query;

    const filter = {};
    if (course && course !== 'all') filter.course = course.toUpperCase();
    if (semester && semester !== 'all') filter.semester = semester;

    const members = await Member.find(filter).sort({ firstName: 1 });

    if (!members.length) {
      return res.status(404).json({ message: "No members found for the given filters" });
    }

    // Parse layout
    const cols = 2;
    const rows = 4;

    const doc = new PDFDocument({ size: "A4", margin: 20 });
    
    // Create chunks array to collect PDF data
    const chunks = [];
    
    // Listen for data events and collect chunks
    doc.on('data', (chunk) => {
      chunks.push(chunk);
    });

    // Promise to handle PDF generation completion
    const pdfPromise = new Promise((resolve, reject) => {
      doc.on('end', () => {
        try {
          // Combine all chunks into a single buffer
          const buffer = Buffer.concat(chunks);
          const base64 = buffer.toString("base64");
          resolve(base64);
        } catch (error) {
          reject(error);
        }
      });

      doc.on('error', (error) => {
        reject(error);
      });
    });

    // Generate PDF content
    const cardWidth = 242;
    const cardHeight = 153;
    const pageWidth = doc.page.width - 40;
    const pageHeight = doc.page.height - 40;
    const spacingX = (pageWidth - cols * cardWidth) / (cols + 1);
    const spacingY = (pageHeight - rows * cardHeight) / (rows + 1);

    let col = 0, row = 0;

    for (let i = 0; i < members.length; i++) {
      const member = members[i];

      const x = 20 + spacingX + col * (cardWidth + spacingX);
      const y = 20 + spacingY + row * (cardHeight + spacingY);

      await generateMemberCard(doc, member, x, y, cardWidth, cardHeight);

      col++;
      if (col >= cols) {
        col = 0;
        row++;
        if (row >= rows && i < members.length - 1) {
          row = 0;
          doc.addPage();
        }
      }
    }

    // Finalize the PDF
    doc.end();

    // Wait for PDF generation to complete
    const base64PDF = await pdfPromise;

    // Send response with preview data
    res.json({ 
      success: true,
      data: {
        pdf: base64PDF,
        totalCards: members.length,
        totalPages: Math.ceil(members.length / (cols * rows)),
        layout: { cols, rows },
        appliedFilters: filter,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error("Preview Error:", error);
    res.status(500).json({ 
      success: false,
      message: "Error generating preview",
      error: error.message 
    });
  }
};

export const downloadSingleMemberCard = async (req, res) => {
  try {
    const { memberId } = req.params;

    const member = await Member.findById(memberId);
    if (!member) {
      return res.status(404).json({ message: "Member not found" });
    }

    const doc = new PDFDocument({ size: [242, 153], margin: 0 }); // Credit card size
    
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${member.memberNumber}_card.pdf"`);
    doc.pipe(res);

    await generateMemberCard(doc, member, 0, 0, 242, 153);

    doc.end();

  } catch (error) {
    console.error('Single card error:', error);
    res.status(500).json({ message: "Error generating member card" });
  }
};

export const previewSingleLibraryCardPDF = async (req, res) => {
  try {
    const { memberId } = req.query;

    if (!memberId) {
      return res.status(400).json({ message: "memberId is required" });
    }

    const member = await Member.findById(memberId);
    if (!member) {
      return res.status(404).json({ message: "Member not found" });
    }

    // Create PDF document
    const doc = new PDFDocument({ size: "A4", margin: 20 });

    // Collect PDF data chunks
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));

    const pdfPromise = new Promise((resolve, reject) => {
      doc.on("end", () => {
        try {
          const buffer = Buffer.concat(chunks);
          const base64 = buffer.toString("base64");
          resolve(base64);
        } catch (error) {
          reject(error);
        }
      });
      doc.on("error", reject);
    });

    // Card dimensions
    const cardWidth = 242;
    const cardHeight = 153;

    // Center the card on the page
    const x = (doc.page.width - cardWidth) / 2;
    const y = (doc.page.height - cardHeight) / 2;

    // Generate the card
    await generateMemberCard(doc, member, x, y, cardWidth, cardHeight);

    // Finalize PDF
    doc.end();

    // Wait for base64 result
    const base64PDF = await pdfPromise;

    res.json({
      success: true,
      data: {
        pdf: base64PDF,
        totalCards: 1,
        totalPages: 1,
        layout: { cols: 1, rows: 1 },
        memberId,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Single Card Preview Error:", error);
    res.status(500).json({
      success: false,
      message: "Error generating single card preview",
      error: error.message,
    });
  }
};
