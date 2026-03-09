'use client';

import { useRef, useState } from 'react';

const PLACEHOLDER_NAME = '公開名を入力';

type TestimonialFormModalProps = {
  appID: string;
  open: boolean;
  onClose: () => void;
  onSubmitted?: (review: {
    id: string;
    user_icon_url: string | null;
    user_name: string;
    content: string;
    created_at: string;
  }) => void;
};

export function TestimonialFormModal({ appID, open, onClose, onSubmitted }: TestimonialFormModalProps) {
  const [userName, setUserName] = useState('');
  const [content, setContent] = useState('');
  const [secretMessage, setSecretMessage] = useState('');
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const placeholderName = PLACEHOLDER_NAME;

  if (!open) return null;

  const handleIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError('画像は2MB以下にしてください');
      return;
    }
    setIconFile(file);
    setIconPreview(URL.createObjectURL(file));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim()) return;
    setSubmitting(true);
    setError(null);

    try {
      const fd = new FormData();
      fd.append('app_id', appID);
      fd.append('user_name', userName.trim());
      fd.append('content', content.trim());
      if (secretMessage.trim()) fd.append('secret_message', secretMessage.trim());
      if (iconFile) fd.append('user_icon', iconFile);

      const res = await fetch('/api/testimonial', { method: 'POST', body: fd });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error || '投稿に失敗しました');
        return;
      }

      setSubmitted(true);
      onSubmitted?.(json.review);
    } catch {
      setError('通信エラーが発生しました');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (iconPreview) URL.revokeObjectURL(iconPreview);
    setUserName('');
    setContent('');
    setSecretMessage('');
    setIconFile(null);
    setIconPreview(null);
    setSubmitted(false);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={handleClose}>
      <div
        className="relative mx-4 w-full max-w-md rounded-2xl border-[0.7px] border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-3 top-3 rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          aria-label="閉じる"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
          </svg>
        </button>

        {submitted ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-6 w-6 text-emerald-600 dark:text-emerald-400">
                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              投稿ありがとうございます！
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              あなたの声が開発者に届きました。<br />開発者が承認すると、ユーザーの声欄に掲載されます。
            </p>
            <button
              type="button"
              onClick={handleClose}
              className="mt-2 rounded-lg bg-zinc-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              閉じる
            </button>
          </div>
        ) : (
          <>
            <h2 className="mb-4 text-base font-semibold text-zinc-900 dark:text-zinc-50">
              ユーザーの声を投稿
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* アイコン画像 */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="group relative h-14 w-14 shrink-0 overflow-hidden rounded-full border-[0.7px] border-zinc-200 bg-zinc-100 transition hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-zinc-600"
                >
                  {iconPreview ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={iconPreview} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full flex-col items-center justify-center text-zinc-400 dark:text-zinc-500">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                        <path d="M12 15.2q1.4 0 2.375-.975T15.35 11.85t-.975-2.375T12 8.5t-2.375.975T8.65 11.85t.975 2.375T12 15.2m0-1.55q-.775 0-1.312-.537T10.15 11.85t.538-1.262T12 10.05t1.313.538t.537 1.262t-.537 1.263T12 13.65M4 20q-.825 0-1.412-.587T2 18V7q0-.825.588-1.412T4 5h3.15L9 3h6l1.85 2H20q.825 0 1.413.588T22 7v11q0 .825-.587 1.413T20 20z" />
                      </svg>
                    </span>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/20">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-white opacity-0 transition group-hover:opacity-100">
                      <path d="M2.695 14.763l-1.262 3.154a.5.5 0 0 0 .65.65l3.155-1.262a4 4 0 0 0 1.343-.885L17.5 5.5a2.121 2.121 0 0 0-3-3L3.58 13.42a4 4 0 0 0-.885 1.343Z" />
                    </svg>
                  </div>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleIconChange}
                />
                <div className="min-w-0 flex-1">
                  <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    アイコン画像（任意）
                  </label>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500">
                    クリックして画像を選択
                  </p>
                </div>
              </div>

              {/* ユーザー名 */}
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  ハンドルネーム <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder={placeholderName}
                  className="w-full rounded-lg border-[0.7px] border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:bg-white dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500 dark:focus:bg-zinc-800"
                />
              </div>

              {/* 推薦コメント */}
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  推薦コメント
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={3}
                  placeholder="公開される可能性があります"
                  className="w-full resize-none rounded-lg border-[0.7px] border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:bg-white dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500 dark:focus:bg-zinc-800"
                />
              </div>

              {/* 応援メッセージ */}
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  開発者への応援メッセージ
                </label>
                <textarea
                  value={secretMessage}
                  onChange={(e) => setSecretMessage(e.target.value)}
                  rows={2}
                  placeholder="一般公開されることはありません"
                  className="w-full resize-none rounded-lg border-[0.7px] border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:bg-white dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500 dark:focus:bg-zinc-800"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              )}

              <button
                type="submit"
                disabled={submitting || !userName.trim()}
                className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {submitting ? '送信中...' : '投稿する'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
