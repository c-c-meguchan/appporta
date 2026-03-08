'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [loadingProvider, setLoadingProvider] = useState<null | 'google' | 'github'>(null);
  const [checking, setChecking] = useState(true);

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
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      {checking ? (
        <span className="text-sm text-zinc-500 dark:text-zinc-400">読み込み中...</span>
      ) : (
      <div className="w-full max-w-md rounded-2xl border-[0.7px] border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="mb-6 text-center text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          ログイン
        </h1>
        <p className="mb-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
          以下のアカウントでサインインしてください。
        </p>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => handleLogin('google')}
            disabled={loadingProvider !== null}
            className="flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-medium text-zinc-900 ring-[0.7px] ring-zinc-200 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-zinc-800 dark:text-zinc-50 dark:ring-zinc-700 dark:hover:bg-zinc-700"
          >
            <span className="h-5 w-5 rounded-full bg-white bg-[radial-gradient(circle_at_30%_30%,#4285F4_0,#4285F4_40%,#34A853_40%,#34A853_60%,#FBBC05_60%,#FBBC05_80%,#EA4335_80%)]" />
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
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-950 text-xs font-bold text-zinc-50 dark:bg-zinc-900 dark:text-zinc-50">
              GH
            </span>
            <span>
              {loadingProvider === 'github' ? 'GitHubで処理中...' : 'GitHubでログイン'}
            </span>
          </button>
        </div>
      </div>
      )}
    </div>
  );
}

