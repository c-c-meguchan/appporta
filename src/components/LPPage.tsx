'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function LPPage({
  studioLoginUrl,
  studioOrigin,
}: {
  studioLoginUrl: string;
  studioOrigin: string;
}) {
  const [appName, setAppName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = appName.trim();
    if (!trimmed) return;
    const appId = trimmed
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    const url = new URL('/signup', studioOrigin);
    url.searchParams.set('app_id', appId || trimmed);
    window.location.href = url.toString();
  };

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="flex items-center justify-between border-b-[0.7px] border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          App Porta
        </span>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/terms" className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
            利用規約
          </Link>
          <Link href="/privacy" className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
            プライバシー
          </Link>
          <a
            href={studioLoginUrl}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            ログイン
          </a>
        </nav>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
        <div className="mx-auto max-w-xl text-center">
          <h1 className="mb-4 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">
            App Porta
          </h1>
          <p className="mb-10 text-lg text-zinc-600 dark:text-zinc-400">
            アプリのLPを簡単に作成・公開できるサービスです。
          </p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
            <div className="flex w-full items-stretch overflow-hidden rounded-lg border-[0.7px] border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-900 sm:w-auto">
              <span className="flex items-center border-r-[0.7px] border-zinc-300 bg-zinc-50 px-4 py-3 text-zinc-600 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                https://appporta.com/
              </span>
              <input
                type="text"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                placeholder="your-app"
                className="min-w-0 flex-1 border-0 bg-transparent px-4 py-3 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-0 dark:text-zinc-50 dark:placeholder:text-zinc-500 sm:w-52"
                aria-label="あなたのアプリ名（URLの一部になります）"
              />
            </div>
            <button
              type="submit"
              className="shrink-0 rounded-lg bg-zinc-900 px-6 py-3 text-sm font-medium text-zinc-50 transition hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              公式ページを作成
            </button>
          </form>
          <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
            公式ページを作成を押すと studio.appporta.com のサインアップへ進みます。
          </p>
        </div>
      </main>
    </div>
  );
}
