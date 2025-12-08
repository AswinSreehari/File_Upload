// src/components/DocumentPreview.jsx
import { API_BASE_URL } from '../api/client';

function formatBytes(bytes) {
  if (bytes === 0 || bytes === undefined || bytes === null) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);
  return `${value.toFixed(2)} ${sizes[i]}`;
}

export default function DocumentPreview({ document: doc }) {
  if (!doc) {
    return (
      <div className="h-full flex items-center justify-center border border-dashed border-slate-300/70 rounded-2xl bg-slate-100/80 text-sm text-slate-500">
        <div className="flex flex-col items-center gap-2">
          <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center shadow-inner">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-slate-500"
              viewBox="0 0 24 24"
              fill="none"
              strokeWidth="1.5"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 8h16M4 12h10M4 16h6"
              />
            </svg>
          </div>
          <p className="text-xs font-medium tracking-wide">
            Select a document on the left to preview its content.
          </p>
        </div>
      </div>
    );
  }

  const {
    id,
    originalFileName,
    mimeType,
    size,
    isTable,
    tableRows,
    extractedText,
  } = doc;

  const downloadUrl = `${API_BASE_URL}/documents/${id}/pdf`;

  const handleDownload = async () => {
    try {
      const res = await fetch(downloadUrl);
      if (!res.ok) throw new Error('Download failed');

      const blob = await res.blob();
      const baseName = originalFileName
        ? originalFileName.replace(/\.[^/.]+$/, '')
        : 'document';
      const filename = `${baseName}.pdf`;

      const link = window.document.createElement('a');
      const url = window.URL.createObjectURL(blob);
      link.href = url;
      link.download = filename;
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Failed to download file.');
    }
  };

  return (
    <div className="h-full flex flex-col w-full max-w-full rounded-2xl border border-slate-800/70 bg-slate-950/95 text-slate-50 shadow-[0_18px_45px_rgba(15,23,42,0.65)] overflow-hidden backdrop-blur"
    >
      {/* HEADER */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-slate-800/80 bg-gradient-to-r from-emerald-500/20 via-cyan-500/10 to-blue-500/20">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-xl bg-slate-900/80 border border-emerald-400/50 flex items-center justify-center shadow-[0_0_18px_rgba(45,212,191,0.55)]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-emerald-300"
              viewBox="0 0 24 24"
              fill="none"
              strokeWidth="1.6"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.25 4.5h7.5m-9 3h10.5m-12 3h13.5m-12 3h10.5m-9 3h7.5"
              />
            </svg>
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold tracking-wide text-slate-50">
                Preview
            </h2>
            <p className="text-[11px] text-slate-300/80 truncate">
              {originalFileName || 'Untitled'} · {mimeType || 'unknown'} ·{' '}
              {size !== undefined && size !== null ? formatBytes(size) : '—'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDownload}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-medium tracking-wide
                     bg-slate-900/90 border border-emerald-300/70 text-emerald-100
                     shadow-[0_0_18px_rgba(52,211,153,0.55)]
                     hover:bg-emerald-500/20 hover:border-emerald-300 hover:text-emerald-50
                     transition-colors"
        >
          <span>Download PDF</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-3.5 w-3.5"
            viewBox="0 0 24 24"
            fill="none"
            strokeWidth="1.8"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4.5v11.25m0 0L8.25 12m3.75 3.75L15.75 12M5.25 18.75h13.5"
            />
          </svg>
        </button>
      </div>

      {/* BODY */}
      <div className="flex-1 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 overflow-y-auto overflow-x-hidden">
        {/* TABLE PREVIEW */}
        {isTable && Array.isArray(tableRows) && tableRows.length > 0 && (
          <div className="border border-slate-700/80 rounded-xl bg-slate-900/70 shadow-xl shadow-emerald-500/5">
            <div className="px-4 py-2.5 border-b border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <h3 className="text-xs font-semibold tracking-wide text-slate-50">
                  Table Preview
                </h3>
              </div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wide">
                {tableRows.length} rows
              </span>
            </div>

            {/* THIS WRAPPER CONTROLS WIDTH + SCROLLING */}
            <div className="w-full max-w-full overflow-x-auto overflow-y-auto max-h-[70vh]">
              <table className="min-w-max text-[11px] border-collapse">
                <tbody>
                  {tableRows.map((row, rowIndex) => (
                    <tr
                      key={rowIndex}
                      className={
                        rowIndex % 2 === 0
                          ? 'bg-slate-900/60'
                          : 'bg-slate-900/30'
                      }
                    >
                      {row.map((cell, cellIndex) => (
                        <td
                          key={cellIndex}
                          className="border border-slate-800/80 px-3 py-2 whitespace-nowrap text-slate-100/90"
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

        {/* TEXT PREVIEW */}
        {!isTable && (
          <div className="border h-[100vh] no-scrollbar border-slate-700/80 rounded-xl bg-slate-900/70 shadow-xl shadow-cyan-500/5 ">
            <div className="px-4 py-2.5 border-b border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                 {/* <h3 className="text-xs font-semibold tracking-wide text-slate-50">
                  Extracted Text (preview)
                </h3> */}
              </div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wide">
                Read-only
              </span>
            </div>

            <pre
              className="text-[13px] leading-relaxed h-full text-slate-100/90 no-scrollbar bg-slate-950/40 
                         font-mono p-4 rounded-b-xl  
                         overflow-y-auto overflow-x-auto
                         whitespace-pre break-words max-w-full
                         [tab-size:2]"
            >
              {extractedText || '(No text extracted)'}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
