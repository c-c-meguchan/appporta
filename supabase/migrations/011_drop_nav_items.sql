-- ナビセクション削除: apps.nav_items カラムを削除
-- Supabase SQL Editor で実行してください。

ALTER TABLE apps DROP COLUMN IF EXISTS nav_items;
