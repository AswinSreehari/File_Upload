export const API_BASE_URL = 'http://localhost:5000';

export async function uploadDocument(file) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE_URL}/documents/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Upload failed');
  }

  return res.json(); // { message, document: { ... } }
}

export async function fetchDocuments() {
  const res = await fetch(`${API_BASE_URL}/documents`);
  if (!res.ok) {
    throw new Error('Failed to fetch documents');
  }
  return res.json(); // { count, items: [...] }
}

export async function fetchDocumentById(id) {
  const res = await fetch(`${API_BASE_URL}/documents/${id}`);
  if (!res.ok) {
    throw new Error('Failed to fetch document');
  }
  return res.json(); // full details
}
