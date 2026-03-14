'use client';

import { use, useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const APP_ID_REGEX = /^[a-z0-9-]+$/;
const DEVELOPER_ID_REGEX = /^[a-z0-9_-]+$/;

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

  useEffect(() => {
    setAppId((prev) => appIdFromQuery || prev);
  }, [appIdFromQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!APP_ID_REGEX.test(appId)) {
      setError('アプリIDは小文字英数字とハイフンのみ使用できます。');
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

    setLoading(true);
    setChecking(true);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        setError('ログインが必要です。');
        router.push('/login');
        return;
      }

      const { data: existingApp } = await supabase.from('apps').select('app_id').eq('app_id', appId).maybeSingle();
      if (existingApp) {
        setError('このアプリIDはすでに使用されています。別のIDを選んでください。');
        setChecking(false);
        setLoading(false);
        return;
      }

      const { error: insertError } = await supabase.from('apps').insert({
        user_id: user.id,
        app_id: appId,
        name: appName.trim(),
      });

      if (insertError) {
        console.error(insertError);
        setError('登録に失敗しました。時間をおいて再度お試しください。');
        setChecking(false);
        setLoading(false);
        return;
      }

      router.push(`/apps/${appId}/edit`);
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
            <input
              id="app-id"
              type="text"
              value={appId}
              onChange={(e) => setAppId(e.target.value)}
              placeholder="例: my-first-app"
              className="w-full rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-900 outline-none ring-0 transition placeholder:text-zinc-500 focus:bg-zinc-200 focus:ring-[0.7px] focus:ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder:text-zinc-400 dark:focus:bg-zinc-700 dark:focus:ring-zinc-600"
            />
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              小文字英数字とハイフンのみ。公開URLは appporta.com/{appId || '...'} になります。
            </p>
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
