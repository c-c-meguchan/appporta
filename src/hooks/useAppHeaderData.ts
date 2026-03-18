'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

/** 設定・アナリティクス画面でヘッダー用のアプリ情報と公開/非公開ハンドラを取得 */
export function useAppHeaderData(appID: string) {
  const [isPublished, setIsPublished] = useState(false);
  const [pendingAppId, setPendingAppId] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [appTitle, setAppTitle] = useState<string | undefined>(undefined);
  const [publishedCount, setPublishedCount] = useState(0);

  const fetchApp = useCallback(async () => {
    if (!appID) return;
    setLoading(true);
    const [
      { data: { user } },
      { data: appData, error },
    ] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from('apps').select('name, is_published, pending_app_id').eq('app_id', appID).maybeSingle(),
    ]);
    if (error) {
      setLoading(false);
      return;
    }
    setIsPublished(Boolean(appData?.is_published));
    setPendingAppId(appData?.pending_app_id ?? null);
    setAppTitle(appData?.name ?? undefined);

    if (user) {
      const { count } = await supabase
        .from('apps')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_published', true);
      setPublishedCount(count ?? 0);
    } else {
      setPublishedCount(0);
    }
    setLoading(false);
  }, [appID]);

  useEffect(() => {
    fetchApp();
  }, [fetchApp]);

  const onPublish = useCallback(async () => {
    setPublishing(true);
    const { error } = await supabase
      .from('apps')
      .update({ is_published: true, last_reflected_at: new Date().toISOString() })
      .eq('app_id', appID);
    if (!error) setIsPublished(true);
    setPublishing(false);
  }, [appID]);

  const onUnpublish = useCallback(async () => {
    setPublishing(true);
    const { error } = await supabase.from('apps').update({ is_published: false }).eq('app_id', appID);
    if (!error) setIsPublished(false);
    setPublishing(false);
  }, [appID]);

  return { isPublished, pendingAppId, appTitle, publishing, loading, publishedCount, onPublish, onUnpublish, refetch: fetchApp };
}
