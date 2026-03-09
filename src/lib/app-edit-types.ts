export type SectionId =
  | 'hero_header'
  | 'app_specs'
  | 'version'
  | 'video'
  | 'gallery'
  | 'free_text'
  | 'users_voice'
  | 'featured'
  | 'inquiry'
  | 'developer'
  | 'support'
  | 'footer';

export type SectionNecessary = 'required' | 'optional';

export type SectionConfig = {
  id: SectionId;
  name: string;
  nameJa: string;
  necessary: SectionNecessary;
};

export const SECTIONS: SectionConfig[] = [
  { id: 'hero_header', name: 'Hero Header', nameJa: 'ヒーロー', necessary: 'required' },
  { id: 'app_specs', name: 'App Specs', nameJa: 'アプリ仕様', necessary: 'required' },
  { id: 'version', name: 'Version', nameJa: 'バージョン', necessary: 'optional' },
  { id: 'video', name: 'Video', nameJa: '動画', necessary: 'optional' },
  { id: 'gallery', name: 'Gallery', nameJa: 'ギャラリー', necessary: 'optional' },
  { id: 'free_text', name: 'Free Text', nameJa: '自由文', necessary: 'optional' },
  { id: 'users_voice', name: "Users' voice", nameJa: 'ユーザーの声', necessary: 'optional' },
  { id: 'featured', name: 'Featured', nameJa: '関連記事', necessary: 'optional' },
  { id: 'inquiry', name: 'Inquiry', nameJa: 'お問い合わせ', necessary: 'optional' },
  { id: 'developer', name: 'Developer', nameJa: '開発者', necessary: 'required' },
  { id: 'support', name: 'Support', nameJa: 'サポート', necessary: 'optional' },
  { id: 'footer', name: 'Footer', nameJa: 'フッター', necessary: 'required' },
];

export type ReleaseNote = { version: string; body: string };
export type FeaturedItem = {
  url: string;
  note: string;
  title?: string;
  description?: string;
  image_url?: string;
};

export type BmcButtonConfig = {
  slug: string;
  color: string;
  emoji: string;
  font: string;
  text: string;
  outline_color: string;
  font_color: string;
  coffee_color: string;
};

export const defaultBmcButtonConfig: BmcButtonConfig = {
  slug: '',
  color: '#FFDD00',
  emoji: '☕',
  font: 'Lato',
  text: 'Buy me a coffee',
  outline_color: '#000000',
  font_color: '#000000',
  coffee_color: '#ffffff',
};

export function parseBmcButtonConfig(val: unknown): BmcButtonConfig | null {
  if (!val || typeof val !== 'object') return null;
  const o = val as Record<string, unknown>;
  if (typeof o.slug !== 'string' || !o.slug) return null;
  return {
    slug: o.slug,
    color: typeof o.color === 'string' ? o.color : defaultBmcButtonConfig.color,
    emoji: typeof o.emoji === 'string' ? o.emoji : defaultBmcButtonConfig.emoji,
    font: typeof o.font === 'string' ? o.font : defaultBmcButtonConfig.font,
    text: typeof o.text === 'string' ? o.text : defaultBmcButtonConfig.text,
    outline_color: typeof o.outline_color === 'string' ? o.outline_color : defaultBmcButtonConfig.outline_color,
    font_color: typeof o.font_color === 'string' ? o.font_color : defaultBmcButtonConfig.font_color,
    coffee_color: typeof o.coffee_color === 'string' ? o.coffee_color : defaultBmcButtonConfig.coffee_color,
  };
}

export function parseBmcScriptTag(script: string): BmcButtonConfig | null {
  const attr = (name: string): string => {
    const m = script.match(new RegExp(`data-${name}="([^"]*)"`));
    return m ? m[1] : '';
  };
  const slug = attr('slug');
  if (!slug) return null;
  return {
    slug,
    color: attr('color') || defaultBmcButtonConfig.color,
    emoji: attr('emoji') || defaultBmcButtonConfig.emoji,
    font: attr('font') || defaultBmcButtonConfig.font,
    text: attr('text') || defaultBmcButtonConfig.text,
    outline_color: attr('outline-color') || defaultBmcButtonConfig.outline_color,
    font_color: attr('font-color') || defaultBmcButtonConfig.font_color,
    coffee_color: attr('coffee-color') || defaultBmcButtonConfig.coffee_color,
  };
}

export type AppFormState = {
  name: string;
  catch_copy: string;
  icon_url: string;
  button_label: string;
  button_label_type: 'download' | 'price';
  price_currency: string;
  price_value: string;
  primary_link: string;
  os_support: string;
  apple_silicon: boolean;
  file_size: string;
  version_visible: boolean;
  version_number: string;
  release_notes: ReleaseNote[];
  video_visible: boolean;
  video_url: string;
  gallery_visible: boolean;
  gallery_image_urls: string[];
  free_text_visible: boolean;
  free_text_image_url: string;
  free_text_markdown: string;
  users_voice_visible: boolean;
  users_voice_show_post_button: boolean;
  users_voice_display_order: string[];
  featured_visible: boolean;
  featured_items: FeaturedItem[];
  inquiry_visible: boolean;
  inquiry_url: string;
  developer_icon_url: string;
  developer_name: string;
  developer_bio: string;
  developer_github: string;
  developer_x: string;
  developer_contact_url: string;
  support_visible: boolean;
  buy_me_a_coffee_url: string;
  bmc_button_config: BmcButtonConfig | null;
  meta_title: string;
  meta_description: string;
  meta_cover_image_url: string;
};

export const defaultFormState: AppFormState = {
  name: '',
  catch_copy: '',
  icon_url: '',
  button_label: 'ダウンロード',
  button_label_type: 'download',
  price_currency: '¥',
  price_value: '',
  primary_link: '',
  os_support: '',
  apple_silicon: true,
  file_size: '',
  version_visible: false,
  version_number: '',
  release_notes: [],
  video_visible: false,
  video_url: '',
  gallery_visible: false,
  gallery_image_urls: [],
  free_text_visible: false,
  free_text_image_url: '',
  free_text_markdown: '',
  users_voice_visible: false,
  users_voice_show_post_button: true,
  users_voice_display_order: [],
  featured_visible: false,
  featured_items: [],
  inquiry_visible: false,
  inquiry_url: '',
  developer_icon_url: '',
  developer_name: '',
  developer_bio: '',
  developer_github: '',
  developer_x: '',
  developer_contact_url: '',
  support_visible: false,
  buy_me_a_coffee_url: '',
  bmc_button_config: null,
  meta_title: '',
  meta_description: '',
  meta_cover_image_url: '',
};
