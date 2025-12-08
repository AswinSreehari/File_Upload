// backend/services/pdfService.js
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const pdfDir = path.join(__dirname, '..', 'uploads', 'pdfs');

// Ensure the pdf directory exists
if (!fs.existsSync(pdfDir)) {
  fs.mkdirSync(pdfDir, { recursive: true });
}

/**
 * Create a simple PDF from plain text and save it to outputPath.
 */
function createPdfFromText(text, outputPath) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      margin: 40,
    });

    const stream = fs.createWriteStream(outputPath);

    doc.pipe(stream);

    doc.fontSize(12);
    doc.text(text || '', {
      align: 'left',
    });

    doc.end();

    stream.on('finish', () => resolve(outputPath));
    stream.on('error', reject);
  });
}

/**
 * Create a PDF that renders tabular data (rows: array of arrays).
 * Each row is a row in the table. Cells are rendered in columns.
 */
function createPdfFromTable(rows, outputPath) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      margin: 40,
      size: 'A4',
    });

    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    const pageWidth =
      doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const pageHeight =
      doc.page.height - doc.page.margins.top - doc.page.margins.bottom;

    const startX = doc.page.margins.left;
    let currentY = doc.page.margins.top;

    const padding = 4;
    const rowHeight = 20; // simple fixed row height
    const headerFill = '#f3f4f6'; // light gray

    const colCount = rows && rows.length > 0 ? rows[0].length : 0;
    const colWidth = colCount > 0 ? pageWidth / colCount : pageWidth;

    // Helper: start a new page if needed
    function ensureSpaceForRow() {
      if (currentY + rowHeight > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
        currentY = doc.page.margins.top;
      }
    }

    // Draw table header if first row looks like headers
    rows.forEach((row, rowIndex) => {
      ensureSpaceForRow();

      // Background for header row
      if (rowIndex === 0) {
        doc.rect(startX, currentY, pageWidth, rowHeight).fill(headerFill);
      }

      // Draw each cell
      row.forEach((cell, colIndex) => {
        const x = startX + colIndex * colWidth;
        const text =
          cell === null || cell === undefined ? '' : String(cell);

        // Cell border
        doc
          .rect(x, currentY, colWidth, rowHeight)
          .stroke();

        // Text inside cell
        doc
          .fontSize(10)
          .fillColor('#111827') // near-black
          .text(text, x + padding, currentY + padding, {
            width: colWidth - 2 * padding,
            height: rowHeight - 2 * padding,
            ellipsis: true,
          });
      });

      // Reset fill color after header row
      if (rowIndex === 0) {
        doc.fillColor('#000000');
      }

      currentY += rowHeight;
    });

    doc.end();

    stream.on('finish', () => resolve(outputPath));
    stream.on('error', reject);
  });
}

module.exports = {
  createPdfFromText,
  createPdfFromTable,
  pdfDir,
};
