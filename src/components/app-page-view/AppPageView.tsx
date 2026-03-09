'use client';

import { useEffect, useRef, useState } from 'react';
import type { AppFormState, SectionId } from '@/lib/app-edit-types';

export type ReviewItem = {
  id?: string;
  user_icon_url: string | null;
  user_name: string;
  content: string;
  created_at?: string;
};

type AppPageViewProps = {
  data: AppFormState;
  reviews?: ReviewItem[];
  /** プレビュー用にリンクを無効化する場合 */
  preview?: boolean;
  /** プレビュー時、セクションのホバー・フォーカスで編集パネルを切り替えるコールバック */
  onSectionFocus?: (sectionId: SectionId) => void;
  /** 現在編集パネルでフォーカス中のセクションID（プレビューでハイライトに使用） */
  focusedSectionId?: SectionId | null;
};

function useHorizontalFade() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const { scrollLeft, scrollWidth, clientWidth } = el;
      const maxScroll = Math.max(scrollWidth - clientWidth, 0);
      setAtStart(scrollLeft <= 1);
      setAtEnd(scrollLeft >= maxScroll - 1);
    };
    update();
    el.addEventListener('scroll', update, { passive: true } as any);
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [ref.current]);

  return { ref, atStart, atEnd };
}

function ImgOrPlaceholder({
  src,
  alt,
  className,
  placeholder = 'icon',
}: {
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
}) {
  if (!src) {
    return (
      <div
        className={`flex items-center justify-center rounded-2xl bg-zinc-200 text-zinc-400 dark:bg-zinc-700 dark:text-zinc-500 ${className ?? ''}`}
      >
        <span className="text-xs">{placeholder}</span>
      </div>
    );
  }
  return (
    <div className={`overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-800 ${className ?? ''}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="h-full w-full object-cover"
        onError={(e) => {
          e.currentTarget.style.display = 'none';
        }}
      />
    </div>
  );
}

/** プロトコルなし・ドメインのみのURLを https:// 付きの絶対URLにします。先頭が / または # の場合はそのまま。 */
function ensureAbsoluteUrl(url: string): string {
  const u = url.trim();
  if (!u) return url;
  if (/^https?:\/\//i.test(u) || u.startsWith('/') || u.startsWith('#')) return u;
  return `https://${u}`;
}

function embedVideoUrl(url: string): string | null {
  const u = url.trim();
  if (!u) return null;
  try {
    const parsed = new URL(u);
    const host = parsed.hostname;
    if (host.includes('youtube.com') || host.includes('youtu.be')) {
      const v = host.includes('youtu.be')
        ? parsed.pathname.slice(1)
        : parsed.searchParams.get('v');
      return v ? `https://www.youtube.com/embed/${v}` : null;
    }
    if (host.includes('vimeo.com')) {
      const m = parsed.pathname.match(/\/(\d+)/);
      return m ? `https://player.vimeo.com/video/${m[1]}` : null;
    }
  } catch {
    // ignore
  }
  return null;
}

/** 価格をカンマ区切りで表示 */
function formatPriceDisplay(raw: string): string {
  const s = raw.replace(/,/g, '');
  const [intPart, decPart] = s.split('.');
  if (!intPart) return '';
  const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return decPart !== undefined ? `${formatted}.${decPart}` : formatted;
}

function SectionWrapper({
  sectionId,
  preview,
  onSectionFocus,
  focusedSectionId,
  children,
  className = '',
}: {
  sectionId: SectionId;
  preview?: boolean;
  onSectionFocus?: (sectionId: SectionId) => void;
  focusedSectionId?: SectionId | null;
  children: React.ReactNode;
  className?: string;
}) {
  const isInteractive = preview && onSectionFocus;
  const isFocused = focusedSectionId === sectionId;
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSectionFocus?.(sectionId);
  };

  if (!isInteractive) {
    return <>{children}</>;
  }
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      className={`rounded-xl border-[0.7px] transition-colors focus:outline-none focus-visible:ring-[0.7px] focus-visible:ring-zinc-400 focus-visible:ring-offset-2 dark:focus-visible:ring-zinc-500 dark:focus-visible:ring-offset-zinc-950 ${
        isFocused
          ? 'border-zinc-300 bg-zinc-50/80 dark:border-zinc-600 dark:bg-zinc-900/60'
          : 'border-transparent hover:border-zinc-200 hover:bg-zinc-50/50 dark:hover:border-zinc-700 dark:hover:bg-zinc-900/40'
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function AppPageView({ data: d, reviews = [], preview, onSectionFocus, focusedSectionId }: AppPageViewProps) {
  const embedUrl = embedVideoUrl(ensureAbsoluteUrl(d.video_url));
  const galleryUrls = d.gallery_image_urls.filter(Boolean);
  const { ref: galleryScrollRef, atStart: galleryAtStart, atEnd: galleryAtEnd } = useHorizontalFade();

  return (
    <div className="min-h-screen bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b-[0.7px] border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
        <a href={preview ? '#' : '/'} className="text-lg font-semibold">
          AppPorta
        </a>
        <button
          type="button"
          className="flex h-9 w-9 flex-col items-center justify-center gap-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
          aria-label="メニュー"
        >
          <span className="block h-0.5 w-4 rounded-full bg-current" />
          <span className="block h-0.5 w-4 rounded-full bg-current" />
          <span className="block h-0.5 w-4 rounded-full bg-current" />
        </button>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        {/* Hero Header */}
        <SectionWrapper
          sectionId="hero_header"
          preview={preview}
          onSectionFocus={onSectionFocus}
          focusedSectionId={focusedSectionId}
          className="-mx-2 px-2"
        >
        <section className="flex flex-row items-start gap-4 py-6">
          <div className="flex-shrink-0">
            <ImgOrPlaceholder
              src={d.icon_url}
              alt=""
              className="h-24 w-24 rounded-2xl sm:h-28 sm:w-28"
              placeholder="アイコン"
            />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <h1 className="text-lg font-semibold tracking-tight text-zinc-900 sm:text-xl dark:text-zinc-50">
              {d.name || 'アプリ名'}
            </h1>
            {d.catch_copy && (
              <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400 sm:mt-1">
                {d.catch_copy}
              </p>
            )}
            {d.primary_link && (
              <a
                href={preview ? '#' : ensureAbsoluteUrl(d.primary_link)}
                target={preview ? undefined : '_blank'}
                rel="noopener noreferrer"
                className="mt-3 inline-flex rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {d.button_label_type === 'price' && d.price_value
                  ? `${d.price_currency} ${formatPriceDisplay(d.price_value)}`
                  : 'ダウンロード'}
              </a>
            )}
          </div>
        </section>
        </SectionWrapper>

        {/* App Specs */}
        <SectionWrapper
          sectionId="app_specs"
          preview={preview}
          onSectionFocus={onSectionFocus}
          focusedSectionId={focusedSectionId}
          className="-mx-2 px-2"
        >
        <section className="flex flex-wrap items-center gap-3 py-6 border-t-[0.7px] border-zinc-200 dark:border-zinc-800">
          {d.os_support && (
            <span className="rounded-lg bg-zinc-100 px-3 py-1 text-sm dark:bg-zinc-800">
              {d.os_support}
            </span>
          )}
          {d.apple_silicon && (
            <span className="rounded-lg bg-zinc-100 px-3 py-1 text-sm dark:bg-zinc-800">
              Apple Silicon
            </span>
          )}
          {d.file_size && (
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              {d.file_size}
            </span>
          )}
        </section>
        </SectionWrapper>

        {/* Version */}
        {d.version_visible && (d.version_number || d.release_notes.length > 0) && (
          <SectionWrapper
            sectionId="version"
            preview={preview}
            onSectionFocus={onSectionFocus}
            focusedSectionId={focusedSectionId}
            className="-mx-2 px-2"
          >
          <section className="py-6 border-t-[0.7px] border-zinc-200 dark:border-zinc-800">
            <h2 className="text-lg font-semibold">バージョン</h2>
            {d.version_number && (
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                最新: {d.version_number}
              </p>
            )}
            {d.release_notes.length > 0 && (
              <details className="mt-3">
                <summary className="cursor-pointer text-sm text-zinc-600 dark:text-zinc-400">
                  リリースノート
                </summary>
                <ul className="mt-2 space-y-2 pl-4">
                  {d.release_notes.map((note, i) => (
                    <li key={i} className="text-sm">
                      <span className="font-medium">{note.version}</span>
                      {note.body && <span className="text-zinc-600 dark:text-zinc-400"> — {note.body}</span>}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </section>
          </SectionWrapper>
        )}

        {/* Video */}
        {d.video_visible && embedUrl && (
          <SectionWrapper
            sectionId="video"
            preview={preview}
            onSectionFocus={onSectionFocus}
            focusedSectionId={focusedSectionId}
            className="-mx-2 px-2"
          >
          <section className="py-6 border-t-[0.7px] border-zinc-200 dark:border-zinc-800">
            <div className="aspect-video w-full overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800">
              <iframe
                title="動画"
                src={embedUrl}
                className="h-full w-full"
                allowFullScreen
              />
            </div>
          </section>
          </SectionWrapper>
        )}

        {/* Gallery */}
        {d.gallery_visible && galleryUrls.length > 0 && (
          <SectionWrapper
            sectionId="gallery"
            preview={preview}
            onSectionFocus={onSectionFocus}
            focusedSectionId={focusedSectionId}
            className="-mx-2 px-2"
          >
          <section className="py-6 border-t-[0.7px] border-zinc-200 dark:border-zinc-800">
            <h2 className="text-lg font-semibold">スクリーンショット</h2>
            <div className="relative mt-3">
              <div
                ref={galleryScrollRef}
                className="flex gap-3 overflow-x-auto pb-2"
              >
                {galleryUrls.map((url, i) => (
                  <div key={i} className="flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt=""
                      className="h-auto w-auto max-h-[480px] max-w-[480px] rounded-xl border border-zinc-200 object-contain shadow-sm dark:border-zinc-700"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                ))}
              </div>
              <div
                className={`pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-white dark:from-zinc-950 to-transparent transition-opacity ${
                  galleryAtStart ? 'opacity-0' : 'opacity-100'
                }`}
              />
              <div
                className={`pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-white dark:from-zinc-950 to-transparent transition-opacity ${
                  galleryAtEnd ? 'opacity-0' : 'opacity-100'
                }`}
              />
            </div>
          </section>
          </SectionWrapper>
        )}

        {/* Free Text */}
        {d.free_text_visible && (d.free_text_image_url || d.free_text_markdown) && (
          <SectionWrapper
            sectionId="free_text"
            preview={preview}
            onSectionFocus={onSectionFocus}
            focusedSectionId={focusedSectionId}
            className="-mx-2 px-2"
          >
          <section className="py-6 border-t-[0.7px] border-zinc-200 dark:border-zinc-800">
            <div className="flex flex-col gap-4 sm:flex-row">
              {d.free_text_image_url && (
                <div className="h-48 w-48 flex-shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={d.free_text_image_url}
                    alt=""
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}
              <div className="min-w-0 flex-1 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
                {d.free_text_markdown}
              </div>
            </div>
          </section>
          </SectionWrapper>
        )}

        {/* Users' voice */}
        {d.users_voice_visible && (
          <SectionWrapper
            sectionId="users_voice"
            preview={preview}
            onSectionFocus={onSectionFocus}
            focusedSectionId={focusedSectionId}
            className="-mx-2 px-2"
          >
          <section className="py-6 border-t-[0.7px] border-zinc-200 dark:border-zinc-800">
            <h2 className="text-lg font-semibold">ユーザーの声</h2>
            {reviews.length > 0 ? (
              <div className="mt-3 flex gap-4 overflow-x-auto pb-2">
                {reviews.map((r, i) => (
                  <div
                    key={r.id ?? i}
                    className="w-64 flex-shrink-0 rounded-xl border-[0.7px] border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <div className="flex items-center gap-2">
                      {r.user_icon_url ? (
                        <div className="h-8 w-8 overflow-hidden rounded-full">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={r.user_icon_url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                      )}
                      <span className="text-sm font-medium">{r.user_name}</span>
                    </div>
                    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 line-clamp-3">
                      {r.content}
                    </p>
                    {r.created_at && (
                      <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
                        {new Date(r.created_at).toLocaleDateString('ja-JP')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                まだレビューはありません。
              </p>
            )}
            {d.users_voice_show_post_button && (
              <button
                type="button"
                className="mt-4 rounded-lg border-[0.7px] border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                ユーザーの声を投稿
              </button>
            )}
          </section>
          </SectionWrapper>
        )}

        {/* Featured（関連記事） */}
        {d.featured_visible && d.featured_items.filter((i) => i.url.trim()).length > 0 && (
          <SectionWrapper
            sectionId="featured"
            preview={preview}
            onSectionFocus={onSectionFocus}
            focusedSectionId={focusedSectionId}
            className="-mx-2 px-2"
          >
          <section className="py-6 border-t-[0.7px] border-zinc-200 dark:border-zinc-800">
            <h2 className="text-lg font-semibold">関連記事</h2>
            <div className="mt-3 flex flex-col gap-3">
              {d.featured_items
                .filter((i) => i.url.trim())
                .map((item, i) => {
                  const displayTitle =
                    item.title?.trim() ||
                    (() => {
                      try {
                        return item.url ? new URL(item.url).hostname : 'リンク';
                      } catch {
                        return 'リンク';
                      }
                    })();
                  return (
                    <div key={i} className="flex flex-col gap-1.5">
                      <a
                        href={preview ? '#' : ensureAbsoluteUrl(item.url)}
                        target={preview ? undefined : '_blank'}
                        rel="noopener noreferrer"
                        className="flex overflow-hidden rounded-lg border-[0.7px] border-zinc-200 bg-zinc-50 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                      >
                        {item.image_url && (
                          <div className="w-28 shrink-0 sm:w-36 bg-zinc-200 dark:bg-zinc-700 aspect-[4/3] sm:aspect-[16/10]">
                            <img
                              src={item.image_url}
                              alt=""
                              className="h-full w-full object-cover object-center"
                            />
                          </div>
                        )}
                        <div className="min-w-0 flex-1 p-4 flex flex-col justify-center">
                          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-2">
                            {displayTitle}
                          </span>
                          {item.description && (
                            <p className="mt-1 line-clamp-2 text-xs text-zinc-500 dark:text-zinc-500">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </a>
                      {item.note && (
                        <p className="px-1 text-sm text-zinc-600 dark:text-zinc-400">
                          {item.note}
                        </p>
                      )}
                    </div>
                  );
                })}
            </div>
          </section>
          </SectionWrapper>
        )}

        {/* お問い合わせ */}
        {d.inquiry_visible && d.inquiry_url.trim() && (
          <SectionWrapper
            sectionId="inquiry"
            preview={preview}
            onSectionFocus={onSectionFocus}
            focusedSectionId={focusedSectionId}
            className="-mx-2 px-2"
          >
          <section className="py-6 border-t-[0.7px] border-zinc-200 dark:border-zinc-800">
            <h2 className="text-lg font-semibold">お問い合わせ</h2>
            <div className="mt-3">
              <a
                href={
                  preview
                    ? '#'
                    : (() => {
                        const u = d.inquiry_url.trim();
                        if (u.startsWith('mailto:') || u.startsWith('tel:')) return u;
                        return ensureAbsoluteUrl(u);
                      })()
                }
                target={preview || d.inquiry_url.trim().startsWith('mailto:') || d.inquiry_url.trim().startsWith('tel:') ? undefined : '_blank'}
                rel="noopener noreferrer"
                className="inline-flex rounded-lg border-[0.7px] border-zinc-300 bg-zinc-100 px-4 py-2.5 text-sm font-medium transition hover:bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700"
              >
                お問い合わせ
              </a>
            </div>
          </section>
          </SectionWrapper>
        )}

        {/* Developer */}
        <SectionWrapper
          sectionId="developer"
          preview={preview}
          onSectionFocus={onSectionFocus}
          focusedSectionId={focusedSectionId}
          className="-mx-2 px-2"
        >
        <section className="py-6 border-t-[0.7px] border-zinc-200 dark:border-zinc-800">
          <h2 className="text-lg font-semibold">開発者</h2>
          <div className="mt-3 flex flex-col items-center gap-3 sm:flex-row sm:items-start">
            <ImgOrPlaceholder
              src={d.developer_icon_url}
              alt=""
              className="h-16 w-16"
              placeholder="開発者"
            />
            <div className="flex-1 text-center sm:text-left">
              <p className="font-medium">{d.developer_name || '開発者'}</p>
              {d.developer_bio && (
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  {d.developer_bio}
                </p>
              )}
              <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
                {d.developer_github && (
                  <a
                    href={preview ? '#' : ensureAbsoluteUrl(d.developer_github)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-zinc-600 hover:underline dark:text-zinc-400"
                  >
                    GitHub
                  </a>
                )}
                {d.developer_x && (
                  <a
                    href={preview ? '#' : ensureAbsoluteUrl(d.developer_x)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-zinc-600 hover:underline dark:text-zinc-400"
                  >
                    X
                  </a>
                )}
                {d.developer_contact_url && (
                  <a
                    href={preview ? '#' : ensureAbsoluteUrl(d.developer_contact_url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                  >
                    お問い合わせ
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>
        </SectionWrapper>

        {/* Support */}
        {d.support_visible && d.buy_me_a_coffee_url && (
          <SectionWrapper
            sectionId="support"
            preview={preview}
            onSectionFocus={onSectionFocus}
            focusedSectionId={focusedSectionId}
            className="-mx-2 px-2"
          >
          <section className="py-6 border-t-[0.7px] border-zinc-200 dark:border-zinc-800">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              この開発者を支援する
            </h2>
            <a
              href={ensureAbsoluteUrl(d.buy_me_a_coffee_url)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-black transition hover:opacity-90"
              style={{ backgroundColor: 'rgb(248, 218, 57)' }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-5 w-5 shrink-0 text-black"
                aria-hidden
              >
                <path d="M20 3H4v10c0 2.21 1.79 4 4 4h6c2.21 0 4-1.79 4-4v-3h2c1.11 0 2-.89 2-2V5c0-1.11-.89-2-2-2zm0 5h-2V5h2v3zM4 19h16v2H4z" />
              </svg>
              Buy Me A Coffee
            </a>
          </section>
          </SectionWrapper>
        )}
      </main>

      {/* Footer（必須） */}
      <SectionWrapper
        sectionId="footer"
        preview={preview}
        onSectionFocus={onSectionFocus}
        focusedSectionId={focusedSectionId}
        className="-mx-2 px-2"
      >
        <footer className="py-6 text-center">
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            Powered by App Porta
          </p>
        </footer>
      </SectionWrapper>
    </div>
  );
}
