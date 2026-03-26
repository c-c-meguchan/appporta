'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { AppPageView, type ReviewItem } from '@/components/app-page-view/AppPageView';
import { AppPageHeader } from '@/components/AppPageHeader';
import { ImageUploadInput } from '@/components/ImageUploadInput';
import { useAppChanges } from '@/context/AppChangesContext';
import { type AppFormState, type ReleaseNote, type SectionId, defaultFormState, SECTIONS, type FeaturedItem, parseBmcButtonConfig, parseBmcScriptTag } from '@/lib/app-edit-types';

const INPUT_CLASS =
  'w-full rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-500 focus:bg-zinc-200 focus:ring-[0.7px] focus:ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder:text-zinc-400 dark:focus:bg-zinc-700 dark:focus:ring-zinc-600';
const LABEL_CLASS =
  'block text-xs font-medium text-zinc-800 dark:text-zinc-200 mb-1';
const SELECT_CLASS = `${INPUT_CLASS} pr-9`;

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

const REQUIRED_FIELD_DEFAULTS: Record<string, string> = {
  name: 'アプリ名',
  catch_copy: 'ここにキャッチコピーを入力',
  primary_link: 'https://example.com',
  os_support: 'macOS 12.0+',
  file_size: '0 MB',
  developer_name: '開発者名',
  developer_bio: '自己紹介を入力してください',
};
const REQUIRED_TEXT_FIELDS: Array<keyof AppFormState> = [
  'name',
  'catch_copy',
  'primary_link',
  'os_support',
  'file_size',
  'developer_name',
  'developer_bio',
];
const SECTION_REQUIRED_FIELDS: Partial<Record<SectionId, Array<keyof AppFormState>>> = {
  hero_header: ['name', 'catch_copy', 'primary_link'],
  app_specs: ['os_support', 'file_size'],
  developer: ['developer_name', 'developer_bio'],
};

function hasSectionContent(sectionId: SectionId, form: AppFormState, reviewCount = 0): boolean {
  switch (sectionId) {
    case 'hero_header':
    case 'app_specs':
    case 'developer':
    case 'footer':
      return true;
    case 'version':
      return (
        form.version_number.trim().length > 0 ||
        form.release_notes.some((note) => note.version.trim() || note.body.trim() || (note.date ?? '').trim())
      );
    case 'video':
      return form.video_url.trim().length > 0;
    case 'gallery':
      return form.gallery_image_urls.some((url) => url.trim().length > 0);
    case 'free_text':
      return form.free_text_image_url.trim().length > 0 || form.free_text_markdown.trim().length > 0;
    case 'users_voice':
      return reviewCount > 0 || form.users_voice_show_post_button;
    case 'featured':
      return form.featured_items.some((item) => item.url.trim().length > 0 || item.note.trim().length > 0);
    case 'inquiry':
      return form.inquiry_url.trim().length > 0;
    case 'support':
      return form.buy_me_a_coffee_url.trim().length > 0 || Boolean(form.bmc_button_config);
    default:
      return false;
  }
}

function withRequiredDefaults(state: AppFormState): AppFormState {
  const next = { ...state };
  const writable = next as Record<string, unknown>;
  for (const key of REQUIRED_TEXT_FIELDS) {
    const val = next[key];
    if (typeof val === 'string' && !val.trim()) {
      writable[key] = REQUIRED_FIELD_DEFAULTS[key];
    }
  }
  return next;
}

function getRequiredFieldErrors(state: AppFormState): Partial<Record<keyof AppFormState, string>> {
  const errors: Partial<Record<keyof AppFormState, string>> = {};
  for (const key of REQUIRED_TEXT_FIELDS) {
    const val = state[key];
    if (typeof val === 'string' && !val.trim()) {
      errors[key] = '必須項目です';
    }
  }
  return errors;
}

function actionValidationMessage(action: 'update' | 'publish'): string {
  return action === 'publish'
    ? '公開するにはエラー項目を解消して下さい'
    : '更新するにはエラー項目を解消して下さい';
}

function isValidationErrorMessage(message: string | null): boolean {
  return Boolean(message && message.includes('エラー項目を解消して下さい'));
}

function parseJsonArray(val: unknown, fallback: unknown[]): unknown[] {
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

function parseReleaseNotes(val: unknown): ReleaseNote[] {
  const a = parseJsonArray(val, []);
  return a.map((x: unknown) => {
    const item = x && typeof x === 'object' ? x as Record<string, unknown> : {};
    return {
      version: typeof item.version === 'string' ? item.version : '',
      body: typeof item.body === 'string' ? item.body : '',
      date: typeof item.date === 'string' ? item.date : undefined,
    };
  });
}

function parseFeaturedItems(val: unknown): FeaturedItem[] {
  const a = parseJsonArray(val, []);
  return a.map((x: unknown) => {
    const item = x && typeof x === 'object' ? x as Record<string, unknown> : {};
    return {
      url: typeof item.url === 'string' ? item.url : '',
      note: typeof item.note === 'string' ? item.note : '',
      title: typeof item.title === 'string' ? item.title : undefined,
      description: typeof item.description === 'string' ? item.description : undefined,
      image_url: typeof item.image_url === 'string' ? item.image_url : undefined,
    };
  });
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

type PageProps = { params: Promise<{ appID?: string }> };

export default function StudioAppEditPage({ params }: PageProps) {
  const resolved = use(params);
  const router = useRouter();
  const appID = typeof resolved.appID === 'string' ? resolved.appID : '';

  const [form, setForm] = useState<AppFormState>(defaultFormState);
  const [focusedSection, setFocusedSection] = useState<SectionId | null>(null);
  const [hoveredSection, setHoveredSection] = useState<SectionId | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof AppFormState, string>>>({});
  const [initialized, setInitialized] = useState(false);
  const [bmcInputMode, setBmcInputMode] = useState<'url' | 'code'>('url');
  const [dirty, setDirty] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [allReviews, setAllReviews] = useState<(ReviewItem & { is_public: boolean })[]>([]);
  const appChanges = useAppChanges();

  useEffect(() => {
    if (dirty) appChanges?.setEditDirty(true);
  }, [dirty, appChanges]);

  const updateForm = useCallback(
    (patch: Partial<AppFormState>) => {
      setForm((prev) => ({ ...prev, ...patch }));
      setFieldErrors((prev) => {
        const next = { ...prev };
        for (const key of Object.keys(patch) as Array<keyof AppFormState>) {
          delete next[key];
        }
        return next;
      });
      if (initialized) {
        setDirty(true);
      }
    },
    [initialized]
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
    const usersVoiceShowPostButton =
      typeof r.users_voice_show_post_button === 'boolean'
        ? r.users_voice_show_post_button
        : Boolean(r.users_voice_visible);

    // 開発者プロフィール情報を読み込む（全プロジェクト共通で使用）
    // Profile data takes precedence to ensure consistency between public and edit views
    let developerName = '';
    let developerBio = '';
    let developerGithub = '';
    let developerX = '';
    let developerId = '';
    let developerImageUrl = '';

    // 認証ユーザーのプロフィール情報があればそれを適用
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('developer_profiles')
        .select('developer_id, developer_name, developer_bio, developer_github, developer_x, developer_image')
        .eq('user_id', user.id)
        .maybeSingle();
      if (profile) {
        developerName = profile.developer_name ?? '';
        developerBio = profile.developer_bio ?? '';
        developerGithub = profile.developer_github ?? '';
        developerX = profile.developer_x ?? '';
        developerId = profile.developer_id ?? '';
        developerImageUrl = profile.developer_image ?? '';
      }
    }

    const nextForm = withRequiredDefaults({
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
      users_voice_show_post_button: usersVoiceShowPostButton,
      users_voice_display_order: parseJsonArray(r.users_voice_display_order, []).map(String),
      featured_visible: Boolean(r.featured_visible),
      featured_items: parseFeaturedItems(r.featured_items),
      inquiry_visible: Boolean(r.inquiry_visible),
      inquiry_url: String(r.inquiry_url ?? ''),
      developer_icon_url: developerImageUrl,
      developer_name: developerName,
      developer_id: developerId,
      developer_bio: developerBio,
      developer_github: developerGithub,
      developer_x: developerX,
      support_visible: Boolean(r.support_visible),
      buy_me_a_coffee_url: String(r.buy_me_a_coffee_url ?? ''),
      bmc_button_config: parseBmcButtonConfig(r.bmc_button_config),
      meta_title: String(r.meta_title ?? ''),
      meta_description: String(r.meta_description ?? ''),
      meta_cover_image_url: String(r.meta_cover_image_url ?? ''),
    });
    setForm(nextForm);
    if (parseBmcButtonConfig(r.bmc_button_config)) {
      setBmcInputMode('code');
    }
    setIsPublished(Boolean(r.is_published));
    setInitialized(true);
    setLoading(false);
  }, [appID]);

  useEffect(() => {
    fetchApp();
  }, [fetchApp]);

  useEffect(() => {
    if (!appID) return;
    (async () => {
      const { data } = await supabase
        .from('reviews')
        .select('id, user_icon_url, user_name, content, is_public, created_at')
        .eq('app_id', appID)
        .order('created_at', { ascending: false });
      if (data) {
        setAllReviews(
          data.map((r) => ({
            id: r.id,
            user_icon_url: r.user_icon_url ?? null,
            user_name: r.user_name ?? '',
            content: r.content ?? '',
            created_at: r.created_at,
            is_public: Boolean(r.is_public),
          })),
        );
      }
    })();
  }, [appID]);

  const pendingChanges = appChanges?.pendingTestimonialChanges ?? new Map<string, boolean>();
  const previewReviews: ReviewItem[] = useMemo(() => {
    return allReviews.filter((r) => {
      const effective = pendingChanges.has(r.id!) ? pendingChanges.get(r.id!)! : r.is_public;
      return effective;
    });
  }, [allReviews, appChanges, pendingChanges]);

  const handleSave = useCallback(async (action: 'update' | 'publish' = 'update'): Promise<boolean> => {
    const errors = getRequiredFieldErrors(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError(actionValidationMessage(action));
      return false;
    }
    setFieldErrors({});
    setSaving(true);
    setError(null);
    const visibility = {
      version_visible: hasSectionContent('version', form, previewReviews.length),
      video_visible: hasSectionContent('video', form, previewReviews.length),
      gallery_visible: hasSectionContent('gallery', form, previewReviews.length),
      free_text_visible: hasSectionContent('free_text', form, previewReviews.length),
      users_voice_visible: hasSectionContent('users_voice', form, previewReviews.length),
      featured_visible: hasSectionContent('featured', form, previewReviews.length),
      inquiry_visible: hasSectionContent('inquiry', form, previewReviews.length),
      support_visible: hasSectionContent('support', form, previewReviews.length),
    };
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
      version_visible: visibility.version_visible,
      version_number: form.version_number.trim() || null,
      release_notes: form.release_notes,
      video_visible: visibility.video_visible,
      video_url: form.video_url.trim() || null,
      gallery_visible: visibility.gallery_visible,
      gallery_image_urls: form.gallery_image_urls,
      free_text_visible: visibility.free_text_visible,
      free_text_image_url: form.free_text_image_url.trim() || null,
      free_text_markdown: form.free_text_markdown.trim() || null,
      users_voice_visible: visibility.users_voice_visible,
      users_voice_show_post_button: form.users_voice_show_post_button,
      users_voice_display_order: form.users_voice_display_order,
      featured_visible: visibility.featured_visible,
      featured_items: form.featured_items,
      inquiry_visible: visibility.inquiry_visible,
      inquiry_url: form.inquiry_url.trim() || null,
      support_visible: visibility.support_visible,
      buy_me_a_coffee_url: bmcInputMode === 'url' ? (form.buy_me_a_coffee_url.trim() || null) : null,
      bmc_button_config: bmcInputMode === 'code' ? form.bmc_button_config : null,
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
      setSaving(false);
      return false;
    }
    setSaving(false);
    return true;
  }, [appID, form, bmcInputMode, previewReviews.length]);

  // 自動保存（初期ロード後の変更のみ）
  useEffect(() => {
    if (!initialized || !dirty) return;
    const timer = setTimeout(() => {
      void (async () => {
        const saved = await handleSave();
        if (saved) {
          setDirty(false);
        }
      })();
    }, 800);
    return () => clearTimeout(timer);
  }, [initialized, dirty, handleSave]);

  /** ヘッダー「更新」用: 保存してから公開反映済みとして editDirty をクリア */
  const handleHeaderUpdate = useCallback(async () => {
    const saved = await handleSave('update');
    if (!saved) {
      window.alert(actionValidationMessage('update'));
      return;
    }
    appChanges?.setEditDirty(false);
  }, [handleSave, appChanges]);

  const handlePublish = useCallback(async () => {
    const saved = await handleSave('publish');
    if (!saved) {
      window.alert(actionValidationMessage('publish'));
      return;
    }
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
  }, [appID, handleSave]);

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

  if (error && !initialized) {
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
  const getInputClass = (key: keyof AppFormState) =>
    `${INPUT_CLASS} ${fieldErrors[key] ? 'border border-red-400 bg-red-50 focus:bg-red-50 focus:ring-red-300 dark:border-red-500 dark:bg-red-950/20 dark:focus:bg-red-950/20 dark:focus:ring-red-800' : ''}`;
  const sectionHasErrors = (sectionId: SectionId): boolean => {
    const keys = SECTION_REQUIRED_FIELDS[sectionId] ?? [];
    return keys.some((key) => Boolean(fieldErrors[key]));
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <AppPageHeader
        appID={appID}
        isPublished={isPublished}
        appTitle={form.name}
        onSave={handleHeaderUpdate}
        onPublish={handlePublish}
        onUnpublish={handleUnpublish}
        saving={saving}
        publishing={publishing}
      />
      <div className="flex h-[calc(100vh-2.5rem)] min-h-0">
        {/* 左: セクション未選択時は表示/非表示一覧、選択時は編集シートのみ */}
        <div className="flex w-[280px] min-w-[280px] flex-shrink-0 flex-col overflow-hidden border-r-[0.7px] border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
          <div
            className="flex min-h-0 flex-1 transition-transform duration-300 ease-in-out"
            style={{ width: '200%', transform: focusedSection == null ? 'translateX(0)' : 'translateX(-50%)' }}
          >
            {/* セクション一覧 */}
            <div className={`flex w-1/2 flex-col ${focusedSection == null ? 'overflow-y-auto' : 'overflow-hidden'} p-4`}>
              <h2 className="mb-4 text-base font-semibold text-zinc-900 dark:text-zinc-50">
                セクション一覧
              </h2>
              <div className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-700">
                {SECTIONS.map((section) => {
                  const isOn = hasSectionContent(section.id, form, previewReviews.length);
                  const isItemHovered = hoveredSection === section.id;
                  const hasErrors = sectionHasErrors(section.id);
                  return (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => setFocusedSection(section.id)}
                      onMouseEnter={() => setHoveredSection(section.id)}
                      onMouseLeave={() => setHoveredSection(null)}
                      className={`flex items-center gap-2 px-1 py-2.5 text-left transition hover:bg-zinc-100 dark:hover:bg-zinc-800/50 ${
                        isItemHovered ? 'bg-zinc-100 dark:bg-zinc-800/50' : ''
                      }`}
                    >
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center ${
                          hasErrors ? 'text-red-500 dark:text-red-400' : 'text-zinc-400 dark:text-zinc-500'
                        }`}
                        aria-hidden
                      >
                        {hasErrors ? (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.72-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.981-1.742 2.981H4.42c-1.53 0-2.492-1.647-1.742-2.98l5.58-9.921zM11 13a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm-1-6a1 1 0 0 0-1 1v3a1 1 0 1 0 2 0V8a1 1 0 0 0-1-1z" clipRule="evenodd" />
                          </svg>
                        ) : isOn ? (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                            <path fillRule="evenodd" d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.25 7.313a1 1 0 0 1-1.42.003l-3.75-3.75a1 1 0 1 1 1.414-1.414l3.04 3.04 6.543-6.598a1 1 0 0 1 1.417-.008z" clipRule="evenodd" />
                          </svg>
                        ) : null}
                      </span>
                      <span className="min-w-0 flex-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {section.nameJa}
                      </span>
                      <span className="shrink-0 text-zinc-400 dark:text-zinc-500" aria-hidden>
                        ›
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            {/* セクション詳細 */}
            <div className={`flex w-1/2 flex-col ${focusedSection != null ? 'overflow-y-auto' : 'overflow-hidden'} rounded-r-xl border-l-[0.7px] border-zinc-200 bg-white shadow-[4px_0_12px_rgba(0,0,0,0.08)] dark:border-zinc-700 dark:bg-zinc-900 dark:shadow-[4px_0_16px_rgba(0,0,0,0.3)]`}>
              <div className="p-4">
                <button
                  type="button"
                  onClick={() => setFocusedSection(null)}
                  className="mb-4 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                >
                  <ChevronLeftIcon className="h-4 w-4 shrink-0" />
                  一覧に戻る
                </button>
                <div className="mb-4">
                  <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                    {currentSectionName}
                  </h1>
                </div>

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
                      className={getInputClass('name')}
                    />
                    {fieldErrors.name && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{fieldErrors.name}</p>}
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>キャッチコピー</label>
                    <input
                      type="text"
                      value={form.catch_copy}
                      onChange={(e) => updateForm({ catch_copy: e.target.value })}
                      placeholder="キャッチコピー"
                      className={getInputClass('catch_copy')}
                    />
                    {fieldErrors.catch_copy && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{fieldErrors.catch_copy}</p>}
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
                      className={getInputClass('primary_link')}
                    />
                    {fieldErrors.primary_link && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{fieldErrors.primary_link}</p>}
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
                      className={getInputClass('os_support')}
                    />
                    {fieldErrors.os_support && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{fieldErrors.os_support}</p>}
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
                      className={getInputClass('file_size')}
                    />
                    {fieldErrors.file_size && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{fieldErrors.file_size}</p>}
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
                    <div className="mb-2 flex items-baseline justify-between">
                      <label className={`${LABEL_CLASS} mb-0`}>リリースノート</label>
                      <button
                        type="button"
                        onClick={() => {
                          const today = new Date().toISOString().slice(0, 10);
                          updateForm({
                            release_notes: [{ version: '', body: '', date: today }, ...form.release_notes],
                          });
                        }}
                        className="inline-flex items-center gap-1 rounded-md border border-zinc-300 px-1.5 py-px text-xs font-medium leading-tight text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 5v14M5 12h14"/></svg>
                        追加
                      </button>
                    </div>
                    <div className="space-y-2">
                    {form.release_notes.map((note, i) => (
                      <div key={i} className="group relative space-y-1 rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                        <button
                          type="button"
                          onClick={() => {
                            const next = form.release_notes.filter((_, idx) => idx !== i);
                            updateForm({ release_notes: next });
                          }}
                          className="absolute -right-2 -top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-200 text-zinc-500 opacity-0 transition hover:bg-red-500 hover:text-white group-hover:opacity-100 dark:bg-zinc-600 dark:text-zinc-300 dark:hover:bg-red-500 dark:hover:text-white"
                          aria-label="削除"
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M18 6 6 18M6 6l12 12"/></svg>
                        </button>
                        <div className="flex gap-2">
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
                            type="date"
                            value={note.date ?? ''}
                            onChange={(e) => {
                              const next = [...form.release_notes];
                              next[i] = { ...next[i], date: e.target.value };
                              updateForm({ release_notes: next });
                            }}
                            className={`${INPUT_CLASS} dark:[color-scheme:dark]`}
                          />
                        </div>
                        <textarea
                          value={note.body}
                          onChange={(e) => {
                            const next = [...form.release_notes];
                            next[i] = { ...next[i], body: e.target.value };
                            updateForm({ release_notes: next });
                          }}
                          placeholder="内容（Markdown対応）"
                          rows={3}
                          className={INPUT_CLASS}
                        />
                      </div>
                    ))}
                    </div>
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
                <div className="space-y-4">
                  <a
                    href="/profile"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center rounded-lg border-[0.7px] border-zinc-900 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                  >
                    開発者プロフィール設定へ
                  </a>
                </div>
              )}

              {focusedSection === 'support' && (
                <div className="space-y-4">
                  <div className="flex rounded-lg bg-zinc-100 p-0.5 dark:bg-zinc-800">
                    <button
                      type="button"
                      onClick={() => { setBmcInputMode('url'); setDirty(true); }}
                      className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition ${bmcInputMode === 'url' ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-50' : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'}`}
                    >
                      URL
                    </button>
                    <button
                      type="button"
                      onClick={() => { setBmcInputMode('code'); setDirty(true); }}
                      className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition ${bmcInputMode === 'code' ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-50' : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'}`}
                    >
                      コード
                    </button>
                  </div>

                  {bmcInputMode === 'url' && (
                    <div>
                      <label className={LABEL_CLASS}>
                        Buy Me A Coffee URL
                      </label>
                      <input
                        type="url"
                        value={form.buy_me_a_coffee_url}
                        onChange={(e) =>
                          updateForm({ buy_me_a_coffee_url: e.target.value, bmc_button_config: null })
                        }
                        placeholder="https://buymeacoffee.com/yourname"
                        className={INPUT_CLASS}
                      />
                    </div>
                  )}

                  {bmcInputMode === 'code' && (
                    <div>
                      <label className={LABEL_CLASS}>
                        Buy Me A Coffee ボタンスクリプト
                      </label>
                      <textarea
                        rows={3}
                        className={INPUT_CLASS}
                        placeholder={'<script type="text/javascript" src="https://cdnjs.buymeacoffee.com/..." data-slug="yourname" ...></script>'}
                        onPaste={(e) => {
                          const text = e.clipboardData.getData('text');
                          const parsed = parseBmcScriptTag(text);
                          if (parsed) {
                            e.preventDefault();
                            updateForm({
                              bmc_button_config: parsed,
                              buy_me_a_coffee_url: `https://buymeacoffee.com/${parsed.slug}`,
                            });
                          }
                        }}
                        onChange={(e) => {
                          const parsed = parseBmcScriptTag(e.target.value);
                          if (parsed) {
                            updateForm({
                              bmc_button_config: parsed,
                              buy_me_a_coffee_url: `https://buymeacoffee.com/${parsed.slug}`,
                            });
                          }
                        }}
                        value={form.bmc_button_config ? `<script data-slug="${form.bmc_button_config.slug}" data-color="${form.bmc_button_config.color}" data-emoji="${form.bmc_button_config.emoji}" data-text="${form.bmc_button_config.text}" ...></script>` : ''}
                      />
                    </div>
                  )}

                </div>
              )}
              {focusedSection === 'footer' && null}
            </div>

            {error && !isValidationErrorMessage(error) && (
              <p className="mt-4 text-sm text-red-500 dark:text-red-400">
                {error}
              </p>
            )}
            <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
              {saving ? '自動保存中…' : (isValidationErrorMessage(error) ? '未保存（入力エラーがあります）' : 'すべての変更は自動保存されます')}
            </p>
              </div>
            </div>
          </div>
        </div>

        {/* 右: 公開サイトに近いプレビュー */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div
            className="min-h-0 flex-1 overflow-auto bg-white dark:bg-zinc-950"
            role="presentation"
            onClick={() => setFocusedSection(null)}
          >
            <div className="mx-auto w-full max-w-3xl">
              <AppPageView
                data={{
                  ...form,
                  ...(bmcInputMode === 'url'
                    ? { bmc_button_config: null }
                    : { buy_me_a_coffee_url: form.bmc_button_config ? form.buy_me_a_coffee_url : '' }),
                }}
                reviews={previewReviews}
                preview
                onSectionFocus={setFocusedSection}
                focusedSectionId={focusedSection}
                onSectionHover={setHoveredSection}
                hoveredSectionId={hoveredSection}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

