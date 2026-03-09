-- 公開URL変更予定を保持（更新ボタンで反映）
ALTER TABLE apps ADD COLUMN IF NOT EXISTS pending_app_id text;
COMMENT ON COLUMN apps.pending_app_id IS '更新確定前の公開URLスラッグ。NULLのときは app_id がそのまま公開URL';
