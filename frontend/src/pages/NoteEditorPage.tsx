import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getErrorMessage, notesApi } from '../api';
import type { Note } from '../api/types';
import { ErrorBanner } from '../components/ErrorBanner';
import { Loading } from '../components/Loading';
import { Markdown } from '../components/Markdown';
import { PageHeader } from '../components/PageHeader';

export const NoteEditorPage = () => {
  const { spaceId, noteId } = useParams();
  const navigate = useNavigate();
  const editing = Boolean(noteId);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [sourceSpaceId, setSourceSpaceId] = useState(spaceId ?? '');
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!noteId) {
      return;
    }

    let active = true;
    notesApi
      .get(noteId)
      .then((note: Note) => {
        if (!active) {
          return;
        }
        setTitle(note.title);
        setContent(note.content);
        setTags(note.tags.join(', '));
        setSourceSpaceId(note.spaceId);
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
  }, [noteId]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const input = {
        title,
        content,
        tags: tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
      };
      const note = noteId
        ? await notesApi.update(noteId, input)
        : await notesApi.create(sourceSpaceId, input);
      navigate(`/notes/${note.id}`);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Loading label="Loading note..." />;
  }

  return (
    <div className="stack large">
      <PageHeader
        eyebrow={editing ? 'Edit note' : 'New note'}
        title={editing ? 'Update your note' : 'Write a study note'}
        description="Use Markdown for headings, lists, tables and links."
        actions={
          sourceSpaceId ? (
            <Link className="button secondary" to={`/spaces/${sourceSpaceId}`}>
              Back to space
            </Link>
          ) : null
        }
      />

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      <form onSubmit={handleSubmit} className="stack">
        <div className="form-grid panel">
          <label className="field full">
            <span>Title</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
            />
          </label>
          <label className="field full">
            <span>Tags</span>
            <input
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder="e.g. networking, exam-1, definitions"
            />
          </label>
          <label className="field full">
            <span>Content</span>
            <textarea
              className="note-textarea"
              rows={16}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="# Heading&#10;&#10;Write your note in Markdown..."
            />
          </label>
          <div className="form-actions full">
            <button className="button" type="submit" disabled={saving}>
              {saving ? 'Saving...' : editing ? 'Save changes' : 'Create note'}
            </button>
            {sourceSpaceId ? (
              <Link className="button secondary" to={`/spaces/${sourceSpaceId}`}>
                Cancel
              </Link>
            ) : null}
          </div>
        </div>
      </form>

      <section className="panel">
        <div className="section-heading">
          <h2>Markdown preview</h2>
        </div>
        <Markdown content={content} />
      </section>
    </div>
  );
};
