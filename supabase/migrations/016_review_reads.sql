-- ユーザーの声の既読管理（カード単位の新着表示用）
-- 拡張性: 将来コラボ時に user_id を追加可能

CREATE TABLE IF NOT EXISTS review_reads (
  app_id text NOT NULL,
  review_id uuid NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (app_id, review_id)
);

COMMENT ON TABLE review_reads IS 'レビュー（ユーザーの声）の既読状態。現状はプロジェクト単位。将来 user_id を追加してユーザー別既読に対応可能';

CREATE INDEX IF NOT EXISTS idx_review_reads_app_id ON review_reads(app_id);

ALTER TABLE review_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "review_reads_select" ON review_reads;
DROP POLICY IF EXISTS "review_reads_insert" ON review_reads;
DROP POLICY IF EXISTS "review_reads_update" ON review_reads;
DROP POLICY IF EXISTS "review_reads_delete" ON review_reads;

CREATE POLICY "review_reads_select" ON review_reads FOR SELECT USING (true);
CREATE POLICY "review_reads_insert" ON review_reads FOR INSERT WITH CHECK (true);
CREATE POLICY "review_reads_update" ON review_reads FOR UPDATE USING (true);
CREATE POLICY "review_reads_delete" ON review_reads FOR DELETE USING (true);
