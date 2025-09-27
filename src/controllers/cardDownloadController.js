import PDFDocument from "pdfkit";
import bwipjs from "bwip-js";
import fs from "fs";
import path from "path";
import Member from "../models/LibraryCard.js";

/**
 * Generate library cards in bulk with filters
 */
export const downloadLibraryCardsPDF = async (req, res) => {
  try {
    const {
      semester,
      course,
      layout = '2x4', // Cards per page (2 cols x 4 rows = 8 cards per page)
    } = req.query;

    // Build filter object
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
   /* // Parse layout
    const [cols, rows] = layout.split('x').map(Number);
    if (!cols || !rows) {
      return res.status(400).json({ message: "Invalid layout format" });
    }
*/
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

/**
 * Generate individual member card
 */
const generateMemberCard = async (doc, member, x, y, width, height) => {
  // Card border and background
  doc.rect(x, y, width, height)
     .fillAndStroke('#ffffff', '#cccccc')
     .lineWidth(1);

  // Header section with logo and library info
  const headerHeight = 45;
  
  // Draw header background
  doc.rect(x + 1, y + 1, width - 2, headerHeight)
     .fillAndStroke('#f8f9fa', '#e9ecef');

  // Library logo placeholder (you can add actual logo here)
  const logoSize = 35;
  doc.circle(x + 15, y + 22, logoSize/2)
     .fillAndStroke('#6c757d', '#495057');
     
  // Add logo text (replace with actual logo)
  doc.fontSize(8)
     .fillColor('#ffffff')
     .text('LOGO', x + 6, y + 18, { width: logoSize, align: 'center' });

  // Library header text
  doc.fontSize(12)
     .fillColor('#000000')
     .font('Helvetica-Bold')
     .text('IIPS Library', x + logoSize + 20, y + 8);
     
  doc.fontSize(8)
     .font('Helvetica')
     .fillColor('#333333')
     .text('Devi Ahilya Vishwavidyalaya, Indore', x + logoSize + 20, y + 22)
     .text('Takshshila Campus, Khandwa Road-452001', x + logoSize + 20, y + 34);

  // Member information section
  const infoStartY = y + headerHeight + 10;
  const leftColX = x + 12;
  const rightColX = x + width/2 + 10;
  const lineHeight = 14;
  let currentY = infoStartY;

  // Left column
  doc.fontSize(9)
     .fillColor('#000000')
     .font('Helvetica');

  // Member Number
  doc.text('Member Id:', leftColX, currentY)
     .font('Helvetica-Bold')
     .text(member.memberId , rightColX, currentY);
  currentY += lineHeight;

  // Name
  doc.font('Helvetica')
     .text('Name:', leftColX, currentY)
     .font('Helvetica-Bold')
     .text(`${member.firstName} ${member.lastName}`, rightColX, currentY);
  currentY += lineHeight;
  
  doc.font('Helvetica')
     .text('Enrollment Number:', leftColX, currentY)
     .font('Helvetica-Bold')
     .text(`${member.enrollment_number}`, rightColX, currentY);
  currentY += lineHeight;

  doc.font('Helvetica')
     .text('Course:', leftColX, currentY)
     .font('Helvetica-Bold')
     .text(`${member.course}`, rightColX, currentY);
  currentY += lineHeight;

  // Mobile Number
  doc.font('Helvetica')
     .text('Mobile No:', leftColX, currentY)
     .font('Helvetica-Bold')
     .text(member.mobile || 'Not provided', rightColX, currentY);
  currentY += lineHeight;

  // Generate barcode for member number
  try {
    const barcodeText = member.memberId 
    const barcodeBuffer = await bwipjs.toBuffer({
      bcid: "code128",
      text: barcodeText,
      scale: 1,
      height: 8,
      includetext: false,
      backgroundcolor: 'ffffff',
      barcolor: '000000'
    });

    // Position barcode at bottom left
    const barcodeY = y + height - 35;
    doc.image(barcodeBuffer, leftColX, barcodeY, {
      fit: [width - 100, 25]
    });

  } catch (error) {
    console.error(`Barcode generation failed for ${member.memberId}:`, error.message);
  }

  // Add signature placeholder
  const signatureX = x + width - 80;
  const signatureY = y + height - 35;
  
  doc.fontSize(8)
     .fillColor('#666666')
     .text('(Signature)', signatureX, signatureY + 20, {
       width: 70,
       align: 'center'
     });

  // Add card ID or additional info if needed
  doc.fontSize(6)
     .fillColor('#999999')
     .text(`Generated: ${new Date().toLocaleDateString()}`, x + 5, y + height - 10);
};

/**
 * Generate member number if not exists

const generateMemberNumber = (member) => {
  const year = new Date().getFullYear();
  const courseCode = member.course ? member.course.substring(0, 1) : 'X';
  const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${year}-${year + 1}-${courseCode}-${randomNum}`;
};
 */
const downloadSingleMemberCard = async (req, res) => {
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
