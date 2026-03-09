-- BMC (Buy Me a Coffee) ボタンのカスタマイズ設定を保存する jsonb カラム
ALTER TABLE apps ADD COLUMN IF NOT EXISTS bmc_button_config jsonb;
