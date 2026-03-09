'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { AppPageHeader } from '@/components/AppPageHeader';
import { useAppHeaderData } from '@/hooks/useAppHeaderData';
import { useAppChanges } from '@/context/AppChangesContext';
import {
  getMainOriginClient,
  validateAppIdSlug,
} from '@/lib/constants';

const LABEL_CLASS = 'block text-xs font-medium text-zinc-800 dark:text-zinc-200 mb-1';
const BASE_URL = () => `${getMainOriginClient()}/`;

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M21.731 2.269a2.625 2.625 0 0 0-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 0 0 0-3.712ZM19.513 8.199l-3.712-3.712-8.4 8.4a5.25 5.25 0 0 0-1.32 2.214l-.8 2.685a.75.75 0 0 0 .933.933l2.685-.8a5.25 5.25 0 0 0 2.214-1.32l8.4-8.4Z" />
    </svg>
  );
}

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

export default function AppSettingsPage() {
  const params = useParams();
  const appID = typeof params.appID === 'string' ? params.appID : '';
  const {
    isPublished,
    pendingAppId,
    publishing,
    loading,
    onPublish,
    onUnpublish,
    refetch: refetchHeader,
  } = useAppHeaderData(appID);

  const [name, setName] = useState('');
  const [catchCopy, setCatchCopy] = useState('');
  const [iconUrl, setIconUrl] = useState('');
  const [formLoading, setFormLoading] = useState(true);
  const [urlEditMode, setUrlEditMode] = useState(false);
  const [urlSlugInput, setUrlSlugInput] = useState('');
  const [urlSlugError, setUrlSlugError] = useState<string | null>(null);
  const [urlSaving, setUrlSaving] = useState(false);
  const [slugChecking, setSlugChecking] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [localPendingSlug, setLocalPendingSlug] = useState<string | null>(null);
  const appChanges = useAppChanges();

  useEffect(() => {
    setLocalPendingSlug(pendingAppId ?? null);
  }, [pendingAppId]);

  useEffect(() => {
    const effectivePending = pendingAppId ?? localPendingSlug;
    const hasPending = Boolean(effectivePending && effectivePending !== appID);
    appChanges?.setSettingsUrlPending(hasPending);
    appChanges?.setPendingAppId(effectivePending);
  }, [appID, pendingAppId, localPendingSlug, appChanges]);

  const fetchForm = useCallback(async () => {
    if (!appID) return;
    const { data, error } = await supabase
      .from('apps')
      .select('name, catch_copy, icon_url')
      .eq('app_id', appID)
      .maybeSingle();
    if (error) {
      setFormLoading(false);
      return;
    }
    setName(String(data?.name ?? ''));
    setCatchCopy(String(data?.catch_copy ?? ''));
    setIconUrl(String(data?.icon_url ?? ''));
    setFormLoading(false);
  }, [appID]);

  useEffect(() => {
    fetchForm();
  }, [fetchForm]);

  const checkSlugAvailability = useCallback(
    async (trimmed: string) => {
      if (trimmed === appID) {
        setSlugAvailable(true);
        setUrlSlugError(null);
        return;
      }
      setSlugChecking(true);
      setUrlSlugError(null);
      const { data: existing } = await supabase
        .from('apps')
        .select('app_id')
        .eq('app_id', trimmed)
        .maybeSingle();
      setSlugChecking(false);
      const available = !existing;
      setSlugAvailable(available);
      if (!available) {
        setUrlSlugError('このアプリIDはすでに使用されています。別のIDを選んでください。');
      }
    },
    [appID]
  );

  useEffect(() => {
    if (!urlEditMode) return;
    const trimmed = urlSlugInput.trim().toLowerCase();
    const validation = validateAppIdSlug(trimmed);
    if (!validation.valid) {
      setSlugAvailable(null);
      setUrlSlugError(validation.error);
      return;
    }
    setUrlSlugError(null);
    const t = setTimeout(() => {
      checkSlugAvailability(trimmed);
    }, 400);
    return () => clearTimeout(t);
  }, [urlEditMode, urlSlugInput, checkSlugAvailability]);

  const currentPublicUrl = `${getMainOriginClient()}/${appID}`;
  const effectiveSlug = pendingAppId ?? appID;
  const effectivePending = pendingAppId ?? localPendingSlug;
  const pendingUrl = effectivePending ? `${getMainOriginClient()}/${effectivePending}` : null;
  const hasPendingUrlChange = Boolean(effectivePending && effectivePending !== appID);

  const handleSaveUrl = useCallback(async () => {
    const trimmed = urlSlugInput.trim().toLowerCase();
    const validation = validateAppIdSlug(trimmed);
    if (!validation.valid) {
      setUrlSlugError(validation.error);
      return;
    }
    if (trimmed === appID) {
      setUrlSlugError(null);
      setUrlEditMode(false);
      await supabase.from('apps').update({ pending_app_id: null }).eq('app_id', appID);
      refetchHeader();
      return;
    }
    const { data: existing } = await supabase
      .from('apps')
      .select('app_id')
      .eq('app_id', trimmed)
      .maybeSingle();
    if (existing) {
      setUrlSlugError('このアプリIDはすでに使用されています。別のIDを選んでください。');
      return;
    }
    setUrlSlugError(null);
    setUrlSaving(true);
    const { error } = await supabase
      .from('apps')
      .update({ pending_app_id: trimmed })
      .eq('app_id', appID);
    setUrlSaving(false);
    if (error) {
      setUrlSlugError('保存に失敗しました。');
      return;
    }
    setLocalPendingSlug(trimmed);
    await refetchHeader();
    setUrlEditMode(false);
  }, [appID, urlSlugInput, refetchHeader]);

  const handleResetUrl = useCallback(async () => {
    setUrlSaving(true);
    await supabase.from('apps').update({ pending_app_id: null }).eq('app_id', appID);
    setLocalPendingSlug(null);
    refetchHeader();
    setUrlSaving(false);
    setUrlEditMode(false);
    setUrlSlugError(null);
  }, [appID, refetchHeader]);

  const startUrlEdit = useCallback(() => {
    setUrlSlugInput(pendingAppId ?? appID);
    setUrlSlugError(null);
    setSlugAvailable(null);
    setSlugChecking(false);
    setUrlEditMode(true);
  }, [appID, pendingAppId]);

  const cancelUrlEdit = useCallback(() => {
    setUrlEditMode(false);
    setUrlSlugError(null);
    setSlugAvailable(null);
    setSlugChecking(false);
  }, []);

  const displayUrl = hasPendingUrlChange ? (pendingUrl ?? currentPublicUrl) : currentPublicUrl;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <AppPageHeader
        appID={appID}
        isPublished={isPublished}
        onPublish={onPublish}
        onUnpublish={onUnpublish}
        publishing={publishing}
      />
      <div className="mx-auto max-w-2xl px-4 py-8">
        {loading ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">読み込み中...</p>
        ) : (
          <>
            <h1 className="mb-6 flex flex-wrap items-center gap-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              ページ設定
              {hasPendingUrlChange && (
                <span className="inline-flex items-center rounded-md bg-orange-500 px-2 py-0.5 text-xs font-medium text-white">
                  URL変更予定
                </span>
              )}
            </h1>
            {formLoading ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">読み込み中...</p>
            ) : (
              <div className="space-y-6">
                <div>
                  <label className={LABEL_CLASS}>公開URL</label>
                  <div className="mt-1 overflow-hidden transition-[max-height,opacity] duration-200 ease-out">
                    {urlEditMode ? (
                      <div key="url-edit" className="animate-url-block-in">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                            <span className="text-sm text-zinc-600 dark:text-zinc-400">{BASE_URL()}</span>
                            <div className="relative flex items-center">
                              <input
                                type="text"
                                value={urlSlugInput}
                                onChange={(e) => {
                                  setUrlSlugInput(e.target.value.toLowerCase());
                                  setUrlSlugError(null);
                                  setSlugAvailable(null);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    void handleSaveUrl();
                                  }
                                }}
                                placeholder="my-app"
                                className="max-w-[12rem] rounded-lg bg-zinc-100 py-2 pl-3 pr-8 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-500 focus:bg-zinc-200 focus:ring-[0.7px] focus:ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder:text-zinc-400 dark:focus:bg-zinc-700 dark:focus:ring-zinc-600"
                                aria-label="公開URLのスラッグ"
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
                          <span className="flex shrink-0 items-center gap-2">
                            <button
                              type="button"
                              onClick={handleSaveUrl}
                              disabled={urlSaving}
                              className="rounded-lg border-[0.7px] border-zinc-300 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-50 transition hover:bg-zinc-800 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                            >
                              {urlSaving ? '保存中...' : '保存'}
                            </button>
                            <button
                              type="button"
                              onClick={cancelUrlEdit}
                              disabled={urlSaving}
                              className="rounded-lg border-[0.7px] border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 transition hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
                            >
                              キャンセル
                            </button>
                          </span>
                        </div>
                        <div
                          className="overflow-hidden transition-[max-height,opacity] duration-200 ease-out"
                          style={{
                            maxHeight: urlSlugError ? 64 : 0,
                            opacity: urlSlugError ? 1 : 0,
                          }}
                        >
                          {urlSlugError && (
                            <p className="pt-1 text-sm text-red-500 dark:text-red-400 animate-url-error-in">
                              {urlSlugError}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div key="url-view" className="animate-url-block-in flex items-center justify-between gap-2">
                        <Link
                          href={displayUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="min-w-0 truncate text-sm text-zinc-600 no-underline hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                        >
                          {displayUrl}
                        </Link>
                        <span className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={startUrlEdit}
                            className="flex items-center gap-1.5 rounded border-[0.7px] border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                            title="編集"
                          >
                            <PencilIcon className="h-3.5 w-3.5" />
                            編集
                          </button>
                          {hasPendingUrlChange && (
                            <button
                              type="button"
                              onClick={handleResetUrl}
                              disabled={urlSaving}
                              className="rounded border-[0.7px] border-amber-400 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800 transition hover:bg-amber-100 disabled:opacity-60 dark:border-amber-600 dark:bg-amber-900/30 dark:text-amber-200 dark:hover:bg-amber-900/50"
                            >
                              元のURLにリセット
                            </button>
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className={LABEL_CLASS}>OGPプレビュー</label>
                  <div className="mt-2 overflow-hidden rounded-lg border-[0.7px] border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800">
                    <div className="flex gap-4">
                      <div className="h-28 w-28 flex-shrink-0 bg-zinc-100 dark:bg-zinc-700">
                        {iconUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={iconUrl}
                            alt=""
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[10px] text-zinc-400 dark:text-zinc-500">
                            画像なし
                          </div>
                        )}
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col justify-center py-3 pr-3">
                        <p className="line-clamp-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          {name || 'ページタイトル'}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">
                          {catchCopy || '説明文がここに表示されます'}
                        </p>
                        <p className="mt-1 truncate text-[11px] text-zinc-400 dark:text-zinc-500">
                          {(() => {
                            try {
                              const url = `${getMainOriginClient()}/${effectiveSlug}`;
                              return url ? new URL(url).hostname : 'example.com';
                            } catch {
                              return 'example.com';
                            }
                          })()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
