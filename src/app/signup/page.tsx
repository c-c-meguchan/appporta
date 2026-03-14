'use client';

import { use, useState, Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getMainOriginClient } from '@/lib/constants';
import { GoogleIcon, GitHubIcon } from '@/components/AuthProviderIcons';

type SearchParamsPromise = Promise<{ [key: string]: string | string[] | undefined }>;

function SignupForm({ searchParams }: { searchParams: SearchParamsPromise }) {
  const router = useRouter();
  const resolved = use(searchParams);
  const appIdFromQuery = (resolved?.app_id && (Array.isArray(resolved.app_id) ? resolved.app_id[0] : resolved.app_id)) ?? '';
  const [loadingProvider, setLoadingProvider] = useState<null | 'google' | 'github'>(null);
  const [checking, setChecking] = useState(true);
  const [topHref, setTopHref] = useState('/');

  useEffect(() => {
    setTopHref(getMainOriginClient() + '/');
  }, []);

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
    <div className="relative min-h-screen bg-zinc-50 px-4 dark:bg-black">
      <Link
        href={topHref}
        className="absolute left-4 top-4 text-base font-semibold text-zinc-900 hover:text-zinc-700 dark:text-zinc-50 dark:hover:text-zinc-200"
      >
        App Porta
      </Link>
      <div className="flex min-h-screen items-center justify-center">
      {checking ? (
        <div className="text-sm text-zinc-500 dark:text-zinc-400">読み込み中...</div>
      ) : (
      <div className="w-full max-w-md rounded-2xl border-[0.7px] border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="mb-3 text-center text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          サインアップ
        </h1>
        <p className="mb-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
          認証に利用するサービスを選択してください
        </p>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => handleSignup('google')}
            disabled={loadingProvider !== null}
            className="flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-medium text-zinc-900 ring-[0.7px] ring-zinc-200 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-zinc-800 dark:text-zinc-50 dark:ring-zinc-700 dark:hover:bg-zinc-700"
          >
            <GoogleIcon className="h-5 w-5 shrink-0" />
            <span>{loadingProvider === 'google' ? '処理中...' : 'Googleでサインアップ'}</span>
          </button>
          <button
            type="button"
            onClick={() => handleSignup('github')}
            disabled={loadingProvider !== null}
            className="flex items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-3 text-sm font-medium text-zinc-50 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            <GitHubIcon className="h-5 w-5 shrink-0 text-zinc-50 dark:text-zinc-900" />
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
    </div>
  );
}

export default function SignupPage({ searchParams }: { searchParams: SearchParamsPromise }) {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">読み込み中...</div>}>
      <SignupForm searchParams={searchParams} />
    </Suspense>
  );
}
