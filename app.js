/* =====================================================
 * Dodge Calendar - app.js
 * 仕様書 v1.0 準拠
 * ===================================================== */

// ====== 設定取得 ======
const CONFIG = window.__APP_CONFIG__ || {};
const GAS_URL = CONFIG.GAS_URL || '';
// 合言葉のSHA-256ハッシュ（hash-tool.htmlで生成して config.js に貼り付け）
const PASSPHRASE_HASH = (CONFIG.PASSPHRASE_HASH || '').toLowerCase();
const SESSION_KEY = 'dodge-calendar-auth';
const ALLOWED_IFRAME_HOST = 'www.youtube.com';

// ====== 状態 ======
const State = {
  records: [],   // 全レコード（メモリキャッシュ）
  byDate: new Map(), // date -> records[]
  fuse: null,
  calendar: null,
};

// ====== エントリ ======
document.addEventListener('DOMContentLoaded', () => {
  if (!GAS_URL || !PASSPHRASE_HASH) {
    alert('config.js が見つからないか、未設定です。SETUP.md を参照して config.js を作成してください。');
    return;
  }
  initAuth();
});

// =====================================================
// 認証
// =====================================================
function initAuth() {
  const isAuthed = sessionStorage.getItem(SESSION_KEY) === '1';
  if (isAuthed) {
    showMain();
    return;
  }
  showAuth();

  const form = document.getElementById('auth-form');
  const input = document.getElementById('auth-input');
  const errEl = document.getElementById('auth-error');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errEl.classList.add('hidden');
    const value = input.value;
    const hash = await sha256Hex(value);
    if (hash === PASSPHRASE_HASH) {
      sessionStorage.setItem(SESSION_KEY, '1');
      input.value = '';
      showMain();
    } else {
      errEl.classList.remove('hidden');
      input.select();
    }
  });
}

function showAuth() {
  document.getElementById('auth-view').classList.remove('hidden');
  document.getElementById('main-view').classList.add('hidden');
}

function showMain() {
  document.getElementById('auth-view').classList.add('hidden');
  document.getElementById('main-view').classList.remove('hidden');
  initTabs();
  initLogout();
  initModal();
  loadAndRender();
}

async function sha256Hex(text) {
  const buf = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', buf);
  const arr = Array.from(new Uint8Array(digest));
  return arr.map(b => b.toString(16).padStart(2, '0')).join('');
}

// =====================================================
// 画面遷移
// =====================================================
function initTabs() {
  const tabs = document.querySelectorAll('.tab[data-tab]');
  tabs.forEach(t => {
    t.addEventListener('click', () => {
      tabs.forEach(x => x.classList.toggle('active', x === t));
      const target = t.dataset.tab;
      document.getElementById('panel-calendar').classList.toggle('hidden', target !== 'calendar');
      document.getElementById('panel-search').classList.toggle('hidden', target !== 'search');
      if (target === 'calendar' && State.calendar) {
        // パネル切替後にレイアウト崩れを防ぐ
        setTimeout(() => State.calendar.updateSize(), 50);
      }
      if (target === 'search') {
        document.getElementById('search-input').focus();
      }
    });
  });
}

function initLogout() {
  document.getElementById('logout-btn').addEventListener('click', () => {
    if (!confirm('ログアウトしますか？')) return;
    sessionStorage.removeItem(SESSION_KEY);
    location.reload();
  });
}

// =====================================================
// データ取得
// =====================================================
async function loadAndRender() {
  try {
    const records = await api({ method: 'GET', query: { action: 'getAll' } });
    setRecords(records);
    initCalendar();
    initSearch();
  } catch (e) {
    console.error(e);
    alert('データ取得に失敗しました: ' + (e && e.message || e));
  }
}

function setRecords(records) {
  State.records = Array.isArray(records) ? records.slice() : [];
  State.byDate = new Map();
  for (const r of State.records) {
    const list = State.byDate.get(r.date) || [];
    list.push(r);
    State.byDate.set(r.date, list);
  }
  // fuse.js
  State.fuse = new Fuse(State.records, {
    keys: ['title', 'text', 'opponent'],
    includeMatches: true,
    threshold: 0.4,
    ignoreLocation: true,
    minMatchCharLength: 1,
  });
}

// =====================================================
// API（GAS通信）
// =====================================================
async function api({ method = 'GET', query, body }) {
  let url = GAS_URL;
  if (query) {
    const q = new URLSearchParams(query).toString();
    url += (url.includes('?') ? '&' : '?') + q;
  }
  const init = { method };
  if (body) {
    // GAS の doPost は preflight を嫌うので text/plain で送る
    init.headers = { 'Content-Type': 'text/plain;charset=utf-8' };
    init.body = JSON.stringify(body);
  }
  const res = await fetch(url, init);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || 'unknown error');
  return json.data;
}

// =====================================================
// カレンダー
// =====================================================
function initCalendar() {
  const el = document.getElementById('calendar');
  if (State.calendar) State.calendar.destroy();
  State.calendar = new FullCalendar.Calendar(el, {
    locale: 'ja',
    initialView: 'dayGridMonth',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: '',
    },
    height: 'auto',
    events: buildEvents(),
    dateClick: (info) => openDateModal(info.dateStr),
    eventClick: (info) => {
      const date = info.event.startStr;
      openDateModal(date);
    },
  });
  State.calendar.render();
}

function buildEvents() {
  const events = [];
  for (const [date, list] of State.byDate.entries()) {
    if (list.length === 1) {
      events.push({ title: list[0].title, start: date, allDay: true });
    } else {
      events.push({
        title: list[0].title + ' (+' + (list.length - 1) + ')',
        start: date,
        allDay: true,
      });
    }
  }
  return events;
}

function refreshCalendar() {
  if (!State.calendar) return;
  State.calendar.removeAllEvents();
  for (const ev of buildEvents()) State.calendar.addEvent(ev);
}

// =====================================================
// 検索
// =====================================================
function initSearch() {
  const inputEl = document.getElementById('search-input');
  const fromEl = document.getElementById('search-from');
  const toEl = document.getElementById('search-to');
  const resultsEl = document.getElementById('search-results');

  const run = debounce(() => {
    const keyword = inputEl.value.trim();
    const from = fromEl.value;
    const to = toEl.value;

    let matches;
    if (keyword) {
      matches = State.fuse.search(keyword);
    } else {
      // キーワードなしのときは全件（更新日降順）
      matches = State.records
        .slice()
        .sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''))
        .map(item => ({ item, matches: [] }));
    }

    if (from || to) {
      matches = matches.filter(m => {
        const d = m.item.date;
        if (from && d < from) return false;
        if (to && d > to) return false;
        return true;
      });
    }

    renderResults(resultsEl, matches, keyword);
  }, 300);

  inputEl.addEventListener('input', run);
  fromEl.addEventListener('change', run);
  toEl.addEventListener('change', run);
  run();
}

function renderResults(container, matches, keyword) {
  container.innerHTML = '';
  if (!matches.length) {
    container.innerHTML = '<div class="loading">該当する記録はありません</div>';
    return;
  }
  const frag = document.createDocumentFragment();
  for (const m of matches) {
    const r = m.item;
    const card = document.createElement('div');
    card.className = 'result-card';
    card.addEventListener('click', () => openDateModal(r.date));

    const title = highlightText(r.title, m.matches, 'title', keyword);
    const text = highlightText(truncate(r.text, 200), m.matches, 'text', keyword);
    const opponent = highlightText(r.opponent, m.matches, 'opponent', keyword);

    const meta = document.createElement('div');
    meta.className = 'result-meta';
    meta.innerHTML = DOMPurify.sanitize(
      `<span>📅 ${escapeHTML(r.date)}</span>` +
      (opponent ? `<span>🆚 ${opponent}</span>` : '')
    );

    const h3 = document.createElement('h3');
    h3.innerHTML = DOMPurify.sanitize(title);

    card.appendChild(meta);
    card.appendChild(h3);
    if (text) {
      const p = document.createElement('p');
      p.innerHTML = DOMPurify.sanitize(text);
      card.appendChild(p);
    }
    if (r.youtube_url) {
      const link = document.createElement('p');
      link.innerHTML = `<a href="${escapeAttr(r.youtube_url)}" target="_blank" rel="noopener">▶ YouTubeを開く</a>`;
      card.appendChild(link);
    }
    frag.appendChild(card);
  }
  container.appendChild(frag);
}

function highlightText(value, matchList, key, keyword) {
  if (!value) return '';
  let safe = escapeHTML(value);
  // 1) fuse.js の match 情報があれば使う
  const m = matchList && matchList.find(x => x.key === key);
  if (m && m.indices && m.indices.length) {
    safe = applyIndices(value, m.indices);
    return safe;
  }
  // 2) 単純な部分一致でハイライト
  if (keyword) {
    const re = new RegExp(escapeRegex(keyword), 'gi');
    safe = safe.replace(re, (s) => `<mark class="highlight">${s}</mark>`);
  }
  return safe;
}

function applyIndices(original, indices) {
  // indices: [[start, end], ...] inclusive
  let result = '';
  let cursor = 0;
  const sorted = indices.slice().sort((a, b) => a[0] - b[0]);
  for (const [s, e] of sorted) {
    if (s > cursor) result += escapeHTML(original.slice(cursor, s));
    result += `<mark class="highlight">${escapeHTML(original.slice(s, e + 1))}</mark>`;
    cursor = e + 1;
  }
  if (cursor < original.length) result += escapeHTML(original.slice(cursor));
  return result;
}

// =====================================================
// モーダル：日付詳細
// =====================================================
function initModal() {
  const overlay = document.getElementById('modal-overlay');
  document.getElementById('modal-close').addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
}

function openModal(html) {
  const overlay = document.getElementById('modal-overlay');
  document.getElementById('modal-content').innerHTML = DOMPurify.sanitize(html, {
    ADD_TAGS: ['iframe'],
    ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'src'],
  });
  overlay.classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

function openDateModal(dateStr) {
  const list = State.byDate.get(dateStr) || [];
  const html = `
    <h2>${escapeHTML(dateStr)} の記録</h2>
    <div class="record-list">
      ${list.length ? list.map(renderRecordItem).join('') : '<p class="muted">この日付の記録はまだありません。</p>'}
    </div>
    <hr class="divider" />
    <h3>新規追加</h3>
    ${renderRecordForm({ date: dateStr })}
  `;
  openModal(html);
  bindFormHandlers(dateStr);
  bindRecordItemHandlers();
  bindPreviewHandler('new');
}

function renderRecordItem(r) {
  const embed = buildYoutubeEmbed(r.youtube_url);
  return `
    <div class="record-item" data-id="${escapeAttr(r.id)}">
      <h3>${escapeHTML(r.title)}</h3>
      <div class="row">
        ${r.opponent ? `<span>🆚 ${escapeHTML(r.opponent)}</span>` : ''}
        <span class="muted">更新: ${escapeHTML((r.updated_at || '').slice(0, 19).replace('T', ' '))}</span>
      </div>
      ${r.text ? `<div>${escapeHTML(r.text).replace(/\n/g, '<br/>')}</div>` : ''}
      ${embed || (r.youtube_url ? `<p><a href="${escapeAttr(r.youtube_url)}" target="_blank" rel="noopener">${escapeHTML(r.youtube_url)}</a></p>` : '')}
      <div class="actions">
        <button class="btn-edit" data-id="${escapeAttr(r.id)}">編集</button>
        <button class="danger btn-delete" data-id="${escapeAttr(r.id)}">削除</button>
      </div>
    </div>
  `;
}

function renderRecordForm(rec) {
  const isEdit = !!rec.id;
  const prefix = isEdit ? 'edit-' + rec.id : 'new';
  return `
    <form class="form-grid" data-form="${isEdit ? 'edit' : 'create'}" data-id="${escapeAttr(rec.id || '')}">
      <label>日付
        <input type="date" name="date" value="${escapeAttr(rec.date || '')}" required />
      </label>
      <label>タイトル <span style="color:var(--danger)">*</span>
        <input type="text" name="title" value="${escapeAttr(rec.title || '')}" required maxlength="200" />
      </label>
      <label>本文
        <textarea name="text">${escapeHTML(rec.text || '')}</textarea>
      </label>
      <label>対戦相手
        <input type="text" name="opponent" value="${escapeAttr(rec.opponent || '')}" maxlength="200" />
      </label>
      <label>YouTube URL
        <input type="url" name="youtube_url" value="${escapeAttr(rec.youtube_url || '')}" data-preview="${prefix}" placeholder="https://youtu.be/..." />
      </label>
      <div class="preview-label">プレビュー</div>
      <div class="iframe-preview" id="preview-${prefix}">${buildYoutubeEmbed(rec.youtube_url) || '<div class="muted">URL未入力</div>'}</div>
      <div class="form-actions">
        ${isEdit ? '<button type="button" class="btn btn-ghost btn-cancel-edit">キャンセル</button>' : ''}
        <button type="submit" class="btn btn-primary">${isEdit ? '更新' : '保存'}</button>
      </div>
    </form>
  `;
}

function bindRecordItemHandlers() {
  document.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const rec = State.records.find(r => r.id === id);
      if (!rec) return;
      const item = btn.closest('.record-item');
      item.innerHTML = renderRecordForm(rec);
      bindEditFormHandlers(item, rec);
      bindPreviewHandler('edit-' + rec.id);
    });
  });
  document.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const rec = State.records.find(r => r.id === id);
      if (!rec) return;
      if (!confirm(`「${rec.title}」を削除しますか？`)) return;
      try {
        await api({ method: 'POST', body: { action: 'delete', id } });
        // ローカルから消す
        State.records = State.records.filter(r => r.id !== id);
        recomputeIndex();
        refreshCalendar();
        openDateModal(rec.date);
      } catch (e) {
        alert('削除に失敗しました: ' + e.message);
      }
    });
  });
}

function bindFormHandlers(dateStr) {
  const form = document.querySelector('form[data-form="create"]');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = readForm(form);
    payload.action = 'create';
    try {
      const created = await api({ method: 'POST', body: payload });
      State.records.push(created);
      recomputeIndex();
      refreshCalendar();
      openDateModal(payload.date || dateStr);
    } catch (e) {
      alert('保存に失敗しました: ' + e.message);
    }
  });
}

function bindEditFormHandlers(itemEl, rec) {
  const form = itemEl.querySelector('form[data-form="edit"]');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = readForm(form);
    payload.action = 'update';
    payload.id = rec.id;
    try {
      const updated = await api({ method: 'POST', body: payload });
      const idx = State.records.findIndex(r => r.id === rec.id);
      if (idx >= 0) State.records[idx] = updated;
      recomputeIndex();
      refreshCalendar();
      openDateModal(updated.date);
    } catch (e) {
      alert('更新に失敗しました: ' + e.message);
    }
  });
  const cancel = itemEl.querySelector('.btn-cancel-edit');
  if (cancel) cancel.addEventListener('click', () => openDateModal(rec.date));
}

function bindPreviewHandler(prefix) {
  const input = document.querySelector(`[data-preview="${prefix}"]`);
  if (!input) return;
  const target = document.getElementById('preview-' + prefix);
  if (!target) return;
  input.addEventListener('input', () => {
    const html = buildYoutubeEmbed(input.value);
    target.innerHTML = DOMPurify.sanitize(html || '<div class="muted">URL未入力</div>', {
      ADD_TAGS: ['iframe'],
      ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'src'],
    });
  });
}

function readForm(form) {
  const obj = {};
  new FormData(form).forEach((v, k) => { obj[k] = String(v); });
  return obj;
}

function recomputeIndex() {
  State.byDate = new Map();
  for (const r of State.records) {
    const list = State.byDate.get(r.date) || [];
    list.push(r);
    State.byDate.set(r.date, list);
  }
  // fuse 再構築
  State.fuse = new Fuse(State.records, {
    keys: ['title', 'text', 'opponent'],
    includeMatches: true,
    threshold: 0.4,
    ignoreLocation: true,
    minMatchCharLength: 1,
  });
}

// =====================================================
// YouTube 埋め込み
// =====================================================
function extractYoutubeId(url) {
  if (!url) return '';
  try {
    const u = new URL(url);
    if (u.hostname === 'youtu.be') {
      return u.pathname.replace(/^\//, '').split('/')[0] || '';
    }
    if (u.hostname.endsWith('youtube.com')) {
      if (u.pathname === '/watch') {
        return u.searchParams.get('v') || '';
      }
      // /embed/XXX や /shorts/XXX
      const m = u.pathname.match(/\/(embed|shorts|v)\/([A-Za-z0-9_-]{6,})/);
      if (m) return m[2];
    }
  } catch (_) { /* invalid url */ }
  return '';
}

function buildYoutubeEmbed(url) {
  const id = extractYoutubeId(url);
  if (!id || !/^[A-Za-z0-9_-]{6,}$/.test(id)) return '';
  const src = `https://${ALLOWED_IFRAME_HOST}/embed/${id}`;
  return `<div class="iframe-wrap"><iframe src="${src}" allowfullscreen allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe></div>`;
}

// =====================================================
// ユーティリティ
// =====================================================
function escapeHTML(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
function escapeAttr(s) { return escapeHTML(s); }
function escapeRegex(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function truncate(s, n) {
  if (!s) return '';
  return s.length > n ? s.slice(0, n) + '…' : s;
}
function debounce(fn, ms) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
}
