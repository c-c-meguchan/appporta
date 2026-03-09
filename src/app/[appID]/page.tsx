'use client';

import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { AppPageView } from '@/components/app-page-view/AppPageView';
import type { ReviewItem } from '@/components/app-page-view/AppPageView';
import { appRowToFormState } from '@/lib/app-page-data';
import type { AppFormState } from '@/lib/app-edit-types';
import { isReservedAppId } from '@/lib/constants';

export default function PublicAppPage() {
  const params = useParams();
  const router = useRouter();
  const appID = typeof params.appID === 'string' ? params.appID : '';

  const [data, setData] = useState<AppFormState | null>(null);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notPublished, setNotPublished] = useState(false);

  if (isReservedAppId(appID)) {
    notFound();
  }

  const fetchApp = useCallback(async () => {
    if (!appID) return;
    setLoading(true);
    setNotPublished(false);
    setData(null);
    setReviews([]);

    const { data: appData, error: appError } = await supabase
      .from('apps')
      .select('*')
      .eq('app_id', appID)
      .eq('is_published', true)
      .maybeSingle();

    if (appError) {
      console.error(appError);
      setLoading(false);
      return;
    }
    if (!appData) {
      // アプリが存在しない場合、旧URL→新URLのリダイレクトを確認（30日間・直前のみ）
      const { data: redirectRow } = await supabase
        .from('url_redirects')
        .select('to_app_id')
        .eq('from_app_id', appID)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();
      if (redirectRow?.to_app_id) {
        setLoading(false);
        router.replace(`/${redirectRow.to_app_id}`);
        return;
      }
      setNotPublished(true);
      setLoading(false);
      return;
    }

    setData(appRowToFormState(appData as Record<string, unknown>));

    const { data: reviewsData } = await supabase
      .from('reviews')
      .select('id, user_icon_url, user_name, content, created_at')
      .eq('app_id', appID)
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    if (reviewsData && Array.isArray(reviewsData)) {
      setReviews(
        reviewsData.map((r) => ({
          id: r.id,
          user_icon_url: r.user_icon_url ?? null,
          user_name: r.user_name ?? '',
          content: r.content ?? '',
          created_at: r.created_at,
        }))
      );
    }
    setLoading(false);
  }, [appID]);

  useEffect(() => {
    fetchApp();
  }, [fetchApp]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          読み込み中...
        </p>
      </div>
    );
  }

  if (notPublished || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <p className="text-lg font-medium text-zinc-600 dark:text-zinc-400">
          Not Published
        </p>
      </div>
    );
  }

  return (
    <AppPageView
      data={data}
      reviews={reviews}
      appID={appID}
    />
  );
}
