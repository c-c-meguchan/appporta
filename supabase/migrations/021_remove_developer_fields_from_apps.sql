-- apps テーブルの開発者セクション関連カラムは、developer_profiles に統合されたため不要
ALTER TABLE apps DROP COLUMN IF EXISTS developer_icon_url;
ALTER TABLE apps DROP COLUMN IF EXISTS developer_name;
ALTER TABLE apps DROP COLUMN IF EXISTS developer_bio;
ALTER TABLE apps DROP COLUMN IF EXISTS developer_github;
ALTER TABLE apps DROP COLUMN IF EXISTS developer_x;
ALTER TABLE apps DROP COLUMN IF EXISTS developer_contact_url;

-- 必要に応じて developer_profiles 自体を廃止する場合は以下を実行（現状は使用中のためコメントアウト）
-- DROP TABLE IF EXISTS developer_profiles;