'use client';

import { uploadsApi, type CreatePresignedUploadData } from '@/lib/api';
import { useTranslations } from 'next-intl';
import { useCallback, useRef, useState } from 'react';
import { RiDeleteBinLine, RiImageAddLine, RiUploadCloud2Line } from 'react-icons/ri';

interface ImageUploadProps {
  /** Current image URL value */
  value: string;
  /** Called with the CDN url after upload, or '' when cleared */
  onChange: (url: string) => void;
  /** Label text */
  label?: string;
  /** Upload folder on object storage */
  folder?: CreatePresignedUploadData['folder'];
  /** Accepted file types */
  accept?: string;
  /** Placeholder for manual URL input */
  placeholder?: string;
  /** Whether to show the manual URL input fallback */
  showUrlInput?: boolean;
}

export function ImageUpload({
  value,
  onChange,
  label,
  folder = 'reference-data',
  accept = 'image/jpeg,image/png,image/webp,image/avif,image/gif',
  placeholder = 'https://...',
  showUrlInput = true,
}: ImageUploadProps) {
  const tc = useTranslations('common');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const handleUpload = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) {
        setUploadError(tc('imageOnly'));
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setUploadError(tc('fileTooLarge'));
        return;
      }

      setIsUploading(true);
      setUploadError('');

      try {
        const cdnUrl = await uploadsApi.uploadFile(file, folder);
        onChange(cdnUrl);
      } catch {
        setUploadError(tc('uploadFailed'));
      } finally {
        setIsUploading(false);
      }
    },
    [folder, onChange, tc],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleUpload(file);
      // Reset so the same file can be re-selected
      e.target.value = '';
    },
    [handleUpload],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleUpload(file);
    },
    [handleUpload],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragActive(false);
  }, []);

  const handleRemove = useCallback(() => {
    onChange('');
  }, [onChange]);

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}

      {/* Preview or Drop Zone */}
      {value ? (
        <div className="relative inline-block">
          <img
            src={value}
            alt="Preview"
            className="h-28 w-28 rounded-lg border border-gray-200 object-cover dark:border-gray-700"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white shadow hover:bg-red-600"
            title={tc('delete')}
          >
            <RiDeleteBinLine className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-6 transition-colors ${
            dragActive
              ? 'border-blue-400 bg-blue-50 dark:border-blue-500 dark:bg-blue-900/20'
              : 'border-gray-300 bg-gray-50 hover:border-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:hover:border-gray-500'
          } ${isUploading ? 'pointer-events-none opacity-60' : ''}`}
        >
          {isUploading ? (
            <>
              <RiUploadCloud2Line className="mb-2 h-8 w-8 animate-pulse text-blue-500" />
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {tc('uploading')}
              </span>
            </>
          ) : (
            <>
              <RiImageAddLine className="mb-2 h-8 w-8 text-gray-400" />
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {tc('dropOrClickToUpload')}
              </span>
              <span className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                JPEG, PNG, WebP, AVIF, GIF — max 5MB
              </span>
            </>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />

      {uploadError && (
        <p className="text-sm text-red-600 dark:text-red-400">{uploadError}</p>
      )}

      {/* Manual URL input fallback */}
      {showUrlInput && (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:placeholder-gray-500"
          />
        </div>
      )}
    </div>
  );
}
