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
  GAS_URL: 'https://script.google.com/macros/s/AKfycbxNrPKNHW9tD9xGGqINmm114ua-Q2obzIG2QNFBmD6kb4yRVzjnmxH7MOLHUTcwNrHlIw/exec',

  // 合言葉の SHA-256 ハッシュ値（小文字16進64桁）
  // `hash-tool.html` をブラウザで開き、合言葉を入力して生成してください。
  PASSPHRASE_HASH: 'b571be147b163b11fd728cf1306b25c466c4f864ace83376e6c41bc831709544',
};
