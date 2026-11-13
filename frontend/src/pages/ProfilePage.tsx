import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { getErrorMessage } from '../api';
import { useAuth } from '../auth/AuthContext';
import { AvatarCropper } from '../components/AvatarCropper';
import { Card } from '../components/Card';
import { Chip } from '../components/Chip';
import { ErrorBanner } from '../components/ErrorBanner';
import { PageHeader } from '../components/PageHeader';
import { UserAvatar } from '../components/UserAvatar';
import { AVATAR_ACCEPT, loadImage, validateAvatarFile } from '../utils/avatarImage';
import { formatDate, formatDateTime } from '../utils/format';
import { ACCOUNT_LABEL } from '../utils/user';
import '../account.css';

const MAX_NAME_LENGTH = 120;

export const ProfilePage = () => {
  const { user, updateProfile, uploadAvatar, removeAvatar } = useAuth();
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [photoSource, setPhotoSource] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoProgress, setPhotoProgress] = useState(0);
  const [removingPhoto, setRemovingPhoto] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const savingRef = useRef(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) {
      return;
    }
    nameInputRef.current?.focus();
    nameInputRef.current?.select();
  }, [editing]);

  useEffect(
    () => () => {
      if (photoSource) {
        URL.revokeObjectURL(photoSource);
      }
    },
    [photoSource],
  );

  if (!user) {
    return null;
  }

  const startEditing = () => {
    setDraftName(user.name);
    setNameError(null);
    setError(null);
    setSuccess(null);
    setConfirmingRemove(false);
    setEditing(true);
  };

  const cancelEditing = () => {
    if (savingRef.current) {
      return;
    }
    setDraftName(user.name);
    setNameError(null);
    setError(null);
    setSuccess(null);
    setEditing(false);
    requestAnimationFrame(() => editButtonRef.current?.focus());
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (savingRef.current) {
      return;
    }

    const nextName = draftName.trim();
    if (!nextName) {
      setNameError('Full name cannot be empty.');
      nameInputRef.current?.focus();
      return;
    }
    if (nextName.length > MAX_NAME_LENGTH) {
      setNameError(`Full name must be ${MAX_NAME_LENGTH} characters or fewer.`);
      nameInputRef.current?.focus();
      return;
    }

    setNameError(null);
    setError(null);
    setSuccess(null);
    savingRef.current = true;
    setSaving(true);

    try {
      await updateProfile({ name: nextName });
      setEditing(false);
      setSuccess('Your profile has been updated.');
      requestAnimationFrame(() => editButtonRef.current?.focus());
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const handlePhotoSelection = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }

    const validationError = validateAvatarFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    const source = URL.createObjectURL(file);
    try {
      await loadImage(source);
    } catch (imageError) {
      URL.revokeObjectURL(source);
      setError(
        imageError instanceof Error ? imageError.message : 'The selected image could not be read.',
      );
      return;
    }

    setError(null);
    setSuccess(null);
    setConfirmingRemove(false);
    setPhotoProgress(0);
    setPhotoSource(source);
  };

  const closePhotoEditor = () => {
    if (photoUploading) {
      return;
    }
    setPhotoSource(null);
    setPhotoProgress(0);
    setError(null);
  };

  const handleSavePhoto = async (file: File) => {
    setPhotoUploading(true);
    setPhotoProgress(0);
    setError(null);
    setSuccess(null);

    try {
      await uploadAvatar(file, setPhotoProgress);
      setPhotoSource(null);
      setPhotoProgress(0);
      setSuccess('Profile photo updated.');
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (removingPhoto) {
      return;
    }

    setRemovingPhoto(true);
    setError(null);
    setSuccess(null);
    try {
      await removeAvatar();
      setConfirmingRemove(false);
      setSuccess('Profile photo removed.');
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setRemovingPhoto(false);
    }
  };

  return (
    <div className="stack large profile-page">
      <PageHeader
        eyebrow="Your account"
        title="My profile"
        description="Review the information attached to your StudyFlows account."
        actions={
          <Link className="button secondary" to="/settings">
            Settings
          </Link>
        }
      />

      <ErrorBanner message={error} onDismiss={() => setError(null)} />
      {success ? (
        <div className="notice profile-success" role="status">
          {success}
        </div>
      ) : null}

      <div className="split-grid">
        <Card
          title={editing ? 'Edit profile' : 'Profile'}
          description={
            editing
              ? 'Update the name shown across StudyFlows.'
              : 'Your identity inside StudyFlows.'
          }
          actions={
            editing || photoSource ? null : (
              <button
                ref={editButtonRef}
                type="button"
                className="button secondary small"
                onClick={startEditing}
              >
                Edit profile
              </button>
            )
          }
        >
          {editing ? (
            <form
              className="profile-edit-form"
              onSubmit={handleSubmit}
              aria-busy={saving}
              noValidate
            >
              <div className="profile-edit-intro">
                <UserAvatar
                  name={user.name}
                  avatarUrl={user.avatarUrl}
                  className="profile-summary-avatar"
                  decorative
                />
                <div>
                  <p className="profile-edit-email">{user.email}</p>
                  <Chip tone="accent">{ACCOUNT_LABEL}</Chip>
                </div>
              </div>

              <label className="field" htmlFor="profile-name">
                <span>Full name</span>
                <input
                  ref={nameInputRef}
                  id="profile-name"
                  value={draftName}
                  onChange={(event) => {
                    setDraftName(event.target.value);
                    if (nameError) {
                      setNameError(null);
                    }
                  }}
                  maxLength={MAX_NAME_LENGTH}
                  autoComplete="name"
                  required
                  disabled={saving}
                  aria-invalid={Boolean(nameError)}
                  aria-describedby={
                    nameError ? 'profile-name-hint profile-name-error' : 'profile-name-hint'
                  }
                />
                <small id="profile-name-hint">
                  Use 1 to {MAX_NAME_LENGTH} characters. This name appears in the header and account
                  menu.
                </small>
              </label>
              {nameError ? (
                <p className="profile-field-error" id="profile-name-error" role="alert">
                  {nameError}
                </p>
              ) : null}

              <p className="profile-edit-note">Email changes are not available yet.</p>

              <div className="form-actions">
                <button className="button" type="submit" disabled={saving}>
                  {saving ? 'Saving...' : 'Save changes'}
                </button>
                <button
                  className="button secondary"
                  type="button"
                  onClick={cancelEditing}
                  disabled={saving}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="profile-summary">
                <UserAvatar
                  name={user.name}
                  avatarUrl={user.avatarUrl}
                  className="profile-summary-avatar"
                  decorative
                />
                <div className="profile-summary-copy">
                  <h3 className="profile-summary-name">{user.name}</h3>
                  <p className="muted">{user.email}</p>
                  <Chip tone="accent">{ACCOUNT_LABEL}</Chip>

                  {!photoSource ? (
                    <div className="profile-avatar-actions">
                      <input
                        ref={photoInputRef}
                        className="visually-hidden"
                        type="file"
                        accept={AVATAR_ACCEPT}
                        onChange={(event) => void handlePhotoSelection(event)}
                        tabIndex={-1}
                      />
                      <button
                        type="button"
                        className="button secondary small"
                        onClick={() => photoInputRef.current?.click()}
                        aria-describedby="profile-photo-help"
                      >
                        Change photo
                      </button>
                      {user.avatarUrl ? (
                        <button
                          type="button"
                          className="button secondary small"
                          onClick={() => setConfirmingRemove(true)}
                          disabled={removingPhoto}
                        >
                          Remove photo
                        </button>
                      ) : null}
                    </div>
                  ) : null}

                  {confirmingRemove ? (
                    <div className="avatar-remove-confirm" role="alert">
                      <p>Remove your current profile photo?</p>
                      <div className="form-actions">
                        <button
                          type="button"
                          className="button danger small"
                          onClick={() => void handleRemovePhoto()}
                          disabled={removingPhoto}
                        >
                          {removingPhoto ? 'Removing...' : 'Remove photo'}
                        </button>
                        <button
                          type="button"
                          className="button secondary small"
                          onClick={() => setConfirmingRemove(false)}
                          disabled={removingPhoto}
                        >
                          Keep photo
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              {photoSource ? (
                <div className="profile-photo-editor">
                  <div className="profile-photo-editor-head">
                    <h3>Position your photo</h3>
                    <p className="muted small-text">
                      Drag to reposition and use the slider to zoom. The saved image will be square
                      and displayed as a circle.
                    </p>
                  </div>
                  <AvatarCropper
                    imageSrc={photoSource}
                    uploading={photoUploading}
                    progress={photoProgress}
                    onCancel={closePhotoEditor}
                    onSave={handleSavePhoto}
                  />
                </div>
              ) : null}

              <p className="footnote" id="profile-photo-help">
                JPEG, PNG and WebP images up to 5 MB. Without a photo, your initials are shown.
              </p>
            </>
          )}
        </Card>

        <Card
          title="Account details"
          description="Read-only information from your authenticated account."
        >
          <dl className="account-details">
            <div className="account-detail-row">
              <dt>Full name</dt>
              <dd>{user.name}</dd>
            </div>
            <div className="account-detail-row">
              <dt>Email</dt>
              <dd>{user.email}</dd>
            </div>
            <div className="account-detail-row">
              <dt>Joined</dt>
              <dd>{formatDate(user.createdAt)}</dd>
            </div>
            <div className="account-detail-row">
              <dt>Last updated</dt>
              <dd>{formatDateTime(user.updatedAt)}</dd>
            </div>
            <div className="account-detail-row">
              <dt>Account ID</dt>
              <dd className="account-id">{user.id}</dd>
            </div>
          </dl>
        </Card>
      </div>

      <Card
        title="Study preferences"
        description="Session length, breaks, and weekly availability live with the rest of your study settings."
      >
        <p className="muted">
          Adjust when and how long you prefer to study from the availability page.
        </p>
        <div className="form-actions">
          <Link className="button" to="/availability">
            Open study preferences
          </Link>
          <Link className="button secondary" to="/settings">
            View settings
          </Link>
        </div>
      </Card>
    </div>
  );
};
