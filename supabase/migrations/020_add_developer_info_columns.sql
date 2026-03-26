-- developer_profiles テーブルに開発者情報のカラムを追加

ALTER TABLE developer_profiles ADD COLUMN IF NOT EXISTS developer_name text;
ALTER TABLE developer_profiles ADD COLUMN IF NOT EXISTS developer_bio text;
ALTER TABLE developer_profiles ADD COLUMN IF NOT EXISTS developer_github text;
ALTER TABLE developer_profiles ADD COLUMN IF NOT EXISTS developer_x text;
