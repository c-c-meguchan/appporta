'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getMainOriginClient } from '@/lib/constants';

/** 設定・アナリティクス画面でヘッダー用のアプリ情報と公開/非公開ハンドラを取得 */
export function useAppHeaderData(appID: string) {
  const [isPublished, setIsPublished] = useState(false);
  const [publicPageUrl, setPublicPageUrl] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchApp = useCallback(async () => {
    if (!appID) return;
    const { data, error } = await supabase
      .from('apps')
      .select('is_published')
      .eq('app_id', appID)
      .maybeSingle();
    if (error) {
      setLoading(false);
      return;
    }
    setIsPublished(Boolean(data?.is_published));
    setPublicPageUrl(`${getMainOriginClient()}/${appID}`);
    setLoading(false);
  }, [appID]);

  useEffect(() => {
    fetchApp();
  }, [fetchApp]);

  const onPublish = useCallback(async () => {
    setPublishing(true);
    const { error } = await supabase.from('apps').update({ is_published: true }).eq('app_id', appID);
    if (!error) setIsPublished(true);
    setPublishing(false);
  }, [appID]);

  const onUnpublish = useCallback(async () => {
    setPublishing(true);
    const { error } = await supabase.from('apps').update({ is_published: false }).eq('app_id', appID);
    if (!error) setIsPublished(false);
    setPublishing(false);
  }, [appID]);

  return { isPublished, publicPageUrl, publishing, loading, onPublish, onUnpublish };
}
