'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

type IdentityInfo = {
  provider: 'google' | 'github' | string;
  email?: string;
  name?: string;
  avatar_url?: string;
};

const CARD_CLASS_CONNECTED =
  'flex gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-800/50';
const CARD_CLASS_UNCONNECTED =
  'flex gap-3 rounded-lg border border-dashed border-zinc-300 bg-white px-3 py-2.5 dark:border-zinc-600 dark:bg-zinc-900';

function CheckIcon() {
  return (
    <span className="flex shrink-0 items-center text-emerald-600 dark:text-emerald-400" aria-hidden>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path
          fillRule="evenodd"
          d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z"
          clipRule="evenodd"
        />
      </svg>
    </span>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [identities, setIdentities] = useState<IdentityInfo[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadUser() {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (error || !user) {
        setLoadingUser(false);
        router.replace('/login');
        return;
      }

      setEmail(user.email ?? null);

      type RawIdentity = { provider: string; identity_data?: Record<string, unknown> };
      const rawIdentities: RawIdentity[] = (user as { identities?: RawIdentity[] }).identities ?? [];
      const mapped: IdentityInfo[] = rawIdentities.map((id) => {
        const d = id.identity_data ?? {};
        return {
          provider: id.provider as IdentityInfo['provider'],
          email: (d.email as string) ?? user.email ?? undefined,
          name:
            (d.full_name as string) ?? (d.name as string) ?? (d.user_name as string) ?? undefined,
          avatar_url:
            (d.avatar_url as string) ?? (d.picture as string) ?? (user.user_metadata?.avatar_url as string) ?? undefined,
        };
      });

      setIdentities(mapped);

      // 表示用の名前・アイコン（GitHub があれば GitHub 優先、なければ user_metadata）
      const gh = mapped.find((i) => i.provider === 'github');
      if (gh) {
        setAvatarUrl(gh.avatar_url ?? null);
        setDisplayName(gh.name ?? gh.email ?? null);
      } else {
        const meta = user.user_metadata as { avatar_url?: string; full_name?: string; name?: string } | undefined;
        setAvatarUrl(meta?.avatar_url ?? null);
        setDisplayName(meta?.full_name ?? meta?.name ?? user.email ?? null);
      }

      setLoadingUser(false);
    }

    void loadUser();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const googleIdentity = useMemo(
    () => identities.find((i) => i.provider === 'google') ?? null,
    [identities]
  );
  const githubIdentity = useMemo(
    () => identities.find((i) => i.provider === 'github') ?? null,
    [identities]
  );

  // アイコン・名前の表示元（GitHub 認証済みなら常に GitHub、なければ認証元）
  const iconNameSourceBadge = useMemo(() => {
    if (githubIdentity) return 'GitHub連携済み';
    if (googleIdentity) return 'Google連携済み';
    return null;
  }, [googleIdentity, githubIdentity]);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await supabase.auth.signOut();
    } finally {
      router.replace('/');
      setLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-8 dark:bg-zinc-950">
      <div className="mx-auto max-w-2xl">
        <nav className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
          <Link href="/apps" className="hover:underline">
            ホーム
          </Link>
          <span className="mx-2">/</span>
          <span className="text-zinc-800 dark:text-zinc-200">設定</span>
        </nav>
        <h1 className="mb-4 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          設定
        </h1>

        {loadingUser ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">アカウント情報を読み込み中...</p>
        ) : (
          <div className="space-y-6">
            <section className="rounded-xl bg-white p-4 dark:bg-zinc-900">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  アカウント情報
                </h2>
                {iconNameSourceBadge && (
                  <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                    {iconNameSourceBadge}
                  </span>
                )}
              </div>
              <dl className="mt-3 space-y-4 text-sm">
                <div>
                  <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">アイコン</dt>
                  <dd className="mt-1">
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={avatarUrl}
                        alt=""
                        width={48}
                        height={48}
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    ) : (
                      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-zinc-300 text-base font-medium text-zinc-600 dark:bg-zinc-600 dark:text-zinc-300">
                        {(displayName ?? '?').charAt(0).toUpperCase()}
                      </span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">名前</dt>
                  <dd className="mt-1 text-zinc-900 dark:text-zinc-100">{displayName ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">メールアドレス</dt>
                  <dd className="mt-1 font-mono text-zinc-900 dark:text-zinc-100">{email ?? '—'}</dd>
                </div>
              </dl>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="mt-4 inline-flex items-center justify-center rounded-lg border border-red-500 bg-white px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-70 dark:border-red-400 dark:bg-transparent dark:text-red-400 dark:hover:bg-red-950/30"
              >
                {loggingOut ? 'ログアウト中...' : 'ログアウト'}
              </button>
            </section>

            <section className="rounded-xl bg-white p-4 dark:bg-zinc-900">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                連携中のログインサービス
              </h2>
              <div className="mt-3 space-y-3 text-sm">
                <div className={googleIdentity ? CARD_CLASS_CONNECTED : CARD_CLASS_UNCONNECTED}>
                  {googleIdentity ? <CheckIcon /> : null}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Google</p>
                    <p className="mt-1 text-zinc-900 dark:text-zinc-100">
                      {googleIdentity
                        ? `接続済み (${googleIdentity.email ?? 'メールアドレス不明'})`
                        : '未接続'}
                    </p>
                  </div>
                </div>
                <div className={githubIdentity ? CARD_CLASS_CONNECTED : CARD_CLASS_UNCONNECTED}>
                  {githubIdentity ? <CheckIcon /> : null}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">GitHub</p>
                    <p className="mt-1 text-zinc-900 dark:text-zinc-100">
                      {githubIdentity
                        ? `接続済み (${githubIdentity.name ?? githubIdentity.email ?? 'アカウント名不明'})`
                        : '未接続'}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
