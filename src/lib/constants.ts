/** appporta.com/{appID} で使用不可の予約語（小文字で比較） */
export const RESERVED_APP_IDS = new Set([
  'app',
  'apps',
  'login',
  'signup',
  'studio',
  'terms',
  'privacy',
  'about',
  'blog',
  'docs',
  'api',
  'dev',
  'explore',
  'search',
  'pricing',
  'contact',
  'support',
  'jobs',
  'careers',
  'status',
  'press',
  'security',
  'legal',
  'news',
  'pickup',
]);

export function isReservedAppId(value: string): boolean {
  return RESERVED_APP_IDS.has(value.toLowerCase());
}

/** 公開URLスラッグとして有効か（a-z, 0-9, - のみ・2文字以上・予約語でない） */
export const APP_ID_SLUG_REGEX = /^[a-z0-9-]+$/;

export function validateAppIdSlug(
  value: string
): { valid: true } | { valid: false; error: string } {
  const trimmed = value.trim().toLowerCase();
  if (trimmed.length === 0) {
    return { valid: false, error: 'appIDを入力してください。' };
  }
  if (trimmed.length === 1) {
    return { valid: false, error: 'appIDは2文字以上で入力してください。' };
  }
  if (!APP_ID_SLUG_REGEX.test(trimmed)) {
    return { valid: false, error: '小文字英数字とハイフンのみ使用できます。' };
  }
  if (isReservedAppId(trimmed)) {
    return { valid: false, error: 'この文字列は使用できません。' };
  }
  return { valid: true };
}

const STUDIO_HOSTS = ['studio.appporta.com', 'studio.localhost'];
const MAIN_HOSTS = ['appporta.com', 'localhost', 'www.appporta.com'];

export function isStudioHost(host: string | null): boolean {
  if (!host) return false;
  const h = host.split(':')[0];
  return STUDIO_HOSTS.some((s) => h === s);
}

export function isMainHost(host: string | null): boolean {
  if (!host) return false;
  const h = host.split(':')[0];
  return MAIN_HOSTS.some((s) => h === s);
}

/** 本番の Studio のオリジン（リダイレクト用）。ローカルでは現在の origin を利用 */
export function getStudioOrigin(request: { headers: { get: (name: string) => string | null } }): string {
  const host = request.headers.get('host') ?? '';
  if (host.startsWith('localhost') || host.startsWith('127.0.0.1')) {
    const proto = request.headers.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    return `${proto}://studio.localhost:${host.includes(':') ? host.split(':')[1] : '3000'}`;
  }
  return 'https://studio.appporta.com';
}

/** 本番のメインサイトのオリジン（リダイレクト用） */
export function getMainOrigin(request: { headers: { get: (name: string) => string | null } }): string {
  const host = request.headers.get('host') ?? '';
  if (host.startsWith('localhost') || host.startsWith('127.0.0.1')) {
    const proto = request.headers.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    const port = host.includes(':') ? host.split(':')[1] : '3000';
    return `${proto}://localhost:${port}`;
  }
  return 'https://appporta.com';
}

/** クライアント側で公開LPのベースURLを取得（studio ホスト時はメインサイトの origin） */
export function getMainOriginClient(): string {
  if (typeof window === 'undefined') return 'https://appporta.com';
  const h = window.location.hostname;
  if (h === 'studio.localhost') return `${window.location.protocol}//localhost${window.location.port ? ':' + window.location.port : ''}`;
  if (h === 'studio.appporta.com') return 'https://appporta.com';
  return window.location.origin;
}
