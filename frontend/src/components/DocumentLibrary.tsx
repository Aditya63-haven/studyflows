import { useEffect, useState, type FormEvent } from 'react';
import { documentsApi, getErrorMessage } from '../api';
import type { StudyDocument } from '../api/types';
import { formatDate } from '../utils/format';
import { Button } from './Button';
import { EmptyState } from './EmptyState';
import { ErrorBanner } from './ErrorBanner';

interface DocumentLibraryProps {
  spaceId: string;
}

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const statusBadge = (document: StudyDocument) => {
  if (document.status === 'ready') {
    return <span className="badge success">Ready</span>;
  }
  if (document.status === 'failed') {
    return <span className="badge danger">Failed</span>;
  }
  return <span className="badge status-due">Processing</span>;
};

export const DocumentLibrary = ({ spaceId }: DocumentLibraryProps) => {
  const [documents, setDocuments] = useState<StudyDocument[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    documentsApi
      .listBySpace(spaceId)
      .then((result) => {
        if (active) {
          setDocuments(result);
        }
      })
      .catch((requestError) => {
        if (active) {
          setError(getErrorMessage(requestError));
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [spaceId]);

  const upload = async (event: FormEvent) => {
    event.preventDefault();
    if (!file || uploading) {
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const document = await documentsApi.upload(spaceId, file);
      setDocuments((current) => [document, ...current]);
      setFile(null);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setUploading(false);
    }
  };

  const remove = async (document: StudyDocument) => {
    if (!window.confirm(`Delete "${document.originalName}" and its extracted content?`)) {
      return;
    }
    setDeleting(document.id);
    setError(null);
    try {
      await documentsApi.remove(document.id);
      setDocuments((current) => current.filter((entry) => entry.id !== document.id));
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setDeleting(null);
    }
  };

  const download = async (document: StudyDocument) => {
    setError(null);
    try {
      const blob = await documentsApi.download(document.id);
      const url = URL.createObjectURL(blob);
      const anchor = window.document.createElement('a');
      anchor.href = url;
      anchor.download = document.originalName;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  };

  return (
    <section className="panel" id="documents">
      <div className="section-heading">
        <div>
          <h2>Documents</h2>
          <p className="muted small-text">
            Upload PDF, DOCX, TXT or Markdown files to use as study and assistant context.
          </p>
        </div>
      </div>

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      <form className="document-upload" onSubmit={upload}>
        <input
          type="file"
          accept=".pdf,.docx,.txt,.md,application/pdf,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          aria-label="Choose a document"
        />
        <Button type="submit" small disabled={!file || uploading}>
          {uploading ? 'Processing...' : 'Upload'}
        </Button>
        {file ? <span className="muted small-text">{file.name}</span> : null}
      </form>

      {loading ? (
        <p className="muted small-text">Loading documents...</p>
      ) : documents.length === 0 ? (
        <EmptyState
          title="No documents yet"
          description="Upload lecture notes or readings to search and use with the assistant."
        />
      ) : (
        <div className="document-list">
          {documents.map((document) => (
            <article key={document.id} className="document-row">
              <div className="document-row-main">
                <div className="document-row-title">
                  <strong>{document.originalName}</strong>
                  <span className="badge">{document.format.toUpperCase()}</span>
                  {statusBadge(document)}
                </div>
                <p className="muted small-text">
                  {formatBytes(document.sizeBytes)}
                  {document.pageCount > 0 ? ` · ${document.pageCount} pages` : ''}
                  {document.characterCount > 0
                    ? ` · ${document.characterCount.toLocaleString()} characters`
                    : ''}
                  {document.chunkCount > 0 ? ` · ${document.chunkCount} chunks` : ''}
                  {' · Added '}
                  {formatDate(document.createdAt)}
                </p>
                {document.status === 'failed' && document.errorMessage ? (
                  <p className="document-error">{document.errorMessage}</p>
                ) : null}
              </div>
              <div className="card-actions">
                <Button
                  variant="secondary"
                  small
                  onClick={() => void download(document)}
                  disabled={document.status !== 'ready'}
                >
                  Download
                </Button>
                <Button
                  variant="danger"
                  small
                  onClick={() => void remove(document)}
                  disabled={deleting === document.id}
                >
                  {deleting === document.id ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};
