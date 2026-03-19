'use client';

import { use, useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getMainOriginClient, validateAppIdSlug } from '@/lib/constants';
import {
  FORM_ERROR_CLASS,
  FORM_INPUT_CLASS,
  FormLabel,
  PREFIX_INPUT_CLASS,
  PREFIX_INPUT_WRAPPER_CLASS,
  PREFIX_TEXT_CLASS,
} from '@/components/FormField';

const DEVELOPER_ID_REGEX = /^[a-z0-9_-]+$/;

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

type SearchParamsPromise = Promise<{ [key: string]: string | string[] | undefined }>;

function getParam(resolved: { [key: string]: string | string[] | undefined }, key: string): string {
  const v = resolved[key];
  if (v == null) return '';
  return Array.isArray(v) ? v[0] ?? '' : v;
}

function WelcomeForm({ searchParams }: { searchParams: SearchParamsPromise }) {
  const router = useRouter();
  const resolved = use(searchParams);
  const appIdFromQuery = getParam(resolved, 'app_id');

  const [appId, setAppId] = useState(appIdFromQuery);
  const [developerId, setDeveloperId] = useState('');
  const [appName, setAppName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [appNameError, setAppNameError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [slugChecking, setSlugChecking] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [appIdError, setAppIdError] = useState<string | null>(null);
  const [developerChecking, setDeveloperChecking] = useState(false);
  const [developerAvailable, setDeveloperAvailable] = useState<boolean | null>(null);
  const [developerError, setDeveloperError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

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
      setAppIdError('このappIDはすでに使用されています。別のIDを選んでください。');
    }
  }, []);

  const checkDeveloperAvailability = useCallback(
    async (trimmed: string) => {
      setDeveloperChecking(true);
      setDeveloperError(null);
      const { data, error: selectError } = await supabase
        .from('developer_profiles')
        .select('user_id, developer_id')
        .eq('developer_id', trimmed)
        .maybeSingle();

      setDeveloperChecking(false);
      if (selectError) {
        console.error(selectError);
        setDeveloperAvailable(null);
        return;
      }

      if (!data) {
        setDeveloperAvailable(true);
        return;
      }

      if (currentUserId == null) {
        // ユーザーID未取得中は判定を保留（誤った「利用可能」表示を避ける）
        setDeveloperAvailable(null);
        return;
      }

      const takenByOther = data.user_id !== currentUserId;
      if (takenByOther) {
        setDeveloperAvailable(false);
        setDeveloperError('この開発者IDはすでに使用されています。別のIDを選んでください。');
        return;
      }

      // 自分のIDならOK扱い
      setDeveloperAvailable(true);
    },
    [currentUserId]
  );

  useEffect(() => {
    setAppId((prev) => appIdFromQuery || prev);
  }, [appIdFromQuery]);

  useEffect(() => {
    // ログイン情報から開発者IDを初期提案（GitHub login を優先）
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) return;
      setCurrentUserId(user.id);

      // すでに developer_profiles があればそれを優先
      const { data: existingProfile } = await supabase
        .from('developer_profiles')
        .select('developer_id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (cancelled) return;
      if (existingProfile?.developer_id) {
        setDeveloperId((prev) => (prev ? prev : existingProfile.developer_id));
        return;
      }

      // GitHub login / user_name / email などから候補を作る
      const identities = (user as any).identities as { provider: string; identity_data?: Record<string, any> }[] | undefined;
      const github = identities?.find((i) => i.provider === 'github')?.identity_data ?? {};
      const candidateRaw =
        (github as any).user_name ||
        (github as any).login ||
        (user.user_metadata as any)?.user_name ||
        (user.user_metadata as any)?.preferred_username ||
        (user.email ? user.email.split('@')[0] : '');

      const candidate = String(candidateRaw ?? '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9_-]/g, '');

      if (candidate) {
        setDeveloperId((prev) => (prev ? prev : candidate));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const trimmed = appId.trim().toLowerCase();
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
  }, [appId, checkSlugAvailability]);

  useEffect(() => {
    const trimmed = developerId.trim().toLowerCase();
    if (!trimmed) {
      setDeveloperError(null);
      setDeveloperAvailable(null);
      return;
    }
    if (!DEVELOPER_ID_REGEX.test(trimmed)) {
      setDeveloperAvailable(null);
      setDeveloperError('小文字英数字・ハイフン・アンダースコアのみ使用できます。');
      return;
    }
    setDeveloperError(null);
    const t = setTimeout(() => {
      void checkDeveloperAvailability(trimmed);
    }, 400);
    return () => clearTimeout(t);
  }, [developerId, checkDeveloperAvailability]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setAppIdError(null);
    setDeveloperError(null);
    setAppNameError(null);

    const appIdNormalized = appId.trim().toLowerCase();
    const appIdValidation = validateAppIdSlug(appIdNormalized);
    const hasAppIdError = !appIdValidation.valid;
    if (hasAppIdError) setAppIdError(appIdValidation.error);

    const developerNormalized = developerId.trim().toLowerCase();
    const hasDeveloperError = Boolean(developerNormalized) && !DEVELOPER_ID_REGEX.test(developerNormalized);
    if (hasDeveloperError) setDeveloperError('小文字英数字・ハイフン・アンダースコアのみ使用できます。');

    const appNameTrimmed = appName.trim();
    const hasAppNameError = !appNameTrimmed;
    if (hasAppNameError) setAppNameError('アプリ名を入力してください。');

    // 必須（appID / アプリ名）や形式エラーがあればまとめて表示して止める
    if (hasAppIdError || hasAppNameError || hasDeveloperError) return;

    const { data: existingApp } = await supabase.from('apps').select('app_id').eq('app_id', appIdNormalized).maybeSingle();
    if (existingApp) {
      setAppIdError('このappIDはすでに使用されています。別のIDを選んでください。');
      return;
    }

    setLoading(true);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        setError('ログインが必要です。');
        router.push('/login');
        return;
      }

      // 開発者ID（任意）: 入力がある場合のみ、かぶり判定した上で保存/更新
      if (developerNormalized) {
        const { data: taken } = await supabase
          .from('developer_profiles')
          .select('user_id')
          .eq('developer_id', developerNormalized)
          .maybeSingle();
        if (taken && taken.user_id !== user.id) {
          setDeveloperError('この開発者IDはすでに使用されています。別のIDを選んでください。');
          setLoading(false);
          return;
        }

        const { error: upsertError } = await supabase
          .from('developer_profiles')
          .upsert(
            { user_id: user.id, developer_id: developerNormalized, updated_at: new Date().toISOString() },
            { onConflict: 'user_id' }
          );
        if (upsertError) {
          console.error(upsertError);
          setDeveloperError('開発者IDの保存に失敗しました。時間をおいて再度お試しください。');
          setLoading(false);
          return;
        }
      }

      const { error: insertError } = await supabase.from('apps').insert({
        user_id: user.id,
        app_id: appIdNormalized,
        name: appNameTrimmed,
      });

      if (insertError) {
        console.error(insertError);
        setError('登録に失敗しました。時間をおいて再度お試しください。');
        setLoading(false);
        return;
      }

      router.push(`/apps/${appIdNormalized}/edit`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <div className="w-full max-w-md rounded-2xl bg-zinc-100 p-6 shadow-none dark:bg-zinc-900 dark:shadow-xl">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          はじめに
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          appIDと開発者IDを設定して登録を完了してください。
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <FormLabel htmlFor="app-id">appID</FormLabel>
            <div className={PREFIX_INPUT_WRAPPER_CLASS}>
              <span className={PREFIX_TEXT_CLASS}>
                {getMainOriginClient()}/
              </span>
              <div className="relative flex min-w-0 flex-1 items-center">
              <input
                id="app-id"
                type="text"
                value={appId}
                onChange={(e) => {
                  setAppId(e.target.value.toLowerCase());
                  setSlugAvailable(null);
                  setAppIdError(null);
                }}
                placeholder="your-app-id"
                className={PREFIX_INPUT_CLASS}
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
              <p className={FORM_ERROR_CLASS}>
                {appIdError}
              </p>
            )}
          </div>
          <div>
            <FormLabel htmlFor="developer-id" optional>開発者ID</FormLabel>
            <div className={PREFIX_INPUT_WRAPPER_CLASS}>
              <span className={PREFIX_TEXT_CLASS}>
                @
              </span>
              <div className="relative flex min-w-0 flex-1 items-center">
                <input
                  id="developer-id"
                  type="text"
                  value={developerId}
                  onChange={(e) => {
                    setDeveloperId(e.target.value.toLowerCase());
                    setDeveloperAvailable(null);
                    setDeveloperError(null);
                  }}
                  placeholder="my-handle"
                  className={PREFIX_INPUT_CLASS}
                />
                <span className="pointer-events-none absolute right-2 flex h-5 w-5 items-center justify-center text-zinc-400 dark:text-zinc-500">
                  {developerChecking && (
                    <SpinnerIcon className="h-5 w-5 animate-spin" />
                  )}
                  {!developerChecking && developerAvailable === true && developerId.trim() && !developerError && (
                    <CheckIcon className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
                  )}
                </span>
              </div>
            </div>
            {developerError ? (
              <p className={FORM_ERROR_CLASS}>
                {developerError}
              </p>
            ) : null}
          </div>
          <div>
            <FormLabel htmlFor="app-name">アプリ名</FormLabel>
            <input
              id="app-name"
              type="text"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              placeholder="正式名称を入力"
              className={FORM_INPUT_CLASS}
            />
            {appNameError && (
              <p className={FORM_ERROR_CLASS}>
                {appNameError}
              </p>
            )}
          </div>
          {error && (
            <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-lg border-[0.7px] border-zinc-900 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {loading ? '処理中...' : '次へ'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function WelcomePage({ searchParams }: { searchParams: SearchParamsPromise }) {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">読み込み中...</div>}>
      <WelcomeForm searchParams={searchParams} />
    </Suspense>
  );
}
