-- 既存の apps テーブルの開発者データを developer_profiles に移行

-- developer_profiles が存在しない場合は作成（既に存在するはず）
INSERT INTO developer_profiles (user_id, developer_id, developer_image, developer_name, developer_bio, updated_at)
SELECT
  user_id,
  developer_id,
  developer_icon_url,
  developer_name,
  developer_bio,
  NOW()
FROM apps
WHERE developer_id IS NOT NULL AND developer_id != ''
ON CONFLICT (user_id) DO UPDATE SET
  developer_id = EXCLUDED.developer_id,
  developer_image = EXCLUDED.developer_image,
  developer_name = EXCLUDED.developer_name,
  developer_bio = EXCLUDED.developer_bio,
  updated_at = EXCLUDED.updated_at;