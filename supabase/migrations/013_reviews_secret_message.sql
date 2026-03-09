-- reviews テーブルに開発者への秘密メッセージカラムを追加
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS secret_message text;
COMMENT ON COLUMN reviews.secret_message IS '開発者への秘密のメッセージ（非公開）';
