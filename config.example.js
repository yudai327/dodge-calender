/**
 * 設定ファイルのテンプレート
 *
 * このファイルを `config.js` にコピーして、値を埋めてください。
 *   $ cp config.example.js config.js
 *
 * `config.js` は .gitignore 対象です。リポジトリには含めません。
 */
window.__APP_CONFIG__ = {
  // GAS Web アプリのデプロイURL（/exec で終わるもの）
  GAS_URL: 'https://script.google.com/macros/s/XXXXXXXXXXXXXXXXXXXXXXXX/exec',

  // 合言葉の SHA-256 ハッシュ値（小文字16進64桁）
  // `hash-tool.html` をブラウザで開き、合言葉を入力して生成してください。
  PASSPHRASE_HASH: 'PUT_SHA256_HASH_HERE',
};
