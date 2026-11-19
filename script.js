// ===== 從 data.js 產生內容 =====
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fill = (id, list, tpl) => { const el = document.getElementById(id); if (el && list) el.innerHTML = list.map(tpl).join(''); };
const cardTpl = (c, i) => `<article class="card"><span class="card-idx">${String(i + 1).padStart(2, '0')}</span><h3>${esc(c.title)}</h3><p>${esc(c.text)}</p></article>`;
const D = typeof SITE_DATA !== 'undefined' ? SITE_DATA : {};
const fmtN = n => Math.round(n).toLocaleString('zh-TW');

fill('terms-list', D.terms, cardTpl);
fill('products-intl', D.productsIntl, cardTpl);
fill('risk-list', D.risks, cardTpl);
fill('rules-list', D.rules, r => `<li>${esc(r)}</li>`);
fill('products-tw', D.productsTW, p =>
  `<tr><td>${esc(p.name)}</td><td class="mono">${esc(p.code)}</td><td>${esc(p.underlying)}</td><td>${esc(p.pointValue)}</td><td>${esc(p.settle)}</td></tr>`);
fill('contact-list', D.contact, c => {
  const inner = `<h3>${esc(c.title)}</h3><p>${esc(c.desc || '')}</p><b>${esc(c.value)}</b>`;
  const ext = /^https?:/.test(c.link || '') ? ' target="_blank" rel="noopener"' : '';
  return c.link ? `<a class="card contact-card" href="${esc(c.link)}"${ext}>${inner}</a>` : `<div class="card contact-card">${inner}</div>`;
});
fill('g-list', D.glossary, (g, i) => `<div id="term-${i + 1}"><dt>${esc(g.term)}</dt><dd>${esc(g.desc)}</dd></div>`);
fill('g-index', D.glossary, (g, i) => `<a href="#term-${i + 1}">${esc(g.term)}</a>`);
const gCount = document.getElementById('g-count');
if (gCount && D.glossary) gCount.textContent = D.glossary.length;
(function () {
  const sel = document.getElementById('c-product');
  if (!sel) return;
  const custom = sel.querySelector('option[value="custom"]');
  (D.calcProducts || []).forEach(p => {
    const o = document.createElement('option');
    o.value = p.pointValue; o.textContent = p.label;
    sel.insertBefore(o, custom);
  });
  sel.selectedIndex = 0;
})();

// ===== 保證金追繳實例：表格 + 圖表 =====
(function () {
  const M = D.marginExample;
  const chart = document.getElementById('mc-chart');
  if (!M || !chart) return;
  const entry = M.days[0].price;
  let prev = entry, callAt = -1;
  const rows = M.days.map((d, i) => {
    const daily = (d.price - prev) * M.pointValue;
    const equity = M.initial + (d.price - entry) * M.pointValue;
    prev = d.price;
    const call = equity < M.maintenance && callAt < 0;
    if (call) callAt = i;
    return { ...d, daily, equity, call };
  });

  document.getElementById('mc-table').innerHTML = rows.map((r, i) => {
    const cls = r.daily > 0 ? 'pos' : r.daily < 0 ? 'neg' : '';
    const daily = i === 0 ? '—' : (r.daily > 0 ? '+' : r.daily < 0 ? '−' : '') + fmtN(Math.abs(r.daily));
    const tag = r.call ? '<span class="tag call">追繳</span>' : i === 0 ? '<span class="tag">建倉</span>' : '<span class="tag">正常</span>';
    return `<tr><td>${esc(r.label)}</td><td>${fmtN(r.price)}</td><td class="${cls}">${daily}</td><td>${fmtN(r.equity)}</td><td>${tag}</td></tr>`;
  }).join('');

  // 圖表
  const W = 480, H = 280, L = 70, R = 44, T = 28, B = 40;
  const vals = rows.map(r => r.equity).concat([M.initial, M.maintenance]);
  const pad = (Math.max(...vals) - Math.min(...vals)) * 0.18 || 10000;
  const lo = Math.min(...vals) - pad, hi = Math.max(...vals) + pad;
  const x = i => L + (W - L - R) * (rows.length === 1 ? 0.5 : i / (rows.length - 1));
  const y = v => T + (H - T - B) * (1 - (v - lo) / (hi - lo));
  const pts = rows.map((r, i) => `${x(i)},${y(r.equity)}`).join(' ');
  const svg = [
    `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="帳戶權益每日變化，與原始及維持保證金比較">`,
    `<line class="ln-init" x1="${L}" x2="${W - R}" y1="${y(M.initial)}" y2="${y(M.initial)}"/>`,
    `<line class="ln-maint" x1="${L}" x2="${W - R}" y1="${y(M.maintenance)}" y2="${y(M.maintenance)}"/>`,
    `<g class="tick"><text x="${L - 6}" y="${y(M.initial) + 4}" text-anchor="end">${fmtN(M.initial)}</text>`,
    `<text x="${L - 6}" y="${y(M.maintenance) + 4}" text-anchor="end">${fmtN(M.maintenance)}</text></g>`,
    `<text class="lbl-mute" x="${L + 4}" y="${y(M.initial) + 17}">原始保證金</text>`,
    `<text class="lbl-call" x="${L + 4}" y="${y(M.maintenance) + 17}">維持保證金</text>`,
    `<polyline class="ln-equity" points="${pts}"/>`,
    ...rows.map((r, i) => `<circle class="pt${r.call ? ' call' : ''}" cx="${x(i)}" cy="${y(r.equity)}" r="5"/>` +
      `<text class="${r.call ? 'lbl-call' : 'lbl-val'}" x="${x(i) + (i === 0 ? 8 : 0)}" y="${y(r.equity) + (r.call ? 22 : -12)}" text-anchor="${i === 0 ? 'start' : 'middle'}">${fmtN(r.equity)}${r.call ? ' 追繳' : ''}</text>` +
      `<g class="tick"><text x="${x(i)}" y="${H - 14}" text-anchor="middle">D${i + 1}</text></g>`),
    `</svg>`,
  ].join('');
  chart.innerHTML = svg;

  const sum = document.getElementById('mc-summary');
  if (callAt >= 0) {
    const r = rows[callAt];
    sum.innerHTML = `第 ${callAt + 1} 天結算價 ${fmtN(r.price)} 點，權益數 ${fmtN(r.equity)} 元已低於維持保證金 ${fmtN(M.maintenance)} 元，期貨商發出追繳通知，需補繳 <b class="mono">${fmtN(M.initial - r.equity)}</b> 元，使權益回到原始保證金 ${fmtN(M.initial)} 元；否則可能遭到強制平倉。`;
  } else {
    sum.textContent = '在此期間權益數均高於維持保證金，未觸發追繳。';
  }
})();

const upd = document.getElementById('updated');
if (upd) upd.textContent = D.updated || '';

// 主題切換
const root = document.documentElement;
try {
  const saved = localStorage.getItem('theme');
  if (saved) root.dataset.theme = saved;
} catch (e) {}
document.querySelector('.theme-btn').addEventListener('click', () => {
  const isDark = root.dataset.theme
    ? root.dataset.theme === 'dark'
    : matchMedia('(prefers-color-scheme: dark)').matches;
  root.dataset.theme = isDark ? 'light' : 'dark';
  try { localStorage.setItem('theme', root.dataset.theme); } catch (e) {}
});

// 手機選單
const menuBtn = document.querySelector('.menu-btn');
const nav = document.querySelector('.nav');
menuBtn.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  menuBtn.setAttribute('aria-expanded', open);
});
nav.addEventListener('click', e => {
  if (e.target.tagName === 'A') { nav.classList.remove('open'); menuBtn.setAttribute('aria-expanded', false); }
});

// 導覽列目前位置
const links = [...nav.querySelectorAll('a')];
const io = new IntersectionObserver(entries => {
  entries.forEach(en => {
    if (en.isIntersecting) {
      links.forEach(a => { if (!a.dataset.page) a.classList.toggle('active', a.getAttribute('href') === '#' + en.target.id); });
    }
  });
}, { rootMargin: '-45% 0px -50% 0px' });
document.querySelectorAll('main section[id]').forEach(s => io.observe(s));

// 損益試算
const $ = id => document.getElementById(id);
const fmt = n => Math.round(n).toLocaleString('zh-TW');
const signed = n => (n > 0 ? '+' : n < 0 ? '−' : '') + fmt(Math.abs(n));

function calc() {
  const product = $('c-product').value;
  $('c-custom-wrap').hidden = product !== 'custom';
  const pointValue = product === 'custom' ? +$('c-custom').value : +product;
  const dir = +document.querySelector('input[name="dir"]:checked').value;
  const entry = +$('c-entry').value;
  const exit = +$('c-exit').value;
  const qty = Math.max(1, Math.floor(+$('c-qty').value || 1));
  const marginEach = +$('c-margin').value;

  const pts = (exit - entry) * dir;
  const pnl = pts * pointValue * qty;
  const value = entry * pointValue * qty;
  const margin = marginEach * qty;
  const roi = margin > 0 ? pnl / margin * 100 : NaN;

  const pnlEl = $('o-pnl');
  pnlEl.textContent = signed(pnl) + ' 元';
  pnlEl.className = pnl > 0 ? 'pos' : pnl < 0 ? 'neg' : '';
  $('o-roi').textContent = isFinite(roi) ? `保證金報酬率 ${roi > 0 ? '+' : ''}${roi.toFixed(1)}%` : '請輸入保證金';
  $('o-roi').className = pnlEl.className;
  $('o-pts').textContent = (pts > 0 ? '+' : '') + pts.toLocaleString('zh-TW') + ' 點';
  $('o-value').textContent = fmt(value) + ' 元';
  $('o-margin').textContent = fmt(margin) + ' 元';
  $('o-lev').textContent = margin > 0 ? (value / margin).toFixed(1) + ' 倍' : '—';

  // 報酬率條：±100% 為滿格
  const pct = isFinite(roi) ? Math.min(Math.abs(roi), 100) / 2 : 0;
  const bar = $('o-bar');
  bar.style.width = pct + '%';
  bar.style.left = roi >= 0 ? '50%' : (50 - pct) + '%';
  bar.style.background = roi >= 0 ? 'var(--up)' : 'var(--down)';
}
if ($('calc-form')) {
  $('calc-form').addEventListener('input', calc);
  calc();
}

// 商品分頁
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => { t.classList.toggle('active', t === tab); t.setAttribute('aria-selected', t === tab); });
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === 'tab-' + tab.dataset.tab));
  });
});

// 名詞搜尋
const items = [...document.querySelectorAll('#g-list > div')];
if ($('g-search')) $('g-search').addEventListener('input', e => {
  const q = e.target.value.trim().toLowerCase();
  let shown = 0;
  items.forEach(it => {
    const hit = !q || it.textContent.toLowerCase().includes(q);
    it.hidden = !hit;
    if (hit) shown++;
  });
  $('g-empty').hidden = shown > 0;
});

$('year').textContent = new Date().getFullYear();
