'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { AppPageHeader } from '@/components/AppPageHeader';
import { useAppHeaderData } from '@/hooks/useAppHeaderData';
import { ImageUploadInput } from '@/components/ImageUploadInput';
import { getMainOriginClient } from '@/lib/constants';

const LABEL_CLASS = 'block text-xs font-medium text-zinc-800 dark:text-zinc-200 mb-1';
const INPUT_CLASS =
  'w-full rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-500 focus:bg-zinc-200 focus:ring-[0.7px] focus:ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder:text-zinc-400 dark:focus:bg-zinc-700 dark:focus:ring-zinc-600';

export default function AppSettingsPage() {
  const params = useParams();
  const appID = typeof params.appID === 'string' ? params.appID : '';
  const { isPublished, publicPageUrl, publishing, loading, onPublish, onUnpublish } = useAppHeaderData(appID);

  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [metaCoverImageUrl, setMetaCoverImageUrl] = useState('');
  const [name, setName] = useState('');
  const [catchCopy, setCatchCopy] = useState('');
  const [formLoading, setFormLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchForm = useCallback(async () => {
    if (!appID) return;
    const { data, error } = await supabase
      .from('apps')
      .select('meta_title, meta_description, meta_cover_image_url, name, catch_copy')
      .eq('app_id', appID)
      .maybeSingle();
    if (error) {
      setFormLoading(false);
      return;
    }
    setMetaTitle(String(data?.meta_title ?? ''));
    setMetaDescription(String(data?.meta_description ?? ''));
    setMetaCoverImageUrl(String(data?.meta_cover_image_url ?? ''));
    setName(String(data?.name ?? ''));
    setCatchCopy(String(data?.catch_copy ?? ''));
    setFormLoading(false);
  }, [appID]);

  useEffect(() => {
    fetchForm();
  }, [fetchForm]);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('apps')
      .update({
        meta_title: metaTitle.trim() || null,
        meta_description: metaDescription.trim() || null,
        meta_cover_image_url: metaCoverImageUrl.trim() || null,
      })
      .eq('app_id', appID);
    if (error) console.error(error);
    setSaving(false);
  };

  const publicUrl = publicPageUrl || `${getMainOriginClient()}/${appID}`;

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
            <h1 className="mb-6 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              ページ設定
            </h1>
            {formLoading ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">読み込み中...</p>
            ) : (
              <div className="space-y-6">
                <div>
                  <label className={LABEL_CLASS}>公開URL</label>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    <Link
                      href={publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:no-underline"
                    >
                      {publicUrl}
                    </Link>
                  </p>
                </div>
                <div>
                  <label className={LABEL_CLASS}>ページタイトル</label>
                  <input
                    type="text"
                    value={metaTitle}
                    onChange={(e) => setMetaTitle(e.target.value)}
                    placeholder="OGP・検索結果に表示されるタイトル"
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label className={LABEL_CLASS}>説明文</label>
                  <textarea
                    value={metaDescription}
                    onChange={(e) => setMetaDescription(e.target.value)}
                    placeholder="OGP・検索結果に表示される説明"
                    rows={3}
                    className={INPUT_CLASS}
                  />
                </div>
                <ImageUploadInput
                  label="カバー画像"
                  value={metaCoverImageUrl}
                  onChange={setMetaCoverImageUrl}
                  pathPrefix={`${appID}/meta-cover`}
                />
                <div>
                  <label className={LABEL_CLASS}>OGPプレビュー</label>
                  <div className="mt-1 overflow-hidden rounded-lg border-[0.7px] border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800">
                    <div className="flex">
                      <div className="h-20 w-20 flex-shrink-0 bg-zinc-100 dark:bg-zinc-700">
                        {metaCoverImageUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={metaCoverImageUrl}
                            alt=""
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[10px] text-zinc-400 dark:text-zinc-500">
                            画像なし
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1 p-2">
                        <p className="line-clamp-2 text-xs font-medium text-zinc-900 dark:text-zinc-100">
                          {metaTitle || name || 'ページタイトル'}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-[10px] text-zinc-500 dark:text-zinc-400">
                          {metaDescription || catchCopy || '説明文がここに表示されます'}
                        </p>
                        <p className="mt-1 truncate text-[9px] text-zinc-400 dark:text-zinc-500">
                          {(() => {
                            try {
                              return publicUrl ? new URL(publicUrl).hostname : 'example.com';
                            } catch {
                              return 'example.com';
                            }
                          })()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-lg border-[0.7px] border-zinc-300 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-50 transition hover:bg-zinc-800 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  {saving ? '保存中...' : '保存'}
                </button>
              </div>
            )}
            <p className="mt-8 text-sm text-zinc-600 dark:text-zinc-400">
              <Link href={`/apps/${appID}/edit`} className="underline hover:no-underline">
                エディターへ
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
