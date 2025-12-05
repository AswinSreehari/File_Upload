// frontend/src/components/FileUpload.jsx
import { useState } from 'react';
import { uploadDocument } from '../api/client';

export default function FileUpload({ onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    setFile(selected || null);
    setStatus('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setStatus('Please select a file.');
      return;
    }

    setLoading(true);
    setStatus('Uploading and processing...');

    try {
      const response = await uploadDocument(file);
      setStatus(response.message || 'Upload successful');

      if (onUploadSuccess) {
        onUploadSuccess(response.document);
      }

      // reset input
      setFile(null);
      e.target.reset();
    } catch (err) {
      console.error(err);
      setStatus(err.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6">
      <h2 className="text-lg font-semibold text-slate-800 mb-2">
        Upload Document
      </h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="file"
          accept=".pdf,.txt,.docx,.ppt,.pptx"
          onChange={handleFileChange}
          className="block w-full text-sm text-slate-700
                     file:mr-4 file:py-2 file:px-4
                     file:rounded-md file:border-0
                     file:text-sm file:font-semibold
                     file:bg-slate-800 file:text-white
                     hover:file:bg-slate-700"
        />
        <button
          type="submit"
          disabled={!file || loading}
          className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium
                     text-white bg-emerald-600 hover:bg-emerald-700
                     disabled:bg-slate-300 disabled:text-slate-600"
        >
          {loading ? 'Uploading...' : 'Upload'}
        </button>
      </form>
      {status && (
        <p className="mt-3 text-sm text-slate-700">
          {status}
        </p>
      )}
    </div>
  );
}
