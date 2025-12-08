// src/components/DocumentList.jsx

function groupByExtension(documents) {
  const groups = {};
  documents.forEach((doc) => {
    let ext = 'unknown';
    if (doc.originalFileName && doc.originalFileName.includes('.')) {
      ext = doc.originalFileName.split('.').pop().toLowerCase();
    } else if (doc.mimeType) {
      ext = doc.mimeType.split('/').pop().toLowerCase();
    }
    if (!groups[ext]) groups[ext] = [];
    groups[ext].push(doc);
  });
  return groups;
}

export default function DocumentList({ documents, onSelect, selectedId }) {
  if (!documents || documents.length === 0) {
    return (
      <div className="mt-4 text-[11px] text-slate-400 bg-slate-950/60 border border-slate-800/70 rounded-2xl px-4 py-3">
        No documents uploaded yet.
      </div>
    );
  }

  const grouped = groupByExtension(documents);
  const extensions = Object.keys(grouped).sort();

  return (
    <div
  className="flex-1 rounded-2xl border border-slate-800/70 bg-slate-950/90 p-4 
             shadow-[0_18px_45px_rgba(15,23,42,0.65)] 
             overflow-y-auto no-scrollbar mt-2 backdrop-blur-lg 
             max-h-[330px]"
>
  <div className="flex items-center justify-between mb-2">
    <h3 className="text-xs font-semibold tracking-wide text-slate-100">
      Uploaded Documents
    </h3>
    <span className="text-[10px] text-slate-500">
      {documents.length} file{documents.length === 1 ? '' : 's'}
    </span>
  </div>

  <div className="space-y-4">
    {extensions.map((ext) => (
      <div key={ext}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              {ext === 'unknown' ? 'Other' : `${ext} files`}
            </span>
          </div>
          <span className="text-[10px] text-slate-500">
            {grouped[ext].length}
          </span>
        </div>

        <ul className="space-y-1.5">
          {grouped[ext].map((doc) => {
            const isSelected = selectedId === doc.id;
            return (
              <li key={doc.id}>
                <button
                  type="button"
                  onClick={() => onSelect(doc.id)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-[12px] border transition-all duration-150
                    ${
                      isSelected
                        ? 'bg-emerald-500/15 border-emerald-400/80 text-emerald-50 shadow-[0_0_18px_rgba(16,185,129,0.45)]'
                        : 'bg-slate-900/70 border-slate-800/80 text-slate-100 hover:bg-slate-900 hover:border-slate-600/80 hover:shadow-[0_0_14px_rgba(15,23,42,0.75)]'
                    }`}
                >
                  <div className="flex justify-between items-center gap-3">
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {doc.originalFileName}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">
                        {doc.mimeType}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <div className="inline-flex items-center gap-1 px-1.5 py-[2px] rounded-full border border-slate-700/80 bg-slate-900/80">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
                        <span className="text-[9px] uppercase tracking-[0.16em] text-slate-300">
                          {doc.originalFileName &&
                          doc.originalFileName.includes('.')
                            ? doc.originalFileName.split('.').pop().toLowerCase()
                            : 'file'}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    ))}
  </div>
</div>

  );
}
