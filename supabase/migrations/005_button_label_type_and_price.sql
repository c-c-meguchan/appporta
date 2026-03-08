-- ボタンラベルを「ダウンロード」or「数値」選択、数値時は通貨＋価格
-- Supabase SQL Editor で実行してください。

ALTER TABLE apps ADD COLUMN IF NOT EXISTS button_label_type text DEFAULT 'download';
COMMENT ON COLUMN apps.button_label_type IS 'download = ダウンロード, price = 数値フィールド';

ALTER TABLE apps ADD COLUMN IF NOT EXISTS price_currency text DEFAULT '¥';
COMMENT ON COLUMN apps.price_currency IS '数値時の通貨マーク（¥, $, €, £ 等）';

ALTER TABLE apps ADD COLUMN IF NOT EXISTS price_value text;
COMMENT ON COLUMN apps.price_value IS '数値時の価格（カンマなしで保存、表示時にフォーマット）';
