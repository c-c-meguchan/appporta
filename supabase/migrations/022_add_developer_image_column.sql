-- developer_profiles テーブルに開発者画像のカラムを追加

ALTER TABLE developer_profiles ADD COLUMN IF NOT EXISTS developer_image text;