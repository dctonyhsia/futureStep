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

// options-strategy.html：選擇權策略（由 data.js 的 legs 自動算出損益、兩平點並畫到期損益圖）
(function () {
  const list = document.getElementById('st-list');
  if (!list || !D.optStrategies) return;
  const cfg = D.optStrategyIntro || {}, idx = cfg.index || 22000, pv = cfg.pointValue || 50;
  const num = n => (Math.round(n * 100) / 100).toLocaleString('zh-TW');
  const views = ['看漲', '看跌', '盤整', '大波動'], vcls = { 看漲: 'up', 看跌: 'dn', 盤整: 'flat', 大波動: 'vol' };
  const legsOf = s => s.legs.map(([side, type, k, p, q]) => ({ sg: side === '買' ? 1 : -1, call: /call/i.test(type), k, p, q: q || 1 }));
  const pay = (L, S) => L.reduce((a, l) => a + l.sg * l.q * (Math.max(l.call ? S - l.k : l.k - S, 0) - l.p), 0);
  const pts = v => `${num(v)} 點<small>（${fmtN(v * pv)} 元）</small>`;
  const rich = t => esc(t).replace(/\*\*(.+?)\*\*/g, '<mark class="st-key">$1</mark>'); // **文字** → 重點標示

  const analyse = s => {
    const L = legsOf(s), ks = [...new Set(L.map(l => l.k))].sort((a, b) => a - b);
    const slopeR = L.filter(l => l.call).reduce((a, l) => a + l.sg * l.q, 0);   // 往上漲每點的損益變化
    const slopeL = L.filter(l => !l.call).reduce((a, l) => a + l.sg * l.q, 0);  // 往下跌每點的損益變化
    const vals = ks.map(k => pay(L, k));
    const hi = Math.max(...vals), lo = Math.min(...vals);
    const maxP = slopeR > 0 ? '無上限<small>（漲越多賺越多）</small>' : slopeL > 0 ? '可能很大<small>（跌越多賺越多）</small>' : pts(hi);
    const maxL = slopeR < 0 ? '無上限<small>（漲越多虧越多）</small>' : slopeL < 0 ? '可能很大<small>（跌越多虧越多）</small>' : pts(-lo);
    const xs = [ks[0] - 5000, ...ks, ks[ks.length - 1] + 5000], bes = [];
    for (let i = 0; i < xs.length - 1; i++) {
      const a = xs[i], b = xs[i + 1], fa = pay(L, a), fb = pay(L, b);
      if (fa === 0 && !bes.includes(a)) bes.push(a);
      if (fa * fb < 0) bes.push(a + (b - a) * (-fa) / (fb - fa));
    }
    const net = L.reduce((a, l) => a + l.sg * l.q * l.p, 0);
    const hasShort = L.some(l => l.sg < 0), limited = !(slopeR < 0 || slopeL < 0);
    // 保證金（依期交所組合部位規定的簡化說明）
    const [l1, l2] = L, two = L.length === 2;
    const vertical = two && l1.call === l2.call && l1.sg !== l2.sg && l1.q === l2.q;
    const shortPair = two && l1.call !== l2.call && l1.sg < 0 && l2.sg < 0;
    const width = vertical ? Math.abs(l1.k - l2.k) * l1.q : 0;
    const margin = !hasShort ? '不需要<small>（只付權利金）</small>'
      : vertical && net > 0 ? '不需要<small>（用組合單下單，只付權利金）</small>'
      : vertical ? `需要 ${fmtN(width * pv)} 元<small>（組合單：履約價差 ${fmtN(width)} 點 × ${pv} 元）</small>`
      : shortPair ? '需要<small>（組合單：取兩邊保證金較高者，再加另一邊的權利金）</small>'
      : limited ? '需要<small>（拆成價差用組合單下單，可大幅減收）</small>'
      : '需要<small>（賣方部位，依期交所公告計算）</small>';
    return { L, ks, bes, net, maxP, maxL, margin };
  };

  const chart = (s, a) => {
    const W = 480, H = 190, P = { l: 12, r: 12, t: 14, b: 26 }, x0 = idx - span, x1 = idx + span;
    const xsS = Array.from({ length: 201 }, (_, i) => x0 + (x1 - x0) * i / 200).concat(a.ks).sort((p, q) => p - q);
    const ys = xsS.map(x => pay(a.L, x));
    let yMax = Math.max(...ys, 0), yMin = Math.min(...ys, 0);
    const pad = (yMax - yMin) * 0.12 || 50; yMax += pad; yMin -= pad;
    const X = x => P.l + (x - x0) / (x1 - x0) * (W - P.l - P.r), Y = y => P.t + (yMax - y) / (yMax - yMin) * (H - P.t - P.b);
    const y0 = Y(0), line = xsS.map((x, i) => `${X(x).toFixed(1)},${Y(ys[i]).toFixed(1)}`).join(' ');
    const area = `M${X(x0)},${y0} L${line.replace(/ /g, ' L')} L${X(x1)},${y0} Z`, id = 'st' + Math.random().toString(36).slice(2, 7);
    const ticks = [x0, idx - span / 2, idx, idx + span / 2, x1];
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(s.name)}到期損益圖">` +
      `<defs><clipPath id="${id}u"><rect x="0" y="0" width="${W}" height="${y0}"/></clipPath><clipPath id="${id}d"><rect x="0" y="${y0}" width="${W}" height="${H - y0}"/></clipPath></defs>` +
      `<path class="oc-fill-up" d="${area}" clip-path="url(#${id}u)"/><path class="oc-fill-dn" d="${area}" clip-path="url(#${id}d)"/>` +
      a.ks.map(k => `<line class="oc-strike" x1="${X(k)}" x2="${X(k)}" y1="${P.t - 6}" y2="${H - P.b}"/>`).join('') +
      `<line class="oc-zero" x1="${P.l}" x2="${W - P.r}" y1="${y0}" y2="${y0}"/>` +
      `<polyline class="oc-line" points="${line}"/>` +
      a.bes.filter(b => b > x0 && b < x1).map(b => `<circle class="oc-be" cx="${X(b)}" cy="${y0}" r="4.5"/>`).join('') +
      `<g class="oc-tick">${ticks.map((t, i) => `<text x="${X(t)}" y="${H - 6}" text-anchor="${i === 0 ? 'start' : i === ticks.length - 1 ? 'end' : 'middle'}">${t.toLocaleString('zh-TW')}</text>`).join('')}</g></svg>`;
  };

  // 所有損益圖共用同一個橫軸範圍：涵蓋每個策略的履約價與兩平點，再往外留 400 點，以 500 點為單位
  const all = D.optStrategies.map(analyse);
  const far = Math.max(...all.flatMap(a => [...a.ks, ...a.bes].map(x => Math.abs(x - idx))));
  const span = Math.max(1000, Math.ceil((far + 400) / 500) * 500);
  list.innerHTML = D.optStrategies.map((s, i) => {
    const a = all[i], v = vcls[s.view] || 'flat';
    const legs = a.L.map(l => `<li><b class="${l.sg > 0 ? 'buy' : 'sell'}">${l.sg > 0 ? '買進' : '賣出'}</b><span class="mono">${l.k.toLocaleString('zh-TW')}</span> ${l.call ? 'Call' : 'Put'}` +
      `${l.q > 1 ? ` × ${l.q} 口` : ''}<em class="mono">權利金 ${num(l.p)}</em></li>`).join('');
    const cost = a.net >= 0 ? `付出 ${pts(a.net)}` : `收取 ${pts(-a.net)}`;
    const be = a.bes.length ? a.bes.map(b => `<span class="mono">${num(b)}</span>`).join('、') : '—';
    return `<article class="card st-card" data-view="${esc(s.view)}">` +
      `<header class="st-h"><span class="st-view ${v}">${esc(s.view)}</span><h3>${esc(s.name)} <small>${esc(s.en)}</small></h3></header>` +
      `<p class="st-sum">${rich(s.summary)}</p>` +
      `<div class="st-chart">${chart(s, a)}</div>` +
      `<ul class="st-legs">${legs}</ul>` +
      `<dl class="st-stats"><div><dt>${a.net >= 0 ? '建立成本' : '先收權利金'}</dt><dd>${cost}</dd></div>` +
      `<div><dt>損益兩平點</dt><dd>${be}</dd></div>` +
      `<div><dt>最大獲利</dt><dd class="pos">${a.maxP}</dd></div><div><dt>最大虧損</dt><dd class="neg">${a.maxL}</dd></div>` +
      `<div class="span2"><dt>保證金</dt><dd>${a.margin}</dd></div></dl>` +
      `<p class="st-when"><b>適用時機</b>${rich(s.when)}</p><p class="st-watch"><b>注意</b>${rich(s.watch)}</p></article>`;
  }).join('');

  const note = document.getElementById('st-note');
  if (note) note.textContent = cfg.note || '';
  const bar = document.getElementById('st-filter');
  const count = v => D.optStrategies.filter(s => !v || s.view === v).length;
  bar.innerHTML = ['', ...views].map(v => `<button type="button" class="tab${v ? '' : ' active'}" data-view="${v}" aria-pressed="${!v}">${v || '全部'} <small>${count(v)}</small></button>`).join('');
  bar.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const v = b.dataset.view;
    bar.querySelectorAll('button').forEach(x => { x.classList.toggle('active', x === b); x.setAttribute('aria-pressed', x === b); });
    list.querySelectorAll('.st-card').forEach(c => { c.hidden = !!v && c.dataset.view !== v; });
  });
})();

$('year').textContent = new Date().getFullYear();
