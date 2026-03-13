'use client';

import { use, useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { AppPageHeader } from '@/components/AppPageHeader';
import { Tooltip } from '@/components/Tooltip';
import { useAppChanges } from '@/context/AppChangesContext';
import { useAppHeaderData } from '@/hooks/useAppHeaderData';
import { supabase } from '@/lib/supabase';

type Testimonial = {
  id: string;
  user_icon_url: string | null;
  user_name: string;
  content: string;
  secret_message: string | null;
  is_public: boolean;
  created_at: string;
};

function PinIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="m16 12 2 2v2h-5v6l-1 1-1-1v-6H6v-2l2-2V5H7V3h10v2h-1z" />
    </svg>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M6 22q-.825 0-1.412-.587T4 20V10q0-.825.588-1.412T6 8h1V6q0-2.075 1.463-3.537T12 1t3.538 1.463T17 6v2h1q.825 0 1.413.588T20 10v10q0 .825-.587 1.413T18 22Zm7.413-5.587Q14 15.825 14 15t-.587-1.412T12 13t-1.412.588T10 15t.588 1.413T12 17t1.413-.587M9 8h6V6q0-1.25-.875-2.125T12 3t-2.125.875T9 6z" />
    </svg>
  );
}

function MoreVertIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 20q-.825 0-1.412-.587T10 18t.588-1.412T12 16t1.413.588T14 18t-.587 1.413T12 20m0-6q-.825 0-1.412-.587T10 12t.588-1.412T12 10t1.413.588T14 12t-.587 1.413T12 14m0-6q-.825 0-1.412-.587T10 6t.588-1.412T12 4t1.413.588T14 6t-.587 1.413T12 8" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
    </svg>
  );
}

const MORE_VERT_BUTTON_CLASS =
  'flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300';

const DROPDOWN_CLASS =
  'absolute right-0 top-full z-10 mt-1 min-w-[100px] overflow-hidden rounded-lg border-[0.7px] border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900';

const DELETE_ITEM_CLASS =
  'flex w-full items-center gap-2 px-3 py-2 text-xs text-red-600 transition hover:bg-zinc-50 dark:text-red-400 dark:hover:bg-zinc-800';

export default function AppTestimonialPage() {
  const paramsPromiseRef = useRef<Promise<Record<string, string | string[]> | undefined> | null>(null);
  if (paramsPromiseRef.current === null) {
    const raw = useParams() as Record<string, string | string[]> | Promise<Record<string, string | string[]> | undefined>;
    paramsPromiseRef.current = raw instanceof Promise ? raw : Promise.resolve(raw);
  }
  const params = use(paramsPromiseRef.current);
  const appID = typeof params?.appID === 'string' ? params.appID : '';
  const { isPublished, publishing, loading: headerLoading, onPublish, onUnpublish } = useAppHeaderData(appID);
  const appChanges = useAppChanges();

  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [readReviewIds, setReadReviewIds] = useState<Set<string>>(new Set());
  /** 新着を一件ずつ表示するキュー（先頭から順に表示） */
  const [newItemQueue, setNewItemQueue] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modalMenuOpen, setModalMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const modalMenuRef = useRef<HTMLDivElement>(null);
  /** 新着キューを fetch でセットしたのは初回だけにする（再 fetch で上書きしない） */
  const hasFilledNewItemQueueRef = useRef(false);

  const fetchReadState = useCallback(async (): Promise<Set<string>> => {
    if (!appID) return new Set();
    const { data, error } = await supabase
      .from('review_reads')
      .select('review_id')
      .eq('app_id', appID);
    if (error) return new Set();
    return new Set((data ?? []).map((r: { review_id: string }) => r.review_id));
  }, [appID]);

  const fetchTestimonials = useCallback(async () => {
    if (!appID) return;
    setLoading(true);
    const [reviewsRes, readSet] = await Promise.all([
      supabase
        .from('reviews')
        .select('id, user_icon_url, user_name, content, secret_message, is_public, created_at')
        .eq('app_id', appID)
        .order('created_at', { ascending: false }),
      fetchReadState(),
    ]);

    const { data: list, error } = reviewsRes;
    if (error) {
      console.error(error);
      setTestimonials([]);
      setReadReviewIds(new Set());
      appChanges?.setTestimonialsHasNew(false);
    } else {
      const items = list ?? [];
      setTestimonials(items);
      setReadReviewIds(readSet);
      const hasNew = items.some((t) => !readSet.has(t.id));
      appChanges?.setTestimonialsHasNew(hasNew);
      const unreadIds = items.filter((t) => !readSet.has(t.id)).map((t) => t.id);
      if (!hasFilledNewItemQueueRef.current) {
        setNewItemQueue(unreadIds);
        hasFilledNewItemQueueRef.current = true;
      }
    }
    setLoading(false);
  }, [appID, fetchReadState, appChanges]);

  /** 一覧を閉じたとき（ページ離脱時）に表示中の全件を既読にする */
  const testimonialsRef = useRef<Testimonial[]>([]);
  const appIDRef = useRef<string>(appID);
  testimonialsRef.current = testimonials;
  appIDRef.current = appID;

  useEffect(() => {
    return () => {
      const list = testimonialsRef.current;
      const id = appIDRef.current;
      if (!id || list.length === 0) return;
      list.forEach((t) => {
        void supabase
          .from('review_reads')
          .upsert(
            { app_id: id, review_id: t.id, read_at: new Date().toISOString() },
            { onConflict: 'app_id,review_id' }
          );
      });
    };
  }, []);

  useEffect(() => {
    fetchTestimonials();
  }, [fetchTestimonials]);

  const pendingChanges = appChanges?.pendingTestimonialChanges ?? new Map<string, boolean>();

  const getEffectivePublic = (t: Testimonial) =>
    pendingChanges.has(t.id) ? pendingChanges.get(t.id)! : t.is_public;

  const togglePublic = (id: string) => {
    const item = testimonials.find((t) => t.id === id);
    if (!item) return;
    const effective = getEffectivePublic(item);
    const newValue = !effective;
    if (newValue === item.is_public) {
      appChanges?.unstageTestimonialChange(id);
    } else {
      appChanges?.stageTestimonialChange(id, newValue);
    }
  };

  useEffect(() => {
    if (!menuOpenId && !modalMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuOpenId && menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null);
      }
      if (modalMenuOpen && modalMenuRef.current && !modalMenuRef.current.contains(e.target as Node)) {
        setModalMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpenId, modalMenuOpen]);

  const handleDelete = async (id: string) => {
    if (!confirm('この投稿を削除しますか？')) return;
    setMenuOpenId(null);
    setModalMenuOpen(false);
    setExpandedId(null);

    setTestimonials((prev) => prev.filter((t) => t.id !== id));
    appChanges?.unstageTestimonialChange(id);
    const { error } = await supabase.from('reviews').delete().eq('id', id);
    if (error) {
      console.error(error);
      fetchTestimonials();
    }
  };

  const publicCount = testimonials.filter((t) => getEffectivePublic(t)).length;
  const expandedItem = expandedId ? testimonials.find((t) => t.id === expandedId) ?? null : null;
  const newItemCurrent = newItemQueue.length > 0 ? testimonials.find((t) => t.id === newItemQueue[0]) ?? null : null;

  const markReviewAsReadAndNext = useCallback(
    (reviewId: string) => {
      if (!appID) return;
      void supabase
        .from('review_reads')
        .upsert(
          { app_id: appID, review_id: reviewId, read_at: new Date().toISOString() },
          { onConflict: 'app_id,review_id' }
        );
      setReadReviewIds((prev) => new Set(prev).add(reviewId));
      setNewItemQueue((prev) => {
        const next = prev.slice(1);
        appChanges?.setTestimonialsHasNew(next.length > 0);
        return next;
      });
    },
    [appID, appChanges]
  );

  const handleNewItemPublish = useCallback(async () => {
    if (!newItemCurrent || !appID) return;
    const id = newItemCurrent.id;
    // 掲載操作前に既読＋キュー更新して、このアイテムを新着から外す
    markReviewAsReadAndNext(id);
    const { error } = await supabase.from('reviews').update({ is_public: true }).eq('id', id);
    if (error) {
      console.error(error);
      return;
    }
    setTestimonials((prev) => prev.map((t) => (t.id === id ? { ...t, is_public: true } : t)));
  }, [newItemCurrent, appID, markReviewAsReadAndNext]);

  const handleNewItemReadAndNext = useCallback(() => {
    if (!newItemCurrent) return;
    markReviewAsReadAndNext(newItemCurrent.id);
  }, [newItemCurrent, markReviewAsReadAndNext]);

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
        {headerLoading || loading ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">読み込み中...</p>
        ) : (
          <>
            <div className="mb-6 flex items-center justify-between">
              <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                ユーザーの声
              </h1>
              <span className="text-xs text-zinc-400 dark:text-zinc-500">
                {publicCount} / {testimonials.length} 件を公開中
              </span>
            </div>

            {testimonials.length === 0 ? (
              <div className="rounded-xl border-[0.7px] border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  まだユーザーの声はありません。
                </p>
                <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                  公開ページの「ユーザーの声を投稿」ボタンから投稿が届きます。
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2.5">
                {testimonials.map((t) => {
                  const isPublic = getEffectivePublic(t);
                  const hasPendingChange = pendingChanges.has(t.id);
                  const isNew = !readReviewIds.has(t.id);
                  return (
                    <div
                      key={t.id}
                      className="relative rounded-xl border-[0.7px] border-zinc-200 bg-white px-3 py-5 transition hover:border-zinc-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
                    >
                      <div className="absolute right-1.5 top-1.5 flex items-center">
                        {isNew && (
                          <span className="mr-1 rounded-full bg-sky-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                            新着
                          </span>
                        )}
                        <Tooltip content={isPublic ? '公開ページから取り下げ' : '公開ページに掲載'}>
                          <button
                            type="button"
                            onClick={() => togglePublic(t.id)}
                            className={`flex h-7 w-7 items-center justify-center rounded-md transition ${
                              isPublic
                                ? 'bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50'
                                : 'text-zinc-300 hover:bg-zinc-100 hover:text-zinc-500 dark:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-400'
                            }`}
                          >
                            <PinIcon className="h-4 w-4" />
                            {hasPendingChange && (
                              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-orange-500 dark:bg-orange-400" />
                            )}
                          </button>
                        </Tooltip>
                        <div className="relative" ref={menuOpenId === t.id ? menuRef : undefined}>
                          <button
                            type="button"
                            onClick={() => setMenuOpenId(menuOpenId === t.id ? null : t.id)}
                            className={MORE_VERT_BUTTON_CLASS}
                          >
                            <MoreVertIcon className="h-4 w-4" />
                          </button>
                          {menuOpenId === t.id && (
                            <div className={DROPDOWN_CLASS}>
                              <button type="button" onClick={() => handleDelete(t.id)} className={DELETE_ITEM_CLASS}>
                                削除
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setExpandedId(t.id)}
                        className="flex w-full flex-col items-center text-center"
                      >
                        {t.user_icon_url ? (
                          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={t.user_icon_url}
                              alt=""
                              className="h-full w-full object-cover"
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                          </div>
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                            <span className="text-sm font-medium text-zinc-400 dark:text-zinc-500">
                              {t.user_name.charAt(0)}
                            </span>
                          </div>
                        )}

                        <span className="mt-1.5 text-xs font-bold text-zinc-900 dark:text-zinc-50">
                          {t.user_name}
                        </span>

                        {t.content && (
                          <p className="mt-1.5 line-clamp-3 whitespace-pre-wrap text-xs leading-relaxed text-zinc-900 dark:text-zinc-100">
                            {t.content}
                          </p>
                        )}

                        {t.secret_message && (
                          <div className="mt-2 flex w-full items-start gap-1.5 rounded-md bg-zinc-100 px-2 py-2 text-left dark:bg-zinc-800">
                            <LockIcon className="mt-0.5 h-3 w-3 shrink-0 text-zinc-400 dark:text-zinc-500" />
                            <p className="line-clamp-2 whitespace-pre-wrap text-xs text-zinc-600 dark:text-zinc-300">
                              {t.secret_message}
                            </p>
                          </div>
                        )}

                        <p className="mt-2 text-[11px] text-zinc-400 dark:text-zinc-500">
                          {new Date(t.created_at).toLocaleDateString('ja-JP')}
                        </p>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* 新着モーダル: ピンなし・下に「掲載する」「既読にして次へ」 */}
      {newItemCurrent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setNewItemQueue([])}
        >
          <div
            className="relative mx-4 w-full max-w-md rounded-2xl border-[0.7px] border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute right-3 top-3 flex items-center gap-1">
              <span className="rounded-full bg-sky-500 px-2 py-0.5 text-xs font-semibold text-white">新着</span>
              <button
                type="button"
                onClick={() => setNewItemQueue([])}
                className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                aria-label="閉じる"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-col items-center pt-2 text-center">
              {newItemCurrent.user_icon_url ? (
                <div className="h-14 w-14 overflow-hidden rounded-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={newItemCurrent.user_icon_url} alt="" className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <span className="text-lg font-medium text-zinc-400 dark:text-zinc-500">
                    {newItemCurrent.user_name.charAt(0)}
                  </span>
                </div>
              )}

              <span className="mt-2 text-sm font-bold text-zinc-900 dark:text-zinc-50">
                {newItemCurrent.user_name}
              </span>

              {newItemCurrent.content && (
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-900 dark:text-zinc-100">
                  {newItemCurrent.content}
                </p>
              )}

              {newItemCurrent.secret_message && (
                <div className="mt-4 flex w-full items-start gap-2 rounded-lg bg-zinc-100 px-3 py-3 text-left dark:bg-zinc-800">
                  <LockIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-400 dark:text-zinc-500" />
                  <p className="whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-300">
                    {newItemCurrent.secret_message}
                  </p>
                </div>
              )}

              <p className="mt-3 text-xs text-zinc-400 dark:text-zinc-500">
                {new Date(newItemCurrent.created_at).toLocaleDateString('ja-JP')}
              </p>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={handleNewItemReadAndNext}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border-[0.7px] border-zinc-300 bg-white py-2.5 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
              >
                既読にして次へ
              </button>
              <button
                type="button"
                onClick={handleNewItemPublish}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border-[0.7px] border-blue-600 bg-blue-600 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 dark:border-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                <PinIcon className="h-5 w-5 shrink-0" />
                掲載する
              </button>
            </div>
          </div>
        </div>
      )}

      {expandedItem && !newItemCurrent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setExpandedId(null)}>
          <div
            className="relative mx-4 w-full max-w-md rounded-2xl border-[0.7px] border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute right-3 top-3 flex items-center gap-1">
              {!readReviewIds.has(expandedItem.id) && (
                <span className="rounded-full bg-sky-500 px-2 py-0.5 text-xs font-semibold text-white">
                  新着
                </span>
              )}
              <Tooltip content={getEffectivePublic(expandedItem) ? '公開ページから取り下げ' : '公開ページに掲載'}>
                <button
                  type="button"
                  onClick={() => togglePublic(expandedItem.id)}
                  className={`relative flex h-8 w-8 items-center justify-center rounded-md transition ${
                    getEffectivePublic(expandedItem)
                      ? 'bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50'
                      : 'text-zinc-300 hover:bg-zinc-100 hover:text-zinc-500 dark:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-400'
                  }`}
                >
                  <PinIcon className="h-[18px] w-[18px]" />
                  {pendingChanges.has(expandedItem.id) && (
                    <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-orange-500 dark:bg-orange-400" />
                  )}
                </button>
              </Tooltip>
              <div className="relative" ref={modalMenuRef}>
                <button
                  type="button"
                  onClick={() => setModalMenuOpen(!modalMenuOpen)}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                >
                  <MoreVertIcon className="h-4 w-4" />
                </button>
                {modalMenuOpen && (
                  <div className={DROPDOWN_CLASS}>
                    <button type="button" onClick={() => handleDelete(expandedItem.id)} className={DELETE_ITEM_CLASS}>
                      削除
                    </button>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setExpandedId(null)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                aria-label="閉じる"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-col items-center pt-2 text-center">
              {expandedItem.user_icon_url ? (
                <div className="h-14 w-14 overflow-hidden rounded-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={expandedItem.user_icon_url} alt="" className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <span className="text-lg font-medium text-zinc-400 dark:text-zinc-500">
                    {expandedItem.user_name.charAt(0)}
                  </span>
                </div>
              )}

              <span className="mt-2 text-sm font-bold text-zinc-900 dark:text-zinc-50">
                {expandedItem.user_name}
              </span>

              {expandedItem.content && (
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-900 dark:text-zinc-100">
                  {expandedItem.content}
                </p>
              )}

              {expandedItem.secret_message && (
                <div className="mt-4 flex w-full items-start gap-2 rounded-lg bg-zinc-100 px-3 py-3 text-left dark:bg-zinc-800">
                  <LockIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-400 dark:text-zinc-500" />
                  <p className="whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-300">
                    {expandedItem.secret_message}
                  </p>
                </div>
              )}

              <p className="mt-3 text-xs text-zinc-400 dark:text-zinc-500">
                {new Date(expandedItem.created_at).toLocaleDateString('ja-JP')}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
