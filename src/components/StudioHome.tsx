'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

const APP_ID_REGEX = /^[a-z0-9-]+$/;

type AppRow = { app_id: string; name: string | null };

type StudioUser = {
  id: string;
  email?: string;
  user_metadata?: { avatar_url?: string; full_name?: string; name?: string };
  /** 表示用の名前（GitHub があれば GitHub 優先） */
  profileName?: string;
  /** 表示用アイコンURL（GitHub があれば GitHub 優先） */
  fixedAvatarUrl?: string;
};

export default function StudioHome() {
  const router = useRouter();
  const [user, setUser] = useState<StudioUser | null>(null);
  const [apps, setApps] = useState<AppRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newAppId, setNewAppId] = useState('');
  const [newAppName, setNewAppName] = useState('');
  const [newError, setNewError] = useState<string | null>(null);
  const [newLoading, setNewLoading] = useState(false);

  const handleOpenNewModal = () => {
    setNewAppId('');
    setNewAppName('');
    setNewError(null);
    setShowNewModal(true);
  };

  const handleCloseNewModal = () => {
    if (newLoading) return;
    setShowNewModal(false);
  };

  const handleCreateApp = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setNewError(null);

    const trimmedId = newAppId.trim();
    const trimmedName = newAppName.trim();

    if (!APP_ID_REGEX.test(trimmedId)) {
      setNewError('プロジェクトIDは小文字英数字とハイフンのみ使用できます。');
      return;
    }
    if (!trimmedName) {
      setNewError('プロジェクト名を入力してください。');
      return;
    }
    if (!user) {
      setNewError('ログイン情報の取得に失敗しました。時間をおいて再度お試しください。');
      return;
    }

    setNewLoading(true);
    try {
      const { data: existing } = await supabase
        .from('apps')
        .select('app_id')
        .eq('app_id', trimmedId)
        .maybeSingle();

      if (existing) {
        setNewError('このプロジェクトIDはすでに使用されています。別のIDを選んでください。');
        return;
      }

      const { error: insertError } = await supabase.from('apps').insert({
        user_id: user.id,
        app_id: trimmedId,
        name: trimmedName,
      });

      if (insertError) {
        console.error(insertError);
        setNewError('プロジェクトの作成に失敗しました。時間をおいて再度お試しください。');
        return;
      }

      setShowNewModal(false);
      router.push(`/apps/${trimmedId}/edit`);
    } finally {
      setNewLoading(false);
    }
  };

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
        // GitHub 認証があれば GitHub の最新情報を優先して名前・アイコンを採用する。
        const identities = (u as any).identities as { provider: string; identity_data?: Record<string, any> }[] | undefined;
        const githubIdentity = identities?.find((i) => i.provider === 'github');

        let fixedAvatarUrl: string | undefined;
        let profileName: string | undefined;

        if (githubIdentity) {
          const data = githubIdentity.identity_data ?? {};
          fixedAvatarUrl =
            (data as any).avatar_url ||
            (data as any).picture ||
            (u.user_metadata as any)?.avatar_url ||
            undefined;
          profileName =
            (data as any).name ||
            (data as any).full_name ||
            (data as any).user_name ||
            (data as any).login ||
            (u.user_metadata as any)?.full_name ||
            (u.user_metadata as any)?.name ||
            (u.email ?? undefined);
        } else {
          fixedAvatarUrl = (u.user_metadata as any)?.avatar_url || undefined;
          profileName =
            (u.user_metadata as any)?.full_name ||
            (u.user_metadata as any)?.name ||
            (u.email ?? undefined);
        }

        setUser({
          id: u.id,
          email: u.email ?? undefined,
          user_metadata: u.user_metadata as { avatar_url?: string; full_name?: string; name?: string } | undefined,
          profileName,
          fixedAvatarUrl,
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
    user?.profileName ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email ||
    'ユーザー';
  const avatarUrl = user?.fixedAvatarUrl ?? user?.user_metadata?.avatar_url;

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
        <span className="text-sm text-zinc-500 dark:text-zinc-400">読み込み中...</span>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-black">
      {/* 左カラム: ユーザー情報 */}
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
        <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            プロジェクト一覧
          </h1>
          <button
            type="button"
            onClick={handleOpenNewModal}
            className="inline-flex items-center rounded-lg border border-zinc-300 bg-zinc-900 px-3 py-1.5 text-sm font-medium text-zinc-50 shadow-sm transition hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-zinc-600 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 dark:focus-visible:ring-zinc-400 dark:focus-visible:ring-offset-zinc-900"
          >
            新規プロジェクト
          </button>
        </header>
        <div className="flex-1 p-6">
          {apps.length === 0 ? (
            <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-zinc-600 dark:text-zinc-400">
                プロジェクトがありません。
              </p>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-500">
                右上の「新規プロジェクト」から作成できます。
              </p>
              <button
                type="button"
                onClick={handleOpenNewModal}
                className="mt-6 inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-50 shadow-sm transition hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-zinc-600 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 dark:focus-visible:ring-zinc-400 dark:focus-visible:ring-offset-zinc-900"
              >
                新規プロジェクトを作成
              </button>
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
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              新規プロジェクトを作成
            </h2>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              公開URLは appporta.com/
              <span className="font-mono">
                {newAppId || 'your-app-id'}
              </span>
              {' '}になります。
            </p>
            <form onSubmit={handleCreateApp} className="mt-6 space-y-4">
              <div>
                <label
                  htmlFor="new-app-id"
                  className="mb-1 block text-xs font-medium text-zinc-800 dark:text-zinc-200"
                >
                  appID
                </label>
                <div className="flex items-center gap-2 rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  <span className="whitespace-nowrap text-xs text-zinc-500 dark:text-zinc-400">
                    appporta.com/
                  </span>
                  <input
                    id="new-app-id"
                    type="text"
                    value={newAppId}
                    onChange={(e) => setNewAppId(e.target.value)}
                    placeholder="your-app-id"
                    className="min-w-0 flex-1 bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-50 dark:placeholder:text-zinc-500"
                  />
                </div>
                <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                  appID は小文字英数字とハイフンのみ使用できます。
                </p>
              </div>
              <div>
                <label
                  htmlFor="new-app-name"
                  className="mb-1 block text-xs font-medium text-zinc-800 dark:text-zinc-200"
                >
                  アプリ名
                </label>
                <input
                  id="new-app-name"
                  type="text"
                  value={newAppName}
                  onChange={(e) => setNewAppName(e.target.value)}
                  placeholder="正式名称を入力"
                  className="w-full rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-900 outline-none ring-0 transition placeholder:text-zinc-500 focus:bg-zinc-200 focus:ring-[0.7px] focus:ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder:text-zinc-400 dark:focus:bg-zinc-700 dark:focus:ring-zinc-600"
                />
              </div>
              {newError && (
                <p className="text-xs text-red-500 dark:text-red-400">
                  {newError}
                </p>
              )}
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCloseNewModal}
                  className="inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:focus-visible:ring-zinc-500 dark:focus-visible:ring-offset-zinc-900"
                  disabled={newLoading}
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={newLoading}
                  className="inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-zinc-900 px-4 py-1.5 text-xs font-medium text-zinc-50 shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-zinc-600 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 dark:focus-visible:ring-zinc-400 dark:focus-visible:ring-offset-zinc-900"
                >
                  {newLoading ? '作成中...' : '作成して編集へ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
