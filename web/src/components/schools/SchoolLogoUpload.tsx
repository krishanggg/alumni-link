import { useEffect, useRef, useState } from 'react';
import { ImageUp } from 'lucide-react';
import { Button } from '../shared/Button';
import { DEFAULT_ICON_TONE } from '../../lib/toneClasses';

interface SchoolLogoUploadProps {
  currentLogoUrl: string | null;
  onUpload: (file: File) => Promise<void>;
}

export function SchoolLogoUpload({ currentLogoUrl, onUpload }: SchoolLogoUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
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

  const allowedTypes = ['image/jpeg', 'image/png'];
  const maxSize = 5 * 1024 * 1024;

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    setError('');
    setUploadSuccess(false);

    if (!allowedTypes.includes(file.type)) {
      setError('Only JPG and PNG files are allowed.');
      e.target.value = '';

      return;
    }

    if (file.size > maxSize) {
      setError('File size must be under 5MB.');
      e.target.value = '';

      return;
    }

    const previousPreviewUrl = previewUrlRef.current;

    if (previousPreviewUrl) {
      URL.revokeObjectURL(previousPreviewUrl);
      previewUrlRef.current = null;
    }

    const nextPreviewUrl = URL.createObjectURL(file);
    previewUrlRef.current = nextPreviewUrl;
    setSelectedFile(file);
    setPreviewUrl(nextPreviewUrl);
    e.target.value = '';
  }

  function handleCancel() {
    setSelectedFile(null);
    const url = previewUrlRef.current;

    if (url) {
      URL.revokeObjectURL(url);
      previewUrlRef.current = null;
    }

    setPreviewUrl(null);
    setError('');
  }

  async function handleUpload() {
    if (!selectedFile) {
      return;
    }

    setError('');
    setIsUploading(true);

    try {
      await onUpload(selectedFile);
      setUploadSuccess(true);
      setSelectedFile(null);
      const url = previewUrlRef.current;

      if (url) {
        URL.revokeObjectURL(url);
        previewUrlRef.current = null;
      }

      setPreviewUrl(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="rounded-DEFAULT border border-outline-variant bg-white p-4">
      <div className="flex items-start gap-4">
        <div className="relative">
          {selectedFile && previewUrl ? (
            <img
              src={previewUrl}
              alt="Preview"
              className="h-20 w-20 rounded-DEFAULT border border-outline-variant bg-white object-contain p-1"
            />
          ) : currentLogoUrl ? (
            <img
              src={currentLogoUrl}
              alt="School logo"
              className="h-20 w-20 rounded-DEFAULT border border-outline-variant bg-white object-contain p-1"
            />
          ) : (
            <div className={`flex h-20 w-20 items-center justify-center rounded-DEFAULT ${DEFAULT_ICON_TONE}`}>
              <ImageUp size={28} aria-hidden="true" strokeWidth={1.75} />
            </div>
          )}
        </div>

        <div className="flex-1 space-y-2">
          {!selectedFile ? (
            <Button type="button" variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
              Change Logo
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button type="button" size="sm" onClick={handleUpload} isLoading={isUploading} loadingText="Saving">
                Save Logo
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={handleCancel} disabled={isUploading}>
                Cancel
              </Button>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png"
            onChange={handleFileSelect}
            className="hidden"
          />

          <p className="text-label-sm text-on-surface-variant">JPG or PNG, max 5MB</p>

          {error && (
            <p className="text-label-sm text-error" role="alert">
              {error}
            </p>
          )}

          {uploadSuccess && (
            <p className="text-label-sm text-on-success-container">Logo updated successfully.</p>
          )}
        </div>
      </div>
    </div>
  );
}
