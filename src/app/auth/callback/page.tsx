'use client';

import { use, useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type SearchParamsPromise = Promise<{ [key: string]: string | string[] | undefined }>;

function getParam(
  resolved: { [key: string]: string | string[] | undefined },
  key: string
): string | null {
  const v = resolved[key];
  if (v == null) return null;
  return Array.isArray(v) ? v[0] ?? null : v;
}

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

function AuthCallbackInner({ searchParams }: { searchParams: SearchParamsPromise }) {
  const router = useRouter();
  const resolved = use(searchParams);
  const [status, setStatus] = useState<'exchanging' | 'redirecting' | 'error'>('exchanging');

  useEffect(() => {
    let cancelled = false;
    const nextParam = getParam(resolved, 'next');
    const appId = getParam(resolved, 'app_id');

    async function run() {
      const code = getParam(resolved, 'code');

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
  }, [router, resolved]);

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

type PageProps = { searchParams: SearchParamsPromise };

export default function AuthCallbackPage({ searchParams }: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
          <span className="text-sm text-zinc-500 dark:text-zinc-400">読み込み中...</span>
        </div>
      }
    >
      <AuthCallbackInner searchParams={searchParams} />
    </Suspense>
  );
}
