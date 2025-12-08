// src/App.jsx
import { useEffect, useState } from 'react';
import FileUpload from './components/FileUpload';
import DocumentList from './components/DocumentList';
import DocumentPreview from './components/DocumentPreview';
import { fetchDocuments, fetchDocumentById } from './api/client';

function App() {
  const [documents, setDocuments] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState('');

  const loadDocuments = async () => {
    try {
      setLoadingDocs(true);
      setError('');
      const res = await fetchDocuments(); // expected shape: { count, items }
      const items = res.items || [];
      setDocuments(items);

      // If nothing is selected yet but we have docs, select the first one
      if (!selectedId && items.length > 0) {
        handleSelectDocument(items[0].id);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load documents');
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleSelectDocument = async (id) => {
    try {
      setSelectedId(id);
      setLoadingDetail(true);
      setError('');
      const doc = await fetchDocumentById(id);
      setSelectedDoc(doc);
    } catch (err) {
      console.error(err);
      setError('Failed to load document details');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleUploadSuccess = () => {
    // After upload, refresh the document list (and auto-select first item)
    loadDocuments();
  };

  useEffect(() => {
    loadDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <div className="p-4 mx-auto h-full flex flex-col px-4 py-6 gap-4">
        

        {/* Main 2-column layout */}
        <div className="flex gap-5 flex-1">
          {/* LEFT SIDE: upload + grouped list */}
          <div className="w-1/2 flex flex-col gap-3">
            <FileUpload onUploadSuccess={handleUploadSuccess} />

            {error && (
              <p className="text-[11px] text-red-400 bg-red-950/40 border border-red-800/60 rounded-lg px-3 py-1.5">
                {error}
              </p>
            )}

            {loadingDocs ? (
              <div className="mt-2 flex-1 flex items-center justify-center rounded-2xl border border-slate-800/80 bg-slate-900/60 text-sm text-slate-300">
                Loading documents...
              </div>
            ) : (
              <DocumentList
                documents={documents.map((d) => ({
                  ...d,
                  mimeType: d.mimeType || 'unknown',
                }))}
                onSelect={handleSelectDocument}
                selectedId={selectedId}
              />
            )}
          </div>

          {/* RIGHT SIDE: content preview + download button in header */}
          <div className="flex-1 min-w-0">
            {loadingDetail ? (
              <div className="h-full flex items-center justify-center rounded-2xl border border-slate-800/80 bg-slate-900/70 text-sm text-slate-300 shadow-[0_18px_45px_rgba(15,23,42,0.65)]">
                Loading document details...
              </div>
            ) : (
              <DocumentPreview document={selectedDoc} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
