import type { AppFormState, NavItem, ReleaseNote, FeaturedItem } from '@/lib/app-edit-types';
import { defaultFormState } from '@/lib/app-edit-types';

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

function parseNavItems(val: unknown): NavItem[] {
  const a = parseJsonArray(val, []);
  return a.map((x: any) => ({
    label: typeof x?.label === 'string' ? x.label : '',
    href: typeof x?.href === 'string' ? x.href : '',
  }));
}

function parseReleaseNotes(val: unknown): ReleaseNote[] {
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

/**
 * Supabase apps 行を AppFormState に変換（公開ページ・プレビュー用）
 */
export function appRowToFormState(r: Record<string, unknown>): AppFormState {
  return {
    ...defaultFormState,
    nav_items: parseNavItems(r.nav_items),
    name: String(r.name ?? ''),
    catch_copy: String(r.catch_copy ?? ''),
    icon_url: String(r.icon_url ?? ''),
    button_label: String(r.button_label ?? 'ダウンロード'),
    button_label_type: r.button_label_type === 'price' ? 'price' : 'download',
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
  };
}
