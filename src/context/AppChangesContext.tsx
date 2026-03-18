'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAppHeaderData } from '@/hooks/useAppHeaderData';

type AppChangesContextValue = {
  editDirty: boolean;
  setEditDirty: (v: boolean) => void;
  settingsUrlPending: boolean;
  setSettingsUrlPending: (v: boolean) => void;
  pendingAppId: string | null;
  setPendingAppId: (v: string | null) => void;
  showUrlConfirm: boolean;
  setShowUrlConfirm: (v: boolean) => void;
  applyUrlChange: () => Promise<boolean>;
  applyingUrl: boolean;
  testimonialsDirty: boolean;
  /** ユーザーの声に未公開の投稿があるか（新着フラグ用） */
  testimonialsHasNew: boolean;
  setTestimonialsHasNew: (v: boolean) => void;
  pendingTestimonialChanges: Map<string, boolean>;
  stageTestimonialChange: (id: string, is_public: boolean) => void;
  unstageTestimonialChange: (id: string) => void;
  applyTestimonialChanges: () => Promise<void>;
  clearTestimonialChanges: () => void;
};

const AppChangesContext = createContext<AppChangesContextValue | null>(null);

export function useAppChanges() {
  const ctx = useContext(AppChangesContext);
  if (!ctx) return null;
  return ctx;
}

type AppChangesProviderProps = {
  appID: string;
  children: React.ReactNode;
};

export function AppChangesProvider({ appID, children }: AppChangesProviderProps) {
  const router = useRouter();
  const { pendingAppId: serverPending } = useAppHeaderData(appID);
  const [editDirty, setEditDirty] = useState(false);
  const [settingsUrlPending, setSettingsUrlPending] = useState(false);
  const [pendingAppId, setPendingAppId] = useState<string | null>(null);
  const [showUrlConfirm, setShowUrlConfirm] = useState(false);
  const [applyingUrl, setApplyingUrl] = useState(false);
  const [pendingTestimonialChanges, setPendingTestimonialChanges] = useState<Map<string, boolean>>(new Map());
  const [testimonialsHasNew, setTestimonialsHasNew] = useState(false);
  const testimonialsDirty = pendingTestimonialChanges.size > 0;

  useEffect(() => {
    setPendingAppId(serverPending ?? null);
    setSettingsUrlPending(!!(serverPending && serverPending !== appID));
  }, [serverPending, appID]);

  // ヘッダーの新着バッジ用に、タブを開いた直後や再読み込み時でも未読があれば反映する
  useEffect(() => {
    if (!appID) return;
    let cancelled = false;
    const checkHasNewTestimonials = async () => {
      const [reviewsRes, readsRes] = await Promise.all([
        supabase
          .from('reviews')
          .select('id')
          .eq('app_id', appID),
        supabase
          .from('review_reads')
          .select('review_id')
          .eq('app_id', appID),
      ]);
      if (cancelled) return;
      if (reviewsRes.error || readsRes.error) {
        return;
      }
      const allIds = (reviewsRes.data ?? []).map((r: { id: string }) => r.id);
      const readIds = new Set((readsRes.data ?? []).map((r: { review_id: string }) => r.review_id));
      const hasNew = allIds.some((id) => !readIds.has(id));
      setTestimonialsHasNew(hasNew);
    };
    void checkHasNewTestimonials();
    return () => {
      cancelled = true;
    };
  }, [appID]);

  const applyUrlChange = useCallback(async (): Promise<boolean> => {
    const pending = pendingAppId;
    if (!pending || pending === appID) return true;
    setApplyingUrl(true);
    try {
      const { data: existing } = await supabase
        .from('apps')
        .select('app_id')
        .eq('app_id', pending)
        .maybeSingle();
      if (existing) return false;

      const { data: row, error: selectError } = await supabase
        .from('apps')
        .select('*')
        .eq('app_id', appID)
        .single();
      if (selectError || !row) return false;

      // 直前のURLのみ保持: 現在のURLへ向いていたリダイレクトを削除
      await supabase
        .from('url_redirects')
        .delete()
        .eq('to_app_id', appID);

      // 旧URL→新URL を30日間リダイレクト（削除前に登録するのでRLSの挿入条件を満たす）
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      await supabase.from('url_redirects').insert({
        from_app_id: appID,
        to_app_id: pending,
        expires_at: expiresAt.toISOString(),
      });

      const rowRecord = row as Record<string, unknown>;
      const { app_id: _oldId, pending_app_id: _pending, id: _id, ...rest } = rowRecord;
      const payload: Record<string, unknown> = {
        app_id: pending,
        pending_app_id: null,
        last_reflected_at: new Date().toISOString(),
      };
      for (const [key, value] of Object.entries(rest)) {
        if (value !== undefined) payload[key] = value;
      }
      const { error: insertError } = await supabase.from('apps').insert(payload);
      if (insertError) return false;

      await supabase.from('reviews').update({ app_id: pending }).eq('app_id', appID);
      const { error: deleteError } = await supabase.from('apps').delete().eq('app_id', appID);
      if (deleteError) return false;

      setSettingsUrlPending(false);
      setPendingAppId(null);
      setShowUrlConfirm(false);
      await router.replace(`/apps/${pending}/settings`);
      router.refresh();
      return true;
    } finally {
      setApplyingUrl(false);
    }
  }, [appID, pendingAppId, router]);

  const stageTestimonialChange = useCallback((id: string, is_public: boolean) => {
    setPendingTestimonialChanges((prev) => {
      const next = new Map(prev);
      next.set(id, is_public);
      return next;
    });
  }, []);

  const unstageTestimonialChange = useCallback((id: string) => {
    setPendingTestimonialChanges((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const applyTestimonialChanges = useCallback(async () => {
    const entries = Array.from(pendingTestimonialChanges.entries());
    if (entries.length === 0) return;

    const promises = entries.map(([id, is_public]) =>
      supabase.from('reviews').update({ is_public }).eq('id', id),
    );
    await Promise.all(promises);
    setPendingTestimonialChanges(new Map());
  }, [pendingTestimonialChanges]);

  const clearTestimonialChanges = useCallback(() => {
    setPendingTestimonialChanges(new Map());
  }, []);

  const value: AppChangesContextValue = {
    editDirty,
    setEditDirty,
    settingsUrlPending,
    setSettingsUrlPending,
    pendingAppId,
    setPendingAppId,
    showUrlConfirm,
    setShowUrlConfirm,
    applyUrlChange,
    applyingUrl,
    testimonialsDirty,
    testimonialsHasNew,
    setTestimonialsHasNew,
    pendingTestimonialChanges,
    stageTestimonialChange,
    unstageTestimonialChange,
    applyTestimonialChanges,
    clearTestimonialChanges,
  };

  return (
    <AppChangesContext.Provider value={value}>
      {children}
    </AppChangesContext.Provider>
  );
}
