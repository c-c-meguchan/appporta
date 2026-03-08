-- 関連記事（Featured）セクション用
-- Supabase SQL Editor で実行してください。

ALTER TABLE apps ADD COLUMN IF NOT EXISTS featured_visible boolean DEFAULT false;
ALTER TABLE apps ADD COLUMN IF NOT EXISTS featured_items jsonb DEFAULT '[]'::jsonb;
COMMENT ON COLUMN apps.featured_items IS '関連記事 [{ url, note }]';
