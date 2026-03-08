-- メタデータ（OGP等）用カラムを apps に追加
-- Supabase SQL Editor で実行してください。

ALTER TABLE apps ADD COLUMN IF NOT EXISTS meta_title text;
COMMENT ON COLUMN apps.meta_title IS 'ページタイトル（OGP og:title 等）';

ALTER TABLE apps ADD COLUMN IF NOT EXISTS meta_description text;
COMMENT ON COLUMN apps.meta_description IS '説明文（OGP og:description 等）';

ALTER TABLE apps ADD COLUMN IF NOT EXISTS meta_cover_image_url text;
COMMENT ON COLUMN apps.meta_cover_image_url IS 'カバー画像URL（OGP og:image 等）';
