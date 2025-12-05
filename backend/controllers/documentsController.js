// backend/controllers/documentsController.js
const path = require('path');
const textExtractService = require('../services/textExtractService');
const pdfService = require('../services/pdfService');

// Temporary in-memory "DB"
const documents = [];

// GET /documents
exports.listDocuments = (req, res) => {
  const items = documents.map((doc) => ({
    id: doc.id,
    originalFileName: doc.originalFileName,
    storedFileName: doc.storedFileName,
    mimeType: doc.mimeType,
    size: doc.size,
    pdfPath: doc.pdfPath, // include pdfPath summary
  }));

  return res.json({
    count: items.length,
    items,
  });
};

// GET /documents/:id
exports.getDocumentById = (req, res) => {
  const id = parseInt(req.params.id, 10);

  const doc = documents.find((d) => d.id === id);

  if (!doc) {
    return res.status(404).json({ message: 'Document not found' });
  }

  return res.json({
    id: doc.id,
    originalFileName: doc.originalFileName,
    storedFileName: doc.storedFileName,
    mimeType: doc.mimeType,
    size: doc.size,
    path: doc.path,
    pdfPath: doc.pdfPath,
    extractedText: doc.extractedText,
    preview: doc.preview,
  });
};

// POST /documents/upload
exports.uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const file = req.file;

    // 1) Extract text
    const extractedText = await textExtractService.extractText(
      file.path,
      file.mimetype,
      file.originalname
    );

    // 2) Build preview
    const preview =
      extractedText.length > 500
        ? extractedText.slice(0, 500) + '...'
        : extractedText;

    // 3) Decide PDF file name and path (canonical PDF)
    const baseName = path.basename(file.filename, path.extname(file.filename));
    const pdfFileName = `${baseName}-canonical.pdf`;
    const pdfPath = path.join(pdfService.pdfDir, pdfFileName);

    // 4) Create PDF from extracted text
    await pdfService.createPdfFromText(extractedText, pdfPath);

    // 5) Create document record
    const docRecord = {
      id: documents.length + 1,
      originalFileName: file.originalname,
      storedFileName: file.filename,
      mimeType: file.mimetype,
      size: file.size,
      path: file.path,          // original file path
      pdfPath,                  // canonical PDF path
      extractedText,
      preview,
    };

    documents.push(docRecord);

    return res.status(201).json({
      message: 'File uploaded, text extracted, and PDF generated successfully',
      document: {
        id: docRecord.id,
        originalFileName: docRecord.originalFileName,
        storedFileName: docRecord.storedFileName,
        mimeType: docRecord.mimeType,
        size: docRecord.size,
        preview: docRecord.preview,
        pdfPath: docRecord.pdfPath,
      },
    });
  } catch (err) {
    console.error('Upload error:', err);
    return res.status(500).json({
      message: 'Error processing file',
      error: err.message,
    });
  }
};
