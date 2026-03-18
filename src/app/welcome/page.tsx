'use client';

import { use, useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { validateAppIdSlug } from '@/lib/constants';

const DEVELOPER_ID_REGEX = /^[a-z0-9_-]+$/;

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="30 70"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 0 1 .208 1.04l-9 13.5a.75.75 0 0 1-1.154.114l-6-6a.75.75 0 0 1 1.06-1.06l5.353 5.353 8.493-12.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
    </svg>
  );
}

type SearchParamsPromise = Promise<{ [key: string]: string | string[] | undefined }>;

function getParam(resolved: { [key: string]: string | string[] | undefined }, key: string): string {
  const v = resolved[key];
  if (v == null) return '';
  return Array.isArray(v) ? v[0] ?? '' : v;
}

function WelcomeForm({ searchParams }: { searchParams: SearchParamsPromise }) {
  const router = useRouter();
  const resolved = use(searchParams);
  const appIdFromQuery = getParam(resolved, 'app_id');

  const [appId, setAppId] = useState(appIdFromQuery);
  const [developerId, setDeveloperId] = useState('');
  const [appName, setAppName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [slugChecking, setSlugChecking] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [appIdError, setAppIdError] = useState<string | null>(null);

  const checkSlugAvailability = useCallback(async (trimmed: string) => {
    setSlugChecking(true);
    setAppIdError(null);
    const { data: existing } = await supabase
      .from('apps')
      .select('app_id')
      .eq('app_id', trimmed)
      .maybeSingle();
    setSlugChecking(false);
    const available = !existing;
    setSlugAvailable(available);
    if (!available) {
      setAppIdError('このアプリIDはすでに使用されています。別のIDを選んでください。');
    }
  }, []);

  useEffect(() => {
    setAppId((prev) => appIdFromQuery || prev);
  }, [appIdFromQuery]);

  useEffect(() => {
    const trimmed = appId.trim().toLowerCase();
    const validation = validateAppIdSlug(trimmed);
    if (!validation.valid) {
      setSlugAvailable(null);
      setAppIdError(trimmed.length === 0 ? null : validation.error);
      return;
    }
    setAppIdError(null);
    const t = setTimeout(() => {
      checkSlugAvailability(trimmed);
    }, 400);
    return () => clearTimeout(t);
  }, [appId, checkSlugAvailability]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setAppIdError(null);

    const appIdNormalized = appId.trim().toLowerCase();
    const appIdValidation = validateAppIdSlug(appIdNormalized);
    if (!appIdValidation.valid) {
      setAppIdError(appIdValidation.error);
      return;
    }
    if (!DEVELOPER_ID_REGEX.test(developerId)) {
      setError('開発者IDは小文字英数字・ハイフン・アンダースコアのみ使用できます。');
      return;
    }
    if (!appName.trim()) {
      setError('アプリ名を入力してください。');
      return;
    }

    const { data: existingApp } = await supabase.from('apps').select('app_id').eq('app_id', appIdNormalized).maybeSingle();
    if (existingApp) {
      setAppIdError('このアプリIDはすでに使用されています。別のIDを選んでください。');
      return;
    }

    setLoading(true);
    setChecking(true);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        setError('ログインが必要です。');
        router.push('/login');
        return;
      }

      const { error: insertError } = await supabase.from('apps').insert({
        user_id: user.id,
        app_id: appIdNormalized,
        name: appName.trim(),
      });

      if (insertError) {
        console.error(insertError);
        setError('登録に失敗しました。時間をおいて再度お試しください。');
        setChecking(false);
        setLoading(false);
        return;
      }

      router.push(`/apps/${appIdNormalized}/edit`);
    } finally {
      setChecking(false);
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <div className="w-full max-w-md rounded-2xl border-[0.7px] border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="mb-6 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          ウェルカム
        </h1>
        <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
          アプリIDと開発者IDを設定して登録を完了してください。
        </p>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="app-id" className="mb-1 block text-sm font-medium text-zinc-800 dark:text-zinc-200">
              アプリID
            </label>
            <div className="relative flex items-center">
              <input
                id="app-id"
                type="text"
                value={appId}
                onChange={(e) => {
                  setAppId(e.target.value.toLowerCase());
                  setSlugAvailable(null);
                  setAppIdError(null);
                }}
                placeholder="例: my-first-app"
                className="w-full rounded-lg bg-zinc-100 py-2 pl-3 pr-8 text-sm text-zinc-900 outline-none ring-0 transition placeholder:text-zinc-500 focus:bg-zinc-200 focus:ring-[0.7px] focus:ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder:text-zinc-400 dark:focus:bg-zinc-700 dark:focus:ring-zinc-600"
              />
              <span className="pointer-events-none absolute right-2 flex h-5 w-5 items-center justify-center text-zinc-400 dark:text-zinc-500">
                {slugChecking && (
                  <SpinnerIcon className="h-5 w-5 animate-spin" />
                )}
                {!slugChecking && slugAvailable === true && (
                  <CheckIcon className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
                )}
              </span>
            </div>
            {appIdError && (
              <p className="mt-1 text-xs text-red-500 dark:text-red-400">
                {appIdError}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="developer-id" className="mb-1 block text-sm font-medium text-zinc-800 dark:text-zinc-200">
              開発者ID
            </label>
            <input
              id="developer-id"
              type="text"
              value={developerId}
              onChange={(e) => setDeveloperId(e.target.value)}
              placeholder="例: my-handle"
              className="w-full rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-900 outline-none ring-0 transition placeholder:text-zinc-500 focus:bg-zinc-200 focus:ring-[0.7px] focus:ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder:text-zinc-400 dark:focus:bg-zinc-700 dark:focus:ring-zinc-600"
            />
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              公開プロフィールは appporta.com/@{developerId || '...'} になります（かぶり判定は準備中）。
            </p>
          </div>
          <div>
            <label htmlFor="app-name" className="mb-1 block text-sm font-medium text-zinc-800 dark:text-zinc-200">
              アプリ名
            </label>
            <input
              id="app-name"
              type="text"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              placeholder="例: はじめてのアプリ"
              className="w-full rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-900 outline-none ring-0 transition placeholder:text-zinc-500 focus:bg-zinc-200 focus:ring-[0.7px] focus:ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder:text-zinc-400 dark:focus:bg-zinc-700 dark:focus:ring-zinc-600"
            />
          </div>
          {error && (
            <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-lg border-[0.7px] border-zinc-300 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-50 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70 dark:border-zinc-600 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {loading ? '登録中...' : '登録して編集へ'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function WelcomePage({ searchParams }: { searchParams: SearchParamsPromise }) {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">読み込み中...</div>}>
      <WelcomeForm searchParams={searchParams} />
    </Suspense>
  );
}
