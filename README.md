# HeadSpa 予約サイト

ヘッドスパサロン向けの予約管理システム。LINEからのリンク先として使用可能。

## 技術スタック

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: SQLite (better-sqlite3)
- **Google連携**: Google Calendar API

## セットアップ

```bash
cd headspa-booking
npm install
npm run dev
```

http://localhost:3000 でアクセス可能。

## 管理者ログイン

- URL: http://localhost:3000/admin/login
- Email: `admin@headspa.com`
- Password: `headspa2024`

`.env.local` で変更可能。

## 環境変数

`.env.local` を編集:

```env
ADMIN_EMAIL=admin@headspa.com
ADMIN_PASSWORD=headspa2024
JWT_SECRET=your-super-secret-jwt-key-change-this
```

## Google Calendar 連携（任意）

1. [Google Cloud Console](https://console.cloud.google.com/) でプロジェクト作成
2. Google Calendar API を有効化
3. 「認証情報」→「OAuth 2.0 クライアント ID」を作成
   - アプリケーションの種類: ウェブアプリケーション
   - 承認済みリダイレクト URI: `http://localhost:3000/api/auth/callback/google`
4. `.env.local` に設定:

```env
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback/google
GOOGLE_CALENDAR_ID=primary
GOOGLE_ACCESS_TOKEN=your-access-token
GOOGLE_REFRESH_TOKEN=your-refresh-token
```

Google連携が未設定でも予約機能は正常に動作します（DB のみで管理）。

## 管理画面の機能

| カテゴリ | 内容 |
|---------|------|
| サロン情報 | 店名・キャッチコピー・テーマカラー・連絡先 |
| メニュー管理 | 追加/編集/削除・料金・時間・ドラッグ並び替え |
| 営業時間 | 曜日ごとの営業時間・定休日・特別休業日 |
| 予約ルール | 予約枠間隔・同時受付数・受付期間 |
| Google連携 | Googleカレンダー接続設定 |

## データベース

SQLite ファイルは `data/headspa.db` に自動作成されます。
初回起動時にテーブルと初期データが自動投入されます。
