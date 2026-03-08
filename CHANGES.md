# 仕様反映：変更箇所・意図の報告

## 1. 画面・パス構成（仕様どおり）

| 画面 | URL | 対応ファイル |
|------|-----|--------------|
| トップ（LP） | appporta.com/ | ホストで分岐: メイン → `LPPage`、studio → `StudioHome` |
| ログイン | studio.appporta.com/login | `src/app/login/page.tsx` |
| サインアップ | studio.appporta.com/signup | `src/app/signup/page.tsx`（新規） |
| ウェルカム | studio.appporta.com/welcome | `src/app/welcome/page.tsx`（新規） |
| ホーム（プロジェクト一覧） | studio.appporta.com/ | ルートで `StudioHome` 表示 |
| 設定 | studio.appporta.com/settings | `src/app/settings/page.tsx`（新規） |
| 開発者プロフィール | studio.appporta.com/profile | `src/app/profile/page.tsx`（新規） |
| LP編集 | studio.appporta.com/apps/{appID}/edit | `src/app/apps/[appID]/edit/page.tsx`（studio/[appID]/edit から移動） |
| LPダッシュボード | studio.appporta.com/apps/{appID}/dashboard | `src/app/apps/[appID]/dashboard/page.tsx`（新規） |
| 公開LP | appporta.com/{appID} | `src/app/[appID]/page.tsx`（app/app/[appID] から変更） |
| 公開開発者詳細 | appporta.com/@{developerID} | Middleware で `/@id` → `/developer/id` に rewrite、`src/app/developer/[developerID]/page.tsx` |
| 利用規約 | appporta.com/terms | `src/app/terms/page.tsx`（新規） |
| プライバシーポリシー | appporta.com/privacy | `src/app/privacy/page.tsx`（新規） |

---

## 2. 変更・追加したファイルと意図

### 2.1 サブドメイン・リダイレクト（Middleware）

- **追加: `src/middleware.ts`**
  - **意図**: ホストで appporta.com / studio.appporta.com を振り分け。
  - `studio.appporta.com` のとき: `/terms`, `/privacy`, `/developer/*` はメインへリダイレクト。
  - メインのとき: `/login`, `/signup`, `/welcome`, `/settings`, `/profile`, `/apps/*`, `/studio`, `/studio/*` は studio へリダイレクト。
  - メインで `/@xxx` にアクセスしたときは `/developer/xxx` に **rewrite**（URL は `appporta.com/@xxx` のまま）。

### 2.2 定数・予約語

- **追加: `src/lib/constants.ts`**
  - **意図**: `/{appID}` で使えない予約語を一覧化。
  - `RESERVED_APP_IDS`（login, signup, studio, terms, privacy, about, blog, docs, api, pricing, contact, support, jobs, careers, status, press, security, legal）。
  - `isStudioHost()` / `isMainHost()` でサブドメイン判定。
  - `getStudioOrigin()` / `getMainOrigin()` でリダイレクト先 URL を生成。
  - `getMainOriginClient()` はクライアント用（編集画面の「公開URL」表示で使用）。

### 2.3 共通 types（編集・公開で共有）

- **追加: `src/lib/app-edit-types.ts`**
  - **意図**: 編集画面と公開LP・`app-page-data` で同じ型を使うため、`studio/[appID]/edit/types.ts` の内容を共通化。
- **削除: `src/app/studio/[appID]/edit/types.ts`**
  - 上記に統合したため削除。

### 2.4 ルート構成の変更

- **公開LP**
  - **削除**: `src/app/app/[appID]/page.tsx`
  - **追加**: `src/app/[appID]/page.tsx`
  - **意図**: 公開LP を `appporta.com/{appID}` にするため。予約語のときは `notFound()` で 404。
- **LP編集**
  - **削除**: `src/app/studio/[appID]/edit/page.tsx`
  - **追加**: `src/app/apps/[appID]/edit/page.tsx`
  - **意図**: 編集を `studio.appporta.com/apps/{appID}/edit` にするため。公開URLは `getMainOriginClient() + '/' + appID`（appporta.com/{appID}）に変更。
- **Studio ホーム**
  - **削除**: `src/app/studio/page.tsx`
  - **意図**: ルート `/` をホストで分岐するため。studio のときは `StudioHome` を表示するので、`/studio` のルートは不要。

### 2.5 ルートページのホスト分岐

- **変更: `src/app/page.tsx`**
  - **意図**: トップをドメインで出し分け。
  - `headers().get('host')` で `isStudioHost(host)` なら `<StudioHome />`、そうでなければ `<LPPage />`。

### 2.6 登録導線（LP → サインアップ → ウェルカム）

- **追加: `src/components/LPPage.tsx`**
  - **意図**: メインのLP。「あなたのアプリ名を取得」フォームで入力 → サインアップへ（クエリ `app_id` 付き）。ローカルは `studio.localhost` 向けにリンク生成。
- **追加: `src/components/StudioHome.tsx`**
  - **意図**: studio のホーム。プロジェクト作成フォーム。作成後は `/apps/{appID}/edit` へ遷移。
- **変更: `src/app/login/page.tsx`**
  - **意図**: 認証後のリダイレクトを `/studio` から `/` に変更（studio のホームへ）。
- **追加: `src/app/signup/page.tsx`**
  - **意図**: サインアップ。クエリ `app_id` があれば保持し、認証後は `/welcome?app_id=...` へ。
- **追加: `src/app/welcome/page.tsx`**
  - **意図**: 認証後のウェルカム。アプリID（クエリで渡されたもの or 入力）・開発者ID・アプリ名を入力し、かぶり判定（アプリIDのみ実装）のうえで `apps` に 1 件 insert し、`/apps/{appID}/edit` へ。開発者IDのかぶり判定は「準備中」扱いでコメントのみ。

### 2.7 その他スタブ・既存修正

- **追加**: `src/app/settings/page.tsx`, `src/app/profile/page.tsx`, `src/app/apps/[appID]/dashboard/page.tsx`, `src/app/terms/page.tsx`, `src/app/privacy/page.tsx`, `src/app/developer/[developerID]/page.tsx`
  - **意図**: 仕様のパスを確保。内容は「準備中」などのスタブ。
- **変更: `src/lib/app-page-data.ts`**
  - **意図**: `appRowToFormState` の戻りに `meta_title`, `meta_description`, `meta_cover_image_url` を追加（公開LP・OGP用）。
- **変更: `src/components/app-page-view/AppPageView.tsx`**
  - **意図**: `focusedSectionId` の型を `SectionId | null | undefined` に合わせて `SectionWrapper` 側を修正（型エラー解消）。

---

## 3. 意図的に仕様と違えた点・補足

1. **開発者IDのかぶり判定**
   - 仕様: ウェルカムで「開発者ID」のかぶり判定。
   - 現状: アプリIDのかぶり判定のみ実装。開発者IDは入力欄と説明文のみで、DB/バリデーションは未実装（「かぶり判定は準備中」とコメント）。

2. **LP の「ログイン」リンク**
   - 本番: `https://studio.appporta.com/login`。
   - ローカル: `http://studio.localhost:3000/login` のように動的生成（`getStudioLoginHref()`）。

3. **Next.js の middleware 警告**
   - ビルド時に "The middleware file convention is deprecated. Please use proxy instead." が出ます。Next.js 16 の新推奨に合わせる場合は、後日 `proxy` への移行が必要です。

---

## 4. ローカルでサブドメインを試す場合

- **studio**: `http://studio.localhost:3000` でアクセス（多くの環境でそのまま利用可能）。
- **メイン**: `http://localhost:3000` のまま。

以上が今回の変更箇所と意図です。
