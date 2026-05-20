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
  GAS_URL: 'https://script.google.com/macros/s/AKfycbzeHVcM7ccuEqF424pn0-ksbsQ0fFxvwip-QVkzO2mh-OaXVlvsrvdAkpK-8lP5slizJQ/exec',

  // 合言葉の SHA-256 ハッシュ値（小文字16進64桁）
  // `hash-tool.html` をブラウザで開き、合言葉を入力して生成してください。
  PASSPHRASE_HASH: '158a323a7ba44870f23d96f1516dd70aa48e9a72db4ebb026b0a89e212a208ab',
};
