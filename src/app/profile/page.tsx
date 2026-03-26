'use client';

import Link from 'next/link';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  FORM_ERROR_CLASS,
  FORM_INPUT_CLASS,
  PREFIX_INPUT_CLASS,
  PREFIX_INPUT_WRAPPER_CLASS,
  PREFIX_TEXT_CLASS,
  FormLabel,
} from '@/components/FormField';
import { ImageUploadInput } from '@/components/ImageUploadInput';

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
        className="opacity-25"
      />
      <path
        fill="currentColor"
        className="opacity-75"
        d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

const DEVELOPER_ID_REGEX = /^[a-z0-9_-]+$/;

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [developerId, setDeveloperId] = useState('');
  const [developerImage, setDeveloperImage] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [serverError, setServerError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const developerError = useMemo(() => {
    const trimmed = developerId.trim().toLowerCase();
    if (!trimmed) return null;
    if (!DEVELOPER_ID_REGEX.test(trimmed)) {
      return '小文字英数字・ハイフン・アンダースコアのみ使用できます。';
    }
    return null;
  }, [developerId]);

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
        .select('developer_id, developer_image, developer_name, developer_bio')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!cancelled) {
        if (profileError) {
          console.error(profileError);
        } else {
          setDeveloperId(profile?.developer_id ?? '');
          setDeveloperImage(profile?.developer_image ?? '');
          setName(profile?.developer_name ?? '');
          setDescription(profile?.developer_bio ?? '');
        }
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (!userId || !developerId.trim()) return;

    const trimmed = developerId.trim().toLowerCase();
    if (!DEVELOPER_ID_REGEX.test(trimmed)) {
      return;
    }

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
        setServerError('サーバーエラーが発生しました。');
        return;
      }
      if (data && data.user_id !== userId) {
        setServerError('この開発者IDはすでに使用されています。別のIDを選んでください。');
      } else {
        setServerError(null);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [developerId, userId]);

  const handleSave = async () => {
    if (!userId) return;
    setSaveMessage(null);
    setServerError(null);

    const trimmed = developerId.trim().toLowerCase();
    if (!trimmed) {
      // 任意項目: 空の場合は設定を削除
      setSaving(true);
      const { error } = await supabase.from('developer_profiles').delete().eq('user_id', userId);
      setSaving(false);
      if (error) {
        console.error(error);
        setServerError('保存に失敗しました。時間をおいて再度お試しください。');
        return;
      }
      setSaveMessage('開発者IDを未設定にしました。');
      return;
    }

    if (!DEVELOPER_ID_REGEX.test(trimmed)) {
      setServerError('小文字英数字・ハイフン・アンダースコアのみ使用できます。');
      return;
    }

    const { data: taken } = await supabase
      .from('developer_profiles')
      .select('user_id')
      .eq('developer_id', trimmed)
      .maybeSingle();
    if (taken && taken.user_id !== userId) {
      setServerError('この開発者IDはすでに使用されています。別のIDを選んでください。');
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('developer_profiles')
      .upsert(
        { user_id: userId, developer_id: trimmed, developer_image: developerImage, developer_name: name, developer_bio: description, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );
    setSaving(false);
    if (error) {
      console.error(error);
      setServerError('保存に失敗しました。時間をおいて再度お試しください。');
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
        <h1 className="mb-4 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          開発者プロフィール
        </h1>

        {loading ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">読み込み中...</p>
        ) : (
          <section className="rounded-xl bg-white p-4 dark:bg-zinc-900">
            <div className="space-y-4">
              <div>
                <ImageUploadInput
                  label="プロフィール画像"
                  value={developerImage}
                  onChange={setDeveloperImage}
                  pathPrefix="profile-images"
                />
              </div>
              <div>
                <FormLabel htmlFor="name">名前</FormLabel>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="表示名"
                  className={FORM_INPUT_CLASS}
                />
              </div>
              <div>
                <FormLabel htmlFor="developer-id" optional>開発者ID</FormLabel>
                <div className={PREFIX_INPUT_WRAPPER_CLASS}>
                  <span className={PREFIX_TEXT_CLASS}>@</span>
                  <div className="relative flex min-w-0 flex-1 items-center">
                    <input
                      id="developer-id"
                      type="text"
                      value={developerId}
                      onChange={(e) => {
                        setDeveloperId(e.target.value.toLowerCase());
                        setServerError(null);
                      }}
                      placeholder="my-handle"
                      className={PREFIX_INPUT_CLASS}
                    />
                    {checking && (
                      <SpinnerIcon className="pointer-events-none absolute right-2 h-4 w-4 animate-spin text-zinc-400 dark:text-zinc-500" />
                    )}
                  </div>
                </div>
                {(developerError || serverError) && <p className={FORM_ERROR_CLASS}>{developerError || serverError}</p>}
              </div>
              <div>
                <FormLabel htmlFor="description">説明</FormLabel>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="自己紹介や経歴など"
                  rows={3}
                  className={FORM_INPUT_CLASS}
                />
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
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
