-- ダウンロードボタン色を廃止（黒固定のため）
-- Supabase SQL Editor で実行してください。

ALTER TABLE apps DROP COLUMN IF EXISTS button_color;
