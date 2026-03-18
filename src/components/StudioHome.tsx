'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getMainOriginClient, validateAppIdSlug } from '@/lib/constants';
import { Tooltip } from '@/components/Tooltip';

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

type AppRow = {
  app_id: string;
  name: string | null;
  icon_url: string | null;
  is_published: boolean;
  pending_app_id: string | null;
  created_at: string | null;
  last_reflected_at: string | null;
  hasDraft: boolean;
  draftUpdatedAt: string | null;
};

function toMs(iso: string | null | undefined): number {
  if (!iso) return 0;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
}

function sortProjectCards(a: AppRow, b: AppRow): number {
  const aPublished = Boolean(a.is_published);
  const bPublished = Boolean(b.is_published);
  if (aPublished !== bPublished) return aPublished ? -1 : 1;

  const aMs = aPublished
    ? Math.max(toMs(a.last_reflected_at), toMs(a.created_at))
    : Math.max(toMs(a.draftUpdatedAt), toMs(a.created_at));
  const bMs = bPublished
    ? Math.max(toMs(b.last_reflected_at), toMs(b.created_at))
    : Math.max(toMs(b.draftUpdatedAt), toMs(b.created_at));

  return bMs - aMs;
}

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
    if (!showNewModal) return;
    const trimmed = newAppId.trim().toLowerCase();
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
  }, [showNewModal, newAppId, checkSlugAvailability]);

  const handleOpenNewModal = () => {
    setNewAppId('');
    setNewAppName('');
    setNewError(null);
    setAppIdError(null);
    setSlugAvailable(null);
    setSlugChecking(false);
    setShowNewModal(true);
  };

  const handleCloseNewModal = () => {
    if (newLoading) return;
    setShowNewModal(false);
  };

  const handleCreateApp = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setNewError(null);
    setAppIdError(null);

    const trimmedId = newAppId.trim().toLowerCase();
    const trimmedName = newAppName.trim();

    const idValidation = validateAppIdSlug(trimmedId);
    const hasIdError = !idValidation.valid;
    const hasNameError = !trimmedName;

    if (hasIdError) setAppIdError(idValidation.error);
    if (hasNameError) setNewError('アプリ名を入力してください。');
    if (hasIdError || hasNameError) return;

    if (!user) {
      setNewError('ログイン情報の取得に失敗しました。時間をおいて再度お試しください。');
      return;
    }

    const { data: existing } = await supabase
      .from('apps')
      .select('app_id')
      .eq('app_id', trimmedId)
      .maybeSingle();
    if (existing) {
      setAppIdError('このアプリIDはすでに使用されています。別のIDを選んでください。');
      return;
    }

    setNewLoading(true);
    try {

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
        .select('app_id, name, icon_url, is_published, pending_app_id, created_at, last_reflected_at')
        .eq('user_id', u.id)
        .order('created_at', { ascending: false });

      if (appsError) {
        if (!cancelled) {
          console.error(appsError);
          setApps([]);
          setLoading(false);
        }
        return;
      }

      const appList = appsData ?? [];
      const appIds = appList.map((a) => a.app_id);
      const draftAppIds = new Set<string>();
      const draftUpdatedAtByAppId = new Map<string, string>();
      if (appIds.length > 0) {
        const { data: draftRows } = await supabase
          .from('app_edit_drafts')
          .select('app_id, updated_at')
          .in('app_id', appIds);
        (draftRows ?? []).forEach((r) => {
          draftAppIds.add(r.app_id);
          if (r.updated_at) draftUpdatedAtByAppId.set(r.app_id, r.updated_at);
        });
      }

      if (!cancelled) {
        const mapped: AppRow[] = appList.map((app) => ({
          ...app,
          created_at: app.created_at ?? null,
          last_reflected_at: app.last_reflected_at ?? null,
          hasDraft: draftAppIds.has(app.app_id),
          draftUpdatedAt: draftUpdatedAtByAppId.get(app.app_id) ?? null,
        }));
        setApps([...mapped].sort(sortProjectCards));
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
            <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {apps.map((app) => {
                const origin = getMainOriginClient();
                const publicUrl = `${origin}/${app.app_id}`;
                const isPublished = Boolean(app.is_published);
                const hasUnappliedChanges = Boolean(app.pending_app_id && app.pending_app_id !== app.app_id) || Boolean(app.hasDraft);
                const statusDotClass = isPublished
                  ? 'bg-emerald-500 dark:bg-emerald-400'
                  : 'bg-zinc-400 dark:bg-zinc-500';
                const statusTooltip = isPublished ? '公開中' : '非公開';
                return (
                  <li key={app.app_id}>
                    <Link
                      href={`/apps/${app.app_id}/edit`}
                      className="relative flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-4 transition hover:border-zinc-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
                    >
                      {hasUnappliedChanges && (
                        <span className="absolute right-3 top-3 rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-semibold text-white dark:bg-orange-500 dark:text-white">
                          変更あり
                        </span>
                      )}
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800">
                        {app.icon_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={app.icon_url}
                            alt=""
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        <span className={`text-sm font-medium text-zinc-400 dark:text-zinc-500 ${app.icon_url ? 'hidden' : ''}`} aria-hidden>
                          {(app.name || app.app_id).charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-zinc-900 dark:text-zinc-100 pr-16">
                          {app.name || app.app_id}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <Tooltip content={statusTooltip} placement="bottom">
                            <span
                              className={`h-2 w-2 shrink-0 rounded-full ${statusDotClass}`}
                              aria-hidden
                            />
                          </Tooltip>
                          <span className="min-w-0 truncate text-xs text-zinc-500 dark:text-zinc-400" title={publicUrl}>
                            {publicUrl}
                          </span>
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
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
            <form onSubmit={handleCreateApp} className="mt-6 space-y-4">
              <div>
                <label
                  htmlFor="new-app-id"
                  className="mb-1 block text-xs font-medium text-zinc-800 dark:text-zinc-200"
                >
                  appID
                </label>
                <div className="flex min-w-0 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800">
                  <span className="flex shrink-0 items-center border-r border-zinc-200 bg-zinc-100 px-3 py-2 text-xs text-zinc-600 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-400">
                    {getMainOriginClient()}/
                  </span>
                  <div className="relative flex min-w-0 flex-1 items-center">
                    <input
                      id="new-app-id"
                      type="text"
                      value={newAppId}
                      onChange={(e) => {
                        setNewAppId(e.target.value.toLowerCase());
                        setSlugAvailable(null);
                        setAppIdError(null);
                      }}
                      placeholder="your-app-id"
                      className="min-w-0 flex-1 border-0 bg-transparent py-2 pl-3 pr-8 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:ring-0 dark:text-zinc-50 dark:placeholder:text-zinc-500"
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
                </div>
                {appIdError && (
                  <p className="mt-1 text-[11px] text-red-500 dark:text-red-400">
                    {appIdError}
                  </p>
                )}
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
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-500 focus:border-zinc-300 focus:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder:text-zinc-400 dark:focus:border-zinc-600 dark:focus:bg-zinc-700"
                />
                {newError && (
                  <p className="mt-1 text-[11px] text-red-500 dark:text-red-400">
                    {newError}
                  </p>
                )}
              </div>
              <p className="mt-5 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                Freeプランで公開できるのは１アカウントにつき１プロジェクトのみです。
                <br />
                近日提供予定のProプランに加入いただくと、公開数の上限がなくなります。
              </p>
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={handleCloseNewModal}
                  className="flex flex-1 items-center justify-center rounded-lg border-[0.7px] border-zinc-300 bg-white py-2.5 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                  disabled={newLoading}
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={newLoading}
                  className="flex flex-1 items-center justify-center rounded-lg border-[0.7px] border-zinc-900 bg-zinc-900 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
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
