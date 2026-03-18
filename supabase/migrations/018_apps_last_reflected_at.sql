-- 「公開」または「更新」ボタンで反映した最終時刻（並び順用）
ALTER TABLE apps
  ADD COLUMN IF NOT EXISTS last_reflected_at timestamptz;

COMMENT ON COLUMN apps.last_reflected_at IS '公開/更新で反映した最終時刻（プロジェクト一覧の並び順用）';

