// controllers/documentsController.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const CloudConvert = require('cloudconvert');

const textExtractService = require('../services/textExtractService');
const {
  createPdfFromText,
  createPdfFromTable,
  pdfDir,
} = require('../services/pdfService');

const documents = [];
let nextId = 1;

// Initialize CloudConvert client (uses CLOUDCONVERT_API_KEY and optional CLOUDCONVERT_API_BASE)
const cloudConvert = new CloudConvert({
  apiKey: process.env.CLOUDCONVERT_API_KEY,
  baseUrl: process.env.CLOUDCONVERT_API_BASE || 'https://api.cloudconvert.com/v2',
});

// Helper: ensure pdfDir exists
if (!fs.existsSync(pdfDir)) {
  fs.mkdirSync(pdfDir, { recursive: true });
}

// GET /documents
exports.listDocuments = (req, res) => {
  const items = documents.map((doc) => ({
    id: doc.id,
    originalFileName: doc.originalFileName,
    storedFileName: doc.storedFileName,
    mimeType: doc.mimeType,
    size: doc.size,
    pdfPath: doc.pdfPath,
  }));

  res.json({
    count: items.length,
    items,
  });
};

// GET /documents/:id
exports.getDocumentById = (req, res) => {
  const id = Number(req.params.id);
  const doc = documents.find((d) => d.id === id);

  if (!doc) {
    return res.status(404).json({ message: 'Document not found' });
  }

  res.json(doc);
};

// POST /documents/upload (unchanged behavior)
exports.uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const file = req.file;

    // Step 1 — Extract text and/or table from the uploaded file (this handles PDFs, docs, txt, csv, etc.)
    const extraction = await textExtractService.extractText(
      file.path,
      file.mimetype,
      file.originalname
    );

    const extractedText = extraction.extractedText || '';
    const tableRows = extraction.tableRows || null;
    const isTable = extraction.isTable || false;

    // Step 2 — Create preview
    const preview =
      extractedText.length > 500
        ? extractedText.slice(0, 500) + '...'
        : extractedText;

    // Step 3 — Build canonical PDF filename
    const baseName = path.basename(file.filename, path.extname(file.filename));
    const pdfFileName = `${baseName}-canonical.pdf`;
    const pdfPath = path.join(pdfDir, pdfFileName);

    // Step 4 — Create PDF (table or text)
    if (isTable && tableRows) {
      await createPdfFromTable(tableRows, pdfPath);
    } else {
      await createPdfFromText(extractedText, pdfPath);
    }

    const docRecord = {
      id: nextId++,
      originalFileName: file.originalname,
      storedFileName: file.filename,
      mimeType: file.mimetype,
      size: file.size,
      path: file.path,
      pdfPath,
      extractedText,
      preview,
      isTable,
      tableRows,
    };

    documents.push(docRecord);

    res.status(201).json({
      message: 'File processed successfully',
      document: {
        id: docRecord.id,
        originalFileName: docRecord.originalFileName,
        storedFileName: docRecord.storedFileName,
        mimeType: docRecord.mimeType,
        size: docRecord.size,
        preview: docRecord.preview,
        pdfPath: docRecord.pdfPath,
        isTable: docRecord.isTable,
      },
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      message: 'Error processing file',
      error: error.message,
    });
  }
};

/**
 * POST /documents/upload-and-convert
 * Accepts PPT/PPTX/ODP (or other supported) uploads and converts to canonical PDF using CloudConvert,
 * then extracts text from the produced PDF and stores a document record in memory (like uploadDocument).
 *
 * Expects req.file (upload middleware should write file to disk and set file.path & file.filename).
 */
exports.uploadAndConvert = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const file = req.file;
    const ext = path.extname(file.originalname || '').toLowerCase();
    const pptExts = ['.ppt', '.pptx', '.odp'];

    // If file is not a PPT/ODP, delegate to normal upload flow (extract text & create PDF)
    if (!pptExts.includes(ext)) {
      // reuse existing upload flow logic
      // Option: you could call uploadDocument(req, res) but to keep stack and response consistent, re-run logic here
      const extraction = await textExtractService.extractText(
        file.path,
        file.mimetype,
        file.originalname
      );

      const extractedText = extraction.extractedText || '';
      const tableRows = extraction.tableRows || null;
      const isTable = extraction.isTable || false;

      const preview =
        extractedText.length > 500
          ? extractedText.slice(0, 500) + '...'
          : extractedText;

      const baseName = path.basename(file.filename, path.extname(file.filename));
      const pdfFileName = `${baseName}-canonical.pdf`;
      const pdfPath = path.join(pdfDir, pdfFileName);

      if (isTable && tableRows) {
        await createPdfFromTable(tableRows, pdfPath);
      } else {
        await createPdfFromText(extractedText, pdfPath);
      }

      const docRecord = {
        id: nextId++,
        originalFileName: file.originalname,
        storedFileName: file.filename,
        mimeType: file.mimetype,
        size: file.size,
        path: file.path,
        pdfPath,
        extractedText,
        preview,
        isTable,
        tableRows,
      };

      documents.push(docRecord);

      return res.status(201).json({
        message: 'File processed successfully (non-PPT path)',
        document: {
          id: docRecord.id,
          originalFileName: docRecord.originalFileName,
          storedFileName: docRecord.storedFileName,
          mimeType: docRecord.mimeType,
          size: docRecord.size,
          preview: docRecord.preview,
          pdfPath: docRecord.pdfPath,
          isTable: docRecord.isTable,
        },
      });
    }

    // --- PPT path: use CloudConvert to produce PDF ---
    // Build canonical PDF filename (use stored filename as base to avoid collisions)
    const baseName = path.basename(file.filename, path.extname(file.filename));
    const pdfFileName = `${baseName}-canonical.pdf`;
    const pdfPath = path.join(pdfDir, pdfFileName);

    // Create CloudConvert job (import/upload -> convert -> export/url)
    const job = await cloudConvert.jobs.create({
      tasks: {
        'import-1': { operation: 'import/upload' },
        'convert-1': {
          operation: 'convert',
          input: ['import-1'],
          output_format: 'pdf',
          // you can include conversion parameters if desired
        },
        'export-1': { operation: 'export/url', input: ['convert-1'] },
      },
    });

    // Get import task and its upload form info
    const importTask = job.tasks.find((t) => t.name === 'import-1');
    if (!importTask || !importTask.result || !importTask.result.form) {
      throw new Error('CloudConvert upload form not available');
    }

    const uploadUrl = importTask.result.form.url;
    const uploadParams = importTask.result.form.parameters || {};

    // Post the file to the provided form upload URL
    const form = new FormData();
    Object.entries(uploadParams).forEach(([k, v]) => form.append(k, v));
    // Use read stream from disk — your uploadService appears to write file to disk (file.path)
    form.append('file', fs.createReadStream(file.path), {
      filename: file.originalname,
      contentType: file.mimetype,
    });

    await axios.post(uploadUrl, form, {
      headers: form.getHeaders(),
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });

    // Wait for job to finish (blocks — ok for low/moderate volume)
    const finishedJob = await cloudConvert.jobs.wait(job.id);

    // Find export task and exported file URL
    const exportTask = finishedJob.tasks.find(
      (t) => t.name === 'export-1' && t.status === 'finished'
    );

    if (
      !exportTask ||
      !exportTask.result ||
      !Array.isArray(exportTask.result.files) ||
      exportTask.result.files.length === 0
    ) {
      throw new Error('CloudConvert did not return exported file URL');
    }

    const fileUrl = exportTask.result.files[0].url;

    // Download the PDF and write to pdfPath
    const pdfResp = await axios.get(fileUrl, { responseType: 'arraybuffer', maxContentLength: Infinity });
    await fs.promises.writeFile(pdfPath, pdfResp.data);

    // Now run text extraction on the generated PDF (to populate extractedText / preview / tableRows)
    const extraction = await textExtractService.extractText(
      pdfPath,
      'application/pdf',
      path.basename(pdfPath)
    );

    const extractedText = extraction.extractedText || '';
    const tableRows = extraction.tableRows || null;
    const isTable = extraction.isTable || false;
    const preview =
      extractedText.length > 500
        ? extractedText.slice(0, 500) + '...'
        : extractedText;

    // Create in-memory document record (same shape as uploadDocument)
    const docRecord = {
      id: nextId++,
      originalFileName: file.originalname,
      storedFileName: file.filename,
      mimeType: file.mimetype,
      size: file.size,
      path: file.path,
      pdfPath,
      extractedText,
      preview,
      isTable,
      tableRows,
    };

    documents.push(docRecord);

    // Respond with same metadata shape as uploadDocument
    return res.status(201).json({
      message: 'PPT converted and processed successfully',
      document: {
        id: docRecord.id,
        originalFileName: docRecord.originalFileName,
        storedFileName: docRecord.storedFileName,
        mimeType: docRecord.mimeType,
        size: docRecord.size,
        preview: docRecord.preview,
        pdfPath: docRecord.pdfPath,
        isTable: docRecord.isTable,
      },
    });
  } catch (error) {
    console.error('uploadAndConvert error:', error);
    if (error?.response?.status === 402) {
      return res.status(402).json({ message: 'CloudConvert billing/quota required.' });
    }
    if (error?.response?.status === 429) {
      return res.status(429).json({ message: 'CloudConvert rate limit exceeded.' });
    }
    return res.status(500).json({
      message: 'Error processing conversion',
      error: error.message,
    });
  }
};

// GET /documents/:id/pdf
exports.downloadDocumentPdf = (req, res) => {
  const id = Number(req.params.id);
  const doc = documents.find((d) => d.id === id);

  if (!doc) {
    return res.status(404).json({ message: 'Document not found' });
  }

  if (!doc.pdfPath) {
    return res.status(404).json({ message: 'Canonical PDF not available' });
  }

  if (!fs.existsSync(doc.pdfPath)) {
    console.error('PDF file not found on disk:', doc.pdfPath);
    return res.status(404).json({ message: 'PDF file missing on server' });
  }

  // Send the PDF file as a download
  res.download(doc.pdfPath, path.basename(doc.pdfPath), (err) => {
    if (err) {
      console.error('PDF download error:', err);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Error downloading PDF' });
      }
    }
  });
};
