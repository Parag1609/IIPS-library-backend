import bwipjs from "bwip-js";

export const generateMemberCard = async (doc, member, x, y, width, height) => {
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
  doc.text('Membership Id:', leftColX, currentY)
     .font('Helvetica-Bold')
     .text(`${member.membershipId}` , rightColX, currentY);
  currentY += lineHeight;

  // Name
  doc.font('Helvetica')
     .text('Name:', leftColX, currentY)
     .font('Helvetica-Bold')
     .text(`${member.name}`, rightColX, currentY);
  currentY += lineHeight;
  
  doc.font('Helvetica')
     .text('Roll Number', leftColX, currentY)
     .font('Helvetica-Bold')
     .text(`${member.memberNumber}`, rightColX, currentY);
  currentY += lineHeight;

 {member.course && doc.font('Helvetica')
     .text('Course:', leftColX, currentY)
     .font('Helvetica-Bold')
     .text(`${member.course}`, rightColX, currentY);
  currentY += lineHeight;}

  // Mobile Number
  doc.font('Helvetica')
     .text('Mobile No:', leftColX, currentY)
     .font('Helvetica-Bold')
     .text(member.mobile || 'Not provided', rightColX, currentY);
  currentY += lineHeight;

  // Generate barcode for member number
  try {
    const barcodeText = member.membershipId 
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
    console.error(`Barcode generation failed for ${member.membershipId}:`, error.message);
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