'use client';

import { useParams } from 'next/navigation';
import { AppPageHeader } from '@/components/AppPageHeader';
import { useAppHeaderData } from '@/hooks/useAppHeaderData';

export default function AppAnalyticsPage() {
  const params = useParams();
  const appID = typeof params.appID === 'string' ? params.appID : '';
  const { isPublished, publicPageUrl, publishing, loading, onPublish, onUnpublish } = useAppHeaderData(appID);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <AppPageHeader
        appID={appID}
        publicPageUrl={publicPageUrl || undefined}
        isPublished={isPublished}
        onPublish={onPublish}
        onUnpublish={onUnpublish}
        publishing={publishing}
      />
      <div className="mx-auto max-w-2xl px-4 py-8">
        {loading ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">読み込み中...</p>
        ) : (
          <>
            <h1 className="mb-4 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              アナリティクス
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              準備中です。
            </p>
          </>
        )}
      </div>
    </div>
  );
}
