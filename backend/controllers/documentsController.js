const fs = require("fs");
const path = require("path");
const textExtractService = require("../services/textExtractService");
const {
  createPdfFromText,
  createPdfFromTable,
  pdfDir,
} = require("../services/pdfService");

const documents = [];
let nextId = 1;

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
    return res.status(404).json({ message: "Document not found" });
  }

  res.json(doc);
};

// POST /documents/upload
exports.uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const file = req.file;

    // Step 1 — Extract text and/or table
    const extraction = await textExtractService.extractText(
      file.path,
      file.mimetype,
      file.originalname
    );

    const extractedText = extraction.extractedText || "";
    const tableRows = extraction.tableRows || null;
    const isTable = extraction.isTable || false;

    // Step 2 — Create preview
    const preview =
      extractedText.length > 500
        ? extractedText.slice(0, 500) + "..."
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
      message: "File processed successfully",
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
    console.error("Upload error:", error);
    res.status(500).json({
      message: "Error processing file",
      error: error.message,
    });
  }
}; 

// GET /documents/:id/pdf
exports.downloadDocumentPdf = (req, res) => {
  const id = Number(req.params.id);
  const doc = documents.find((d) => d.id === id);

  if (!doc) {
    return res.status(404).json({ message: "Document not found" });
  }

  if (!doc.pdfPath) {
    return res.status(404).json({ message: "Canonical PDF not available" });
  }

  if (!fs.existsSync(doc.pdfPath)) {
    console.error("PDF file not found on disk:", doc.pdfPath);
    return res.status(404).json({ message: "PDF file missing on server" });
  }

  // Send the PDF file as a download
  res.download(doc.pdfPath, path.basename(doc.pdfPath), (err) => {
    if (err) {
      console.error("PDF download error:", err);
      if (!res.headersSent) {
        res.status(500).json({ message: "Error downloading PDF" });
      }
    }
  });
};

