-- apps テーブルで URL 変更時に新 app_id で行を挿入できるようにする
-- RLS が有効な場合に INSERT を許可するポリシーを追加（RLS が無効な場合は何もしない）

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'apps' AND n.nspname = 'public' AND c.relrowsecurity
  ) THEN
    DROP POLICY IF EXISTS "apps_insert_own" ON public.apps;
    CREATE POLICY "apps_insert_own"
      ON public.apps
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
