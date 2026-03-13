'use client';

import { use, useRef } from 'react';
import { useParams } from 'next/navigation';
import { AppChangesProvider, useAppChanges } from '@/context/AppChangesContext';
import { getMainOriginClient } from '@/lib/constants';

function UrlChangeConfirmModal() {
  const paramsPromiseRef = useRef<Promise<Record<string, string | string[]> | undefined> | null>(null);
  if (paramsPromiseRef.current === null) {
    const raw = useParams() as Record<string, string | string[]> | Promise<Record<string, string | string[]> | undefined>;
    paramsPromiseRef.current = raw instanceof Promise ? raw : Promise.resolve(raw);
  }
  const params = use(paramsPromiseRef.current);
  const appID = typeof params?.appID === 'string' ? params.appID : '';
  const ctx = useAppChanges();
  if (!ctx) return null;
  const { showUrlConfirm, setShowUrlConfirm, applyUrlChange, applyingUrl, pendingAppId } = ctx;
  if (!showUrlConfirm) return null;

  const origin = getMainOriginClient();
  const urlBefore = `${origin}/${appID}`;
  const urlAfter = pendingAppId ? `${origin}/${pendingAppId}` : '';

  const handleConfirm = async () => {
    const ok = await applyUrlChange();
    if (!ok) {
      const errMsg =
        'URLの変更に失敗しました。別のアプリと重複している可能性があります。';
      alert(errMsg);
    }
  };

  const handleCancel = () => {
    setShowUrlConfirm(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="url-change-confirm-title"
    >
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg dark:bg-zinc-800">
        <h2
          id="url-change-confirm-title"
          className="text-base font-semibold text-zinc-900 dark:text-zinc-100"
        >
          公開URLの変更
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          公開ページのURLを変更してよろしいですか？
        </p>
        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-500">
          変更すると旧URLは30日間新URLにリダイレクトされます。リダイレクトは直前のURLのみ保持され、それ以前のURLは無効になります。
        </p>
        <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900/50">
          <div className="flex flex-col gap-2 text-sm">
            <div>
              <span className="font-medium text-zinc-500 dark:text-zinc-400">変更前</span>
              <p className="mt-0.5 break-all font-medium text-zinc-900 dark:text-zinc-100">
                {urlBefore}
              </p>
            </div>
            <div className="flex items-center justify-center text-zinc-400 dark:text-zinc-500">
              <span
                className="material-symbols-rounded text-[1.25rem] text-inherit"
                aria-hidden
              >
                arrow_cool_down
              </span>
            </div>
            <div>
              <span className="font-medium text-zinc-500 dark:text-zinc-400">変更後</span>
              <p className="mt-0.5 break-all font-medium text-emerald-700 dark:text-emerald-400">
                {urlAfter}
              </p>
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={handleCancel}
            disabled={applyingUrl}
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-600 disabled:opacity-60"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={applyingUrl}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-50 hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {applyingUrl ? '変更中...' : '変更する'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const paramsPromiseRef = useRef<Promise<Record<string, string | string[]> | undefined> | null>(null);
  if (paramsPromiseRef.current === null) {
    const raw = useParams() as Record<string, string | string[]> | Promise<Record<string, string | string[]> | undefined>;
    paramsPromiseRef.current = raw instanceof Promise ? raw : Promise.resolve(raw);
  }
  const params = use(paramsPromiseRef.current);
  const appID = typeof params?.appID === 'string' ? params.appID : '';
  return (
    <AppChangesProvider appID={appID}>
      <UrlChangeConfirmModal />
      {children}
    </AppChangesProvider>
  );
}
