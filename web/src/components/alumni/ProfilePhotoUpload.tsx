import { useEffect, useRef, useState } from 'react';
import { Camera, ImageUp } from 'lucide-react';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_MIME_TYPES = ['image/jpeg', 'image/png'];

interface ProfilePhotoUploadProps {
  currentPhotoUrl?: string | null;
  onFileSelected: (file: File | null) => void;
  onRemoveChange?: (removed: boolean) => void;
  error?: string;
}

export function ProfilePhotoUpload({ currentPhotoUrl, onFileSelected, onRemoveChange, error }: ProfilePhotoUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isRemoved, setIsRemoved] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      const url = previewUrlRef.current;

      if (url) {
        URL.revokeObjectURL(url);
        previewUrlRef.current = null;
      }
    };
  }, []);

  function handleFile(file: File | undefined | null) {
    if (!file) {
      return;
    }

    if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
      setValidationError('Only JPG or PNG images are allowed.');
      onFileSelected(null);

      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setValidationError('Image must be 5MB or smaller.');
      onFileSelected(null);

      return;
    }

    setValidationError('');
    const previousPreviewUrl = previewUrlRef.current;

    if (previousPreviewUrl) {
      URL.revokeObjectURL(previousPreviewUrl);
      previewUrlRef.current = null;
    }

    const nextPreviewUrl = URL.createObjectURL(file);
    previewUrlRef.current = nextPreviewUrl;
    setPreviewUrl(nextPreviewUrl);
    setIsRemoved(false);
    onRemoveChange?.(false);
    onFileSelected(file);
  }

  function handleRemove() {
    const url = previewUrlRef.current;

    if (url) {
      URL.revokeObjectURL(url);
      previewUrlRef.current = null;
    }

    setPreviewUrl(null);
    setValidationError('');
    setIsRemoved(true);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    onFileSelected(null);
    onRemoveChange?.(true);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDraggingOver(false);
    handleFile(e.dataTransfer.files?.[0]);
  }

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openFilePicker();
    }
  }

  const displayedPhoto = previewUrl ?? (isRemoved ? null : currentPhotoUrl);

  return (
    <div className="flex flex-col items-center">
      <div
        role="button"
        tabIndex={0}
        aria-label={displayedPhoto ? 'Change profile photo' : 'Upload profile photo'}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDraggingOver(true);
        }}
        onDragLeave={() => setIsDraggingOver(false)}
        onDrop={handleDrop}
        onClick={openFilePicker}
        onKeyDown={handleKeyDown}
        className={`group relative h-28 w-28 shrink-0 cursor-pointer overflow-hidden rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
          displayedPhoto ? '' : 'border-2 border-dashed'
        } ${
          isDraggingOver
            ? 'border-accent bg-accent/5'
            : displayedPhoto
              ? ''
              : 'border-outline-variant bg-surface-container-low/40 hover:border-accent/50 hover:bg-accent/5'
        }`}
      >
        {displayedPhoto ? (
          <>
            <img src={displayedPhoto} alt="Profile preview" className="h-full w-full object-cover" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/0 text-white opacity-0 transition-all group-hover:bg-black/50 group-hover:opacity-100 group-focus-visible:bg-black/50 group-focus-visible:opacity-100">
              <Camera size={20} aria-hidden="true" />
              <span className="text-label-sm font-label-sm">Change</span>
            </div>
          </>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 px-2 text-center">
            <ImageUp size={22} className="text-on-surface-variant transition-colors group-hover:text-accent" aria-hidden="true" />
            <span className="text-label-sm text-on-surface-variant transition-colors group-hover:text-accent">Upload</span>
          </div>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <p className="mt-2 text-label-sm text-on-surface-variant">JPG or PNG, up to 5MB</p>
      {displayedPhoto && (
        <button
          type="button"
          onClick={handleRemove}
          className="mt-1 rounded-DEFAULT text-label-sm font-label-sm text-error hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error/40"
        >
          Remove photo
        </button>
      )}
      {(validationError || error) && (
        <p className="mt-1 text-label-sm text-error" role="alert">{validationError || error}</p>
      )}
    </div>
  );
}
