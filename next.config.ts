import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // プロジェクトルートを明示（親の package-lock 検出警告を防ぐ）
  outputFileTracingRoot: path.join(process.cwd()),
};

export default nextConfig;
