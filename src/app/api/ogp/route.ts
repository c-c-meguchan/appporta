import { NextRequest, NextResponse } from 'next/server';

const TIMEOUT_MS = 12_000;
const MAX_HTML_LEN = 512 * 1024; // 512KB

/** Normalize meta tag: collapse whitespace so we can match across newlines */
function normalizeMetaArea(html: string): string {
  const headEnd = html.indexOf('</head>');
  const head = headEnd > 0 ? html.slice(0, headEnd) : html.slice(0, 64 * 1024);
  return head.replace(/\s+/g, ' ');
}

function extractMeta(html: string, property: string): string | null {
  const normalized = normalizeMetaArea(html);
  const re = new RegExp(
    `<meta[^>]+property=["']${property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]+content=["']([^"']+)["']`,
    'i'
  );
  const m = normalized.match(re);
  if (m) return m[1].trim();
  const re2 = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`,
    'i'
  );
  const m2 = normalized.match(re2);
  return m2 ? m2[1].trim() : null;
}

/** Extract by name= (e.g. name="description") */
function extractMetaByName(html: string, name: string): string | null {
  const normalized = normalizeMetaArea(html);
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(
    `<meta[^>]+name=["']${escaped}["'][^>]+content=["']([^"']+)["']`,
    'i'
  );
  const m = normalized.match(re);
  if (m) return m[1].trim();
  const re2 = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${escaped}["']`,
    'i'
  );
  const m2 = normalized.match(re2);
  return m2 ? m2[1].trim() : null;
}

/** Try to get description from JSON-LD (Article or WebPage schema) */
function extractDescriptionFromJsonLd(html: string): string | null {
  const matches = html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );
  for (const m of matches) {
    try {
      const data = JSON.parse(m[1].trim());
      const obj = Array.isArray(data) ? data.find((x: any) => x['@type'] === 'Article' || x['@type'] === 'NewsArticle' || x['@type'] === 'BlogPosting') : data;
      const desc = obj?.description ?? obj?.articleBody;
      if (typeof desc === 'string' && desc.trim().length > 0) {
        return desc.trim().slice(0, 500);
      }
    } catch {
      continue;
    }
  }
  return null;
}

function extractTitle(html: string): string | null {
  const og = extractMeta(html, 'og:title');
  if (og) return og;
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : null;
}

function resolveUrl(base: string, path: string): string {
  try {
    return new URL(path, base).href;
  } catch {
    return path;
  }
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  if (!url || typeof url !== 'string') {
    return NextResponse.json(
      { error: 'Missing or invalid url parameter' },
      { status: 400 }
    );
  }

  let target: URL;
  try {
    target = new URL(url);
    if (!['http:', 'https:'].includes(target.protocol)) {
      return NextResponse.json({ error: 'Only http/https URLs allowed' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(target.href, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; AppPortaOGP/1.0; +https://github.com/appporta)',
      },
      redirect: 'follow',
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Fetch failed: ${res.status}` },
        { status: 502 }
      );
    }

    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    if (!contentType.includes('text/html')) {
      return NextResponse.json(
        { error: 'URL did not return HTML' },
        { status: 400 }
      );
    }

    const text = await res.text();
    const html = text.length > MAX_HTML_LEN ? text.slice(0, MAX_HTML_LEN) : text;
    const baseHref = res.url || target.href;

    const title = extractMeta(html, 'og:title') || extractTitle(html) || null;
    const description =
      extractMeta(html, 'og:description') ||
      extractMeta(html, 'twitter:description') ||
      extractMetaByName(html, 'description') ||
      extractMetaByName(html, 'zenn:description') ||
      extractDescriptionFromJsonLd(html) ||
      null;
    let imageUrl = extractMeta(html, 'og:image');
    if (imageUrl && !/^https?:\/\//i.test(imageUrl)) {
      imageUrl = resolveUrl(baseHref, imageUrl);
    }

    return NextResponse.json({
      title: title ?? null,
      description: description ?? null,
      imageUrl: imageUrl ?? null,
    });
  } catch (e) {
    if ((e as Error).name === 'AbortError') {
      return NextResponse.json({ error: 'Request timeout' }, { status: 504 });
    }
    return NextResponse.json(
      { error: (e as Error).message || 'Fetch failed' },
      { status: 502 }
    );
  } finally {
    clearTimeout(timeout);
  }
}
