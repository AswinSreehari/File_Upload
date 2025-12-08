// frontend/src/components/DocumentPreview.jsx

export default function DocumentPreview({ document }) {
  if (!document) {
    return (
      <div className="mt-4 text-sm text-slate-500">
        Select a document to see its details.
      </div>
    );
  }

  return (
    <div className="mt-4 border-t border-slate-200 pt-4">
      <h2 className="text-lg font-semibold text-slate-800 mb-2">
        Document Details
      </h2>

      {/* Metadata Section */}
      <div className="space-y-1 text-sm text-slate-700">
        <p>
          <span className="font-medium">Source name:</span>{' '}
          {document.originalFileName}
        </p>
        <p>
          <span className="font-medium">Stored file:</span>{' '}
          {document.storedFileName}
        </p>
        <p>
          <span className="font-medium">Type:</span>{' '}
          {document.mimeType}
        </p>
        <p>
          <span className="font-medium">Size:</span>{' '}
          {document.size} bytes
        </p>
        <p>
          <span className="font-medium">Canonical PDF path:</span>{' '}
          <span className="break-all">{document.pdfPath}</span>
        </p>
      </div>

      {/* TABLE PREVIEW (CSV/XLS/XLSX) */}
      {document.isTable && document.tableRows && (
        <div className="mt-6 border rounded-md p-4 bg-white shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800 mb-3">
            Table Preview
          </h3>

          <div className="overflow-auto max-h-[70vh] border rounded">
            <table className="min-w-full text-sm border-collapse">
              <tbody>
                {document.tableRows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-b">
                    {row.map((cell, cellIndex) => (
                      <td
                        key={cellIndex}
                        className="border px-3 py-2 whitespace-nowrap"
                      >
                        {cell !== null && cell !== undefined
                          ? cell.toString()
                          : ""}
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
      {!document.isTable && (
        <div className="mt-6 border rounded-md p-4 bg-white shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800 mb-2">
            Extracted Text (preview)
          </h3>

          <pre
            className="text-sm text-slate-700 bg-slate-50 border border-slate-200 
                       rounded-md p-4 max-h-[70vh] overflow-auto whitespace-pre-wrap"
          >
            {document.extractedText || "(No text extracted)"}
          </pre>
        </div>
      )}
    </div>
  );
}
