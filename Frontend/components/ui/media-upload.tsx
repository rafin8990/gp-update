'use client';

import { useState, useCallback } from 'react';
import { uploadImage } from '@/lib/storage';
import { Button } from './button';
import { Progress } from './progress';
import { X } from 'lucide-react';

interface MediaUploadProps {
  onUploadComplete?: (urls: string[]) => void;
  multiple?: boolean;
  maxFiles?: number;
  accept?: string;
  storagePath?: string;
  className?: string;
  maxFileSize?: number; // in bytes
}

export function MediaUpload({
  onUploadComplete,
  multiple = false,
  maxFiles = 5,
  accept = 'image/*',
  storagePath = '',
  className = '',
  maxFileSize = 50 * 1024 * 1024, // 50MB default
}: MediaUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    
    if (selectedFiles.length > maxFiles) {
      setError(`You can only upload up to ${maxFiles} files at once`);
      return;
    }

    // Check file sizes
    const oversizedFiles = selectedFiles.filter(file => file.size > maxFileSize);
    if (oversizedFiles.length > 0) {
      setError(`Some files exceed the maximum size of ${maxFileSize / (1024 * 1024)}MB`);
      return;
    }

    setFiles(selectedFiles);
    setError(null);
  }, [maxFiles, maxFileSize]);

  const removeFile = useCallback((index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const uploadFiles = useCallback(async () => {
    if (files.length === 0) return;

    setUploading(true);
    setProgress(0);
    setError(null);

    const uploadedUrls: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const { url, error: uploadError } = await uploadImage({
          file,
          folder: storagePath,
        });

        if (uploadError) {
          throw new Error(uploadError);
        }

        if (url) {
          uploadedUrls.push(url);
        }
        setProgress(((i + 1) / files.length) * 100);
      }

      onUploadComplete?.(uploadedUrls);
      setFiles([]);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload files');
    } finally {
      setUploading(false);
    }
  }, [files, storagePath, onUploadComplete]);

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center gap-4">
        <input
          type="file"
          onChange={handleFileChange}
          multiple={multiple}
          accept={accept}
          className="hidden"
          id="media-upload"
        />
        <label
          htmlFor="media-upload"
          className="cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md"
        >
          Select Files
        </label>
        {files.length > 0 && (
          <Button
            onClick={uploadFiles}
            disabled={uploading}
            variant="outline"
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </Button>
        )}
      </div>

      {error && (
        <p className="text-destructive text-sm">{error}</p>
      )}

      {uploading && (
        <Progress value={progress} className="w-full" />
      )}

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-2 border rounded-md"
            >
              <span className="text-sm truncate">{file.name}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeFile(index)}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 