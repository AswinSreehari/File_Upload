// src/components/FileUpload.jsx
import { useState } from "react";
import { uploadDocument } from "../api/client";

export default function FileUpload({ onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    setFile(selected || null);
    setStatus("");
  };

  // DRAG & DROP HANDLERS
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      setFile(droppedFile);
      setStatus("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setStatus("⚠️ Please select a file.");
      return;
    }

    setLoading(true);
    setStatus("⏳ Uploading and processing...");

    try {
      const response = await uploadDocument(file);
      setStatus(response.message || "✔️ File processed successfully");

      if (onUploadSuccess) {
        onUploadSuccess(response.document);
      }

      setFile(null);
      e.target.reset();
    } catch (err) {
      console.error(err);
      setStatus(`❌ ${err.message || "Upload failed"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-800/70 bg-slate-950/90 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.65)] backdrop-blur-lg text-slate-70">
      <h2 className="text-lg font-semibold tracking-wide text-slate-100 mb-1">
        Upload Document
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* DROPZONE */}
        <label className="block cursor-pointer group">
          <span className="sr-only">Choose file</span>

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center px-5 py-8
              rounded-xl border-2 border-dashed transition-all duration-200 shadow-inner
              ${
                isDragging
                  ? "border-emerald-400 bg-slate-900/40"
                  : "border-slate-700/70 bg-slate-900/50"
              }
            `}
          >
            {/* Icon */}
            <div
              className={`h-10 w-10 flex items-center justify-center rounded-full border shadow transition
                ${
                  isDragging
                    ? "border-emerald-400 bg-slate-900/80 shadow-[0_0_20px_rgba(16,185,129,0.45)]"
                    : "border-slate-700/60 bg-slate-900/70"
                }
              `}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-6 w-6 transition ${
                  isDragging ? "text-emerald-300" : "text-slate-300"
                }`}
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.4}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 9L12 
                  4.5 7.5 9M12 4.5V15"
                />
              </svg>
            </div>

            {/* File name or placeholder */}
            <span
              className={`text-sm font-medium mt-3 transition ${
                isDragging ? "text-emerald-300" : "text-slate-200"
              }`}
            >
              {file ? file.name : isDragging ? "Drop here…" : "Click to choose a file"}
            </span>

            <span
              className={`text-[10px] mt-1 transition ${
                isDragging ? "text-slate-300" : "text-slate-500"
              }`}
            >
              or drag and drop
            </span>

            <input
              type="file"
              accept=".pdf,.txt,.docx,.ppt,.pptx"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </label>

        {/* SUBMIT BUTTON */}
        <button
          type="submit"
          disabled={!file || loading}
          className="w-full inline-flex items-center justify-center px-4 py-2
                     rounded-full text-[12px] font-semibold tracking-wide
                     bg-emerald-600 hover:bg-emerald-500
                     disabled:bg-slate-700 disabled:text-slate-500
                     shadow-[0_0_18px_rgba(52,211,153,0.4)]
                     transition-all duration-200"
        >
          {loading ? "Processing..." : "Upload & Convert"}
        </button>
      </form>

      {/* STATUS */}
      {status && (
        <p
          className="mt-3 text-[11px] whitespace-pre-line text-slate-300 
                     bg-slate-900/60 border border-slate-800/70
                     rounded-lg p-2 leading-relaxed"
        >
          {status}
        </p>
      )}
    </div>
  );
}
