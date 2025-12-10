// controllers/documentsController.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const { exec } = require('child_process');
const util = require('util');
const execProm = util.promisify(exec);


const cloudConvert = require('../services/cloudconvertClient'); // single source of truth for CloudConvert

const textExtractService = require('../services/textExtractService');
const {
  createPdfFromText,
  createPdfFromTable,
  pdfDir,
} = require('../services/pdfService');

const documents = [];
let nextId = 1;

// Helper: ensure pdfDir exists
if (!fs.existsSync(pdfDir)) {
  fs.mkdirSync(pdfDir, { recursive: true });
}

// Optional runtime warning if CloudConvert not configured
if (!process.env.CLOUDCONVERT_API_KEY) {
  console.warn('⚠️ CLOUDCONVERT_API_KEY not set — PPT/PPTX conversion will fail until configured.');
}
``
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

exports.uploadDocuments = async (req, res) => {
  try {
    const files = req.files;
    if (!files || !files.length) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    const processed = [];
    const PPT_EXTS = ['.ppt', '.pptx', '.odp'];

    // Process files sequentially to avoid CPU/disk overload.
    for (const file of files) {
      try {
        const ext = path.extname(file.originalname || '').toLowerCase();

        let meta = null;

        // --- PPT-like files: convert via convertPptFile (CloudConvert helper) ---
        if (PPT_EXTS.includes(ext)) {
          // convertPptFile should return an object:
          // { originalFileName, storedFileName, mimeType, size, path, pdfPath, extractedText, preview, isTable, tableRows }
          meta = await convertPptFile(file);
        } else {
          // --- Non-PPT: run your existing extraction + canonical PDF creation ---
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

          // Build canonical PDF filename and create PDF from text/table
          const baseName = path.basename(file.filename, path.extname(file.filename));
          const pdfFileName = `${baseName}-canonical.pdf`;
          const pdfPath = path.join(pdfDir, pdfFileName);

          if (isTable && tableRows) {
            await createPdfFromTable(tableRows, pdfPath);
          } else {
            await createPdfFromText(extractedText, pdfPath);
          }

          meta = {
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
        }

        // --- Build final in-memory record (assign id) ---
        const docRecord = {
          id: nextId++,
          ...meta,
        };

        // Expose a stable public URL for client preview/download (do NOT expose pdfPath)
        docRecord.pdfUrl = `/documents/${docRecord.id}/pdf`;

        // Store in-memory
        documents.push(docRecord);

        // Push per-file response (expose pdfUrl, preview, etc.)
        processed.push({
          success: true,
          message: "File processed successfully",
          document: {
            id: docRecord.id,
            originalFileName: docRecord.originalFileName,
            storedFileName: docRecord.storedFileName,
            mimeType: docRecord.mimeType,
            size: docRecord.size,
            preview: docRecord.preview,
            pdfUrl: docRecord.pdfUrl,
            isTable: docRecord.isTable,
          },
        });
      } catch (fileError) {
        // Log full error server-side for debugging
        console.error(`Error processing file ${file.originalname}:`, fileError);

        // Return a per-file failure entry so client knows which file failed
        processed.push({
          success: false,
          message: `Error processing file ${file.originalname}: ${fileError.message || 'unknown error'}`,
          originalFileName: file.originalname,
        });
      }
    }

    // Return array of results for each file (success/failure per file)
    return res.status(201).json({
      message: "Files processed",
      results: processed,
    });
  } catch (error) {
    console.error("Upload (multiple) error:", error);
    return res.status(500).json({
      message: "Error processing uploaded files",
      error: error.message,
    });
  }
};



async function convertPptFile(file) {
  const ext = path.extname(file.originalname || '').toLowerCase();
  const baseName = path.basename(file.filename, ext);
  const outPdfName = `${baseName}.pdf`;
  const pdfPath = path.join(pdfDir, outPdfName);

  // Remove existing output if any
  try {
    if (fs.existsSync(pdfPath)) await fs.promises.unlink(pdfPath);
  } catch (e) {
    console.warn('Could not remove existing pdfPath:', pdfPath, e.message);
  }

  // Candidate soffice executables
  const candidates = [];

  // 1) explicit env var (recommended)
  if (process.env.LIBREOFFICE_BIN) candidates.push(process.env.LIBREOFFICE_BIN);

  // 2) common Windows locations
  if (process.platform === 'win32') {
    candidates.push(
      'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
      'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe'
    );
  }

  // 3) common Linux/macOS binary name (assumes in PATH)
  candidates.push('soffice');

  // Try candidates until one works (we do NOT execute yet, we will use the first that exists or fallback to name)
  let sofficeCmd = null;
  for (const c of candidates) {
    try {
      // If it's an absolute path, check it exists
      if (path.isAbsolute(c)) {
        if (fs.existsSync(c)) {
          sofficeCmd = c;
          break;
        }
      } else {
        // If not absolute (like 'soffice'), try running "<cmd> --version" to see if available
        try {
          const { stdout } = await execProm(`"${c}" --version`, { timeout: 3000 });
          if (stdout && stdout.toLowerCase().includes('libreoffice')) {
            sofficeCmd = c;
            break;
          }
        } catch (_) {
          // not available — continue
        }
      }
    } catch (_) {
      // ignore and continue
    }
  }

  if (!sofficeCmd) {
    // Candidate not found — give actionable message
    const tried = candidates.join(' , ');
    throw new Error(
      `LibreOffice "soffice" executable not found. Tried: ${tried}. ` +
      `Install LibreOffice or set LIBREOFFICE_BIN env var to the full path of soffice executable, then restart the server.`
    );
  }

  // Build command — quote path to handle spaces
  const cmd = `"${sofficeCmd}" --headless --convert-to pdf --outdir "${pdfDir}" "${file.path}"`;

  try {
    const { stdout, stderr } = await execProm(cmd, { windowsHide: true, timeout: 120000 });
    // optional debug:
    // console.log('soffice stdout:', stdout);
    // console.log('soffice stderr:', stderr);
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error('LibreOffice (soffice) not found on PATH. Set LIBREOFFICE_BIN or add to PATH.');
    }
    // include stderr/message for more context
    throw new Error(`Local conversion failed: ${err.message || (err.stderr || 'unknown error')}`);
  }

  // Wait for output file to appear
  const maxRetries = 20;
  const waitMs = 200;
  let found = false;
  for (let i = 0; i < maxRetries; i++) {
    if (fs.existsSync(pdfPath)) {
      found = true;
      break;
    }
    await new Promise((r) => setTimeout(r, waitMs));
  }

  if (!found) {
    throw new Error('Conversion completed but output PDF not found (timeout).');
  }

  // Extract text using your existing extractor
  const extraction = await textExtractService.extractText(
    pdfPath,
    'application/pdf',
    path.basename(pdfPath)
  );

  const extractedText = extraction.extractedText || '';
  const tableRows = extraction.tableRows || null;
  const isTable = extraction.isTable || false;
  const preview =
    extractedText.length > 500 ? extractedText.slice(0, 500) + '...' : extractedText;

  return {
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
}


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
      return res.status(400).json({ message: "No file uploaded" });
    }

    const file = req.file;
    const ext = path.extname(file.originalname || "").toLowerCase();
    const pptExts = [".ppt", ".pptx", ".odp"];

    // If file is not a PPT/ODP, delegate to normal upload flow (extract text & create PDF)
    if (!pptExts.includes(ext)) {
      // reuse existing upload flow logic
      // Option: you could call uploadDocument(req, res) but to keep stack and response consistent, re-run logic here
      const extraction = await textExtractService.extractText(
        file.path,
        file.mimetype,
        file.originalname
      );

      const extractedText = extraction.extractedText || "";
      const tableRows = extraction.tableRows || null;
      const isTable = extraction.isTable || false;

      const preview =
        extractedText.length > 500
          ? extractedText.slice(0, 500) + "..."
          : extractedText;

      const baseName = path.basename(
        file.filename,
        path.extname(file.filename)
      );
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
        message: "File processed successfully (non-PPT path)",
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
    const pdfFileName = `${baseName}.pdf`;
    const pdfPath = path.join(pdfDir, pdfFileName);

    // Create CloudConvert job (import/upload -> convert -> export/url)
    const job = await cloudConvert.jobs.create({
      tasks: {
        "import-1": { operation: "import/upload" },
        "convert-1": {
          operation: "convert",
          input: ["import-1"],
          output_format: "pdf",
          // you can include conversion parameters if desired
        },
        "export-1": { operation: "export/url", input: ["convert-1"] },
      },
    });

    // Get import task and its upload form info
    const importTask = job.tasks.find((t) => t.name === "import-1");
    if (!importTask || !importTask.result || !importTask.result.form) {
      throw new Error("CloudConvert upload form not available");
    }

    const uploadUrl = importTask.result.form.url;
    const uploadParams = importTask.result.form.parameters || {};

    // Post the file to the provided form upload URL
    const form = new FormData();
    Object.entries(uploadParams).forEach(([k, v]) => form.append(k, v));
    // Use read stream from disk — your uploadService appears to write file to disk (file.path)
    form.append("file", fs.createReadStream(file.path), {
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
      (t) => t.name === "export-1" && t.status === "finished"
    );

    if (
      !exportTask ||
      !exportTask.result ||
      !Array.isArray(exportTask.result.files) ||
      exportTask.result.files.length === 0
    ) {
      throw new Error("CloudConvert did not return exported file URL");
    }

    const fileUrl = exportTask.result.files[0].url;

    // Download the PDF and write to pdfPath
    const pdfResp = await axios.get(fileUrl, {
      responseType: "arraybuffer",
      maxContentLength: Infinity,
    });
    await fs.promises.writeFile(pdfPath, pdfResp.data);

    // Now run text extraction on the generated PDF (to populate extractedText / preview / tableRows)
    const extraction = await textExtractService.extractText(
      pdfPath,
      "application/pdf",
      path.basename(pdfPath)
    );

    const extractedText = extraction.extractedText || "";
    const tableRows = extraction.tableRows || null;
    const isTable = extraction.isTable || false;
    const preview =
      extractedText.length > 500
        ? extractedText.slice(0, 500) + "..."
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
      message: "PPT converted and processed successfully",
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
    console.error("uploadAndConvert error:", error);
    if (error?.response?.status === 402) {
      return res
        .status(402)
        .json({ message: "CloudConvert billing/quota required." });
    }
    if (error?.response?.status === 429) {
      return res
        .status(429)
        .json({ message: "CloudConvert rate limit exceeded." });
    }
    return res.status(500).json({
      message: "Error processing conversion",
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

exports.deleteDocument = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "Invalid id" });
    }

    // 'documents' should be your in-memory array declared in this module scope
    const idx = documents.findIndex((d) => d.id === id);
    if (idx === -1) {
      return res.status(404).json({ message: "Document not found" });
    }

    // remove record
    const [removed] = documents.splice(idx, 1);

    // remove uploaded original file (if you want)
    try {
      if (removed && removed.path) {
        fs.unlink(removed.path, (err) => {
          if (err) {
            // log but don't fail the request
            console.warn(
              "Failed to unlink uploaded file:",
              removed.path,
              err.message
            );
          }
        });
      }
      // remove generated canonical pdf if exists
      if (removed && removed.pdfPath) {
        fs.unlink(removed.pdfPath, (err) => {
          if (err) {
            console.warn(
              "Failed to unlink pdf file:",
              removed.pdfPath,
              err.message
            );
          }
        });
      }
    } catch (err) {
      console.warn("Cleanup error:", err.message);
    }

    return res.json({ success: true, id });
  } catch (err) {
    console.error("DeleteDocument error:", err);
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

exports.downloadDocumentPdf = (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).send('Invalid id');

    const doc = documents.find((d) => d.id === id);
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    // Ensure pdfPath exists and is a file
    const pdfPath = doc.pdfPath;
    if (!pdfPath || !fs.existsSync(pdfPath)) {
      return res.status(404).json({ message: 'PDF not found' });
    }

    // Security: resolve real path and ensure it is inside your uploads directory
    const real = path.resolve(pdfPath);
    const uploadsRoot = path.resolve(pdfDir); // pdfDir should be the folder you wrote files into
    if (!real.startsWith(uploadsRoot)) {
      console.warn('Attempt to access file outside upload dir:', real);
      return res.status(403).json({ message: 'Access denied' });
    }

    // Stream the file with appropriate headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${path.basename(doc.pdfPath)}"`);

    const stream = fs.createReadStream(real);
    stream.on('error', (err) => {
      console.error('PDF stream error:', err);
      if (!res.headersSent) res.status(500).end('Server error');
      else res.end();
    });
    stream.pipe(res);
  } catch (err) {
    console.error('downloadDocumentPdf error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};
