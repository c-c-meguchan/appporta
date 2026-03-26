'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

const IMAGE_BUCKET = 'app-images';
const LABEL_CLASS = 'block text-xs font-medium text-[var(--text-primary)] mb-1';
const INPUT_CLASS =
  'w-full rounded-lg bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:bg-[var(--input-focus-bg)] focus:ring-[0.7px] focus:ring-[var(--input-focus-ring)]';

function CloudUploadIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      height="24"
      viewBox="0 -960 960 960"
      width="24"
      className={className}
      fill="currentColor"
    >
      <path d="M260-160q-91 0-155.5-63T40-377q0-78 47-139t123-87q26-92 100-153t170-61q100 0 175 68t87 166q71 14 120.5 68.5T880-520q0 75-52.5 127.5T700-340H260Z" />
    </svg>
  );
}

type ImageUploadInputProps = {
  label: string;
  value: string;
  onChange: (url: string) => void;
  pathPrefix: string;
};

export function ImageUploadInput({ label, value, onChange, pathPrefix }: ImageUploadInputProps) {
  const [uploading, setUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);

  const uploadFile = async (file: File) => {
    try {
      setUploading(true);
      const ext = file.name.split('.').pop() || 'png';
      const filePath = `${pathPrefix}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(filePath, file);
      if (error) throw error;
      const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(filePath);
      onChange(data.publicUrl);
    } catch (e) {
      console.error(e);
      alert('画像のアップロードに失敗しました。時間をおいて再度お試しください。');
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void uploadFile(file);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) void uploadFile(file);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  return (
    <div className="space-y-2">
      <label className={LABEL_CLASS}>{label}</label>
      <div
        role="button"
        tabIndex={0}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => {
          const input = document.getElementById(`file-${pathPrefix}`) as HTMLInputElement | null;
          input?.click();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            (document.getElementById(`file-${pathPrefix}`) as HTMLInputElement | null)?.click();
          }
        }}
        className="flex min-h-[120px] cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-[0.7px] border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-center transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
      >
        <input
          id={`file-${pathPrefix}`}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        {value ? (
          <div className="relative h-16 w-16 overflow-hidden rounded-lg border-[0.7px] border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt=""
              className="h-full w-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        ) : (
          <>
            <CloudUploadIcon className="h-10 w-10 text-zinc-400 dark:text-zinc-500" />
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">画像アップロード</p>
          </>
        )}
      </div>
      <button
        type="button"
        onClick={() => setShowUrlInput((v) => !v)}
        className="text-xs text-zinc-500 underline hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
      >
        {showUrlInput ? 'URL入力を閉じる' : 'URLを入力'}
      </button>
      {showUrlInput && (
        <input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://..."
          className={INPUT_CLASS}
        />
      )}
    </div>
  );
}
