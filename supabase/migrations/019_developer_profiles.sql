-- 開発者プロフィール（@developerID）をユーザー単位で一意管理

CREATE TABLE IF NOT EXISTS developer_profiles (
  user_id uuid PRIMARY KEY,
  developer_id text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE developer_profiles IS '公開URL /@developer_id 用の開発者ID。ユーザー単位で一意。';

ALTER TABLE developer_profiles ENABLE ROW LEVEL SECURITY;

-- 公開ページで参照するため全員に SELECT 許可（developer_id -> user_id の対応は公開情報扱い）
DROP POLICY IF EXISTS "developer_profiles_select" ON developer_profiles;
CREATE POLICY "developer_profiles_select"
  ON developer_profiles FOR SELECT
  USING (true);

-- 作成/更新は本人のみ
DROP POLICY IF EXISTS "developer_profiles_insert_own" ON developer_profiles;
CREATE POLICY "developer_profiles_insert_own"
  ON developer_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "developer_profiles_update_own" ON developer_profiles;
CREATE POLICY "developer_profiles_update_own"
  ON developer_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

