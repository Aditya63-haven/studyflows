import { useEffect, useState } from 'react';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import { avatarFileFromBlob, createCroppedAvatar } from '../utils/avatarImage';

interface AvatarCropperProps {
  imageSrc: string;
  uploading: boolean;
  progress: number;
  onCancel: () => void;
  onSave: (file: File) => Promise<void>;
}

export const AvatarCropper = ({
  imageSrc,
  uploading,
  progress,
  onCancel,
  onSave,
}: AvatarCropperProps) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = uploading || processing;

  useEffect(() => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setError(null);
  }, [imageSrc]);

  const handleSave = async () => {
    if (!croppedAreaPixels || busy) {
      return;
    }

    setError(null);
    setProcessing(true);
    try {
      const blob = await createCroppedAvatar(imageSrc, croppedAreaPixels);
      await onSave(avatarFileFromBlob(blob));
    } catch (cropError) {
      setError(
        cropError instanceof Error ? cropError.message : 'The cropped image could not be created.',
      );
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="avatar-crop-editor">
      <div className="avatar-crop-viewport">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          rotation={0}
          aspect={1}
          cropShape="rect"
          showGrid
          objectFit="contain"
          minZoom={1}
          maxZoom={3}
          zoomSpeed={1}
          restrictPosition
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={(_area, areaPixels) => setCroppedAreaPixels(areaPixels)}
        />
      </div>

      <label className="avatar-zoom-control">
        <span>Zoom</span>
        <input
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={zoom}
          disabled={busy}
          onChange={(event) => setZoom(Number(event.target.value))}
        />
      </label>

      {uploading ? (
        <div className="avatar-upload-status" role="status" aria-live="polite">
          <span>
            {progress >= 100 ? 'Processing your photo...' : `Uploading photo... ${progress}%`}
          </span>
          <progress max={100} value={progress} />
        </div>
      ) : null}

      {error ? (
        <p className="profile-field-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="form-actions">
        <button
          className="button"
          type="button"
          onClick={() => void handleSave()}
          disabled={busy || !croppedAreaPixels}
        >
          {processing ? 'Preparing...' : uploading ? 'Saving photo...' : 'Save photo'}
        </button>
        <button className="button secondary" type="button" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
      </div>
    </div>
  );
};
