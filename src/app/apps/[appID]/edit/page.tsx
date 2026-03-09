'use client';

import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { AppPageView } from '@/components/app-page-view/AppPageView';
import { AppPageHeader } from '@/components/AppPageHeader';
import { ImageUploadInput } from '@/components/ImageUploadInput';
import { Tooltip } from '@/components/Tooltip';
import { useAppChanges } from '@/context/AppChangesContext';
import { type AppFormState, type SectionId, defaultFormState, SECTIONS, type FeaturedItem } from '@/lib/app-edit-types';

const INPUT_CLASS =
  'w-full rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-500 focus:bg-zinc-200 focus:ring-[0.7px] focus:ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder:text-zinc-400 dark:focus:bg-zinc-700 dark:focus:ring-zinc-600';
const LABEL_CLASS =
  'block text-xs font-medium text-zinc-800 dark:text-zinc-200 mb-1';
const SELECT_CLASS = `${INPUT_CLASS} pr-9`;

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}

const VISIBILITY_KEYS: Record<SectionId, keyof AppFormState | null> = {
  hero_header: null,
  app_specs: null,
  version: 'version_visible',
  video: 'video_visible',
  gallery: 'gallery_visible',
  free_text: 'free_text_visible',
  users_voice: 'users_voice_visible',
  featured: 'featured_visible',
  inquiry: 'inquiry_visible',
  developer: null,
  support: 'support_visible',
  footer: null,
};

function parseJsonArray(val: unknown, fallback: any[]): any[] {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try {
      const a = JSON.parse(val);
      return Array.isArray(a) ? a : fallback;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function parseReleaseNotes(val: unknown): { version: string; body: string }[] {
  const a = parseJsonArray(val, []);
  return a.map((x: any) => ({
    version: typeof x?.version === 'string' ? x.version : '',
    body: typeof x?.body === 'string' ? x.body : '',
  }));
}

function parseFeaturedItems(val: unknown): FeaturedItem[] {
  const a = parseJsonArray(val, []);
  return a.map((x: any) => ({
    url: typeof x?.url === 'string' ? x.url : '',
    note: typeof x?.note === 'string' ? x.note : '',
    title: typeof x?.title === 'string' ? x.title : undefined,
    description: typeof x?.description === 'string' ? x.description : undefined,
    image_url: typeof x?.image_url === 'string' ? x.image_url : undefined,
  }));
}

/** 価格をカンマ区切りで表示（保存値はカンマなし） */
function formatPriceDisplay(raw: string): string {
  const s = raw.replace(/,/g, '');
  const [intPart, decPart] = s.split('.');
  if (!intPart) return '';
  const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return decPart !== undefined ? `${formatted}.${decPart}` : formatted;
}

/** 入力から数値のみ抽出（数字と小数点1つまで） */
function parsePriceInput(input: string): string {
  const noComma = input.replace(/,/g, '');
  const match = noComma.match(/^\d*\.?\d*/);
  return match ? match[0] : '';
}

export default function StudioAppEditPage() {
  const params = useParams();
  const router = useRouter();
  const appID = typeof params.appID === 'string' ? params.appID : '';

  const [form, setForm] = useState<AppFormState>(defaultFormState);
  const [focusedSection, setFocusedSection] = useState<SectionId | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const appChanges = useAppChanges();

  useEffect(() => {
    if (dirty) appChanges?.setEditDirty(true);
  }, [dirty, appChanges]);

  const updateForm = useCallback(
    (patch: Partial<AppFormState>) => {
      setForm((prev) => ({ ...prev, ...patch }));
      if (initialized) {
        setDirty(true);
      }
    },
    [initialized]
  );

  const setVisibility = useCallback(
    (key: keyof AppFormState, value: boolean) => {
      if (
        key in defaultFormState &&
        typeof (defaultFormState as Record<string, unknown>)[key] === 'boolean'
      ) {
        updateForm({ [key]: value } as Partial<AppFormState>);
      }
    },
    [updateForm]
  );

  const fetchApp = useCallback(async () => {
    if (!appID) return;
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from('apps')
      .select('*')
      .eq('app_id', appID)
      .maybeSingle();

    if (fetchError) {
      console.error(fetchError);
      setError('データの取得に失敗しました。');
      setLoading(false);
      return;
    }
    if (!data) {
      setError('アプリが見つかりません。');
      setLoading(false);
      return;
    }

    const r = data as Record<string, unknown>;
    setForm({
      name: String(r.name ?? ''),
      catch_copy: String(r.catch_copy ?? ''),
      icon_url: String(r.icon_url ?? ''),
      button_label: String(r.button_label ?? 'ダウンロード'),
      button_label_type: (r.button_label_type === 'price' ? 'price' : 'download') as 'download' | 'price',
      price_currency: String(r.price_currency ?? '¥'),
      price_value: String(r.price_value ?? ''),
      primary_link: String(r.primary_link ?? r.download_url ?? ''),
      os_support: String(r.os_support ?? ''),
      apple_silicon: Boolean(r.apple_silicon !== false),
      file_size: String(r.file_size ?? ''),
      version_visible: Boolean(r.version_visible),
      version_number: String(r.version_number ?? ''),
      release_notes: parseReleaseNotes(r.release_notes),
      video_visible: Boolean(r.video_visible),
      video_url: String(r.video_url ?? ''),
      gallery_visible: Boolean(r.gallery_visible),
      gallery_image_urls: parseJsonArray(r.gallery_image_urls, []).map(String),
      free_text_visible: Boolean(r.free_text_visible),
      free_text_image_url: String(r.free_text_image_url ?? ''),
      free_text_markdown: String(r.free_text_markdown ?? ''),
      users_voice_visible: Boolean(r.users_voice_visible),
      users_voice_show_post_button: Boolean(r.users_voice_show_post_button !== false),
      users_voice_display_order: parseJsonArray(r.users_voice_display_order, []).map(String),
      featured_visible: Boolean(r.featured_visible),
      featured_items: parseFeaturedItems(r.featured_items),
      inquiry_visible: Boolean(r.inquiry_visible),
      inquiry_url: String(r.inquiry_url ?? ''),
      developer_icon_url: String(r.developer_icon_url ?? ''),
      developer_name: String(r.developer_name ?? ''),
      developer_bio: String(r.developer_bio ?? ''),
      developer_github: String(r.developer_github ?? ''),
      developer_x: String(r.developer_x ?? ''),
      developer_contact_url: String(r.developer_contact_url ?? ''),
      support_visible: Boolean(r.support_visible),
      buy_me_a_coffee_url: String(r.buy_me_a_coffee_url ?? ''),
      meta_title: String(r.meta_title ?? ''),
      meta_description: String(r.meta_description ?? ''),
      meta_cover_image_url: String(r.meta_cover_image_url ?? ''),
    });
    setIsPublished(Boolean(r.is_published));
    setInitialized(true);
    setLoading(false);
  }, [appID]);

  useEffect(() => {
    fetchApp();
  }, [fetchApp]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    const payload = {
      name: form.name.trim() || null,
      catch_copy: form.catch_copy.trim() || null,
      icon_url: form.icon_url.trim() || null,
      download_url: form.primary_link.trim() || null,
      button_label: form.button_label.trim() || null,
      button_label_type: form.button_label_type,
      price_currency: form.price_currency || null,
      price_value: form.price_value.trim() || null,
      primary_link: form.primary_link.trim() || null,
      os_support: form.os_support.trim() || null,
      apple_silicon: form.apple_silicon,
      file_size: form.file_size.trim() || null,
      version_visible: form.version_visible,
      version_number: form.version_number.trim() || null,
      release_notes: form.release_notes,
      video_visible: form.video_visible,
      video_url: form.video_url.trim() || null,
      gallery_visible: form.gallery_visible,
      gallery_image_urls: form.gallery_image_urls,
      free_text_visible: form.free_text_visible,
      free_text_image_url: form.free_text_image_url.trim() || null,
      free_text_markdown: form.free_text_markdown.trim() || null,
      users_voice_visible: form.users_voice_visible,
      users_voice_show_post_button: form.users_voice_show_post_button,
      users_voice_display_order: form.users_voice_display_order,
      featured_visible: form.featured_visible,
      featured_items: form.featured_items,
      inquiry_visible: form.inquiry_visible,
      inquiry_url: form.inquiry_url.trim() || null,
      developer_icon_url: form.developer_icon_url.trim() || null,
      developer_name: form.developer_name.trim() || null,
      developer_bio: form.developer_bio.trim() || null,
      developer_github: form.developer_github.trim() || null,
      developer_x: form.developer_x.trim() || null,
      developer_contact_url: form.developer_contact_url.trim() || null,
      support_visible: form.support_visible,
      buy_me_a_coffee_url: form.buy_me_a_coffee_url.trim() || null,
      meta_title: form.meta_title.trim() || null,
      meta_description: form.meta_description.trim() || null,
      meta_cover_image_url: form.meta_cover_image_url.trim() || null,
    };
    const { error: updateError } = await supabase
      .from('apps')
      .update(payload)
      .eq('app_id', appID);
    if (updateError) {
      console.error(updateError);
      setError('保存に失敗しました。');
    }
    setSaving(false);
  }, [appID, form]);

  // 自動保存（初期ロード後の変更のみ）
  useEffect(() => {
    if (!initialized || !dirty) return;
    const timer = setTimeout(() => {
      void handleSave();
      setDirty(false);
    }, 800);
    return () => clearTimeout(timer);
  }, [initialized, dirty, handleSave]);

  /** ヘッダー「更新」用: 保存してから公開反映済みとして editDirty をクリア */
  const handleHeaderUpdate = useCallback(async () => {
    await handleSave();
    appChanges?.setEditDirty(false);
  }, [handleSave, appChanges]);

  const handlePublish = useCallback(async () => {
    setPublishing(true);
    setError(null);
    const { error: updateError } = await supabase
      .from('apps')
      .update({ is_published: true })
      .eq('app_id', appID);
    if (updateError) {
      console.error(updateError);
      setError('公開に失敗しました。');
      setPublishing(false);
      return;
    }
    setIsPublished(true);
    setPublishing(false);
  }, [appID]);

  const handleUnpublish = useCallback(async () => {
    setPublishing(true);
    setError(null);
    const { error: updateError } = await supabase
      .from('apps')
      .update({ is_published: false })
      .eq('app_id', appID);
    if (updateError) {
      console.error(updateError);
      setError('非公開に失敗しました。');
      setPublishing(false);
      return;
    }
    setIsPublished(false);
    setPublishing(false);
  }, [appID]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">読み込み中...</p>
      </div>
    );
  }

  if (error && !form.name) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-50 px-4 dark:bg-zinc-950">
        <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
        <button
          type="button"
          onClick={() => router.push('/apps')}
          className="rounded-lg bg-zinc-200 px-4 py-2 text-sm font-medium text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200"
        >
          トップに戻る
        </button>
      </div>
    );
  }

  const currentSectionName =
    focusedSection != null ? SECTIONS.find((s) => s.id === focusedSection)?.nameJa ?? focusedSection : '';
  const visibilityKey = focusedSection != null ? VISIBILITY_KEYS[focusedSection] : null;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <AppPageHeader
        appID={appID}

        isPublished={isPublished}
        onSave={handleHeaderUpdate}
        onPublish={handlePublish}
        onUnpublish={handleUnpublish}
        saving={saving}
        publishing={publishing}
      />
      <div className="flex h-[calc(100vh-2.5rem)] min-h-0">
        {/* 左: セクション未選択時は表示/非表示一覧、選択時は編集シートのみ */}
        <div className="flex w-[280px] min-w-[280px] flex-shrink-0 flex-col overflow-hidden border-r-[0.7px] border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
          {focusedSection == null ? (
            /* セクション未選択: 左カラムいっぱいにセクション一覧 */
            <div className="flex flex-1 flex-col overflow-y-auto p-4">
              <h2 className="mb-4 text-base font-semibold text-zinc-900 dark:text-zinc-50">
                セクション一覧
              </h2>
              <div className="flex flex-col gap-1">
                {SECTIONS.map((section) => {
                  const visKey = VISIBILITY_KEYS[section.id];
                  const isVisible = visKey && (form[visKey] as boolean);
                  const isRequired = section.necessary === 'required';
                  const isOn = isRequired || !!isVisible;
                  const showSwitch = isRequired || visKey;
                  return (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => setFocusedSection(section.id)}
                      className="flex items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-left transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
                    >
                      <span className="min-w-0 flex-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {section.nameJa}
                      </span>
                      {showSwitch ? (
                        <span className="flex shrink-0 items-center gap-2">
                          {isRequired ? (
                            <Tooltip content="このセクションは非表示にできません" placement="top">
                              <span
                                role="switch"
                                aria-checked={isOn}
                                aria-disabled={true}
                                onClick={(e) => e.stopPropagation()}
                                className="relative inline-flex h-5 w-9 flex-shrink-0 cursor-not-allowed rounded-full opacity-50 ring-1 ring-zinc-300 transition-colors focus:outline-none bg-blue-600 dark:bg-blue-500 dark:ring-zinc-600"
                              >
                                <span className="pointer-events-none absolute top-0.5 left-0.5 h-4 w-4 translate-x-4 rounded-full bg-white shadow-sm" />
                              </span>
                            </Tooltip>
                          ) : (
                            <span
                              role="switch"
                              aria-checked={isOn}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (visKey) setVisibility(visKey, !isVisible);
                              }}
                              className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full transition-colors focus:outline-none focus:ring-[0.7px] focus:ring-zinc-400 ${
                                isOn ? 'bg-blue-600 dark:bg-blue-500' : 'bg-zinc-200 dark:bg-zinc-700'
                              }`}
                            >
                              <span
                                className={`pointer-events-none absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                                  isOn ? 'translate-x-4' : 'translate-x-0'
                                }`}
                              />
                            </span>
                          )}
                          <span className="text-zinc-400 dark:text-zinc-500" aria-hidden>
                            ›
                          </span>
                        </span>
                      ) : (
                        <span className="shrink-0 text-zinc-400 dark:text-zinc-500" aria-hidden>
                          ›
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* セクション選択時: 編集シートのみ（「セクションを編集」メニューは出さない） */
            <div className="flex flex-1 flex-col overflow-y-auto rounded-r-xl border-l-[0.7px] border-zinc-200 bg-white shadow-[4px_0_12px_rgba(0,0,0,0.08)] dark:border-zinc-700 dark:bg-zinc-900 dark:shadow-[4px_0_16px_rgba(0,0,0,0.3)]">
              <div className="p-4">
                <button
                  type="button"
                  onClick={() => setFocusedSection(null)}
                  className="mb-4 inline-flex items-center gap-2 rounded-lg border-[0.7px] border-zinc-300 bg-white px-4 py-1.5 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
                >
                  <ArrowLeftIcon className="h-4 w-4 shrink-0" />
                  一覧に戻る
                </button>
                <h1 className="mb-4 text-base font-semibold text-zinc-900 dark:text-zinc-50">
                  {currentSectionName}
                </h1>

                {/* セクション表示切替（必須は常にオン・無効） */}
                {(() => {
                  const isRequired = focusedSection != null && SECTIONS.find((s) => s.id === focusedSection)?.necessary === 'required';
                  const isOn = isRequired || !!(visibilityKey && (form[visibilityKey] as boolean));
                  const isDisabled = isRequired;
                  return (
              <div className="mb-4 flex items-center gap-2">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  このセクションを表示
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isOn}
                  aria-disabled={isDisabled}
                  disabled={isDisabled}
                  onClick={() => !isDisabled && visibilityKey && setVisibility(visibilityKey, !(form[visibilityKey] as boolean))}
                  className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors focus:outline-none focus:ring-[0.7px] focus:ring-zinc-400 ${
                    isDisabled
                      ? 'cursor-not-allowed opacity-50'
                      : ''
                  } ${
                    isOn
                      ? 'bg-blue-600 dark:bg-blue-500'
                      : 'bg-zinc-200 dark:bg-zinc-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                      isOn ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
                  );
                })()}

            <div className="space-y-4">
              {focusedSection === 'hero_header' && (
                <>
                  <ImageUploadInput
                    label="アプリアイコン"
                    value={form.icon_url}
                    onChange={(url) => updateForm({ icon_url: url })}
                    pathPrefix={`${appID}/hero-icon`}
                  />
                  <div>
                    <label className={LABEL_CLASS}>アプリ名</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => updateForm({ name: e.target.value })}
                      placeholder="アプリ名"
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>キャッチコピー</label>
                    <input
                      type="text"
                      value={form.catch_copy}
                      onChange={(e) => updateForm({ catch_copy: e.target.value })}
                      placeholder="キャッチコピー"
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>ボタンラベル</label>
                    <select
                      value={form.button_label_type}
                      onChange={(e) =>
                        updateForm({
                          button_label_type: e.target.value as 'download' | 'price',
                          ...(e.target.value === 'download' ? { price_value: '' } : {}),
                        })
                      }
                      className={SELECT_CLASS}
                    >
                      <option value="download">ダウンロード</option>
                      <option value="price">数値フィールド</option>
                    </select>
                    {form.button_label_type === 'price' && (
                      <div className="mt-3 flex gap-2">
                        <select
                          value={form.price_currency}
                          onChange={(e) => updateForm({ price_currency: e.target.value })}
                          className={SELECT_CLASS}
                          style={{ width: '4.5rem' }}
                        >
                          <option value="¥">¥</option>
                          <option value="$">$</option>
                          <option value="€">€</option>
                          <option value="£">£</option>
                          <option value="CHF">CHF</option>
                          <option value="¥ (税込)">¥ (税込)</option>
                        </select>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={formatPriceDisplay(form.price_value)}
                          onChange={(e) =>
                            updateForm({ price_value: parsePriceInput(e.target.value) })
                          }
                          placeholder="0"
                          className={INPUT_CLASS}
                          style={{ flex: 1 }}
                        />
                      </div>
                    )}
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>ダウンロード / 購入リンク</label>
                    <input
                      type="url"
                      value={form.primary_link}
                      onChange={(e) => updateForm({ primary_link: e.target.value })}
                      placeholder="https://..."
                      className={INPUT_CLASS}
                    />
                  </div>
                </>
              )}

              {focusedSection === 'app_specs' && (
                <>
                  <div>
                    <label className={LABEL_CLASS}>対応OS</label>
                    <input
                      type="text"
                      value={form.os_support}
                      onChange={(e) => updateForm({ os_support: e.target.value })}
                      placeholder="macOS 12.0+"
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="apple_silicon"
                      checked={form.apple_silicon}
                      onChange={(e) => updateForm({ apple_silicon: e.target.checked })}
                      className="h-4 w-4 rounded border-[0.7px] border-zinc-300"
                    />
                    <label htmlFor="apple_silicon" className={LABEL_CLASS}>
                      Apple Silicon 対応
                    </label>
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>ファイルサイズ</label>
                    <input
                      type="text"
                      value={form.file_size}
                      onChange={(e) => updateForm({ file_size: e.target.value })}
                      placeholder="例: 45 MB"
                      className={INPUT_CLASS}
                    />
                  </div>
                </>
              )}

              {focusedSection === 'version' && (
                <>
                  <div>
                    <label className={LABEL_CLASS}>最新バージョン番号</label>
                    <input
                      type="text"
                      value={form.version_number}
                      onChange={(e) => updateForm({ version_number: e.target.value })}
                      placeholder="1.0.0"
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>リリースノート</label>
                    {form.release_notes.map((note, i) => (
                      <div key={i} className="mb-2 flex gap-2">
                        <input
                          type="text"
                          value={note.version}
                          onChange={(e) => {
                            const next = [...form.release_notes];
                            next[i] = { ...next[i], version: e.target.value };
                            updateForm({ release_notes: next });
                          }}
                          placeholder="バージョン"
                          className={INPUT_CLASS}
                        />
                        <input
                          type="text"
                          value={note.body}
                          onChange={(e) => {
                            const next = [...form.release_notes];
                            next[i] = { ...next[i], body: e.target.value };
                            updateForm({ release_notes: next });
                          }}
                          placeholder="内容"
                          className={INPUT_CLASS}
                        />
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        updateForm({
                          release_notes: [...form.release_notes, { version: '', body: '' }],
                        })
                      }
                      className="text-sm text-zinc-600 underline dark:text-zinc-400"
                    >
                      + リリースノートを追加
                    </button>
                  </div>
                </>
              )}

              {focusedSection === 'video' && (
                <div>
                  <label className={LABEL_CLASS}>動画URL（YouTube / Vimeo）</label>
                  <input
                    type="url"
                    value={form.video_url}
                    onChange={(e) => updateForm({ video_url: e.target.value })}
                    placeholder="https://..."
                    className={INPUT_CLASS}
                  />
                </div>
              )}

              {focusedSection === 'gallery' && (
                <>
                  {form.gallery_image_urls.map((url, i) => (
                    <input
                      key={i}
                      type="url"
                      value={url}
                      onChange={(e) => {
                        const next = [...form.gallery_image_urls];
                        next[i] = e.target.value;
                        updateForm({ gallery_image_urls: next });
                      }}
                      placeholder="https://..."
                      className={INPUT_CLASS}
                    />
                  ))}
                  <ImageUploadInput
                    label="スクリーンショットをアップロード"
                    value=""
                    onChange={(url) =>
                      updateForm({
                        gallery_image_urls: [...form.gallery_image_urls, url],
                      })
                    }
                    pathPrefix={`${appID}/gallery`}
                  />
                </>
              )}

              {focusedSection === 'free_text' && (
                <>
                  <ImageUploadInput
                    label="画像（任意・左側）"
                    value={form.free_text_image_url}
                    onChange={(url) => updateForm({ free_text_image_url: url })}
                    pathPrefix={`${appID}/free-text`}
                  />
                  <div>
                    <label className={LABEL_CLASS}>マークダウンテキスト</label>
                    <textarea
                      value={form.free_text_markdown}
                      onChange={(e) => updateForm({ free_text_markdown: e.target.value })}
                      placeholder="## 見出し..."
                      rows={6}
                      className={INPUT_CLASS}
                    />
                  </div>
                </>
              )}

              {focusedSection === 'users_voice' && (
                <>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="users_voice_show_post_button"
                      checked={form.users_voice_show_post_button}
                      onChange={(e) =>
                        updateForm({
                          users_voice_show_post_button: e.target.checked,
                        })
                      }
                      className="h-4 w-4 rounded border-[0.7px] border-zinc-300"
                    />
                    <label
                      htmlFor="users_voice_show_post_button"
                      className={LABEL_CLASS}
                    >
                      ユーザーの声投稿ボタンを表示
                    </label>
                  </div>
                </>
              )}

              {focusedSection === 'featured' && (
                <>
                  {form.featured_items.map((item, i) => (
                    <div key={i} className="rounded-lg bg-zinc-100 p-3 dark:bg-zinc-800">
                      <div className="mb-2">
                        <label className={LABEL_CLASS}>URL</label>
                        <div className="flex gap-2">
                          <input
                            type="url"
                            value={item.url}
                            onChange={(e) => {
                              const next = [...form.featured_items];
                              next[i] = { ...next[i], url: e.target.value };
                              updateForm({ featured_items: next });
                            }}
                            placeholder="https://..."
                            className={`${INPUT_CLASS} flex-1`}
                          />
                          <button
                            type="button"
                            disabled={!item.url.trim()}
                            onClick={async () => {
                              const u = item.url.trim();
                              if (!u) return;
                              try {
                                const res = await fetch(`/api/ogp?url=${encodeURIComponent(u)}`);
                                const data = await res.json();
                                if (!res.ok) throw new Error(data.error || 'Failed');
                                const next = [...form.featured_items];
                                next[i] = {
                                  ...next[i],
                                  title: data.title ?? undefined,
                                  description: data.description ?? undefined,
                                  image_url: data.imageUrl ?? undefined,
                                };
                                updateForm({ featured_items: next });
                              } catch (err) {
                                alert((err as Error).message || 'OGPの取得に失敗しました');
                              }
                            }}
                            className="shrink-0 rounded-lg bg-zinc-200 px-3 py-2 text-xs font-medium text-zinc-800 hover:bg-zinc-300 disabled:opacity-50 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-600"
                          >
                            OGPを取得
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className={LABEL_CLASS}>注釈</label>
                        <input
                          type="text"
                          value={item.note}
                          onChange={(e) => {
                            const next = [...form.featured_items];
                            next[i] = { ...next[i], note: e.target.value };
                            updateForm({ featured_items: next });
                          }}
                          placeholder="記事の紹介文など"
                          className={INPUT_CLASS}
                        />
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      updateForm({
                        featured_items: [...form.featured_items, { url: '', note: '' }],
                      })
                    }
                    className="mt-2 text-sm text-zinc-600 underline dark:text-zinc-400"
                  >
                    + 関連記事を追加
                  </button>
                </>
              )}

              {focusedSection === 'inquiry' && (
                <div>
                  <label className={LABEL_CLASS}>問い合わせ先</label>
                  <input
                    type="text"
                    value={form.inquiry_url}
                    onChange={(e) =>
                      updateForm({ inquiry_url: e.target.value })
                    }
                    placeholder="URLを入力"
                    className={INPUT_CLASS}
                  />
                </div>
              )}

              {focusedSection === 'developer' && (
                <>
                  <ImageUploadInput
                    label="開発者アイコン"
                    value={form.developer_icon_url}
                    onChange={(url) => updateForm({ developer_icon_url: url })}
                    pathPrefix={`${appID}/developer`}
                  />
                  <div>
                    <label className={LABEL_CLASS}>開発者名</label>
                    <input
                      type="text"
                      value={form.developer_name}
                      onChange={(e) => updateForm({ developer_name: e.target.value })}
                      placeholder="名前"
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Bio</label>
                    <textarea
                      value={form.developer_bio}
                      onChange={(e) => updateForm({ developer_bio: e.target.value })}
                      placeholder="自己紹介"
                      rows={3}
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>GitHub URL</label>
                    <input
                      type="url"
                      value={form.developer_github}
                      onChange={(e) =>
                        updateForm({ developer_github: e.target.value })
                      }
                      placeholder="https://github.com/..."
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>X (Twitter) URL</label>
                    <input
                      type="url"
                      value={form.developer_x}
                      onChange={(e) => updateForm({ developer_x: e.target.value })}
                      placeholder="https://x.com/..."
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>お問い合わせリンク</label>
                    <input
                      type="url"
                      value={form.developer_contact_url}
                      onChange={(e) =>
                        updateForm({ developer_contact_url: e.target.value })
                      }
                      placeholder="https://..."
                      className={INPUT_CLASS}
                    />
                  </div>
                </>
              )}

              {focusedSection === 'support' && (
                <div>
                  <label className={LABEL_CLASS}>
                    Buy Me A Coffee URL（寄付ボタン）
                  </label>
                  <input
                    type="url"
                    value={form.buy_me_a_coffee_url}
                    onChange={(e) =>
                      updateForm({ buy_me_a_coffee_url: e.target.value })
                    }
                    placeholder="https://buymeacoffee.com/..."
                    className={INPUT_CLASS}
                  />
                </div>
              )}
              {focusedSection === 'footer' && null}
            </div>

            {error && (
              <p className="mt-4 text-sm text-red-500 dark:text-red-400">
                {error}
              </p>
            )}
            <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
              {saving ? '自動保存中…' : 'すべての変更は自動保存されます'}
            </p>
              </div>
            </div>
          )}
        </div>

        {/* 右: 公開サイトに近いプレビュー */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div
            className="min-h-0 flex-1 overflow-auto bg-white dark:bg-zinc-950"
            role="presentation"
            onClick={() => setFocusedSection(null)}
          >
            <div className="mx-auto w-full max-w-2xl px-4 sm:px-8">
              <AppPageView
                data={form}
                preview
                onSectionFocus={setFocusedSection}
                focusedSectionId={focusedSection}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

