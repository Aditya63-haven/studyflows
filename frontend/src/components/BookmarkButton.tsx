import { useState } from 'react';
import { bookmarksApi } from '../api';
import { StudyItemType } from '../api/types';

interface BookmarkButtonProps {
  itemId: string;
  itemType: StudyItemType;
  compact?: boolean;
}

export const BookmarkButton = ({
  itemId,
  itemType,
  compact = false,
}: BookmarkButtonProps) => {
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>(
    'idle',
  );

  const save = async () => {
    if (status === 'saving' || status === 'saved') {
      return;
    }
    setStatus('saving');
    try {
      await bookmarksApi.create(itemId, itemType);
      setStatus('saved');
    } catch {
      setStatus('error');
    }
  };

  const label =
    status === 'saved'
      ? 'Bookmarked'
      : status === 'saving'
        ? 'Saving...'
        : status === 'error'
          ? 'Try again'
          : 'Bookmark';

  return (
    <button
      type="button"
      className={compact ? 'button small secondary' : 'button secondary'}
      onClick={() => void save()}
      disabled={status === 'saving' || status === 'saved'}
      title="Save to bookmarks"
    >
      {label}
    </button>
  );
};
