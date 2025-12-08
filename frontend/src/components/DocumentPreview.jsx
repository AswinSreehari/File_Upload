// frontend/src/components/DocumentPreview.jsx
import { API_BASE_URL } from '../api/client';

function formatBytes(bytes) {
  if (bytes === 0 || bytes === undefined || bytes === null) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);
  return `${value.toFixed(2)} ${sizes[i]}`;
}

export default function DocumentPreview({ document }) {
  if (!document) {
    return (
      <div className="mt-4 text-sm text-slate-500">
        Select a document to see its details.
      </div>
    );
  }

  const downloadUrl = `${API_BASE_URL}/documents/${document.id}/pdf`;

  const {
    originalFileName,
    storedFileName,
    mimeType,
    size,
    pdfPath,
    isTable,
    tableRows,
    extractedText,
  } = document;

  return (
    <div className="mt-4 border-t border-slate-200 pt-4">
      <h2 className="text-lg font-semibold text-slate-800 mb-2">
        Document Details
      </h2>

      {/* Metadata Section */}
      <div className="space-y-1 text-sm text-slate-700">
        <p>
          <span className="font-medium">Source name:</span>{' '}
          {originalFileName || '—'}
        </p>
        <p>
          <span className="font-medium">Stored file:</span>{' '}
          {storedFileName || '—'}
        </p>
        <p>
          <span className="font-medium">Type:</span>{' '}
          {mimeType || '—'}
        </p>
        <p>
          <span className="font-medium">Size:</span>{' '}
          {size !== undefined && size !== null ? `${formatBytes(size)} (${size} bytes)` : '—'}
        </p>
      </div>

      {/* Download button */}
      <div className="mt-4">
        <a
          href={downloadUrl}
          className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md bg-slate-800 text-white hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-600"
        >
          Download PDF
        </a>
      </div>

      {/* TABLE PREVIEW (CSV/XLS/XLSX) */}
      {isTable && Array.isArray(tableRows) && tableRows.length > 0 && (
        <div className="mt-6 border rounded-md p-4 bg-white shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800 mb-3">
            Table Preview
          </h3>

          <div className="overflow-auto max-h-[70vh] border rounded">
            <table className="min-w-full text-sm border-collapse">
              <tbody>
                {tableRows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-b">
                    {row.map((cell, cellIndex) => (
                      <td
                        key={cellIndex}
                        className="border px-3 py-2 whitespace-nowrap"
                      >
                        {cell !== null && cell !== undefined
                          ? cell.toString()
                          : ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TEXT PREVIEW (non-table formats) */}
      {!isTable && (
        <div className="mt-6 border rounded-md p-4 bg-white shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800 mb-2">
            Extracted Text (preview)
          </h3>

          <pre
            className="text-sm text-slate-700 bg-slate-50 border border-slate-200 
                       rounded-md p-4 max-h-[70vh] overflow-auto whitespace-pre-wrap"
          >
            {extractedText || '(No text extracted)'}
          </pre>
        </div>
      )}
    </div>
  );
}
