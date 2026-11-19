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
// 名詞表：依分類分組
const G = (D.glossary || []).map((g, i) => ({ ...g, cat: g.cat || '期貨', id: 'term-' + (i + 1) }));
const gCats = [...new Set(G.map(g => g.cat))];
const gList = document.getElementById('g-list');
if (gList) {
  gList.innerHTML = gCats.map(c => {
    const list = G.filter(g => g.cat === c);
    return `<section class="g-group" data-cat="${esc(c)}"><h2 class="g-group-h">${esc(c)}<span>${list.length}</span></h2>` +
      `<dl class="glossary">${list.map(g => `<div id="${g.id}"><dt>${esc(g.term)}</dt><dd>${esc(g.desc)}</dd></div>`).join('')}</dl></section>`;
  }).join('');
}
const gIndex = document.getElementById('g-index');
if (gIndex) {
  gIndex.innerHTML = gCats.map(c =>
    `<div class="g-index-row" data-cat="${esc(c)}"><b>${esc(c)}</b><div class="g-chips">${G.filter(g => g.cat === c).map(g => `<a href="#${g.id}">${esc(g.term)}</a>`).join('')}</div></div>`).join('');
}
const gFilter = document.getElementById('g-filter');
if (gFilter) {
  gFilter.innerHTML = ['全部', ...gCats].map((c, i) =>
    `<button type="button" class="tab${i === 0 ? ' active' : ''}" data-cat="${esc(c)}" aria-pressed="${i === 0}">${esc(c)}<span>${c === '全部' ? G.length : G.filter(g => g.cat === c).length}</span></button>`).join('');
}
const gCount = document.getElementById('g-count');
if (gCount) gCount.textContent = G.length;
const gCats2 = document.getElementById('g-cats');
if (gCats2) gCats2.textContent = gCats.join('、');
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

// ===== 選擇權損益試算 + 損益圖（單一部位、雙買、雙賣）=====
const OPT = {
  bc: { name: 'Buy Call', zh: '買進買權', buy: true,  call: true },
  bp: { name: 'Buy Put',  zh: '買進賣權', buy: true,  call: false },
  sc: { name: 'Sell Call', zh: '賣出買權', buy: false, call: true },
  sp: { name: 'Sell Put',  zh: '賣出賣權', buy: false, call: false },
};
// 單一腳位到期每單位損益（點）
function legPayoff(leg, S) {
  const intrinsic = leg.call ? Math.max(S - leg.K, 0) : Math.max(leg.K - S, 0);
  return leg.buy ? intrinsic - leg.P : leg.P - intrinsic;
}
const money = n => signed(n) + ' 元';
const num = id => +$(id).value;

// 由腳位組出整個部位：損益函數、轉折點、兩平點、最大獲利／虧損
function buildPosition(legs, unit) {
  const f = S => legs.reduce((a, l) => a + legPayoff(l, S), 0) * unit;
  const kinks = [...new Set(legs.map(l => l.K))].sort((a, b) => a - b);
  // 損益是分段直線：在轉折點與左右遠端取樣，即可精確求出兩平點
  const far = Math.max(...kinks) * 10 + 1e6;
  const xs = [Math.max(0, kinks[0] - far), ...kinks, kinks[kinks.length - 1] + far];
  const bes = [];
  for (let i = 0; i < xs.length - 1; i++) {
    const a = xs[i], b = xs[i + 1], fa = f(a), fb = f(b);
    if (fa === 0 && (i === 0 || f(xs[i - 1]) !== 0)) bes.push(a);
    if ((fa < 0 && fb > 0) || (fa > 0 && fb < 0)) bes.push(a + (b - a) * (0 - fa) / (fb - fa));
  }
  const slopeR = f(xs[xs.length - 1]) - f(kinks[kinks.length - 1]);
  const atKinks = kinks.map(f), atZero = f(0);
  const maxP = slopeR > 0 ? Infinity : Math.max(...atKinks, atZero);
  const maxL = slopeR < 0 ? -Infinity : Math.min(...atKinks, atZero);
  return { f, kinks, bes: [...new Set(bes.map(v => Math.round(v * 100) / 100))], maxP, maxL };
}

function optCalc() {
  const mode = document.querySelector('input[name="omode"]:checked').value;
  document.querySelectorAll('#opt-form .op-single').forEach(e => e.hidden = mode !== 'single');
  document.querySelectorAll('#opt-form .op-dual').forEach(e => e.hidden = mode === 'single');
  const S = num('op-s'), Q = Math.max(1, Math.floor(num('op-q') || 1)), M = Math.max(0, num('op-m'));
  const unit = M * Q;

  let legs, title, desc, buyer, note;
  if (mode === 'single') {
    const pos = OPT[document.querySelector('input[name="opos"]:checked').value];
    legs = [{ ...pos, K: num('op-k'), P: Math.max(0, num('op-p')) }];
    buyer = pos.buy;
    title = pos.name;
    desc = `${pos.name}（${pos.zh}）・履約價 ${fmt(legs[0].K)}`;
    note = pos.buy
      ? '買方最大虧損就是權利金，不需繳保證金。未計入手續費與期交稅。'
      : '賣方需繳交保證金（依期交所公式與最新 A、B 值計算），最大虧損可能遠大於收取的權利金。未計入手續費與期交稅。';
  } else {
    buyer = mode === 'long';
    const Kc = num('op-kc'), Kp = num('op-kp');
    legs = [
      { call: true,  buy: buyer, K: Kc, P: Math.max(0, num('op-pc')) },
      { call: false, buy: buyer, K: Kp, P: Math.max(0, num('op-pp')) },
    ];
    const kind = Kc === Kp ? '跨式' : '勒式', en = Kc === Kp ? 'Straddle' : 'Strangle';
    title = (buyer ? 'Long ' : 'Short ') + en;
    desc = `雙${buyer ? '買' : '賣'}・${buyer ? '買進' : '賣出'}${kind}（${title}）`;
    note = buyer
      ? `同時買進買權與賣權，押注「大漲或大跌」。最大虧損是兩邊權利金合計，盤整到期最不利。${Kp > Kc ? '注意：Put 履約價高於 Call，屬於兩邊都價內的組合。' : ''}未計入手續費與期交稅。`
      : '同時賣出買權與賣權，押注「盤整、波動縮小」。最大獲利是兩邊權利金合計，大漲或大跌時虧損可能很大。賣方需繳保證金：Max(Sell Call 保證金, Sell Put 保證金) ＋ 另一邊權利金市值 ＋ C 值，以期交所公告為準。未計入手續費與期交稅。';
  }

  const ptot = legs.reduce((a, l) => a + l.P, 0);
  const P = buildPosition(legs, unit);
  const pnl = P.f(S);
  const el = $('op-pnl');
  el.textContent = money(pnl);
  el.className = pnl > 0 ? 'pos' : pnl < 0 ? 'neg' : '';
  $('op-desc').textContent = desc;
  $('op-prem-l').textContent = (buyer ? '支付權利金' : '收取權利金') + (legs.length > 1 ? '（合計）' : '');
  $('op-prem').textContent = fmt(ptot * unit) + ' 元';
  $('op-be').textContent = P.bes.length ? P.bes.map(v => fmt(v)).join(' / ') + ' 點' : '—';
  $('op-max').textContent = P.maxP === Infinity ? '理論上無上限' : (P.maxP > 0 ? '+' : '') + fmt(P.maxP) + ' 元';
  $('op-min').textContent = P.maxL === -Infinity ? '理論上無上限' : (P.maxL < 0 ? '−' : '') + fmt(Math.abs(P.maxL)) + ' 元';
  $('op-max').className = 'pos'; $('op-min').className = 'neg';
  $('op-note').textContent = note;

  const capLegs = legs.length > 1
    ? `Call ${fmt(legs[0].K)}＠${fmt(legs[0].P)}・Put ${fmt(legs[1].K)}＠${fmt(legs[1].P)}`
    : `履約價 ${fmt(legs[0].K)}・權利金 ${fmt(legs[0].P)} 點`;
  drawOptChart({ legs, S, P, unit, ptot, title, cap: `${title}・${capLegs} × ${fmt(unit)} 元` });
}

function niceTicks(lo, hi, n) {
  const raw = (hi - lo) / Math.max(1, n);
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= raw) || 10 * mag;
  const out = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(Math.round(v * 1e6) / 1e6);
  return out;
}
// 粗估文字寬度（中日文字較寬）
const textW = (s, px) => [...s].reduce((w, c) => w + (c.charCodeAt(0) > 0x2E80 ? px : px * 0.62), 0);

function drawOptChart({ legs, S, P, unit, ptot, title, cap }) {
  const box = $('op-chart');
  const W = Math.round(Math.max(300, box.clientWidth || 1000));
  const narrow = W < 520;
  const H = Math.round(Math.min(360, Math.max(260, W * 0.5))), L = narrow ? 58 : 76, R = 20, T = 34, B = 42;
  const { f, kinks, bes } = P;
  const k1 = kinks[0], k2 = kinks[kinks.length - 1], mid = (k1 + k2) / 2;
  const half = Math.max(ptot * 2.5 + (k2 - k1) / 2, Math.abs(S - mid) * 1.25, mid * 0.03, 300);
  const x0 = mid - half, x1 = mid + half;
  const ys = [f(x0), f(x1), ...kinks.map(f), 0, f(S)];
  let lo = Math.min(...ys), hi = Math.max(...ys);
  const pad = (hi - lo) * 0.14 || 1000; lo -= pad; hi += pad;
  const X = s => L + (W - L - R) * (s - x0) / (x1 - x0);
  const Y = v => T + (H - T - B) * (1 - (v - lo) / (hi - lo));
  const lab = v => (v > 0 ? '+' : v < 0 ? '−' : '') + fmt(Math.abs(v));
  const short = v => Math.abs(v) >= 10000 && narrow ? (v > 0 ? '+' : v < 0 ? '−' : '') + fmt(Math.abs(v) / 10000) + '萬' : lab(v);
  const y0 = Y(0);
  const line = [x0, ...kinks, x1].map(s => `${X(s).toFixed(1)},${Y(f(s)).toFixed(1)}`).join(' ');
  const area = `M${X(x0)},${y0} L${line.replace(/ /g, ' L')} L${X(x1)},${y0} Z`;
  // 刻度：整數刻度 + 平坦段／轉折點金額（最大虧損或最大獲利），太近的整數刻度拿掉
  const flats = [...new Set(kinks.map(k => Math.round(f(k))))];
  const yt = niceTicks(lo, hi, narrow ? 4 : 5).filter(v => flats.every(fl => Math.abs(Y(v) - Y(fl)) > 16)).concat(flats).sort((a, b) => b - a);
  const xt = niceTicks(x0, x1, narrow ? 4 : 6).filter(v => kinks.every(k => Math.abs(X(v) - X(k)) > (narrow ? 46 : 40)));
  const id = 'oc' + Math.random().toString(36).slice(2, 7);

  // 履約價標籤：兩個履約價時分左右擺放
  const strikeLabels = legs.length > 1 && k1 !== k2
    ? legs.map(l => {
        const left = l.K === k1;
        return `<text class="oc-strike-l" x="${X(l.K) + (left ? -4 : 4)}" y="${T - 16}" text-anchor="${left ? 'end' : 'start'}">${l.call ? 'Call' : 'Put'} ${fmt(l.K)}</text>`;
      }).join('')
    : `<text class="oc-strike-l" x="${X(k1)}" y="${T - 16}" text-anchor="middle">履約價 ${fmt(k1)}</text>`;

  // 結算價標籤（膠囊）
  const fS = f(S), sx = X(S), sy = Y(fS), sIn = S >= x0 && S <= x1;
  const pill = `結算 ${fmt(S)}　${lab(fS)} 元`;
  const pw = textW(pill, 12.5) + 22, ph = 26;
  let px = sx + 14, py = sy - ph - 10;
  if (px + pw > W - R) px = sx - 14 - pw;
  px = Math.min(Math.max(px, 4), W - R - pw);
  if (py < T - 8) py = sy + 12;

  const parts = [
    `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${title}到期損益圖：損益兩平點 ${bes.map(fmt).join('、') || '無'}，結算價 ${fmt(S)} 時損益 ${lab(fS)} 元">`,
    `<defs><clipPath id="${id}-up"><rect x="0" y="0" width="${W}" height="${Math.max(0, y0)}"/></clipPath>`,
    `<clipPath id="${id}-dn"><rect x="0" y="${y0}" width="${W}" height="${Math.max(0, H - y0)}"/></clipPath></defs>`,
    `<g class="oc-grid">${yt.map(v => `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}"/>`).join('')}</g>`,
    `<g class="oc-tick">${yt.map(v => `<text x="${L - 10}" y="${Y(v) + 4}" text-anchor="end">${short(v)}</text>`).join('')}`,
    xt.map(v => `<text x="${X(v)}" y="${H - 14}" text-anchor="middle">${fmt(v)}</text>`).join(''), `</g>`,
    `<path class="oc-fill-up" d="${area}" clip-path="url(#${id}-up)"/>`,
    `<path class="oc-fill-dn" d="${area}" clip-path="url(#${id}-dn)"/>`,
    `<line class="oc-zero" x1="${L}" x2="${W - R}" y1="${y0}" y2="${y0}"/>`,
    kinks.map(k => `<line class="oc-strike" x1="${X(k)}" x2="${X(k)}" y1="${T - 10}" y2="${H - B}"/>`).join(''),
    strikeLabels,
    `<polyline class="oc-line" points="${line}"/>`,
    hi > 0 ? `<text class="oc-zone up" x="${W - R - 8}" y="${Math.min(y0 - 10, T + 16)}" text-anchor="end">獲利區</text>` : '',
    lo < 0 ? `<text class="oc-zone dn" x="${W - R - 8}" y="${Math.max(y0 + 22, H - B - 10)}" text-anchor="end">虧損區</text>` : '',
    // 損益兩平：標籤放在線的外側空白處
    bes.filter(b => b >= x0 && b <= x1).map(b => {
      const right = b >= mid, farV = f(right ? x1 : x0);
      const t = `兩平 ${fmt(b)}`, tw = textW(t, 12);
      // 預設放在點的外側；超出圖框時往內收
      let tx = right ? X(b) + 10 : X(b) - 10 - tw;
      tx = Math.min(Math.max(tx, L + 2), W - R - tw - 2);
      return `<circle class="oc-be" cx="${X(b)}" cy="${y0}" r="5.5"/>` +
        `<text class="oc-be-l" x="${tx}" y="${y0 + (farV > 0 ? 20 : -11)}">${t}</text>`;
    }).join(''),
    sIn ? `<line class="oc-drop" x1="${sx}" x2="${sx}" y1="${sy}" y2="${y0}"/>` +
      `<circle class="oc-pt ${fS >= 0 ? 'up' : 'dn'}" cx="${sx}" cy="${sy}" r="6.5"/>` +
      `<g class="oc-pill"><rect x="${px}" y="${py}" width="${pw}" height="${ph}" rx="13"/>` +
      `<text x="${px + pw / 2}" y="${py + 17}" text-anchor="middle">${pill}</text></g>` : '',
    `<g class="oc-hover" visibility="hidden"><line class="oc-cross" y1="${T}" y2="${H - B}"/><circle class="oc-hdot" r="5"/></g>`,
    `<rect class="oc-hit" x="${L}" y="${T - 10}" width="${W - L - R}" height="${H - T - B + 10}"/>`,
    `</svg><div class="oc-tip" hidden></div>`,
  ];
  box.innerHTML = parts.join('');
  $('op-chart-cap').textContent = cap;

  // 滑鼠／觸控：顯示任一結算價的損益
  const svg = box.querySelector('svg'), hov = svg.querySelector('.oc-hover'), cross = hov.querySelector('.oc-cross'),
    dot = hov.querySelector('.oc-hdot'), tip = box.querySelector('.oc-tip'), hit = svg.querySelector('.oc-hit');
  const move = e => {
    const r = svg.getBoundingClientRect();
    const cx = ((e.touches ? e.touches[0].clientX : e.clientX) - r.left) * W / r.width;
    const s = Math.round(x0 + (Math.min(Math.max(cx, L), W - R) - L) / (W - L - R) * (x1 - x0));
    const v = f(s), hx = X(s), hy = Y(v);
    cross.setAttribute('x1', hx); cross.setAttribute('x2', hx);
    dot.setAttribute('cx', hx); dot.setAttribute('cy', hy);
    dot.setAttribute('class', 'oc-hdot ' + (v >= 0 ? 'up' : 'dn'));
    hov.setAttribute('visibility', 'visible');
    tip.innerHTML = `<span>結算價 <b>${fmt(s)}</b></span><span>損益 <b class="${v > 0 ? 'pos' : v < 0 ? 'neg' : ''}">${lab(v)} 元</b></span>`;
    tip.hidden = false;
    const scale = r.width / W, tw = tip.offsetWidth;
    let left = hx * scale + 14; if (left + tw > r.width) left = hx * scale - 14 - tw;
    tip.style.left = left + 'px'; tip.style.top = Math.max(0, hy * scale - 52) + 'px';
  };
  const leave = () => { hov.setAttribute('visibility', 'hidden'); tip.hidden = true; };
  hit.addEventListener('mousemove', move);
  hit.addEventListener('touchmove', move, { passive: true });
  hit.addEventListener('touchstart', move, { passive: true });
  hit.addEventListener('mouseleave', leave);
  hit.addEventListener('touchend', () => setTimeout(leave, 1200));
}
if ($('opt-form')) {
  $('opt-form').addEventListener('input', optCalc);
  optCalc();
  // 切到選擇權分頁或視窗改變大小時重畫（隱藏時寬度為 0）
  document.querySelector('#calc .tab[data-tab="copt"]')?.addEventListener('click', () => requestAnimationFrame(optCalc));
  let rT; addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(optCalc, 150); });
}

// 分頁切換（商品分頁、01 期貨／選擇權）：每組 tablist 只控制同一個段落內的面板
document.querySelectorAll('[role="tablist"]').forEach(list => {
  const tabs = [...list.querySelectorAll('.tab[data-tab]')];
  const scope = list.closest('section') || document;
  tabs.forEach(tab => tab.addEventListener('click', () => {
    tabs.forEach(t => { t.classList.toggle('active', t === tab); t.setAttribute('aria-selected', t === tab); });
    const ids = tabs.map(t => 'tab-' + t.dataset.tab);
    scope.querySelectorAll('.tab-panel').forEach(p => { if (ids.includes(p.id)) p.classList.toggle('active', p.id === 'tab-' + tab.dataset.tab); });
    if (tab.dataset.title) {
      const h = scope.querySelector('.sec-head h2'), s = scope.querySelector('.sec-head p');
      if (h) h.textContent = tab.dataset.title;
      if (s) s.textContent = tab.dataset.sub || '';
    }
  }));
});

// 名詞搜尋
let gCat = '全部';
function filterGlossary() {
  const q = ($('g-search').value || '').trim().toLowerCase();
  let shown = 0;
  document.querySelectorAll('.g-group').forEach(sec => {
    const catOk = gCat === '全部' || sec.dataset.cat === gCat;
    let n = 0;
    sec.querySelectorAll('.glossary > div').forEach(it => {
      const hit = catOk && (!q || it.textContent.toLowerCase().includes(q));
      it.hidden = !hit;
      if (hit) n++;
    });
    sec.hidden = n === 0;
    shown += n;
  });
  document.querySelectorAll('.g-index-row').forEach(r => { r.hidden = !(gCat === '全部' || r.dataset.cat === gCat); });
  $('g-empty').hidden = shown > 0;
}
if ($('g-search')) {
  $('g-search').addEventListener('input', filterGlossary);
  if (gFilter) gFilter.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    gCat = b.dataset.cat;
    gFilter.querySelectorAll('button').forEach(x => { x.classList.toggle('active', x === b); x.setAttribute('aria-pressed', x === b); });
    filterGlossary();
  });
}

$('year').textContent = new Date().getFullYear();
