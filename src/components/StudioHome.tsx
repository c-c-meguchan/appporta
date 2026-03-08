'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type AppRow = { app_id: string; name: string | null };

export default function StudioHome() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email?: string; user_metadata?: { avatar_url?: string; full_name?: string; name?: string } } | null>(null);
  const [apps, setApps] = useState<AppRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // OAuth リダイレクト直後は URL に hash でトークンが付いていることがある。
      // クライアントがセッションを復元するまで少し待ってから getUser する。
      const hasAuthHash =
        typeof window !== 'undefined' &&
        /(#access_token=|#error=)/.test(window.location.hash);
      if (hasAuthHash) {
        await new Promise((r) => setTimeout(r, 600));
        if (cancelled) return;
      }

      const {
        data: { user: u },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !u) {
        if (!cancelled) router.replace('/login');
        return;
      }

      if (!cancelled) {
        setUser({
          id: u.id,
          email: u.email ?? undefined,
          user_metadata: u.user_metadata as { avatar_url?: string; full_name?: string; name?: string } | undefined,
        });
      }

      const { data: appsData, error: appsError } = await supabase
        .from('apps')
        .select('app_id, name')
        .eq('user_id', u.id)
        .order('created_at', { ascending: false });

      if (!cancelled) {
        if (appsError) {
          console.error(appsError);
          setApps([]);
        } else {
          setApps(appsData ?? []);
        }
        setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [router]);

  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email ||
    'ユーザー';
  const avatarUrl = user?.user_metadata?.avatar_url;

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
        <span className="text-sm text-zinc-500 dark:text-zinc-400">読み込み中...</span>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-black">
      {/* 左カラム: ユーザー情報 + ナビ */}
      <aside className="flex w-56 flex-shrink-0 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col gap-4 p-4">
          <Link href="/apps" className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            App Porta Studio
          </Link>
          <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50/50 px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-800/50">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt=""
                width={40}
                height={40}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-zinc-300 text-sm font-medium text-zinc-600 dark:bg-zinc-600 dark:text-zinc-300">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {displayName}
              </p>
              {user.email && (
                <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                  {user.email}
                </p>
              )}
            </div>
          </div>
          <nav className="flex flex-col gap-0.5 text-sm">
            <Link
              href="/settings"
              className="rounded-md px-3 py-2 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            >
              設定
            </Link>
            <Link
              href="/profile"
              className="rounded-md px-3 py-2 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            >
              プロフィール
            </Link>
          </nav>
        </div>
      </aside>

      {/* メイン: プロジェクト一覧 */}
      <main className="flex flex-1 flex-col">
        <header className="border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            プロジェクト一覧
          </h1>
        </header>
        <div className="flex-1 p-6">
          {apps.length === 0 ? (
            <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-zinc-600 dark:text-zinc-400">
                プロジェクトがありません。
              </p>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-500">
                新規作成は準備中です。
              </p>
            </div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {apps.map((app) => (
                <li key={app.app_id}>
                  <Link
                    href={`/apps/${app.app_id}/edit`}
                    className="block rounded-xl border border-zinc-200 bg-white p-4 transition hover:border-zinc-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
                  >
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">
                      {app.name || app.app_id}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      {app.app_id}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
