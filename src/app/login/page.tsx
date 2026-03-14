'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getMainOriginClient } from '@/lib/constants';
import { GoogleIcon, GitHubIcon } from '@/components/AuthProviderIcons';

export default function LoginPage() {
  const router = useRouter();
  const [loadingProvider, setLoadingProvider] = useState<null | 'google' | 'github'>(null);
  const [checking, setChecking] = useState(true);
  const [topHref, setTopHref] = useState('/');

  useEffect(() => {
    setTopHref(getMainOriginClient() + '/');
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) {
        setChecking(false);
        return;
      }
      const { data: apps } = await supabase
        .from('apps')
        .select('app_id')
        .eq('user_id', user.id)
        .limit(1);
      if (cancelled) return;
      const target = apps && apps.length > 0 ? '/apps' : '/welcome';
      router.replace(target);
    })();
    return () => { cancelled = true; };
  }, [router]);

  const handleLogin = async (provider: 'google' | 'github') => {
    try {
      setLoadingProvider(provider);

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        console.error(error);
        alert('ログインに失敗しました。時間をおいて再度お試しください。');
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
        <span className="text-sm text-zinc-500 dark:text-zinc-400">読み込み中...</span>
      ) : (
      <div className="w-full max-w-md rounded-2xl border-[0.7px] border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="mb-3 text-center text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          ログイン
        </h1>
        <p className="mb-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
          認証に利用するサービスを選択してください
        </p>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => handleLogin('google')}
            disabled={loadingProvider !== null}
            className="flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-medium text-zinc-900 ring-[0.7px] ring-zinc-200 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-zinc-800 dark:text-zinc-50 dark:ring-zinc-700 dark:hover:bg-zinc-700"
          >
            <GoogleIcon className="h-5 w-5 shrink-0" />
            <span>
              {loadingProvider === 'google' ? 'Googleで処理中...' : 'Googleでログイン'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleLogin('github')}
            disabled={loadingProvider !== null}
            className="flex items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-3 text-sm font-medium text-zinc-50 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            <GitHubIcon className="h-5 w-5 shrink-0 text-zinc-50 dark:text-zinc-900" />
            <span>
              {loadingProvider === 'github' ? 'GitHubで処理中...' : 'GitHubでログイン'}
            </span>
          </button>
        </div>
        <p className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
          アカウントをお持ちでない場合は{' '}
          <Link href="/signup" className="font-medium text-zinc-800 underline dark:text-zinc-200">
            サインアップ
          </Link>
        </p>
      </div>
      )}
      </div>
    </div>
  );
}
