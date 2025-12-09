// backend/routes/documents.js
const express = require('express');
const router = express.Router();
const documentsController = require('../controllers/documentsController');
const upload = require('../services/uploadService');

// GET /documents
router.get('/', documentsController.listDocuments);

// GET /documents/:id
router.get('/:id', documentsController.getDocumentById);

// POST /documents/upload
router.post('/upload', upload.array('files', 50), documentsController.uploadDocuments);


// POST /documents/upload-and-convert
// (new) Accepts a PPT/PPTX (or other supported file), converts to PDF, and returns/stores the PDF.
// Uses the same upload middleware so req.file.buffer is available to the controller.
router.post(
  '/upload-and-convert',
  upload.single('file'),
  documentsController.uploadAndConvert
);

// GET /documents/:id/pdf
router.get('/:id/pdf', documentsController.downloadDocumentPdf);

module.exports = router;
