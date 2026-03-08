'use client';

import { useState, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const appIdFromQuery = searchParams.get('app_id') ?? '';
  const [loadingProvider, setLoadingProvider] = useState<null | 'google' | 'github'>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        const target = appIdFromQuery ? `/welcome?app_id=${encodeURIComponent(appIdFromQuery)}` : '/apps';
        router.replace(target);
      } else {
        setChecking(false);
      }
    });
  }, [router, appIdFromQuery]);

  const handleSignup = async (provider: 'google' | 'github') => {
    try {
      setLoadingProvider(provider);
      const callbackUrl = new URL('/auth/callback', window.location.origin);
      callbackUrl.searchParams.set('next', '/welcome');
      if (appIdFromQuery) callbackUrl.searchParams.set('app_id', appIdFromQuery);

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: callbackUrl.toString() },
      });

      if (error) {
        console.error(error);
        alert('サインアップに失敗しました。時間をおいて再度お試しください。');
      }
    } finally {
      setLoadingProvider(null);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      {checking ? (
        <div className="text-sm text-zinc-500 dark:text-zinc-400">読み込み中...</div>
      ) : (
      <div className="w-full max-w-md rounded-2xl border-[0.7px] border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="mb-6 text-center text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          サインアップ
        </h1>
        <p className="mb-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
          以下のアカウントで登録してください。
        </p>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => handleSignup('google')}
            disabled={loadingProvider !== null}
            className="flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-medium text-zinc-900 ring-[0.7px] ring-zinc-200 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-zinc-800 dark:text-zinc-50 dark:ring-zinc-700 dark:hover:bg-zinc-700"
          >
            <span className="h-5 w-5 rounded-full bg-[radial-gradient(circle_at_30%_30%,#4285F4_0,#4285F4_40%,#34A853_40%,#34A853_60%,#FBBC05_60%,#FBBC05_80%,#EA4335_80%)]" />
            <span>{loadingProvider === 'google' ? '処理中...' : 'Googleでサインアップ'}</span>
          </button>
          <button
            type="button"
            onClick={() => handleSignup('github')}
            disabled={loadingProvider !== null}
            className="flex items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-3 text-sm font-medium text-zinc-50 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-950 text-xs font-bold text-zinc-50 dark:bg-zinc-900 dark:text-zinc-50">GH</span>
            <span>{loadingProvider === 'github' ? '処理中...' : 'GitHubでサインアップ'}</span>
          </button>
        </div>
        <p className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
          すでにアカウントがある場合は{' '}
          <Link href="/login" className="font-medium text-zinc-800 underline dark:text-zinc-200">
            ログイン
          </Link>
        </p>
      </div>
      )}
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">読み込み中...</div>}>
      <SignupForm />
    </Suspense>
  );
}
