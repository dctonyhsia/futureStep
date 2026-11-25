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

// ===== settlement.html：結算價卡片 + 維持率與砍倉實例 =====
fill('settle-list', D.settlement, cardTpl);
(function () {
  const R = D.riskExample;
  const body = document.getElementById('mr-table');
  if (!R || !body) return;
  const entry = R.prices[0], pv = R.pointValue, cut = R.cutPct;
  const pct = e => e / R.initial * 100;
  body.innerHTML = R.prices.map((p, i) => {
    const pnl = (p - entry) * pv, eq = R.initial + pnl, r = pct(eq);
    const cls = pnl > 0 ? 'pos' : pnl < 0 ? 'neg' : '';
    const pnlTxt = i === 0 ? '—' : (pnl > 0 ? '+' : pnl < 0 ? '−' : '') + fmtN(Math.abs(pnl));
    const tag = i === 0 ? '<span class="tag">建倉</span>'
      : r < cut ? '<span class="tag cut">砍倉</span>'
      : eq < R.maintenance ? '<span class="tag call">追繳</span>' : '<span class="tag">正常</span>';
    return `<tr><td>${i === 0 ? '進場' : '結算價'}</td><td>${fmtN(p)}</td><td class="${cls}">${pnlTxt}</td><td>${fmtN(eq)}</td><td>${r.toFixed(1)}%</td><td>${tag}</td></tr>`;
  }).join('');

  const callPts = (R.initial - R.maintenance) / pv;
  const cutPts = R.initial * (1 - cut / 100) / pv;
  document.getElementById('mr-intro').textContent =
    `假設在 ${fmtN(entry)} 點做多 1 口${R.product}（每點 ${fmtN(pv)} 元），原始保證金 ${fmtN(R.initial)} 元、維持保證金 ${fmtN(R.maintenance)} 元（假設數字，實際以期交所與期貨商公告為準）。`;
  document.getElementById('mr-summary').innerHTML =
    `以這個例子，指數下跌 <b class="mono">${fmtN(callPts)}</b> 點（跌破 ${fmtN(entry - callPts)} 點），權益數就低於維持保證金、維持率約 ${pct(R.maintenance).toFixed(1)}%，會收到追繳通知；` +
    `下跌約 <b class="mono">${fmtN(Math.ceil(cutPts))}</b> 點（跌破約 ${fmtN(Math.floor(entry - cutPts))} 點），權益數剩不到 ${fmtN(R.initial * cut / 100)} 元、維持率低於 ${cut}%，期貨商就會代為沖銷（砍倉）。`;
  document.getElementById('mr-points').innerHTML = [
    `維持率 = 權益數 ÷ 原始保證金；剛進場時為 100%，賺錢會上升、賠錢會下降。`,
    `權益數低於維持保證金時會被追繳，必須在期限內補足至原始保證金。`,
    `維持率低於 ${cut}% 時，期貨商會直接以市價代為沖銷（砍倉），不必等到收盤或追繳期限。`,
    `砍倉是盤中即時計算；行情跳空時成交價可能更差，虧損甚至超過保證金，需另外補足。`,
  ].map(t => `<li>${esc(t)}</li>`).join('');
})();

// ===== settlement.html：小 Tips（豁免代為沖銷商品）=====
(function () {
  const box = document.getElementById('exempt-tips'), T = D.exemptTips;
  if (!box || !T) return;
  box.innerHTML = `<b class="tips-h"><span aria-hidden="true">💡</span>${esc(T.title)}</b><p>${esc(T.text)}</p>` +
    (T.points && T.points.length ? `<ul>${T.points.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : '');
})();

// ===== margin-calc.html：維持率計算機（由進場價推算做多、做空的追繳與砍倉價格）=====
(function () {
  const C = D.ratioCalc, form = document.getElementById('rc-form');
  if (!C || !form) return;
  const g = id => document.getElementById(id);
  const P = C.products, cut = C.cutPct;
  const fmtP = n => n.toLocaleString('zh-TW', { maximumFractionDigits: 2 });
  const def = Math.max(0, P.findIndex(p => p.name === '微台'));
  g('rc-products').innerHTML = P.map((p, i) =>
    `<label><input type="radio" name="rcprod" value="${i}"${i === def ? ' checked' : ''}><span>${esc(p.name)}<small>每點 ${fmtN(p.pointValue)} 元</small></span></label>`).join('');
  g('rc-hint').textContent = `選擇商品後會自動帶入期交所 ${C.marginDate} 公告的保證金，可自行修改。假設進場時帳戶權益剛好等於原始保證金（維持率 100%），且只持有同一種商品；口數多寡不影響價格。`;
  g('rc-points').innerHTML = [
    `追繳點數 = （原始保證金 − 維持保證金）÷ 每點價值：權益跌破維持保證金時會被追繳，需補足至原始保證金。`,
    `砍倉點數 = 原始保證金 ×（1 − ${cut}%）÷ 每點價值：維持率（權益數 ÷ 原始保證金）低於 ${cut}% 時，期貨商會代為沖銷。`,
    `做多：進場價 − 點數（價格跌破就觸發）；做空：進場價 + 點數（價格漲破就觸發）。`,
    `實際砍倉為盤中即時計算；行情跳空時成交價可能更差，未計入手續費與期交稅。`,
  ].map(t => `<li>${esc(t)}</li>`).join('');
  const prod = () => P[+form.querySelector('input[name="rcprod"]:checked').value];
  const loadDefaults = () => { const p = prod(); g('rc-init').value = p.initial; g('rc-maint').value = p.maintenance; };

  function run() {
    const p = prod(), pv = p.pointValue;
    const entry = +g('rc-entry').value, init = +g('rc-init').value || 0, maint = +g('rc-maint').value || 0;
    const ok = isFinite(entry) && entry > 0 && init > 0 && pv > 0;
    const callPts = (init - maint) / pv, cutPts = init * (1 - cut / 100) / pv;
    g('rc-head').innerHTML = ok
      ? `${esc(p.full)}（${esc(p.name)}）每點 ${fmtN(pv)} 元｜進場價 <b class="mono">${fmtP(entry)}</b> 點`
      : '請輸入進場價與原始保證金';
    const row = (cls, title, sub, word, price, pts) =>
      `<div class="rc-row ${cls}"><span class="rc-lbl">${title}<small>${sub}</small></span>` +
      `<b class="rc-price">${ok && price > 0 ? `${word} ${fmtP(price)} <small>點</small>` : '—'}</b>` +
      `<span class="rc-pts">${ok ? `距進場 ${word === '跌破' ? '−' : '+'}${fmtP(pts)} 點` : ''}</span></div>`;
    const block = (d, name) => {
      const word = d > 0 ? '跌破' : '漲破';
      return `<div class="rc-dir ${d > 0 ? 'long' : 'short'}"><span class="rc-dir-h">${name}</span>` +
        row('call', '追繳', '低於維持保證金', word, entry - d * callPts, callPts) +
        row('cut', '強制砍倉', `維持率低於 ${cut}%`, word, entry - d * cutPts, cutPts) + '</div>';
    };
    g('rc-dirs').innerHTML = block(1, '做多（買進）') + block(-1, '做空（賣出）');
    g('rc-note').textContent = ok
      ? `追繳：（${fmtN(init)} − ${fmtN(maint)}）÷ ${fmtN(pv)} = ${fmtP(callPts)} 點；砍倉：${fmtN(init)} × ${100 - cut}% ÷ ${fmtN(pv)} = ${fmtP(cutPts)} 點。保證金請以期交所與期貨商最新公告為準。`
      : '';
  }

  form.addEventListener('input', e => { if (e.target.name === 'rcprod') loadDefaults(); run(); });
  loadDefaults(); run();
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

// 選擇權共用計算（策略頁與數據分析頁的策略篩選器共用）
const OptMath = (() => {
  const erf = x => { const t = 1 / (1 + 0.3275911 * Math.abs(x)), y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; };
  const cnd = x => 0.5 * (1 + erf(x / Math.SQRT2));
  // Black-76 理論價（F 期貨或指數、K 履約價、T 年、iv 年化波動率）
  const black = (F, K, T, iv, call) => {
    if (F <= 0) return call ? 0 : K;
    if (T <= 0 || iv <= 0) return Math.max(call ? F - K : K - F, 0);
    const sd = iv * Math.sqrt(T), d1 = (Math.log(F / K) + sd * sd / 2) / sd, c = F * cnd(d1) - K * cnd(d1 - sd);
    return call ? c : c - (F - K);
  };
  // 由權利金反推隱含波動率（二分法）；價格低於內含價值時回傳 NaN
  const impliedVol = (price, F, K, T, call) => {
    const intrinsic = Math.max(call ? F - K : K - F, 0);
    if (!(price > intrinsic) || T <= 0) return NaN;
    let lo = 0.001, hi = 3;
    for (let i = 0; i < 80; i++) { const mid = (lo + hi) / 2; if (black(F, K, T, mid, call) > price) hi = mid; else lo = mid; }
    return (lo + hi) / 2;
  };
  // data.js 的 legs → { sg 買+1/賣-1, fut 期貨, call, k 履約價, p 權利金, q 口數, far 遠月 }
  const legsOf = legs => legs.map(([side, type, k, p, q, mo]) => ({
    sg: side === '買' ? 1 : -1, fut: type === '期貨', call: /call/i.test(type), k, p: p || 0, q: q || 1, far: mo === '遠月' }));
  return { erf, cnd, black, impliedVol, legsOf };
})();

// options-strategy.html：選擇權策略（由 data.js 的 legs 自動算出損益、兩平點並畫到期損益圖）
(function () {
  const list = document.getElementById('st-list');
  if (!list || !D.optStrategyGroups) return;
  const cfg = D.optStrategyIntro || {}, idx = cfg.index || 40000, pv = cfg.pointValue || 50;
  const iv = cfg.iv || 0.18, farT = (cfg.farDaysLeft || 28) / 365;
  const groups = D.optStrategyGroups, items = groups.flatMap(g => g.items);
  const num = n => (Math.round(n * 100) / 100).toLocaleString('zh-TW');
  const views = ['看漲', '看跌', '盤整', '大波動', '套利'], vcls = { 看漲: 'up', 看跌: 'dn', 盤整: 'flat', 大波動: 'vol', 套利: 'arb' };
  const slug = s => 'st-' + s.en.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const legsOf = s => OptMath.legsOf(s.legs);
  // 遠月部位：近月到期當天用 Black-76 估算剩餘價值
  const black = (F, K, call) => OptMath.black(F, K, farT, iv, call);
  const legPay = (l, S) => l.fut ? S - l.k
    : (l.far ? black(S, l.k, l.call) : Math.max(l.call ? S - l.k : l.k - S, 0)) - l.p;
  const pay = (L, S) => L.reduce((a, l) => a + l.sg * l.q * legPay(l, S), 0);
  const pts = v => `${num(v)} 點<small>（${fmtN(v * pv)} 元）</small>`;
  const rich = t => esc(t).replace(/\*\*(.+?)\*\*/g, '<mark class="st-key">$1</mark>'); // **文字** → 重點標示

  const analyse = s => {
    const L = legsOf(s), opts = L.filter(l => !l.fut), curved = L.some(l => l.far);
    const ks = [...new Set(opts.map(l => l.k))].sort((a, b) => a - b);
    let bes = [], hi, lo, slopeR = 0, slopeL = 0;
    if (curved) {
      // 有遠月部位時損益是曲線：逐點取樣找極值與兩平點
      let prev = null;
      hi = -Infinity; lo = Infinity;
      for (let S = idx - 8000; S <= idx + 8000; S++) {
        const v = pay(L, S);
        hi = Math.max(hi, v); lo = Math.min(lo, v);
        if (prev !== null && (prev < 0) !== (v < 0)) bes.push(S - (v / (v - prev)));
        prev = v;
      }
    } else {
      // 到期損益是分段直線：兩端斜率決定「無上限」，極值一定在履約價上
      slopeR = L.reduce((a, l) => a + (l.fut || l.call ? l.sg * l.q : 0), 0);   // 往上漲每點的損益變化
      slopeL = L.reduce((a, l) => a + (l.fut ? -l.sg * l.q : !l.call ? l.sg * l.q : 0), 0);  // 往下跌每點的損益變化
      const vals = ks.map(k => pay(L, k));
      hi = Math.max(...vals); lo = Math.min(...vals);
      // 找兩平點：左端取到指數 0，右端取到最高履約價的兩倍，確保遠離現價的兩平點也找得到
      const xs = [0, ...ks.filter(k => k > 0), ks[ks.length - 1] * 2];
      for (let i = 0; i < xs.length - 1; i++) {
        const a = xs[i], b = xs[i + 1], fa = pay(L, a), fb = pay(L, b);
        if (fa === 0 && !bes.includes(a)) bes.push(a);
        if (fa * fb < 0) bes.push(a + (b - a) * (-fa) / (fb - fa));
      }
    }
    if (curved) { hi = Math.round(hi); lo = Math.round(lo); }   // 估算值取整數點
    const about = curved ? '約 ' : '', est = '';   // 跨月份價差的估算說明放在分組說明裡，卡片只標「約」
    const maxP = slopeR > 0 && slopeL > 0 ? '無上限<small>（大漲或大跌越多賺越多）</small>'
      : slopeR > 0 ? '無上限<small>（漲越多賺越多）</small>' : slopeL > 0 ? '可能很大<small>（跌越多賺越多）</small>'
      : hi <= 0 ? '無' : about + pts(hi) + est;
    const maxL = slopeR < 0 && slopeL < 0 ? '無上限<small>（大漲或大跌越多虧越多）</small>'
      : slopeR < 0 ? '無上限<small>（漲越多虧越多）</small>' : slopeL < 0 ? '可能很大<small>（跌越多虧越多）</small>'
      : lo >= 0 ? '不會虧損<small>（損益已鎖定，未計手續費與稅）</small>' : about + pts(-lo) + est;
    const net = opts.reduce((a, l) => a + l.sg * l.q * l.p, 0);
    const hasShort = opts.some(l => l.sg < 0), hasFut = L.some(l => l.fut), limited = !(slopeR < 0 || slopeL < 0);
    // 保證金（依期交所組合部位規定的簡化說明）
    const [l1, l2] = L, two = L.length === 2 && !hasFut && !curved;
    const vertical = two && l1.call === l2.call && l1.sg !== l2.sg && l1.q === l2.q;
    const shortPair = two && l1.call !== l2.call && l1.sg < 0 && l2.sg < 0;
    const width = vertical ? Math.abs(l1.k - l2.k) * l1.q : 0;
    // 四隻腳剛好拆成「Call 一組、Put 一組」付權利金的價差（如反向鐵兀鷹、盒式價差）：組合單免保證金
    const debitPair = g => {
      if (g.length !== 2 || g[0].sg === g[1].sg || g[0].q !== g[1].q) return false;
      const b = g.find(l => l.sg > 0), sl = g.find(l => l.sg < 0);
      return b.call ? b.k < sl.k : b.k > sl.k;
    };
    const twoDebit = !hasFut && !curved && opts.length === 4 && debitPair(opts.filter(l => l.call)) && debitPair(opts.filter(l => !l.call));
    // 期貨＋賣出選擇權：「買期貨＋賣 Call」或「賣期貨＋賣 Put」1 口小台配 1 口選擇權可組合，保證金＝期貨保證金＋權利金市值
    const futLeg = L.find(l => l.fut), shorts = opts.filter(l => l.sg < 0);
    const mtx = ((D.ratioCalc || {}).products || []).find(p => p.name === '小台');
    const futCombo = futLeg && shorts.length === 1 && shorts[0].q === 1 && (futLeg.sg > 0 ? shorts[0].call : !shorts[0].call);
    const margin = hasFut && !hasShort ? `需要${mtx ? ` ${fmtN(mtx.initial)} 元` : ''}<small>（小台期貨原始保證金，買進的選擇權只付權利金）</small>`
      : futCombo ? `需要${mtx ? ` ${fmtN(mtx.initial + shorts[0].p * pv)} 元` : ''}<small>（期貨與選擇權組合部位：小台原始保證金${mtx ? ` ${fmtN(mtx.initial)}` : ''} ＋ 賣出 ${shorts[0].call ? 'Call' : 'Put'} 的權利金市值${fmtN(shorts[0].p * pv)}）</small>`
      : hasFut ? '需要<small>（小台期貨保證金，加上賣出選擇權的保證金，依期交所公告）</small>'
      : !hasShort ? '不需要<small>（只付權利金）</small>'
      : twoDebit ? '不需要<small>（拆成兩組付權利金的價差，用組合單下單）</small>'
      : curved ? '需要<small>（時間價差用組合單下單可減收，依期交所公告）</small>'
      : vertical && net > 0 ? '不需要<small>（用組合單下單，只付權利金）</small>'
      : vertical ? `需要 ${fmtN(width * pv)} 元<small>（組合單：履約價差 ${fmtN(width)} 點 × ${pv} 元）</small>`
      : shortPair ? '需要<small>（組合單：兩邊保證金較高者 ＋ 另一邊權利金市值 ＋ C 值）</small>'
      : limited ? '需要<small>（拆成價差用組合單下單，可大幅減收）</small>'
      : '需要<small>（賣方部位，依期交所公告計算）</small>';
    return { L, ks, bes: bes.map(b => Math.round(b)), net, maxP, maxL, margin, curved };
  };

  const chart = (s, a) => {
    const W = 480, H = 190, P = { l: 12, r: 12, t: 14, b: 26 }, x0 = idx - span, x1 = idx + span;
    const xsS = Array.from({ length: 201 }, (_, i) => x0 + (x1 - x0) * i / 200).concat(a.ks.filter(k => k > x0 && k < x1)).sort((p, q) => p - q);
    const ys = xsS.map(x => pay(a.L, x));
    let yMax = Math.max(...ys, 0), yMin = Math.min(...ys, 0);
    const pad = (yMax - yMin) * 0.12; yMax += pad; yMin -= pad;
    // 損益幅度很小（如套利只賺幾點）時，縱軸至少留 ±200 點，線才不會被放大成整片
    if (yMax - yMin < 400) { yMax = Math.max(yMax, 200); yMin = Math.min(yMin, -200); }
    const X = x => P.l + (x - x0) / (x1 - x0) * (W - P.l - P.r), Y = y => P.t + (yMax - y) / (yMax - yMin) * (H - P.t - P.b);
    const y0 = Y(0), line = xsS.map((x, i) => `${X(x).toFixed(1)},${Y(ys[i]).toFixed(1)}`).join(' ');
    const area = `M${X(x0)},${y0} L${line.replace(/ /g, ' L')} L${X(x1)},${y0} Z`, id = 'st' + Math.random().toString(36).slice(2, 7);
    // 橫軸刻度取整千點（範圍小時取 500 點）
    const step = span >= 2000 ? 1000 : 500, ticks = [];
    for (let t = Math.ceil(x0 / step) * step; t <= x1; t += step) ticks.push(t);
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(s.name)}${a.curved ? '近月到期' : '到期'}損益圖">` +
      `<defs><clipPath id="${id}u"><rect x="0" y="0" width="${W}" height="${y0}"/></clipPath><clipPath id="${id}d"><rect x="0" y="${y0}" width="${W}" height="${H - y0}"/></clipPath></defs>` +
      `<path class="oc-fill-up" d="${area}" clip-path="url(#${id}u)"/><path class="oc-fill-dn" d="${area}" clip-path="url(#${id}d)"/>` +
      a.ks.map(k => `<line class="oc-strike" x1="${X(k)}" x2="${X(k)}" y1="${P.t - 6}" y2="${H - P.b}"/>`).join('') +
      `<line class="oc-zero" x1="${P.l}" x2="${W - P.r}" y1="${y0}" y2="${y0}"/>` +
      `<polyline class="oc-line" points="${line}"/>` +
      a.bes.filter(b => b > x0 && b < x1).map(b => `<circle class="oc-be" cx="${X(b)}" cy="${y0}" r="4.5"/>`).join('') +
      `<g class="oc-tick">${ticks.map(t => `<text x="${X(t)}" y="${H - 6}" text-anchor="${t === x0 ? 'start' : t === x1 ? 'end' : 'middle'}">${t.toLocaleString('zh-TW')}</text>`).join('')}</g></svg>`;
  };

  const legRow = (l, showMo) => {
    const side = `<b class="${l.sg > 0 ? 'buy' : 'sell'}">${l.sg > 0 ? '買進' : '賣出'}</b>`;
    if (l.fut) return `<li>${side}<span class="mono">${l.k.toLocaleString('zh-TW')}</span> 小台期貨<em>期貨成交點數</em></li>`;
    const mo = showMo ? `<span class="st-mo${l.far ? ' far' : ''}">${l.far ? '遠月' : '近月'}</span>` : '';
    return `<li>${side}${mo}<span class="mono">${l.k.toLocaleString('zh-TW')}</span> ${l.call ? 'Call' : 'Put'}` +
      `${l.q > 1 ? ` × ${l.q} 口` : ''}<em class="mono">權利金 ${num(l.p)}</em></li>`;
  };

  const holdCls = k => /需放到結算/.test(k) ? 'm' : /近月/.test(k) ? 'n' : 'e';   // 持有方式的顏色
  const card = (s, a) => {
    const v = vcls[s.view] || 'flat';
    const cost = a.net > 0 ? `付出 ${pts(a.net)}` : a.net < 0 ? `收取 ${pts(-a.net)}` : '0 點<small>（一收一付，剛好相抵）</small>';
    const be = a.bes.length ? a.bes.map(b => `<span class="mono">${num(b)}</span>`).join('、') + (a.curved ? '<small>（約）</small>' : '')
      : a.maxL.startsWith('不會') ? '無<small>（損益固定）</small>' : '—';
    return `<article class="card st-card" id="${slug(s)}" data-view="${esc(s.view)}">` +
      `<header class="st-h"><span class="st-view ${v}">${esc(s.view)}</span>${s.level ? `<span class="st-lv">${esc(s.level)}</span>` : ''}` +
      `${s.hold && holdCls(s.hold[0]) === 'm' ? '<span class="st-lv st-lv-settle">需放到結算</span>' : ''}<h3>${esc(s.name)} <small>${esc(s.en)}</small></h3></header>` +
      `<p class="st-sum">${rich(s.summary)}</p>` +
      `<div class="st-chart">${chart(s, a)}</div>` +
      `<ul class="st-legs">${a.L.map(l => legRow(l, a.curved)).join('')}</ul>` +
      `<dl class="st-stats"><div><dt>${a.net > 0 ? '建立成本' : a.net < 0 ? '先收權利金' : '權利金淨額'}</dt><dd>${cost}</dd></div>` +
      `<div><dt>損益兩平點</dt><dd>${be}</dd></div>` +
      `<div><dt>最大獲利</dt><dd class="pos">${a.maxP}</dd></div><div><dt>最大虧損</dt><dd class="neg">${a.maxL}</dd></div>` +
      `<div class="span2"><dt>保證金</dt><dd>${a.margin}</dd></div></dl>` +
      `<p class="st-when"><b>適用時機</b>${rich(s.when)}</p>` +
      (s.cp || s.pcr || s.hold ? `<div class="st-cond"><p class="st-cond-h">適用條件</p><dl>` +
        (s.cp ? `<div><dt>權利金比較</dt><dd>${rich(s.cp)}</dd></div>` : '') +
        (s.pcr ? `<div><dt>P/C Ratio</dt><dd>${rich(s.pcr)}</dd></div>` : '') +
        (s.hold ? `<div><dt>持有方式</dt><dd><span class="st-hold ${holdCls(s.hold[0])}">${esc(s.hold[0])}</span>${rich(s.hold[1])}</dd></div>` : '') +
        `</dl></div>` : '') +
      `<p class="st-watch"><b>注意</b>${rich(s.watch)}</p></article>`;
  };

  // 所有損益圖共用同一個橫軸範圍：涵蓋每個策略的履約價與兩平點，再往外留 400 點，以 500 點為單位
  const all = new Map(items.map(s => [s, analyse(s)]));
  const far = Math.max(...[...all.values()].flatMap(a => [...a.ks, ...a.bes].map(x => Math.abs(x - idx))));
  const span = Math.max(1000, Math.ceil((far + 400) / 500) * 500);

  list.innerHTML = groups.map((g, gi) =>
    `<section class="st-group" id="st-g${gi + 1}"><div class="st-gh"><h2><span class="st-gn">${gi + 1}</span>${esc(g.name)}<small>${g.items.length} 種</small></h2><p>${rich(g.desc)}</p></div>` +
    `<div class="st-grid">${g.items.map(s => card(s, all.get(s))).join('')}</div></section>`).join('');

  // 速查表：依行情看法列出所有策略，點名稱跳到該張卡片
  const index = document.getElementById('st-index');
  if (index) index.innerHTML = views.filter(v => items.some(s => s.view === v)).map(v =>
    `<div class="st-ix-col"><span class="st-view ${vcls[v]}">${v}</span><ul>` +
    items.filter(s => s.view === v).map(s => `<li><a href="#${slug(s)}">${esc(s.name)}</a></li>`).join('') + `</ul></div>`).join('');

  const note = document.getElementById('st-note');
  if (note) note.textContent = cfg.note || '';
  const bar = document.getElementById('st-filter');
  const count = v => items.filter(s => !v || s.view === v).length;
  const setView = v => {
    bar.querySelectorAll('button').forEach(x => { const on = x.dataset.view === v; x.classList.toggle('active', on); x.setAttribute('aria-pressed', on); });
    list.querySelectorAll('.st-card').forEach(c => { c.hidden = !!v && c.dataset.view !== v; });
    list.querySelectorAll('.st-group').forEach(g => { g.hidden = !g.querySelector('.st-card:not([hidden])'); });
  };
  bar.innerHTML = ['', ...views].map(v => `<button type="button" class="tab${v ? '' : ' active'}" data-view="${v}" aria-pressed="${!v}">${v || '全部'} <small>${count(v)}</small></button>`).join('');
  // 點篩選按鈕：篩選後捲動到第一個符合的分類（扣掉上方黏住的選單列與篩選列高度）
  // 篩選列黏在選單列正下方（選單列高度在手機上可能不同）
  const stick = () => { bar.closest('.st-bar').style.top = (document.querySelector('.topbar')?.offsetHeight || 0) + 'px'; };
  stick(); addEventListener('resize', stick);
  const jumpTo = el => {
    const top = (document.querySelector('.topbar')?.offsetHeight || 0) + bar.closest('.st-bar').offsetHeight + 12;
    window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - top, behavior: 'smooth' });
  };
  bar.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    setView(b.dataset.view);
    // 手機上篩選列可左右滑動：把按下的按鈕捲到中間
    if (bar.scrollWidth > bar.clientWidth) bar.scrollTo({ left: b.offsetLeft - (bar.clientWidth - b.offsetWidth) / 2, behavior: 'smooth' });
    const first = list.querySelector('.st-group:not([hidden])');
    if (first) jumpTo(first);
  });
  // 從速查表點到被篩選隱藏的卡片時，先切回「全部」
  index?.addEventListener('click', e => {
    const a = e.target.closest('a'); if (!a) return;
    const c = document.getElementById(a.hash.slice(1));
    if (c?.hidden) setView('');
    c?.classList.remove('st-flash'); void c?.offsetWidth; c?.classList.add('st-flash');
  });
})();

// analysis.html：選擇權策略篩選器（報價 → 判讀 IV → 依看法篩選、排名策略庫中的組合）
(function () {
  const form = document.getElementById('sc-form');
  if (!form || !D.optStrategyGroups) return;
  const C0 = D.optScreener || {}, intro = D.optStrategyIntro || {}, PV = intro.pointValue || 50;
  const baseIdx = intro.index || 40000, baseStep = intro.step || 400;
  const OFFS = [-2, -1, 0, 1, 2];
  const el = id => document.getElementById(id);
  const val = id => parseFloat(el(id).value);
  const nf = n => Math.round(n).toLocaleString('zh-TW');
  const sgn = n => (n > 0 ? '+' : n < 0 ? '−' : '') + nf(Math.abs(n));
  const pct = n => (Math.round(n * 1000) / 10).toFixed(1) + '%';
  const slug = s => 'st-' + s.en.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const vcls = { 看漲: 'up', 看跌: 'dn', 盤整: 'flat', 大波動: 'vol' };

  // 預設值與 5 檔報價表
  [['sc-spot', C0.spot], ['sc-fut', C0.fut], ['sc-days', C0.days], ['sc-step', C0.step], ['sc-refiv', C0.refIv],
   ['sc-a', C0.A], ['sc-b', C0.B], ['sc-cval', C0.C], ['sc-budget', C0.budget]].forEach(([id, v]) => { if (v != null) el(id).value = v; });
  if (el('sc-mdate')) el('sc-mdate').textContent = C0.marginDate ? `${C0.marginDate} 公告` : '請依期交所最新公告填入';
  el('sc-chain').innerHTML = OFFS.map((o, i) => `<div class="sc-chain-r${o === 0 ? ' atm' : ''}">` +
    `<span class="sc-k"><b class="mono" id="sc-k${i}"></b><small>${o === 0 ? '價平' : o < 0 ? `低 ${-o} 檔` : `高 ${o} 檔`}</small></span>` +
    `<input id="sc-c${i}" type="number" min="0" step="any" aria-label="Call 權利金" value="${C0.calls?.[i] ?? ''}">` +
    `<input id="sc-p${i}" type="number" min="0" step="any" aria-label="Put 權利金" value="${C0.puts?.[i] ?? ''}"></div>`).reverse().join('');   // 由高到低顯示

  // 可比較的策略：排除套利、搭配期貨、跨月份（需要遠月報價）；履約價換算成「離價平幾檔」
  const templates = D.optStrategyGroups.flatMap(g => g.items)
    .filter(s => vcls[s.view] && !s.legs.some(l => l[1] === '期貨' || l[5] === '遠月'))
    .map(s => ({ s, legs: OptMath.legsOf(s.legs).map(l => ({ ...l, o: Math.max(-2, Math.min(2, Math.round((l.k - baseIdx) / baseStep))) })) }));

  // 每個策略的不同履約價組合：整組平移；垂直價差另外比較不同寬度
  const variants = t => {
    const out = [], seen = new Set(), L = t.legs;
    const add = offs => {
      if (offs.some(o => o < -2 || o > 2)) return;
      const legs = L.map((l, i) => ({ ...l, o: offs[i] }));
      if (legs.some((a, i) => legs.some((b, j) => j > i && a.call === b.call && a.o === b.o && a.sg !== b.sg))) return;
      const key = legs.map(l => `${l.sg}${l.call ? 'C' : 'P'}${l.o}x${l.q}`).sort().join('|');
      if (!seen.has(key)) { seen.add(key); out.push(legs); }
    };
    // 跨式、勒式這類「Call 和 Put 同買或同賣」的組合不平移，平移到深價內會變成方向性部位，名稱就不符了
    const sameSideMix = L.some(l => l.call) && L.some(l => !l.call) && L.every(l => l.sg === L[0].sg);
    for (let sh = sameSideMix ? 0 : -4; sh <= (sameSideMix ? 0 : 4); sh++) add(L.map(l => l.o + sh));
    if (L.length === 2 && L[0].call === L[1].call && L[0].sg !== L[1].sg && L[0].q === L[1].q) {
      const lowFirst = L[0].o < L[1].o;
      for (let a = -2; a <= 2; a++) for (let b = a + 1; b <= 2; b++) add(lowFirst ? [a, b] : [b, a]);
    }
    return out;
  };
  const pool = templates.flatMap(t => variants(t).map(legs => ({ t, legs })));

  // 保證金估算：同種選擇權先配成價差（付權利金的價差 0、收權利金的價差 = 履約價差 × 每點），剩下的賣方部位用單一公式，Call、Put 各一口時用勒式規則
  const marginOf = (L, M) => {
    const single = l => l.p * PV + Math.max(M.A - Math.max(l.call ? l.k - M.spot : M.spot - l.k, 0) * PV, M.B);
    let total = 0; const naked = { c: [], p: [] };
    [true, false].forEach(call => {
      const longs = [], shorts = [];
      L.filter(l => l.call === call).forEach(l => { for (let i = 0; i < l.q; i++) (l.sg > 0 ? longs : shorts).push(l); });
      shorts.sort((a, b) => a.k - b.k).forEach(s => {
        if (!longs.length) { naked[call ? 'c' : 'p'].push(s); return; }
        let bi = 0; longs.forEach((b, i) => { if (Math.abs(b.k - s.k) < Math.abs(longs[bi].k - s.k)) bi = i; });
        const b = longs.splice(bi, 1)[0];
        if (call ? s.k < b.k : s.k > b.k) total += Math.abs(b.k - s.k) * PV;
      });
    });
    while (naked.c.length && naked.p.length) {
      const c = naked.c.pop(), p = naked.p.pop(), mc = single(c), mp = single(p);
      total += Math.max(mc, mp) + (mc >= mp ? p.p : c.p) * PV + M.C;
    }
    naked.c.concat(naked.p).forEach(l => { total += single(l); });
    return total;
  };

  // 評估單一組合
  const evaluate = (t, legsO, M) => {
    const L = legsO.map(l => ({ ...l, k: M.atm + l.o * M.step, p: (l.call ? M.calls : M.puts)[l.o + 2] }));
    const pay = S => L.reduce((a, l) => a + l.sg * l.q * (Math.max(l.call ? S - l.k : l.k - S, 0) - l.p), 0);
    const ks = [...new Set(L.map(l => l.k))].sort((a, b) => a - b);
    const slopeR = L.reduce((a, l) => a + (l.call ? l.sg * l.q : 0), 0), slopeL = L.reduce((a, l) => a + (l.call ? 0 : l.sg * l.q), 0);
    const vals = ks.map(pay), hi = Math.max(...vals), lo = Math.min(...vals);
    const net = L.reduce((a, l) => a + l.sg * l.q * l.p, 0);
    const xs = [0, ...ks, ks[ks.length - 1] * 2], bes = [];
    for (let i = 0; i < xs.length - 1; i++) {
      const a = xs[i], b = xs[i + 1], fa = pay(a), fb = pay(b);
      if (fa === 0 && !bes.includes(a)) bes.push(a);
      if (fa * fb < 0) bes.push(a + (b - a) * (-fa) / (fb - fa));
    }
    const unlimited = slopeR < 0 || slopeL < 0, bigUp = slopeR > 0 || slopeL > 0;
    // 情境：看對時的損益，與看錯方向／價格不動時比較
    const F = M.fut, sc = M.scen;
    let gain, other;
    if (sc.kind === 'dir') { gain = pay(sc.c); other = pay(2 * F - sc.c); }
    else if (sc.kind === 'flat') { gain = pay(sc.c); other = Math.max(pay(sc.c + M.em), pay(sc.c - M.em)); }
    else { gain = Math.min(pay(F + sc.move), pay(F - sc.move)); other = pay(F); }
    // 品質門檻：看對要明顯比看錯好（差距 ≥ 損益區間的 20%），看對時的獲利 ≥ 最大虧損的 20%
    const maxLoss = unlimited ? Infinity : -lo, range = bigUp || unlimited ? Infinity : hi - lo;
    const scale = Number.isFinite(range) ? range : Math.max(gain, Number.isFinite(maxLoss) ? maxLoss : gain);
    if (!(gain > 0 && gain - other >= 0.2 * scale && (!Number.isFinite(maxLoss) || gain >= 0.2 * maxLoss))) return null;
    // 大漲／大跌：還要比「價格不動」時明顯賺得多，而且漲（跌）過頭也不能虧損無上限
    if (sc.big && (gain - pay(F) < 0.2 * scale || (sc.c > F ? slopeR < 0 : slopeL < 0))) return null;
    let pop = 0;
    M.grid.forEach(([S, w]) => { if (pay(S) > 0) pop += w; });
    const margin = marginOf(L, M), capital = margin + Math.max(net, 0) * PV;
    return { t, L, pay, ks, net, bes: bes.map(Math.round), hi, lo, unlimited, bigUp, gain, pop, margin, capital };
  };

  const compute = () => {
    const spot = val('sc-spot'), fut = val('sc-fut') || spot, days = val('sc-days'), step = val('sc-step');
    const out = { read: el('sc-read'), note: el('sc-read-note'), count: el('sc-count'), top: el('sc-top'), more: el('sc-more') };
    const fail = msg => { out.read.innerHTML = ''; out.note.textContent = msg; out.count.textContent = ''; out.top.innerHTML = ''; out.more.innerHTML = ''; el('sc-chart-card').hidden = true; };
    if (!(spot > 0 && days > 0 && step > 0)) return fail('請填入台指現價、距到期天數與履約價間距。');
    const atm = Math.round(spot / step) * step, T = days / 365;
    OFFS.forEach((o, i) => { el('sc-k' + i).textContent = nf(atm + o * step); });
    const raw = { c: OFFS.map((_, i) => val('sc-c' + i)), p: OFFS.map((_, i) => val('sc-p' + i)) };
    const ivC = OptMath.impliedVol(raw.c[2], fut, atm, T, true), ivP = OptMath.impliedVol(raw.p[2], fut, atm, T, false);
    const ivs = [ivC, ivP].filter(v => v > 0), iv = ivs.length ? ivs.reduce((a, b) => a + b) / ivs.length : NaN;
    if (!(iv > 0)) return fail('價平的 Call 或 Put 權利金無法換算出隱含波動率，請確認報價（權利金要大於內含價值）。');
    // 空白格用價平 IV 估算，顯示在格子裡當提示
    const est = (o, call) => OptMath.black(fut, atm + o * step, T, iv, call);
    const calls = raw.c.map((v, i) => (v > 0 ? v : est(OFFS[i], true))), puts = raw.p.map((v, i) => (v > 0 ? v : est(OFFS[i], false)));
    OFFS.forEach((o, i) => { el('sc-c' + i).placeholder = '估 ' + nf(calls[i]); el('sc-p' + i).placeholder = '估 ' + nf(puts[i]); });

    // 市場判讀
    const refIv = (val('sc-refiv') || 18) / 100, ratio = iv / refIv;
    const level = ratio > 1.15 ? 'high' : ratio < 0.85 ? 'low' : 'mid';
    const levelTxt = { high: '偏高', low: '偏低', mid: '普通' }[level];
    const em = calls[2] + puts[2];
    const skP = OptMath.impliedVol(puts[1], fut, atm - step, T, false), skC = OptMath.impliedVol(calls[3], fut, atm + step, T, true);
    const skew = (skP - skC) * 100, skewTxt = !(skew === skew) ? '—' : skew > 1.5 ? 'Put 偏貴' : skew < -1.5 ? 'Call 偏貴' : '平';
    // 套利檢查：合成價格 vs 期貨、盒式價差 vs 履約價差（只用有填的報價，差距大於 5 點才提示）
    let arb = null;
    OFFS.forEach((o, i) => {
      if (!(raw.c[i] > 0 && raw.p[i] > 0)) return;
      const d = fut - (atm + o * step + raw.c[i] - raw.p[i]);
      if (Math.abs(d) > 5 && (!arb || Math.abs(d) > arb.v)) arb = { v: Math.abs(d), txt: d < 0 ? `期貨比 ${nf(atm + o * step)} 合成價格便宜 ${nf(-d)} 點，可留意「轉換」` : `期貨比 ${nf(atm + o * step)} 合成價格貴 ${nf(d)} 點，可留意「逆轉換」` };
    });
    for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) {
      if (![raw.c[i], raw.c[j], raw.p[i], raw.p[j]].every(v => v > 0)) continue;
      const edge = (j - i) * step - (raw.c[i] - raw.c[j] + raw.p[j] - raw.p[i]);
      if (Math.abs(edge) > 5 && (!arb || Math.abs(edge) > arb.v)) arb = { v: Math.abs(edge), txt: `${nf(atm + OFFS[i] * step)}／${nf(atm + OFFS[j] * step)} ${edge > 0 ? '買進' : '賣出'}盒式價差可鎖住約 ${nf(Math.abs(edge))} 點` };
    }
    out.read.innerHTML =
      `<div><span>價平隱含波動率</span><b>${pct(iv)}</b><small>${levelTxt}（參考 ${pct(refIv)}）</small></div>` +
      `<div><span>預期波動</span><b>±${nf(em)}</b><small>約 ${pct(em / spot)}（價平 Call ＋ Put）</small></div>` +
      `<div><span>波動率偏斜</span><b>${skewTxt}</b><small>${skew === skew ? `價外 Put ${pct(skP)}／Call ${pct(skC)}` : '報價不足'}</small></div>` +
      `<div><span>套利檢查</span><b>${arb ? '有落差' : '無'}</b><small>${arb ? esc(arb.txt) : '合成價格與期貨、盒式價差都沒有明顯落差'}</small></div>`;
    out.note.textContent = { high: '權利金偏高：先收權利金的策略（賣方、收權利金的價差）較有利。', low: '權利金偏低：付權利金的策略（買方、付權利金的價差）較划算。', mid: '權利金普通：買方與賣方策略都可以考慮，重點在方向與幅度判斷。' }[level] + (arb ? '扣掉手續費與期交稅前，請先確認套利空間是否足夠。' : '');

    // 情境
    const view = form.querySelector('[name="sc-view"]:checked').value, target = val('sc-target');
    const mult = { bigup: 1, up: 0.4, flat: 0, dn: -0.4, bigdn: -1 };
    let scen;
    // 大波動：你預期的波動要比市場預期大，預設取 1.3 倍預期波動
    if (view === 'vol') scen = { kind: 'vol', move: target > 0 ? Math.abs(target - fut) || 1.3 * em : 1.3 * em };
    else if (view === 'flat') scen = { kind: 'flat', c: target > 0 ? target : fut };
    else scen = { kind: 'dir', c: target > 0 ? target : fut + mult[view] * em, big: view === 'bigup' || view === 'bigdn' };
    // 到期價格分布（對數常態，用價平 IV）
    const sd = iv * Math.sqrt(T), grid = [];
    let wsum = 0;
    for (let i = 0; i <= 600; i++) { const z = -5 + 10 * i / 600, w = Math.exp(-z * z / 2); grid.push([fut * Math.exp(z * sd - sd * sd / 2), w]); wsum += w; }
    grid.forEach(g => { g[1] /= wsum; });
    const M = { spot, fut, atm, step, T, calls, puts, em, scen, grid, A: val('sc-a') || 0, B: val('sc-b') || 0, C: val('sc-cval') || 0 };

    const risk = form.querySelector('[name="sc-risk"]:checked').value, rank = form.querySelector('[name="sc-rank"]:checked').value;
    const budget = val('sc-budget');
    const fit = r => (level === 'high' ? (r.net < 0 ? 1 : -1) : level === 'low' ? (r.net > 0 ? 1 : -1) : 0);
    const score = r => { const f = 1 + 0.08 * fit(r); return rank === 'pop' ? r.pop * f : rank === 'ret' ? r.gain * PV / Math.max(r.capital, 1) * f : -r.capital / f; };
    // 策略本身的分類要和看法相容，避免平移履約價後性質改變、名稱卻不符
    const allow = { bigup: ['看漲', '大波動'], up: ['看漲', '盤整'], flat: ['盤整', '看漲', '看跌'], dn: ['看跌', '盤整'], bigdn: ['看跌', '大波動'], vol: ['大波動'] }[view];
    const fitView = pool.filter(c => allow.includes(c.t.s.view)).map(c => evaluate(c.t, c.legs, M)).filter(Boolean);
    const rs = fitView.filter(r => !(risk === 'limited' && r.unlimited) && !(budget > 0 && r.capital > budget));
    const best = new Map();
    rs.forEach(r => { const k = r.t.s.name, s = score(r); if (!best.has(k) || s > best.get(k).s) best.set(k, { r, s }); });
    // 排序（同分時所需資金少的優先）；到期損益完全相同的組合（例如買賣權平價下的多頭買權價差與多頭賣權價差）只留一個
    const probe = Array.from({ length: 13 }, (_, i) => fut + (i - 6) * step);
    const list = [];
    [...best.values()].sort((a, b) => b.s - a.s || a.r.capital - b.r.capital).forEach(({ r }) => {
      if (!list.some(q => probe.every(S => Math.abs(q.pay(S) - r.pay(S)) <= 3))) list.push(r);   // 容許跳動點進位造成的 1～3 點差
    });
    const dropped = new Set(fitView.map(r => r.t.s.name).filter(n => !best.has(n))).size;
    const rankTxt = { pop: '勝率', ret: '報酬（看對時獲利 ÷ 所需資金）', cost: '所需資金由低到高' }[rank];
    out.count.textContent = (list.length ? `共比較 ${pool.length} 種組合，符合條件的有 ${list.length} 種策略，依${rankTxt}排序` : '') +
      (dropped ? `${list.length ? '；' : ''}另有 ${dropped} 種方向相符，但超出資金上限或風險限制` : '');
    if (!list.length) {
      out.top.innerHTML = '<div class="card sc-empty"><b>沒有符合條件的策略</b><p>可以試著放寬資金上限、把風險限制改成「不限」，或調整目標價。</p></div>';
      out.more.innerHTML = ''; el('sc-chart-card').hidden = true; return;
    }

    // 前三名卡片
    const legTxt = r => r.L.map(l => `<li><b class="${l.sg > 0 ? 'buy' : 'sell'}">${l.sg > 0 ? '買進' : '賣出'}</b><span class="mono">${nf(l.k)}</span> ${l.call ? 'Call' : 'Put'}${l.q > 1 ? ` × ${l.q} 口` : ''}<em class="mono">權利金 ${nf(l.p)}</em></li>`).join('');
    const scenTxt = r => scen.kind === 'dir' ? `看對時（到期 ${nf(scen.c)}）賺 ${nf(r.gain)} 點；看錯方向（${nf(2 * fut - scen.c)}）${r.pay(2 * fut - scen.c) >= 0 ? '賺' : '虧'} ${nf(Math.abs(r.pay(2 * fut - scen.c)))} 點`
      : scen.kind === 'flat' ? `到期停在 ${nf(scen.c)} 時賺 ${nf(r.gain)} 點` : `到期漲跌 ${nf(scen.move)} 點時，至少賺 ${nf(r.gain)} 點`;
    const why = r => [
      scenTxt(r),
      `到期勝率約 ${pct(r.pop)}，損益兩平點 ${r.bes.length ? r.bes.map(nf).join('、') : '—'}`,
      fit(r) > 0 ? (level === 'high' ? '權利金偏高，先收權利金對你有利' : '權利金偏低，付權利金比較划算')
        : r.net < 0 ? `先收 ${nf(-r.net)} 點權利金` : `付出 ${nf(r.net)} 點權利金`,
      r.unlimited ? '虧損沒有上限，一定要設停損' : `最大虧損 ${nf(-r.lo)} 點（${nf(-r.lo * PV)} 元）`,
    ];
    const pick = (r, i) => `<article class="card sc-pick${i === 0 ? ' best' : ''}">` +
      `<header class="sc-pick-h"><span class="sc-rank">${i + 1}</span><div><h3>${esc(r.t.s.name)} <small>${esc(r.t.s.en)}</small></h3>` +
      `<span class="st-view ${vcls[r.t.s.view]}">${esc(r.t.s.view)}</span><span class="st-lv">${esc(r.t.s.level)}</span></div></header>` +
      `<ul class="st-legs">${legTxt(r)}</ul>` +
      `<dl class="sc-kv"><div><dt>到期勝率</dt><dd>${pct(r.pop)}</dd></div>` +
      `<div><dt>看對時損益</dt><dd class="pos">${sgn(r.gain)} 點<small>${sgn(r.gain * PV)} 元</small></dd></div>` +
      `<div><dt>最大虧損</dt><dd class="neg">${r.unlimited ? '無上限' : nf(-r.lo) + ' 點'}<small>${r.unlimited ? '需設停損' : nf(-r.lo * PV) + ' 元'}</small></dd></div>` +
      `<div><dt>所需資金</dt><dd>${nf(r.capital)} 元<small>${r.margin > 0 ? `含保證金 ${nf(r.margin)}` : '不需保證金'}</small></dd></div></dl>` +
      `<ul class="sc-why">${why(r).map(t => `<li>${esc(t)}</li>`).join('')}</ul>` +
      `<a class="sc-link" href="options-strategy.html#${slug(r.t.s)}">查看${esc(r.t.s.name)}的說明 →</a></article>`;
    const top = list.slice(0, 3);
    out.top.innerHTML = top.map(pick).join('');

    // 損益比較圖
    el('sc-chart-card').hidden = false;
    const W = 640, H = 230, P = { l: 52, r: 14, t: 14, b: 28 };
    const reach = Math.max(1.8 * em, scen.kind === 'dir' || scen.kind === 'flat' ? Math.abs(scen.c - fut) * 1.4 : scen.move * 1.4, 2.5 * step);
    const x0 = fut - reach, x1 = fut + reach;
    const xsS = Array.from({ length: 241 }, (_, i) => x0 + (x1 - x0) * i / 240);
    const series = top.map(r => xsS.concat(r.ks.filter(k => k > x0 && k < x1)).sort((a, b) => a - b).map(x => [x, r.pay(x)]));
    let yMax = Math.max(0, ...series.flat().map(p => p[1])), yMin = Math.min(0, ...series.flat().map(p => p[1]));
    const pad = (yMax - yMin) * 0.1 || 50; yMax += pad; yMin -= pad;
    const X = x => P.l + (x - x0) / (x1 - x0) * (W - P.l - P.r), Y = y => P.t + (yMax - y) / (yMax - yMin) * (H - P.t - P.b);
    const tickStep = [100, 200, 250, 500, 1000, 2000, 5000].find(s => (x1 - x0) / s <= 6) || 10000;
    const xt = []; for (let x = Math.ceil(x0 / tickStep) * tickStep; x <= x1; x += tickStep) xt.push(x);
    const yStep = [10, 20, 50, 100, 200, 250, 500, 1000, 2000, 5000].find(s => (yMax - yMin) / s <= 5) || 10000;
    const yt = []; for (let y = Math.ceil(yMin / yStep) * yStep; y <= yMax; y += yStep) yt.push(y);
    const marks = scen.kind === 'vol' ? [fut - scen.move, fut + scen.move] : [scen.c];
    el('sc-chart').innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="前三名策略的到期損益比較圖">` +
      yt.map(y => `<line class="sc-grid" x1="${P.l}" x2="${W - P.r}" y1="${Y(y)}" y2="${Y(y)}"/><text class="sc-ty" x="${P.l - 8}" y="${Y(y) + 4}" text-anchor="end">${sgn(y)}</text>`).join('') +
      `<line class="oc-zero" x1="${P.l}" x2="${W - P.r}" y1="${Y(0)}" y2="${Y(0)}"/>` +
      `<line class="sc-spot" x1="${X(fut)}" x2="${X(fut)}" y1="${P.t}" y2="${H - P.b}"/>` +
      marks.filter(m => m > x0 && m < x1).map(m => `<line class="sc-mark" x1="${X(m)}" x2="${X(m)}" y1="${P.t}" y2="${H - P.b}"/><text class="sc-mark-l" x="${X(m) + 4}" y="${P.t + 11}">情境 ${nf(m)}</text>`).join('') +
      series.map((sr, i) => `<polyline class="sc-l sc-l${i + 1}" points="${sr.map(([x, y]) => `${X(x).toFixed(1)},${Y(y).toFixed(1)}`).join(' ')}"/>`).join('') +
      `<g class="oc-tick">${xt.map(x => `<text x="${X(x)}" y="${H - 8}" text-anchor="middle">${nf(x)}</text>`).join('')}</g></svg>`;
    el('sc-legend').innerHTML = top.map((r, i) => `<span><i class="sc-sw sc-sw${i + 1}"></i>${i + 1}. ${esc(r.t.s.name)}</span>`).join('') + `<span><i class="sc-sw sc-sw-spot"></i>現價 ${nf(fut)}</span>`;

    // 其他符合條件的策略
    const rest = list.slice(3);
    out.more.innerHTML = rest.length ? `<p class="sc-more-h">其他符合條件的策略</p><div class="table-wrap"><table class="num-table sc-table"><thead><tr><th>策略</th><th>組合</th><th>到期勝率</th><th>看對時</th><th>最大虧損</th><th>所需資金</th></tr></thead><tbody>` +
      rest.map(r => `<tr><td><a href="options-strategy.html#${slug(r.t.s)}">${esc(r.t.s.name)}</a></td>` +
        `<td class="mono">${r.L.map(l => `${l.sg > 0 ? '買' : '賣'}${l.q > 1 ? l.q : ''} ${nf(l.k)}${l.call ? 'C' : 'P'}`).join('、')}</td>` +
        `<td>${pct(r.pop)}</td><td class="pos">${sgn(r.gain)}</td><td class="neg">${r.unlimited ? '無上限' : nf(-r.lo)}</td><td>${nf(r.capital)}</td></tr>`).join('') +
      `</tbody></table></div><p class="hint">損益單位為點（每點 ${PV} 元），所需資金單位為元。</p>` : '';
  };

  let tm = 0;
  form.addEventListener('input', () => { clearTimeout(tm); tm = setTimeout(compute, 40); });
  form.addEventListener('submit', e => e.preventDefault());
  compute();
})();

$('year').textContent = new Date().getFullYear();
