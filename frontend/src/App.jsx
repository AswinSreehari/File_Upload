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
      const res = await fetchDocuments(); // { count, items }
      setDocuments(res.items || []);
      if (!selectedId && res.items && res.items.length > 0) {
        handleSelectDocument(res.items[0].id);
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
    // After upload, refresh list
    loadDocuments();
  };

  useEffect(() => {
    loadDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center">
      <div className="bg-white shadow-md rounded-lg p-8 max-w-5xl w-full">
        {/* <h1 className="text-2xl font-bold mb-2 text-slate-800">
          Document Ingestion Frontend
        </h1>
        <p className="text-slate-600 mb-4 text-sm">
          Backend expected at <code>http://localhost:5000</code>.
        </p> */}

        <FileUpload onUploadSuccess={handleUploadSuccess} />

        {error && (
          <p className="mt-2 text-sm text-red-600">
            {error}
          </p>
        )}

        {loadingDocs ? (
          <p className="mt-4 text-sm text-slate-500">Loading documents...</p>
        ) : (
          <div className="mt-4 flex flex-col md:flex-row gap-6">
            {/* Left: document list (narrower) */}
            <div className="md:w-1/3">
              <DocumentList
                documents={documents.map((d) => ({
                  ...d,
                  mimeType: d.mimeType || 'unknown',
                }))}
                onSelect={handleSelectDocument}
                selectedId={selectedId}
              />
            </div>

            {/* Right: document preview (wider) */}
            <div className="md:w-2/3">
              {loadingDetail ? (
                <p className="text-sm text-slate-500">
                  Loading document details...
                </p>
              ) : (
                <DocumentPreview document={selectedDoc} />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
