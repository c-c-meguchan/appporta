-- App Porta: セクション対応の apps 拡張と reviews テーブル
-- Supabase SQL Editor で実行してください。

-- ========== apps テーブルにカラム追加 ==========

-- Nav Bar（必須）
ALTER TABLE apps ADD COLUMN IF NOT EXISTS nav_items jsonb DEFAULT '[]'::jsonb;
COMMENT ON COLUMN apps.nav_items IS 'ナビゲーション項目 [{ label, href }]';

-- Hero Header（必須）※ name, catch_copy, icon_url, download_url は既存
ALTER TABLE apps ADD COLUMN IF NOT EXISTS button_label text DEFAULT 'ダウンロード';
ALTER TABLE apps ADD COLUMN IF NOT EXISTS button_color text DEFAULT '#18181b';
ALTER TABLE apps ADD COLUMN IF NOT EXISTS primary_link text;

-- App Specs（必須）
ALTER TABLE apps ADD COLUMN IF NOT EXISTS os_support text;
ALTER TABLE apps ADD COLUMN IF NOT EXISTS apple_silicon boolean DEFAULT true;
ALTER TABLE apps ADD COLUMN IF NOT EXISTS file_size text;

-- Version（任意）
ALTER TABLE apps ADD COLUMN IF NOT EXISTS version_visible boolean DEFAULT false;
ALTER TABLE apps ADD COLUMN IF NOT EXISTS version_number text;
ALTER TABLE apps ADD COLUMN IF NOT EXISTS release_notes jsonb DEFAULT '[]'::jsonb;
COMMENT ON COLUMN apps.release_notes IS '[{ version, body }]';

-- Video（任意）
ALTER TABLE apps ADD COLUMN IF NOT EXISTS video_visible boolean DEFAULT false;
ALTER TABLE apps ADD COLUMN IF NOT EXISTS video_url text;

-- Gallery（任意）
ALTER TABLE apps ADD COLUMN IF NOT EXISTS gallery_visible boolean DEFAULT false;
ALTER TABLE apps ADD COLUMN IF NOT EXISTS gallery_image_urls jsonb DEFAULT '[]'::jsonb;

-- Free Text（任意）
ALTER TABLE apps ADD COLUMN IF NOT EXISTS free_text_visible boolean DEFAULT false;
ALTER TABLE apps ADD COLUMN IF NOT EXISTS free_text_image_url text;
ALTER TABLE apps ADD COLUMN IF NOT EXISTS free_text_markdown text;

-- Users' voice（任意）
ALTER TABLE apps ADD COLUMN IF NOT EXISTS users_voice_visible boolean DEFAULT false;
ALTER TABLE apps ADD COLUMN IF NOT EXISTS users_voice_show_post_button boolean DEFAULT true;
ALTER TABLE apps ADD COLUMN IF NOT EXISTS users_voice_display_order jsonb DEFAULT '[]'::jsonb;
COMMENT ON COLUMN apps.users_voice_display_order IS '表示する review id の並び順';

-- Developer（必須）※ユーザー紐づけ前は直接入力
ALTER TABLE apps ADD COLUMN IF NOT EXISTS developer_icon_url text;
ALTER TABLE apps ADD COLUMN IF NOT EXISTS developer_name text;
ALTER TABLE apps ADD COLUMN IF NOT EXISTS developer_bio text;
ALTER TABLE apps ADD COLUMN IF NOT EXISTS developer_github text;
ALTER TABLE apps ADD COLUMN IF NOT EXISTS developer_x text;
ALTER TABLE apps ADD COLUMN IF NOT EXISTS developer_contact_url text;

-- Support（任意）
ALTER TABLE apps ADD COLUMN IF NOT EXISTS support_visible boolean DEFAULT false;
ALTER TABLE apps ADD COLUMN IF NOT EXISTS buy_me_a_coffee_url text;

-- ========== reviews テーブル（ユーザーの声） ==========

CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id text NOT NULL,
  user_icon_url text,
  user_name text NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reviews_app_id ON reviews(app_id);

-- RLS: アプリのオーナーと認証ユーザーは参照・挿入可能（本番では要調整）
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reviews_select" ON reviews FOR SELECT USING (true);
CREATE POLICY "reviews_insert" ON reviews FOR INSERT WITH CHECK (true);
CREATE POLICY "reviews_update" ON reviews FOR UPDATE USING (true);
CREATE POLICY "reviews_delete" ON reviews FOR DELETE USING (true);

-- ========== primary_link の初期値（既存の download_url をコピー） ==========

UPDATE apps SET primary_link = download_url WHERE primary_link IS NULL AND download_url IS NOT NULL;
