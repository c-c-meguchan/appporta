-- testimonials/ フォルダへの画像アップロードを誰でも可能にする
CREATE POLICY "testimonial_images_public_insert"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'app-images'
  AND (storage.foldername(name))[1] = 'testimonials'
);
