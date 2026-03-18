-- 編集の「変更差分」を保持。更新ボタンで apps に反映するまで保持し、プロジェクト離脱後も残す。
CREATE TABLE IF NOT EXISTS app_edit_drafts (
  app_id text PRIMARY KEY REFERENCES apps(app_id) ON DELETE CASCADE,
  draft_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE app_edit_drafts IS 'エディターの未反映変更。更新で apps にマージされると削除';
COMMENT ON COLUMN app_edit_drafts.draft_data IS 'AppFormState の JSON（編集フォーム全体）';

CREATE INDEX IF NOT EXISTS idx_app_edit_drafts_updated_at ON app_edit_drafts(updated_at);

ALTER TABLE app_edit_drafts ENABLE ROW LEVEL SECURITY;

-- 自分のアプリのドラフトのみ操作可能
CREATE POLICY "app_edit_drafts_select_own"
  ON app_edit_drafts FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM apps WHERE apps.app_id = app_edit_drafts.app_id AND apps.user_id = auth.uid())
  );

CREATE POLICY "app_edit_drafts_insert_own"
  ON app_edit_drafts FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM apps WHERE apps.app_id = app_edit_drafts.app_id AND apps.user_id = auth.uid())
  );

CREATE POLICY "app_edit_drafts_update_own"
  ON app_edit_drafts FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM apps WHERE apps.app_id = app_edit_drafts.app_id AND apps.user_id = auth.uid())
  );

CREATE POLICY "app_edit_drafts_delete_own"
  ON app_edit_drafts FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM apps WHERE apps.app_id = app_edit_drafts.app_id AND apps.user_id = auth.uid())
  );
