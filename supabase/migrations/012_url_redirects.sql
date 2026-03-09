-- 公開URL変更時の旧URL→新URLリダイレクト（30日間、直前のURLのみ保持）
CREATE TABLE IF NOT EXISTS url_redirects (
  from_app_id text PRIMARY KEY,
  to_app_id text NOT NULL,
  expires_at timestamptz NOT NULL
);

COMMENT ON TABLE url_redirects IS 'URL変更後、旧URLから新URLへのリダイレクト。30日間有効。直前のURLのみ保持。';
CREATE INDEX IF NOT EXISTS idx_url_redirects_expires_at ON url_redirects(expires_at);

ALTER TABLE url_redirects ENABLE ROW LEVEL SECURITY;

-- 公開ページでアプリ未発見時にリダイレクト可否を判定するため全員にSELECT許可
CREATE POLICY "url_redirects_select"
  ON url_redirects FOR SELECT
  USING (true);

-- 挿入: 変更元アプリを所有する認証ユーザーのみ
CREATE POLICY "url_redirects_insert"
  ON url_redirects FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM apps
      WHERE apps.app_id = url_redirects.from_app_id
        AND apps.user_id = auth.uid()
    )
  );

-- 削除: 変更元(to_app_id)を所有する認証ユーザーのみ（直前のみ保持のため旧リダイレクト削除）
CREATE POLICY "url_redirects_delete"
  ON url_redirects FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM apps
      WHERE apps.app_id = url_redirects.to_app_id
        AND apps.user_id = auth.uid()
    )
  );
