// ===== 從 data.js 產生內容 =====
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fill = (id, list, tpl) => { const el = document.getElementById(id); if (el && list) el.innerHTML = list.map(tpl).join(''); };
const cardTpl = (c, i) => `<article class="card"><span class="card-idx">${String(i + 1).padStart(2, '0')}</span><h3>${esc(c.title)}</h3><p>${esc(c.text)}</p></article>`;
const D = typeof SITE_DATA !== 'undefined' ? SITE_DATA : {};
const fmtN = n => Math.round(n).toLocaleString('zh-TW');

fill('terms-list', D.terms, cardTpl);
fill('products-intl', D.productsIntl, cardTpl);
document.querySelectorAll('#os-total').forEach(e => { e.textContent = (D.overseasSpecs || []).length; });
fill('risk-list', D.risks, cardTpl);
fill('rules-list', D.rules, r => `<li>${esc(r)}</li>`);
fill('products-tw', D.productsTW, p =>
  `<tr><td>${esc(p.name)}</td><td class="mono">${esc(p.code)}</td><td>${esc(p.underlying)}</td><td>${esc(p.pointValue)}</td><td>${esc(p.settle)}</td></tr>`);
// 聯絡我們：第一項（聯絡人）當標題，其餘一行一項；hide: true 的先部分遮住，按「顯示」才顯示完整資訊
(function () {
  const box = document.getElementById('contact-list');
  if (!box || !D.contact) return;
  const [who, ...items] = D.contact;
  const ext = l => (/^https?:/.test(l || '') ? ' target="_blank" rel="noopener"' : '');
  const act = c => (c.link ? `<a class="btn primary ct-btn" href="${esc(c.link)}"${ext(c.link)}>${esc(c.action || '開啟')}</a>` : '');
  const row = (c, i) => `<li class="ct-row" data-i="${i}"><span class="ct-label">${esc(c.title)}</span>` +
    (c.hide ? `<span class="ct-value mono is-masked">${esc(c.mask || '••••••••')}</span><button type="button" class="btn ghost ct-btn ct-show">顯示</button>`
            : `<span class="ct-value mono">${esc(c.value)}</span>${act(c)}`) + '</li>';
  box.innerHTML = `<div class="card ct-card"><div class="ct-who"><span class="ct-avatar" aria-hidden="true">${esc((who.value || '').slice(0, 1))}</span>` +
    `<div><span class="ct-label">${esc(who.title)}</span><b>${esc(who.value)}</b></div></div><ul class="ct-list">${items.map(row).join('')}</ul></div>`;
  const reveal = btn => {
    const li = btn.closest('.ct-row'), c = items[+li.dataset.i];
    const v = li.querySelector('.ct-value');
    v.textContent = c.value; v.classList.remove('is-masked');
    btn.outerHTML = act(c);
  };
  box.addEventListener('click', e => { const b = e.target.closest('.ct-show'); if (b) reveal(b); });
})();
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

  const hitBox = (a, b) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
  // 兩平點標籤：放在點的外側空白處，超出圖框時往內收
  const beItems = bes.filter(b => b >= x0 && b <= x1).map(b => {
    const right = b >= mid, farV = f(right ? x1 : x0);
    const t = narrow ? fmt(b) : `兩平 ${fmt(b)}`, tw = textW(t, 12);
    let tx = right ? X(b) + 10 : X(b) - 10 - tw;
    tx = Math.min(Math.max(tx, L + 2), W - R - tw - 2);
    let ty = y0 + (farV > 0 ? 20 : -11);
    const sDot = [X(S) - 9, Y(f(S)) - 9, X(S) + 9, Y(f(S)) + 9];
    if (hitBox([tx - 4, ty - 14, tx + tw + 4, ty + 5], sDot)) ty = y0 + (farV > 0 ? -11 : 20);
    return { b, t, tx, ty, box: [tx - 4, ty - 14, tx + tw + 4, ty + 5] };
  });

  // 結算價標籤（膠囊）：依序嘗試右上、左上、右下、左下，避開兩平標籤與圖框
  const fS = f(S), sx = X(S), sy = Y(fS), sIn = S >= x0 && S <= x1;
  const pill = `結算 ${fmt(S)}　${lab(fS)} 元`;
  const pw = textW(pill, 12.5) + 22, ph = 26;
  const spots = [[sx + 14, sy - ph - 10], [sx - 14 - pw, sy - ph - 10], [sx + 14, sy + 12], [sx - 14 - pw, sy + 12]];
  const fits = ([x, y]) => x >= 4 && x + pw <= W - R && y >= T - 8 && y + ph <= H - B;
  const clear = ([x, y]) => beItems.every(it => !hitBox([x, y, x + pw, y + ph], it.box));
  let [px, py] = spots.find(p => fits(p) && clear(p)) || spots.find(fits) || spots[0];
  px = Math.min(Math.max(px, 4), W - R - pw);
  const pillBox = narrow ? [-9, -9, -9, -9] : [px, py, px + pw, py + ph]; // 手機上不畫膠囊（上方結果框已顯示）

  // 獲利區／虧損區文字：放進實際上色的區塊裡（區塊太小就不放）
  const xsS = Array.from({ length: 81 }, (_, i) => x0 + (x1 - x0) * i / 80);
  const zoneLabel = (sign, text, cls) => {
    const tw = textW(text, 12) + 6;
    const ok = xsS.filter(s => X(s) >= L + tw / 2 + 24 && X(s) <= W - R - tw / 2 - 24);
    if (!ok.length) return '';
    const pick = ok.reduce((best, s) => (sign * f(s) > sign * f(best) ? s : best), ok[0]);
    const v = f(pick);
    if (sign * v <= 0 || Math.abs(Y(v) - y0) < 34) return '';
    const zx = X(pick);
    // 在該處的線與零軸之間取中點，避免壓到線
    const zy = (y0 + Y(v)) / 2 + 4;
    const box = [zx - tw / 2, zy - 13, zx + tw / 2, zy + 4];
    if (hitBox(box, pillBox) || beItems.some(it => hitBox(box, it.box))) return '';
    return `<text class="oc-zone ${cls}" x="${zx}" y="${zy}" text-anchor="middle">${text}</text>`;
  };

  // 線的兩端若還在延伸（不是水平），加箭頭表示損益會繼續擴大
  const dx = (x1 - x0) * 0.01;
  const goesOnL = Math.abs(f(x0) - f(x0 + dx)) > 1e-6, goesOnR = Math.abs(f(x1) - f(x1 - dx)) > 1e-6;

  const parts = [
    `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${title}到期損益圖：損益兩平點 ${bes.map(fmt).join('、') || '無'}，結算價 ${fmt(S)} 時損益 ${lab(fS)} 元">`,
    `<defs><clipPath id="${id}-up"><rect x="0" y="0" width="${W}" height="${Math.max(0, y0)}"/></clipPath>`,
    `<clipPath id="${id}-dn"><rect x="0" y="${y0}" width="${W}" height="${Math.max(0, H - y0)}"/></clipPath>`,
    `<marker id="${id}-ar" viewBox="0 0 10 10" refX="6" refY="5" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto-start-reverse"><path class="oc-arrow" d="M0,0 L10,5 L0,10 z"/></marker></defs>`,
    `<g class="oc-grid">${yt.map(v => `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}"/>`).join('')}</g>`,
    `<g class="oc-tick">${yt.map(v => `<text x="${L - 10}" y="${Y(v) + 4}" text-anchor="end">${short(v)}</text>`).join('')}`,
    xt.map(v => `<text x="${X(v)}" y="${H - 14}" text-anchor="middle">${fmt(v)}</text>`).join(''), `</g>`,
    `<path class="oc-fill-up" d="${area}" clip-path="url(#${id}-up)"/>`,
    `<path class="oc-fill-dn" d="${area}" clip-path="url(#${id}-dn)"/>`,
    `<line class="oc-zero" x1="${L}" x2="${W - R}" y1="${y0}" y2="${y0}"/>`,
    kinks.map(k => `<line class="oc-strike" x1="${X(k)}" x2="${X(k)}" y1="${T - 10}" y2="${H - B}"/>`).join(''),
    strikeLabels,
    `<polyline class="oc-line" points="${line}"${goesOnL ? ` marker-start="url(#${id}-ar)"` : ''}${goesOnR ? ` marker-end="url(#${id}-ar)"` : ''}/>`,
    zoneLabel(1, '獲利區', 'up'),
    zoneLabel(-1, '虧損區', 'dn'),
    beItems.map(it => `<circle class="oc-be" cx="${X(it.b)}" cy="${y0}" r="5.5"/><text class="oc-be-l" x="${it.tx}" y="${it.ty}">${it.t}</text>`).join(''),
    sIn ? `<line class="oc-drop" x1="${sx}" x2="${sx}" y1="${sy}" y2="${y0}"/>` +
      `<circle class="oc-pt ${fS >= 0 ? 'up' : 'dn'}" cx="${sx}" cy="${sy}" r="6.5"/>` +
      (narrow ? '' : `<g class="oc-pill"><rect x="${px}" y="${py}" width="${pw}" height="${ph}" rx="13"/>` +
      `<text x="${px + pw / 2}" y="${py + 17}" text-anchor="middle">${pill}</text></g>`) : '',
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

// ===== 05 海外期貨：商品合約規格表（篩選 + 分頁）=====
(function () {
  const body = document.getElementById('os-body');
  if (!body || !D.overseasSpecs) return;
  const mq = matchMedia('(max-width: 640px)');
  const perPage = () => (mq.matches ? 5 : 10);   // 每頁筆數：手機 5 筆、電腦 10 筆
  const EXN = D.exchangeNames || {};
  const rows = D.overseasSpecs.map(r => ({
    ex: r[0], cat: r[1], name: r[2], code: r[3], cur: r[4], size: r[5], tick: r[6], tv: r[7], months: r[8], hours: r[9],
  }));
  const exSel = document.getElementById('os-ex'), catSel = document.getElementById('os-cat'), q = document.getElementById('os-q');
  const pager = document.getElementById('os-pager'), count = document.getElementById('os-count');
  const head = document.getElementById('os-head');
  const MG = D.overseasMargins || {};
  // 檢視：合約規格 spec ／ 保證金 margin（網址可帶 ?view=margin 直接開保證金）
  let view = new URLSearchParams(location.search).get('view') === 'margin' ? 'margin' : 'spec';
  const viewBtns = [...document.querySelectorAll('.os-view .tab')];
  const SPEC_H = ['交易所', '類別', '商品名稱', '代碼', '幣別', '合約規格', '跳動點', '跳動值', '熱門月份', '台灣交易時間'];
  const MARGIN_H = ['交易所', '類別', '商品名稱', '代碼', '幣別', '原始保證金', '維持保證金'];
  const n0 = v => (v == null ? '—' : Number(v).toLocaleString('en-US'));
  const uniq = a => [...new Set(a)];
  exSel.insertAdjacentHTML('beforeend', uniq(rows.map(r => r.ex)).map(e => `<option value="${esc(e)}">${esc(EXN[e] || e)}</option>`).join(''));
  const fillCats = () => {
    const keep = catSel.value;
    const cats = uniq(rows.filter(r => !exSel.value || r.ex === exSel.value).map(r => r.cat));
    catSel.innerHTML = '<option value="">全部類別</option>' + cats.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
    catSel.value = cats.includes(keep) ? keep : '';
  };
  fillCats();
  const note = document.getElementById('os-note');

  let page = 1;
  function render() {
    const kw = q.value.trim().toLowerCase();
    const list = rows.filter(r => (!exSel.value || r.ex === exSel.value) && (!catSel.value || r.cat === catSel.value) &&
      (!kw || (r.name + ' ' + r.code).toLowerCase().includes(kw)));
    const cols = view === 'margin' ? MARGIN_H : SPEC_H;
    head.innerHTML = '<tr>' + cols.map(h => `<th>${h}</th>`).join('') + '</tr>';
    document.querySelector('.os-table').classList.toggle('os-margin', view === 'margin');
    const PER = perPage();
    const pages = Math.max(1, Math.ceil(list.length / PER));
    page = Math.min(Math.max(1, page), pages);
    const shown = list.slice((page - 1) * PER, page * PER);
    const marginRow = r => {
      const m = MG[r.code] || [null, null];
      return `<tr><td data-l="交易所"><span class="ex-tag">${esc(r.ex)}</span></td><td data-l="類別">${esc(r.cat)}</td>` +
        `<td class="os-name" data-l="商品名稱">${esc(r.name)}</td><td class="mono" data-l="代碼">${esc(r.code)}</td>` +
        `<td class="mono" data-l="幣別">${esc(r.cur)}</td><td class="mono num" data-l="原始保證金">${n0(m[0])}</td><td class="mono num" data-l="維持保證金">${n0(m[1])}</td></tr>`;
    };
    body.innerHTML = !shown.length ? `<tr><td colspan="${cols.length}" class="os-empty">找不到符合條件的商品。</td></tr>`
      : view === 'margin' ? shown.map(marginRow).join('') : shown.map(r =>
      `<tr><td data-l="交易所"><span class="ex-tag">${esc(r.ex)}</span></td><td data-l="類別">${esc(r.cat)}</td><td class="os-name" data-l="商品名稱">${esc(r.name)}</td>` +
      `<td class="mono" data-l="代碼">${esc(r.code)}</td><td class="mono" data-l="幣別">${esc(r.cur)}</td><td data-l="合約規格">${esc(r.size)}</td><td class="mono" data-l="跳動點">${esc(r.tick)}</td>` +
      `<td class="mono" data-l="跳動值">${esc(r.tv)}</td><td data-l="熱門月份">${esc(r.months)}</td><td class="os-hours" data-l="台灣交易時間">${esc(r.hours)}</td></tr>`).join('');
    if (note) note.textContent = view === 'margin'
      ? `保證金資料日期：${D.overseasMarginsDate || ''}。${D.overseasMarginsNote || ''}保證金會依市況變動，實際以期貨商最新公告為準。`
      : `規格資料日期：${D.overseasSpecsDate || ''}。${D.overseasSpecsNote || ''}規格可能調整，實際以各交易所及期貨商公告為準。`;
    count.textContent = list.length
      ? `共 ${list.length} 項商品，第 ${(page - 1) * PER + 1}–${Math.min(page * PER, list.length)} 項`
      : '共 0 項商品';
    // 分頁按鈕：上一頁、頁碼（頁數多時以 … 省略）、下一頁
    const nums = [];
    for (let i = 1; i <= pages; i++) {
      if (pages <= 9 || i === 1 || i === pages || Math.abs(i - page) <= 1) nums.push(i);
      else if (nums[nums.length - 1] !== '…') nums.push('…');
    }
    pager.innerHTML = pages <= 1 ? '' :
      `<button type="button" data-p="${page - 1}" ${page === 1 ? 'disabled' : ''} aria-label="上一頁">‹</button>` +
      nums.map(n => n === '…' ? '<span class="os-gap">…</span>'
        : `<button type="button" data-p="${n}" class="${n === page ? 'active' : ''}" ${n === page ? 'aria-current="page"' : ''}>${n}</button>`).join('') +
      `<button type="button" data-p="${page + 1}" ${page === pages ? 'disabled' : ''} aria-label="下一頁">›</button>`;
  }
  pager.addEventListener('click', e => {
    const b = e.target.closest('button[data-p]');
    if (!b || b.disabled) return;
    page = +b.dataset.p;
    render();
    const top = document.querySelector('.os-filters').getBoundingClientRect().top;
    if (top < 0) window.scrollBy({ top: top - 90, behavior: 'smooth' });
  });
  exSel.addEventListener('change', () => { fillCats(); page = 1; render(); });
  catSel.addEventListener('change', () => { page = 1; render(); });
  q.addEventListener('input', () => { page = 1; render(); });
  const setView = v => {
    view = v;
    viewBtns.forEach(b => { b.classList.toggle('active', b.dataset.view === v); b.setAttribute('aria-selected', b.dataset.view === v); });
    try { history.replaceState(null, '', v === 'margin' ? '?view=margin' : location.pathname); } catch (e) {}
  };
  viewBtns.forEach(b => b.addEventListener('click', () => { setView(b.dataset.view); page = 1; render(); }));
  setView(view);
  mq.addEventListener('change', () => { page = 1; render(); });
  render();
})();

$('year').textContent = new Date().getFullYear();
