-- Storage バケット app-images の RLS ポリシー
-- バケットは Supabase ダッシュボードで Public 作成済みであること。
-- 認証ユーザーがアップロード・更新・削除、誰でも参照可能にします。

-- 認証ユーザー: アップロード（INSERT）を許可
CREATE POLICY "app_images_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'app-images');

-- 認証ユーザー: 更新（UPDATE）を許可（画像差し替え用）
CREATE POLICY "app_images_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'app-images')
WITH CHECK (bucket_id = 'app-images');

-- 認証ユーザー: 削除（DELETE）を許可
CREATE POLICY "app_images_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'app-images');

-- 誰でも: 参照（SELECT）を許可（公開URL表示のため）
CREATE POLICY "app_images_select"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'app-images');
