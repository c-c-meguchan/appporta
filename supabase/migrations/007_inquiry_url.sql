-- お問い合わせセクション用（mailto / Googleフォーム等のURL）
ALTER TABLE apps ADD COLUMN IF NOT EXISTS inquiry_url text;
ALTER TABLE apps ADD COLUMN IF NOT EXISTS inquiry_visible boolean DEFAULT false;
