// backend/services/textExtractService.js
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

async function extractText(filePath, mimeType, originalFileName) {
  const ext = path.extname(originalFileName).toLowerCase();

  if (ext === '.txt') {
    return extractFromTxt(filePath);
  }

  if (ext === '.pdf') {
    return extractFromPdf(filePath);
  }

  if (ext === '.docx') {
    return extractFromDocx(filePath);
  }

  // Fallback: try reading as plain text
  return extractFromTxt(filePath);
}

function extractFromTxt(filePath) {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) return reject(err);
      resolve(data || '');
    });
  });
}

function extractFromPdf(filePath) {
  const dataBuffer = fs.readFileSync(filePath);
  return pdfParse(dataBuffer).then((result) => result.text || '');
}

function extractFromDocx(filePath) {
  return mammoth
    .extractRawText({ path: filePath })
    .then((result) => result.value || '');
}

module.exports = {
  extractText,
};
