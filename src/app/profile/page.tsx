'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  FORM_ERROR_CLASS,
  PREFIX_INPUT_CLASS,
  PREFIX_INPUT_WRAPPER_CLASS,
  PREFIX_TEXT_CLASS,
  FormLabel,
} from '@/components/FormField';

const DEVELOPER_ID_REGEX = /^[a-z0-9_-]+$/;

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [developerId, setDeveloperId] = useState('');
  const [developerError, setDeveloperError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (cancelled) return;
      if (userError || !user) {
        router.replace('/login');
        return;
      }
      setUserId(user.id);

      const { data: profile, error: profileError } = await supabase
        .from('developer_profiles')
        .select('developer_id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!cancelled) {
        if (profileError) {
          console.error(profileError);
        } else {
          setDeveloperId(profile?.developer_id ?? '');
        }
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (!userId) return;
    const trimmed = developerId.trim().toLowerCase();
    if (!trimmed) {
      setDeveloperError(null);
      return;
    }
    if (!DEVELOPER_ID_REGEX.test(trimmed)) {
      setDeveloperError('小文字英数字・ハイフン・アンダースコアのみ使用できます。');
      return;
    }
    setDeveloperError(null);
    const timer = setTimeout(async () => {
      setChecking(true);
      const { data, error } = await supabase
        .from('developer_profiles')
        .select('user_id')
        .eq('developer_id', trimmed)
        .maybeSingle();
      setChecking(false);
      if (error) {
        console.error(error);
        return;
      }
      if (data && data.user_id !== userId) {
        setDeveloperError('この開発者IDはすでに使用されています。別のIDを選んでください。');
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [developerId, userId]);

  const handleSave = async () => {
    if (!userId) return;
    setSaveMessage(null);
    setDeveloperError(null);

    const trimmed = developerId.trim().toLowerCase();
    if (!trimmed) {
      // 任意項目: 空の場合は設定を削除
      setSaving(true);
      const { error } = await supabase.from('developer_profiles').delete().eq('user_id', userId);
      setSaving(false);
      if (error) {
        console.error(error);
        setDeveloperError('保存に失敗しました。時間をおいて再度お試しください。');
        return;
      }
      setSaveMessage('開発者IDを未設定にしました。');
      return;
    }

    if (!DEVELOPER_ID_REGEX.test(trimmed)) {
      setDeveloperError('小文字英数字・ハイフン・アンダースコアのみ使用できます。');
      return;
    }

    const { data: taken } = await supabase
      .from('developer_profiles')
      .select('user_id')
      .eq('developer_id', trimmed)
      .maybeSingle();
    if (taken && taken.user_id !== userId) {
      setDeveloperError('この開発者IDはすでに使用されています。別のIDを選んでください。');
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('developer_profiles')
      .upsert(
        { user_id: userId, developer_id: trimmed, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );
    setSaving(false);
    if (error) {
      console.error(error);
      setDeveloperError('保存に失敗しました。時間をおいて再度お試しください。');
      return;
    }
    setDeveloperId(trimmed);
    setSaveMessage('保存しました。');
  };

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-8 dark:bg-zinc-950">
      <div className="mx-auto max-w-2xl">
        <nav className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
          <Link href="/apps" className="hover:underline">ホーム</Link>
          <span className="mx-2">/</span>
          <span className="text-zinc-800 dark:text-zinc-200">開発者プロフィール</span>
        </nav>
        <h1 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          開発者プロフィール
        </h1>
        <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
          公開用の開発者IDを設定できます。
        </p>

        <div className="rounded-2xl bg-zinc-100 p-6 dark:bg-zinc-900">
          {loading ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">読み込み中...</p>
          ) : (
            <div className="space-y-4">
              <div>
                <FormLabel htmlFor="developer-id" optional>開発者ID</FormLabel>
                <div className={PREFIX_INPUT_WRAPPER_CLASS}>
                  <span className={PREFIX_TEXT_CLASS}>@</span>
                  <div className="relative flex min-w-0 flex-1 items-center">
                    <input
                      id="developer-id"
                      type="text"
                      value={developerId}
                      onChange={(e) => setDeveloperId(e.target.value.toLowerCase())}
                      placeholder="my-handle"
                      className={PREFIX_INPUT_CLASS}
                    />
                    {checking && (
                      <span className="pointer-events-none absolute right-2 text-xs text-zinc-400 dark:text-zinc-500">
                        確認中...
                      </span>
                    )}
                  </div>
                </div>
                {developerError && <p className={FORM_ERROR_CLASS}>{developerError}</p>}
              </div>

              {saveMessage && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400">{saveMessage}</p>
              )}

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center justify-center rounded-lg border-[0.7px] border-zinc-900 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  {saving ? '保存中...' : '保存'}
                </button>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  空にして保存すると未設定に戻せます。
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
