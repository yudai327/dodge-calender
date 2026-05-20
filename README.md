# dodge-calender
# Dodge Calendar セットアップ手順

GitHub Pages + GAS + Googleスプレッドシートで動くカレンダー記録アプリのデプロイ手順です。

- フロント: https://github.com/yudai327/dodge-calender
- スプレッドシート: https://docs.google.com/spreadsheets/d/12IHDZsHMwiZccBxfwCcyY48A5bHCYX-EeGIVQe_JTI0/edit

---

## 0. 配布ファイル一覧

| ファイル | 配置先 | 役割 |
|---|---|---|
| `Code.gs` | GAS（Apps Script） | バックエンドAPI（doGet/doPost） |
| `index.html` | リポジトリのルート | エントリポイント |
| `app.js` | リポジトリのルート | クライアントロジック |
| `style.css` | リポジトリのルート | スタイル |
| `config.example.js` | リポジトリのルート | 設定テンプレート（コミットする） |
| `config.js` | **ローカルだけ** | GAS URL / 合言葉ハッシュ（**コミットしない**） |
| `.gitignore` | リポジトリのルート | `config.js` を除外 |
| `hash-tool.html` | **ローカルだけ** | 合言葉のSHA-256ハッシュを生成する補助ツール |

---

## 1. GAS（バックエンド）のセットアップ

### 1-1. スプレッドシートの準備

1. 既存のスプレッドシート（ID: `12IHDZsHMwiZccBxfwCcyY48A5bHCYX-EeGIVQe_JTI0`）を開く。
2. 共有設定は **「制限付き（自分のみ）」のまま** にしておく（GASがオーナー権限で読み書きするのでOK）。
3. シート名は自動作成されるので何でも良いが、`Code.gs` の `SHEET_NAME = 'records'` と合わせる。
   - 違う名前にしたい場合は `Code.gs` の定数を変更。
   - 初回 `getAll` 実行時にヘッダー行（`id, date, title, ...`）を自動作成します。

### 1-2. Apps Script に Code.gs を配置

1. スプレッドシートの「拡張機能」→「Apps Script」をクリック。
2. デフォルトの `コード.gs` の内容を **全削除** し、配布した `Code.gs` の中身を貼り付け。
3. 上部の保存ボタン（💾）で保存。
4. 関数選択プルダウンから `_selftest` を選び、▷ 実行。
   - 初回は権限承認が必要（自分のGoogleアカウントで許可）。
   - 「実行ログ」に `created: {...}` `count: 1` `updated: ...` `deleted: true` が出ればOK。

### 1-3. Webアプリとしてデプロイ

1. 右上の「デプロイ」→「新しいデプロイ」。
2. 種類（歯車）：**ウェブアプリ**。
3. 設定：
   - 説明：任意（例: `dodge-calendar v1`）
   - 次のユーザーとして実行：**自分**
   - アクセスできるユーザー：**全員**
4. 「デプロイ」をクリック。
5. 表示された **ウェブアプリURL**（`https://script.google.com/macros/s/XXXX/exec` の形）を控える。
6. ブラウザで `（URL）?action=getAll` を開いて `{"ok":true,"data":[]}` が返れば成功。

> **コード修正時の注意**: GASのWebアプリは「新しいデプロイ」or「デプロイを管理」→「編集」→「バージョン: 新しいバージョン」で再デプロイしないと反映されません。

---

## 2. 合言葉ハッシュの生成

1. 配布した `hash-tool.html` をダブルクリックでブラウザで開く（ローカル）。
2. 合言葉を入力すると即座にSHA-256ハッシュが表示される。
3. 「📋 コピー」ボタンでクリップボードへコピー。
4. このハッシュを次の手順 3 の `config.js` に貼る。

> ハッシュ生成はブラウザ内で完結し、外部送信はしません。

---

## 3. フロントエンドのセットアップ

### 3-1. リポジトリへ配置

```bash
# 既存リポジトリをクローン（未取得の場合）
git clone https://github.com/yudai327/dodge-calender.git
cd dodge-calender

# 配布ファイルをコピー
cp /path/to/index.html .
cp /path/to/app.js .
cp /path/to/style.css .
cp /path/to/config.example.js .
cp /path/to/.gitignore .
```

### 3-2. `config.js` を作成（コミット禁止）

```bash
cp config.example.js config.js
```

`config.js` を開き、以下2箇所を埋める：

```js
window.__APP_CONFIG__ = {
  GAS_URL: 'https://script.google.com/macros/s/XXXXXXXX/exec',   // ← 手順1-3 で控えたURL
  PASSPHRASE_HASH: 'a3f1...64桁の小文字16進',                    // ← 手順2 のハッシュ
};
```

> `.gitignore` で `config.js` は除外済みなので `git status` に出ないはず。
> 念のため `git status` で `config.js` が **表示されないこと** を確認。

### 3-3. ローカルで動作確認（任意だが推奨）

```bash
# 任意の静的サーバで起動（CORSの都合上、file:// より http:// が安心）
python3 -m http.server 5500
# → http://localhost:5500/ をブラウザで開く
```

### 3-4. GitHub Pages へ公開

```bash
git add index.html app.js style.css config.example.js .gitignore
git commit -m "feat: initial release"
git push origin main
```

1. GitHub のリポジトリ → Settings → Pages。
2. Source: **Deploy from a branch**、Branch: `main` / `/(root)`、Save。
3. 数十秒待つと `https://yudai327.github.io/dodge-calender/` が公開される。

### 3-5. 公開後の本番動作確認

1. 上記URLをブラウザで開く。
2. 合言葉入力画面 → 合言葉を入力 → カレンダー画面に遷移すれば成功。
3. 日付クリック → モーダルで記録を作成 → スプレッドシートに行が追加されることを確認。

---

## 4. 運用メモ

### 4-1. 合言葉の変更

1. `hash-tool.html` で新ハッシュを生成。
2. `config.js` の `PASSPHRASE_HASH` を更新。
3. `git push`（`config.js` 自体はコミットされないので、ローカル更新だけでOK）。

> ※ 「GitHub Pages公開ホストの `config.js` を差し替える」ということなので、本番反映には別途デプロイ手段（例: GitHub Actionsで `config.js` を組み立てる）を検討すると良い。

### 4-2. GAS のスキーマ追加

`Code.gs` の `HEADERS` 配列に列を追加すれば、スプシ側も初回呼び出し時に拡張されます（既存シートの場合は手動で列追加が必要）。

### 4-3. 困ったとき

| 症状 | 対処 |
|---|---|
| 合言葉が通らない | `hash-tool.html` で再計算し、`config.js` の `PASSPHRASE_HASH` と一字一句一致しているか確認 |
| `{"ok":false,"error":"..."}` | GASの「実行ログ」をチェック |
| カレンダーが空 | `（GAS_URL）?action=getAll` を直接叩いて `data` が返るか確認 |
| 保存できない | デプロイ時に「アクセス：全員」を選んだか、Apps Script の権限承認が完了しているか確認 |
| iframe(YouTube)が表示されない | URLが `youtube.com/watch?v=...` か `youtu.be/...` 形式か確認 |

---

## 5. セキュリティの再掲

- 認証はクライアント側のハッシュ照合のみ。**機密データ用途には使用しない**。
- `config.js` は **絶対にコミットしない**（`.gitignore` で除外済み）。
- スプレッドシートは非公開のまま運用する。
- 合言葉 / GAS URL を知っている人のみアクセス可能。
