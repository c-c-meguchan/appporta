'use client';

import { use } from 'react';
import { useState, useEffect } from 'react';

type PageProps = { params: Promise<{ developerID?: string }> };

export default function PublicDeveloperPage({ params }: PageProps) {
  const resolved = use(params);
  const developerID = typeof resolved.developerID === 'string' ? resolved.developerID : '';
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-12 dark:bg-zinc-950">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-4 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          開発者 @{mounted ? developerID : '...'}
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          公開開発者詳細ページ（準備中）
        </p>
      </div>
    </div>
  );
}
