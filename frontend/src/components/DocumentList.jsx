 
export default function DocumentList({ documents, onSelect, selectedId }) {
  if (!documents || documents.length === 0) {
    return (
      <div className="mt-4 text-sm text-slate-500">
        No documents uploaded yet.
      </div>
    );
  }

  return (
    <div className="mt-4">
      <h2 className="text-lg font-semibold text-slate-800 mb-2">
        Uploaded Documents
      </h2>
      <ul className="space-y-1">
        {documents.map((doc) => (
          <li key={doc.id}>
            <button
              onClick={() => onSelect(doc.id)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm
                ${selectedId === doc.id
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-slate-50 text-slate-800 border border-slate-200 hover:bg-slate-100'
                }`}
            >
              <div className="flex justify-between items-center">
                <span className="font-medium">
                  {doc.originalFileName}
                </span>
                <span className="text-xs text-slate-500">
                  {doc.mimeType}
                </span>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
