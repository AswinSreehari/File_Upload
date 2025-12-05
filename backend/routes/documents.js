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
router.post('/upload', upload.single('file'), documentsController.uploadDocument);

module.exports = router;
