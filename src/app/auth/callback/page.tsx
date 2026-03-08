'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

/** ログイン後: next 指定があればそれに従い、なければアプリ有無で /welcome か / を返す */
async function resolveRedirectTarget(
  nextParam: string | null,
  appIdParam: string | null
): Promise<string> {
  if (nextParam && (nextParam === '/welcome' || nextParam.startsWith('/welcome'))) {
    const url = nextParam.includes('?') ? nextParam : `${nextParam}`;
    if (appIdParam) {
      return `${url}${url.includes('?') ? '&' : '?'}app_id=${encodeURIComponent(appIdParam)}`;
    }
    return url;
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return '/apps';

  const { data: apps, error: appsError } = await supabase
    .from('apps')
    .select('app_id')
    .eq('user_id', user.id)
    .limit(1);

  if (appsError) return '/apps';
  if (!apps || apps.length === 0) return '/welcome';
  return '/apps';
}

function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'exchanging' | 'redirecting' | 'error'>('exchanging');

  useEffect(() => {
    let cancelled = false;
    const nextParam = searchParams.get('next');
    const appId = searchParams.get('app_id');

    async function run() {
      const code = searchParams.get('code');

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (cancelled) return;
        if (error) {
          console.error('exchangeCodeForSession:', error);
          setStatus('error');
          return;
        }
        const target = await resolveRedirectTarget(nextParam, appId);
        if (cancelled) return;
        setStatus('redirecting');
        router.replace(target);
        return;
      }

      // PKCE でない場合: リダイレクト先に hash でトークンが付くことがある。
      const hasHash = typeof window !== 'undefined' && window.location.hash.length > 0;
      if (hasHash) {
        await new Promise((r) => setTimeout(r, 800));
        if (cancelled) return;
      }
      const target = await resolveRedirectTarget(nextParam, appId);
      if (cancelled) return;
      setStatus('redirecting');
      router.replace(target);
    }

    run();
    return () => { cancelled = true; };
  }, [router, searchParams]);

  if (status === 'error') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-50 dark:bg-black">
        <p className="text-sm text-red-600 dark:text-red-400">認証の処理に失敗しました。</p>
        <a href="/login" className="text-sm text-zinc-600 underline dark:text-zinc-400">
          ログインへ戻る
        </a>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <span className="text-sm text-zinc-500 dark:text-zinc-400">
        {status === 'exchanging' ? '認証を確認しています...' : 'リダイレクトしています...'}
      </span>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
          <span className="text-sm text-zinc-500 dark:text-zinc-400">読み込み中...</span>
        </div>
      }
    >
      <AuthCallbackInner />
    </Suspense>
  );
}
