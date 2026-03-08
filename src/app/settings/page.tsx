import Link from 'next/link';

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-8 dark:bg-zinc-950">
      <div className="mx-auto max-w-2xl">
        <nav className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
          <Link href="/apps" className="hover:underline">ホーム</Link>
          <span className="mx-2">/</span>
          <span className="text-zinc-800 dark:text-zinc-200">設定</span>
        </nav>
        <h1 className="mb-4 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          設定
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          アカウント・通知などの設定（準備中）
        </p>
      </div>
    </div>
  );
}
