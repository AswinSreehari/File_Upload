// backend/services/textExtractService.js
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const WordExtractor = require('word-extractor');

const extractor = new WordExtractor();

// Optional textract loader – works even if textract is not installed
let textractModule; // undefined until first use
function getTextract() {
  if (textractModule !== undefined) return textractModule;
  try {
    // This will throw if 'textract' is not in node_modules
    // We catch it so the server doesn't crash.
    // eslint-disable-next-line global-require
    textractModule = require('textract');
  } catch (e) {
    console.warn(
      'textract is not available; PPT/PPTX text will not be fully extracted yet.'
    );
    textractModule = null;
  }
  return textractModule;
}

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

  if (ext === '.doc') {
    return extractFromDoc(filePath);
  }

  if (ext === '.ppt' || ext === '.pptx') {
    return extractFromPpt(filePath);
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

function extractFromDoc(filePath) {
  // Old .doc (binary) files
  return extractor.extract(filePath).then((doc) => doc.getBody() || '');
}

function extractFromPpt(filePath) {
  const textract = getTextract();

   if (!textract) {
    return Promise.resolve(
      'PPT/PPTX text not extracted'
    );
  }

  return new Promise((resolve) => {
    textract.fromFileWithPath(
      filePath,
      { preserveLineBreaks: true },
      (err, text) => {
        if (err) {
          console.error('PPT/PPTX text extraction error:', err);
          return resolve('');
        }
        resolve(text || '');
      }
    );
  });
}

module.exports = {
  extractText,
};
