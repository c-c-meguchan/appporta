-- reviews に公開フラグを追加（デフォルト非公開、開発者がオプトインで公開）
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN reviews.is_public IS '公開ページに表示するかどうか（開発者が選択）';

CREATE INDEX IF NOT EXISTS idx_reviews_app_id_public ON reviews(app_id) WHERE is_public = true;
