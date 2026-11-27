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

  // 圖表：權益數走勢（面積＋折線），原始／維持保證金參考線，維持保證金以下標成追繳區；依實際寬度畫，視窗改變時重畫
  const wan = v => `${(v / 10000).toLocaleString('zh-TW', { maximumFractionDigits: 1 })} 萬`;
  const draw = () => {
    const W = Math.max(340, Math.round(chart.clientWidth || 520)), H = W < 460 ? 290 : 280;
    const L = 48, R = 16, T = 30, B = 52;
    const eqs = rows.map(r => r.equity), vals = eqs.concat([M.initial, M.maintenance]);
    const span = Math.max(...vals) - Math.min(...vals) || 10000;
    const step = [10000, 20000, 50000, 100000, 200000].find(s => span / s <= 2.5) || 500000;   // 格線約 3～5 條，畫面比較乾淨
    const hi = Math.ceil((Math.max(...vals) + span * 0.12) / step) * step;
    // 下方要留出追繳說明框的高度（約 78px）：縱軸下限一格一格往下調，直到放得下
    let lo = Math.floor(Math.min(...vals) / step) * step;
    const needBelow = callAt >= 0 ? 80 : 24, minEq = Math.min(...eqs);
    while ((minEq - lo) / (hi - lo) * (H - T - B) < needBelow && lo > 0) lo -= step / 2;
    const x = i => L + 18 + (W - L - R - 36) * (rows.length === 1 ? 0.5 : i / (rows.length - 1));
    const y = v => T + (H - T - B) * (hi - v) / (hi - lo);
    const yb = H - B, xr = W - R;
    let g = `<defs><linearGradient id="mcFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--accent);stop-opacity:.26"/><stop offset="1" style="stop-color:var(--accent);stop-opacity:0"/></linearGradient></defs>`;
    // 追繳區（維持保證金以下）
    g += `<rect class="mc-zone" x="${L}" y="${y(M.maintenance).toFixed(1)}" width="${xr - L}" height="${(yb - y(M.maintenance)).toFixed(1)}"/>`;
    g += `<text class="mc-zone-l" x="${L + 8}" y="${(yb - 8).toFixed(1)}">追繳區</text>`;
    // 橫向格線與縱軸（萬元）
    for (let v = Math.ceil(lo / step) * step; v <= hi + 1; v += step) g += `<line class="mc-grid" x1="${L}" x2="${xr}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}"/><text class="mc-ty" x="${L - 8}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end">${(v / 10000).toLocaleString('zh-TW')}萬</text>`;
    // 參考線：原始、維持保證金
    const ref = (v, cls) => `<line class="mc-ref ${cls}" x1="${L}" x2="${xr}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}"/>`;
    g += ref(M.initial, 'init') + ref(M.maintenance, 'maint');
    // 參考線的文字最後才畫，放在最上層，不會被權益線或圓點擋住
    const refLabel = (v, cls, label, right) => `<text class="mc-ref-l ${cls}" x="${right ? xr - 8 : L + 8}" y="${(y(v) - 6).toFixed(1)}"${right ? ' text-anchor="end"' : ''}>${label} ${fmtN(v)}</text>`;
    // 權益面積與折線
    const line = rows.map((r, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(r.equity).toFixed(1)}`).join('');
    g += `<path class="mc-area" d="${line}L${x(rows.length - 1).toFixed(1)},${yb}L${x(0).toFixed(1)},${yb}Z"/><path class="mc-line" d="${line}"/>`;
    // 每一天：圓點、數值標籤、日期與當日損益
    rows.forEach((r, i) => {
      const cx = x(i), cy = y(r.equity);
      g += `<line class="mc-drop" x1="${cx.toFixed(1)}" x2="${cx.toFixed(1)}" y1="${(cy + 6).toFixed(1)}" y2="${yb}"/>`;
      if (r.call) {
        g += `<circle class="mc-halo" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="11"/><circle class="mc-pt call" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="6"/>`;
      } else if (r.equity === M.initial) {
        g += `<circle class="mc-pt" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="5.5"/>`;   // 和原始保證金相同，數字已標在參考線上
      } else {
        const t = fmtN(r.equity), w = t.length * 7.4 + 14, px = Math.min(Math.max(cx, L + w / 2 + 2), xr - w / 2 - 2);
        g += `<circle class="mc-pt" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="5.5"/>` +
          `<rect class="mc-pill" x="${(px - w / 2).toFixed(1)}" y="${(cy - 33).toFixed(1)}" width="${w.toFixed(1)}" height="21" rx="10.5"/>` +
          `<text class="mc-val" x="${px.toFixed(1)}" y="${(cy - 18.5).toFixed(1)}" text-anchor="middle">${t}</text>`;
      }
      const chg = i === 0 ? '建倉' : `${r.daily > 0 ? '+' : r.daily < 0 ? '−' : '±'}${wan(Math.abs(r.daily))}`;
      g += `<text class="mc-day" x="${cx.toFixed(1)}" y="${yb + 22}" text-anchor="middle">第 ${i + 1} 天</text>` +
        `<text class="mc-chg${i === 0 ? '' : r.daily > 0 ? ' pos' : r.daily < 0 ? ' neg' : ''}" x="${cx.toFixed(1)}" y="${yb + 40}" text-anchor="middle">${chg}</text>`;
    });
    g += refLabel(M.initial, 'init', '原始保證金', true) + refLabel(M.maintenance, 'maint', '維持保證金');
    // 追繳說明框：放在追繳點正下方（靠近邊緣時往內收）
    if (callAt >= 0) {
      const r = rows[callAt], cx = x(callAt), cy = y(r.equity);
      const bw = Math.min(W - L - R - 8, 196), bh = 52, bx = Math.min(Math.max(cx - bw / 2, L + 4), xr - bw - 4), by = Math.min(cy + 20, yb - bh - 4);
      g += `<line class="mc-call-lead" x1="${cx.toFixed(1)}" x2="${cx.toFixed(1)}" y1="${(cy + 11).toFixed(1)}" y2="${by.toFixed(1)}"/>` +
        `<rect class="mc-call-box" x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${bw}" height="${bh}" rx="8"/>` +
        `<text class="mc-call-t" x="${(bx + bw / 2).toFixed(1)}" y="${(by + 21).toFixed(1)}" text-anchor="middle">追繳　權益 ${fmtN(r.equity)}</text>` +
        `<text class="mc-call-s" x="${(bx + bw / 2).toFixed(1)}" y="${(by + 41).toFixed(1)}" text-anchor="middle">盤中高風險通知或盤後追繳通知</text>`;
    }
    chart.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="帳戶權益每日變化，與原始及維持保證金比較">${g}</svg>`;
  };
  draw();
  // 寬度改變就重畫（含頁面剛載入、寬度還沒算好的時候）
  let lastW = chart.clientWidth, tm;
  const redraw = () => { clearTimeout(tm); tm = setTimeout(() => { if (chart.clientWidth && chart.clientWidth !== lastW) { lastW = chart.clientWidth; draw(); } }, 120); };
  if (window.ResizeObserver) new ResizeObserver(redraw).observe(chart); else addEventListener('resize', redraw);

  const sum = document.getElementById('mc-summary');
  if (callAt >= 0) {
    const r = rows[callAt];
    sum.innerHTML = `第 ${callAt + 1} 天結算價 ${fmtN(r.price)} 點，權益數 ${fmtN(r.equity)} 元已低於維持保證金 ${fmtN(M.maintenance)} 元，期貨商發出追繳通知，需補繳 <b class="mono">${fmtN(M.initial - r.equity)}</b> 元，使權益回到原始保證金 ${fmtN(M.initial)} 元；否則可能遭到代沖銷。`;
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
    `假設在 ${fmtN(entry)} 點做多 1 口${R.product}（每點 ${fmtN(pv)} 元），原始保證金 ${fmtN(R.initial)} 元、維持保證金 ${fmtN(R.maintenance)} 元（${R.note || '假設數字，實際以期交所與期貨商公告為準'}）。`;
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

// ===== 05 海外期貨：商品契約規格表（篩選 + 分頁）=====
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
  // 檢視：契約規格 spec ／ 保證金 margin（網址可帶 ?view=margin 直接開保證金）
  let view = new URLSearchParams(location.search).get('view') === 'margin' ? 'margin' : 'spec';
  const viewBtns = [...document.querySelectorAll('.os-view .tab')];
  const SPEC_H = ['交易所', '類別', '商品名稱', '代碼', '幣別', '契約規格', '跳動點', '跳動值', '熱門月份', '台灣交易時間'];
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
      `<td class="mono" data-l="代碼">${esc(r.code)}</td><td class="mono" data-l="幣別">${esc(r.cur)}</td><td data-l="契約規格">${esc(r.size)}</td><td class="mono" data-l="跳動點">${esc(r.tick)}</td>` +
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

// 選擇權共用計算（策略頁與數據頁的策略篩選器共用）
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
  if (note) note.innerHTML = [].concat(cfg.note || []).map(t => `<li>${esc(t)}</li>`).join('');
  const bar = document.getElementById('st-filter');
  const count = v => items.filter(s => !v || s.view === v).length;
  const setView = v => {
    bar.querySelectorAll('button').forEach(x => { const on = x.dataset.view === v; x.classList.toggle('active', on); x.setAttribute('aria-pressed', on); });
    list.querySelectorAll('.st-card').forEach(c => { c.hidden = !!v && c.dataset.view !== v; });
    list.querySelectorAll('.st-group').forEach(g => { g.hidden = !g.querySelector('.st-card:not([hidden])'); });
  };
  bar.innerHTML = ['', ...views.filter(v => count(v))].map(v => `<button type="button" class="tab${v ? '' : ' active'}" data-view="${v}" aria-pressed="${!v}">${v || '全部'} <small>${count(v)}</small></button>`).join('');
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
  // 每檔間隔：履約價固定 50 點為單位，表格 5 檔可以隔 50、100、200… 點排開
  const UNIT = C0.strikeUnit || 50;
  el('sc-step').innerHTML = (C0.rowSteps || [50, 100, 200, 400, 500]).map(v => `<option value="${v}">${nf(v)} 點</option>`).join('');
  [['sc-spot', C0.spot], ['sc-fut', C0.fut], ['sc-days', C0.days], ['sc-step', C0.rowStep || 200], ['sc-refiv', C0.refIv],
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
    const margin = marginOf(L, M), capital = margin + Math.max(net, 0) * PV;
    return { t, L, pay, ks, net, bes: bes.map(Math.round), hi, lo, unlimited, bigUp, gain, margin, capital };
  };

  const compute = () => {
    const spot = val('sc-spot'), fut = val('sc-fut') || spot, days = val('sc-days'), step = val('sc-step');
    const out = { read: el('sc-read'), note: el('sc-read-note'), count: el('sc-count'), top: el('sc-top'), more: el('sc-more') };
    const fail = msg => { out.read.innerHTML = ''; out.note.textContent = msg; out.count.textContent = ''; out.top.innerHTML = ''; out.more.innerHTML = ''; el('sc-chart-card').hidden = true; };
    if (!(spot > 0 && days > 0 && step > 0)) return fail('請填入台指現價、距到期天數與履約價間距。');
    const atm = Math.round(spot / UNIT) * UNIT, T = days / 365;   // 價平：最接近現價的 50 點履約價
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
    const M = { spot, fut, atm, step, T, calls, puts, em, scen, A: val('sc-a') || 0, B: val('sc-b') || 0, C: val('sc-cval') || 0 };

    const risk = form.querySelector('[name="sc-risk"]:checked').value, rank = form.querySelector('[name="sc-rank"]:checked').value;
    const budget = val('sc-budget');
    const fit = r => (level === 'high' ? (r.net < 0 ? 1 : -1) : level === 'low' ? (r.net > 0 ? 1 : -1) : 0);
    const score = r => { const f = 1 + 0.08 * fit(r); return rank === 'cost' ? -r.capital / f : r.gain * PV / Math.max(r.capital, 1) * f; };
    // 策略本身的分類要和看法相容，避免平移履約價後性質改變、名稱卻不符
    const allow = { bigup: ['看漲', '大波動'], up: ['看漲', '盤整'], flat: ['盤整', '看漲', '看跌'], dn: ['看跌', '盤整'], bigdn: ['看跌', '大波動'], vol: ['大波動'] }[view];
    const fitView = pool.filter(c => allow.includes(c.t.s.view)).map(c => evaluate(c.t, c.legs, M)).filter(Boolean);
    const rs = fitView.filter(r => !(risk === 'limited' && r.unlimited) && !(budget > 0 && r.capital > budget));
    // 所有組合一起排序（同分時所需資金少的優先），每個策略取分數最高、且和前面已選組合到期損益不重複的那一組
    // （例如買賣權平價下，買權多頭價差與賣權多頭價差可能完全相同，後者就改取它的下一個組合）
    const probe = Array.from({ length: 13 }, (_, i) => fut + (i - 6) * step);
    const list = [], names = new Set();
    rs.map(r => ({ r, s: score(r) })).sort((a, b) => b.s - a.s || a.r.capital - b.r.capital).forEach(({ r }) => {
      if (names.has(r.t.s.name)) return;
      if (list.some(q => probe.every(S => Math.abs(q.pay(S) - r.pay(S)) <= 3))) return;   // 容許跳動點進位造成的 1～3 點差
      list.push(r); names.add(r.t.s.name);
    });
    const dropped = new Set(fitView.map(r => r.t.s.name).filter(n => !names.has(n) && !rs.some(x => x.t.s.name === n))).size;
    const rankTxt = { ret: '報酬（看對時獲利 ÷ 所需資金）', cost: '所需資金由低到高' }[rank] || '報酬（看對時獲利 ÷ 所需資金）';
    out.count.textContent = (list.length ? `共比較 ${pool.length} 種組合，符合條件的有 ${list.length} 種策略，依${rankTxt}排序` : '') +
      (dropped ? `${list.length ? '；' : ''}另有 ${dropped} 種方向相符，但超出資金上限或風險限制` : '');
    if (!list.length) {
      out.top.innerHTML = '<div class="card sc-empty"><b>沒有符合條件的策略</b><p>可以試著放寬資金上限、把風險限制改成「不限」，或調整目標價。</p></div>';
      out.more.innerHTML = ''; el('sc-chart-card').hidden = true; return;
    }

    // 前三名卡片
    const legTxt = r => r.L.map(l => `<li><b class="${l.sg > 0 ? 'buy' : 'sell'}">${l.sg > 0 ? '買進' : '賣出'}</b><span class="mono">${nf(l.k)}</span> ${l.call ? 'Call' : 'Put'}${l.q > 1 ? ` × ${l.q} 口` : ''}<em class="mono">權利金 ${nf(l.p)}</em></li>`).join('');
    const why = r => [
      `損益兩平點 ${r.bes.length ? r.bes.map(nf).join('、') : '—'}`,
      fit(r) > 0 ? (level === 'high' ? '權利金偏高，先收權利金對你有利' : '權利金偏低，付權利金比較划算')
        : r.net < 0 ? `先收 ${nf(-r.net)} 點權利金` : `付出 ${nf(r.net)} 點權利金`,
      r.unlimited ? '虧損沒有上限，一定要設停損' : '',
    ].filter(Boolean);
    const pick = (r, i) => `<article class="card sc-pick${i === 0 ? ' best' : ''}">` +
      `<header class="sc-pick-h"><span class="sc-rank">${i + 1}</span><div><h3>${esc(r.t.s.name)} <small>${esc(r.t.s.en)}</small></h3>` +
      `<span class="st-view ${vcls[r.t.s.view]}">${esc(r.t.s.view)}</span><span class="st-lv">${esc(r.t.s.level)}</span></div></header>` +
      `<ul class="st-legs">${legTxt(r)}</ul>` +
      `<dl class="sc-kv">` +
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
    out.more.innerHTML = rest.length ? `<p class="sc-more-h">其他符合條件的策略</p><div class="table-wrap"><table class="num-table sc-table"><thead><tr><th>策略</th><th>組合</th><th>所需資金</th></tr></thead><tbody>` +
      rest.map(r => `<tr><td><a href="options-strategy.html#${slug(r.t.s)}">${esc(r.t.s.name)}</a></td>` +
        `<td class="mono">${r.L.map(l => `${l.sg > 0 ? '買' : '賣'}${l.q > 1 ? l.q : ''} ${nf(l.k)}${l.call ? 'C' : 'P'}`).join('、')}</td>` +
        `<td>${nf(r.capital)}</td></tr>`).join('') +
      `</tbody></table></div><p class="hint">所需資金單位為元（權利金 ＋ 保證金估算）。</p>` : '';
  };

  // 改變每檔間隔：價平以外的報價對應的履約價變了，清空後用價平 IV 估算
  el('sc-step').addEventListener('change', () => {
    OFFS.forEach((o, i) => { if (o !== 0) { el('sc-c' + i).value = ''; el('sc-p' + i).value = ''; } });
  });
  let tm = 0;
  form.addEventListener('input', () => { clearTimeout(tm); tm = setTimeout(compute, 40); });
  form.addEventListener('submit', e => e.preventDefault());
  compute();
})();

// ---------- 數據頁：物價指標（美國 CPI、美國 PCE 共用同一套畫法；資料在 data.js 的 usCpi、usPce）----------
// o.p：頁面元素 id 的前綴（cpi／pce）；o.name：指標名稱；o.fields：年增率、月增率各用哪個欄位；o.adjFixed：只有季調時填 'sa'
function renderPriceIndex(o) {
  const kpis = document.getElementById(o.p + '-kpis');
  if (!kpis) return;
  const cfg = o.cfg || {};
  const rows = (cfg.rows || []).filter(r => r && r.m).slice().sort((a, b) => a.m < b.m ? -1 : 1);
  const has = v => typeof v === 'number' && isFinite(v);
  const DEC = 2;   // 顯示到小數第幾位（data.js 目前為 2 位）
  const pct = v => has(v) ? v.toFixed(DEC) + '%' : '—';
  const mon = m => { const [y, mm] = String(m).split('-'); return `${y} 年 ${+mm} 月`; };
  const any = k => rows.some(r => has(r[k]) || (typeof r[k] === 'string' && r[k]));
  const setText = (id, t) => { const el = document.getElementById(id); if (el) el.textContent = t; };

  // 季節調整：mkt＝市場慣用（年增率未季調、月增率季調，與新聞相同）；sa＝全部季調；nsa＝全部未季調
  const FIELDS = o.fields;
  const ALL = [...new Set(Object.values(FIELDS).flatMap(m => Object.values(m).flatMap(s => Object.values(s))))];
  const hasAdj = !o.adjFixed && (o.adjKeys || []).some(any);
  let adj = o.adjFixed || 'mkt';
  const adjOf = measure => o.adjFixed || (adj === 'mkt' ? (measure === 'yoy' ? 'nsa' : 'sa') : adj);
  const N = o.name;
  const key = (measure, s) => FIELDS[measure][s][adjOf(measure)];
  const tag = measure => adjOf(measure) === 'sa' ? '季調' : '未季調';
  const okAny = r => ALL.some(k => has(r[k]));
  const latestOf = k => { for (let i = rows.length - 1; i >= 0; i--) if (has(rows[i][k])) return i; return -1; };

  // 最新數據：每一格用該欄位最近一個有公布的月份
  const tile = (label, k) => {
    const i = latestOf(k);
    if (i < 0) return [label, '—', '待更新'];
    const r = rows[i], p = rows[i - 1];
    const d = p && has(p[k]) ? r[k] - p[k] : null;
    const chg = d === null ? '' : `　較上月 ${d > 0.004 ? '+' : d < -0.004 ? '−' : '±'}${Math.abs(d).toFixed(DEC)} 個百分點`;
    return [label, pct(r[k]), mon(r.m) + chg];
  };
  const renderTiles = () => {
    const tiles = [
      tile(`${N} 年增率（${tag('yoy')}）`, key('yoy', 'cpi')), tile(`核心 ${N} 年增率（${tag('yoy')}）`, key('yoy', 'core')),
      tile(`${N} 月增率（${tag('mom')}）`, key('mom', 'cpi')), tile(`核心 ${N} 月增率（${tag('mom')}）`, key('mom', 'core')),
    ];
    kpis.innerHTML = tiles.map(([k, v, s]) => `<div class="card cpi-kpi"><span class="cpi-k">${k}</span><b class="cpi-v">${v}</b><small>${esc(s)}</small></div>`).join('');
  };
  const extra = document.getElementById(o.p + '-extra'), ei = latestOf('exp');
  const ex = [ei >= 0 ? `${mon(rows[ei].m)} 市場預期 ${N} 年增率：${pct(rows[ei].exp)}` : '', cfg.next ? `下次公布（台灣時間）：${cfg.next}` : ''].filter(Boolean);
  if (extra && ex.length) { extra.textContent = ex.join('｜'); extra.hidden = false; }
  const meta = document.getElementById(o.p + '-meta');
  if (meta && rows.length) meta.textContent = `${mon(rows[0].m)} ～ ${mon(rows[rows.length - 1].m)}｜資料來源：${cfg.source || o.source}${cfg.updated ? `｜更新：${cfg.updated}` : ''}`;

  // 走勢圖：可切換「月增率」（預設）與「年增率」；沒公布的月份線會斷開，整個月沒公布的標「未公布」
  const chart = document.getElementById(o.p + '-chart');
  const MODES = {
    mom: { ref: 0, title: `${N} 月增率走勢`, lg: [`${N} 月增率`, `核心 ${N} 月增率`], ref_lg: '0% 基準線', name: '月增率' },
    yoy: { ref: 2, title: `${N} 年增率走勢`, lg: [`${N} 年增率`, `核心 ${N} 年增率`], ref_lg: '2% 參考線', name: '年增率' },
  };
  let mode = 'mom';
  const draw = () => {
    const M = MODES[mode], k1 = key(mode, 'cpi'), k2 = key(mode, 'core');
    setText(o.p + '-title', `${M.title}（${tag(mode)}）`);
    setText(o.p + '-lg1', `${M.lg[0]}（${tag(mode)}）`); setText(o.p + '-lg2', `${M.lg[1]}（${tag(mode)}）`); setText(o.p + '-lg3', M.ref_lg);
    const okM = r => has(r[k1]) || has(r[k2]);
    const i0 = rows.findIndex(okM);
    let i1 = rows.length - 1; while (i1 >= 0 && !okM(rows[i1])) i1--;
    const pts = i0 < 0 ? [] : rows.slice(i0, i1 + 1);
    if (pts.filter(okM).length < 2) {
      chart.classList.add('cpi-empty');
      chart.innerHTML = `<div class="cpi-ph"><b>圖表位置</b><span>數據更新後，這裡會顯示 ${N} 與核心 ${N} ${M.name}的走勢圖</span></div>`;
      return;
    }
    chart.classList.remove('cpi-empty');
    // 依圖表實際寬度畫，手機上字才不會縮得太小
    const W = Math.max(320, Math.round(chart.clientWidth || 720)), H = W < 560 ? 240 : 300, L = 40, R = 50, T = 16, B = 34;   // 右邊多留空間給最後一點的數值
    const vals = pts.flatMap(r => [r[k1], r[k2]].filter(has)).concat(M.ref);
    const pad = mode === 'mom' ? 0.1 : 0.3;
    const span0 = Math.max(...vals) - Math.min(...vals);
    const stepY = span0 > 7 ? 2 : span0 > 3.5 ? 1 : span0 > 1.6 ? 0.5 : 0.2;
    let lo = Math.floor((Math.min(...vals) - pad) / stepY) * stepY, hi = Math.ceil((Math.max(...vals) + pad) / stepY) * stepY;
    if (hi - lo < stepY * 2) hi = lo + stepY * 2;
    const x = i => L + (W - L - R) * (pts.length === 1 ? 0.5 : i / (pts.length - 1));
    const y = v => T + (H - T - B) * (hi - v) / (hi - lo);
    let g = '';
    for (let v = lo; v <= hi + 1e-9; v += stepY) g += `<line class="sc-grid" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text class="sc-ty" x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${+v.toFixed(1)}</text>`;
    // 橫軸：資料多時只標每年 1 月，少時平均標幾個月份
    const lastI = pts.length - 1;
    const yearly = pts.length > 30;
    const every = Math.max(1, Math.ceil(pts.length / Math.max(3, Math.floor((W - L - R) / 70))));
    const yStep = Math.max(1, Math.ceil((pts.length / 12) / Math.max(2, Math.floor((W - L - R) / 56))));
    pts.forEach((r, i) => {
      const [yy, mm] = r.m.split('-');
      if (yearly) {
        if (mm !== '01' || (+yy - +pts[0].m.slice(0, 4)) % yStep) return;
        g += `<line class="sc-grid" x1="${x(i)}" x2="${x(i)}" y1="${T}" y2="${H - B}"/><text class="sc-ty" x="${x(i)}" y="${H - 12}" text-anchor="${i === 0 ? 'start' : 'middle'}">${yy}</text>`;
        return;
      }
      if (i !== lastI && (i % every || lastI - i < every)) return;   // 最後一個月一定標，太靠近的就不標，避免重疊
      const anc = i === 0 ? 'start' : i === lastI ? 'end' : 'middle';
      g += `<text class="sc-ty" x="${x(i)}" y="${H - 12}" text-anchor="${anc}">${yy.slice(2)}/${mm}</text>`;
    });
    g += `<line class="sc-spot" x1="${L}" x2="${W - R}" y1="${y(M.ref)}" y2="${y(M.ref)}"/>`;
    pts.forEach((r, i) => { if (!okAny(r)) g += `<line class="sc-mark" x1="${x(i)}" x2="${x(i)}" y1="${T}" y2="${H - B}"/><text class="sc-mark-l" x="${x(i) - 4}" y="${T + 10}" text-anchor="end">未公布</text>`; });
    const rad = pts.length > 36 ? 2 : 3;
    const line = (k, cls) => {
      let d = '', on = false;
      pts.forEach((r, i) => { if (has(r[k])) { d += `${on ? 'L' : 'M'}${x(i).toFixed(1)},${y(r[k]).toFixed(1)} `; on = true; } else on = false; });
      const dots = pts.map((r, i) => has(r[k]) ? `<circle class="cpi-dot ${cls}" cx="${x(i).toFixed(1)}" cy="${y(r[k]).toFixed(1)}" r="${rad}"><title>${mon(r.m)}：${r[k].toFixed(DEC)}%</title></circle>` : '').join('');
      return d ? `<path class="sc-l ${cls}" d="${d}"/>${dots}` : '';
    };
    // 最後一點：放大圓點並標上數值；兩個數值太靠近時上下錯開
    const ends = [[k1, 'sc-l1'], [k2, 'sc-l2']].map(([k, cls]) => {
      let i = pts.length - 1; while (i >= 0 && !has(pts[i][k])) i--;
      return i < 0 ? null : { cls, i, v: pts[i][k], ly: y(pts[i][k]) + 4 };
    }).filter(Boolean);
    if (ends.length === 2 && Math.abs(ends[0].ly - ends[1].ly) < 14) {
      const [a, b] = ends[0].v >= ends[1].v ? ends : [ends[1], ends[0]];
      const mid = (a.ly + b.ly) / 2; a.ly = mid - 7; b.ly = mid + 7;
    }
    const endG = ends.map(e => `<circle class="cpi-dot ${e.cls}" cx="${x(e.i).toFixed(1)}" cy="${y(e.v).toFixed(1)}" r="4.5"/><text class="cpi-end ${e.cls}" x="${(x(e.i) + 8).toFixed(1)}" y="${e.ly.toFixed(1)}">${e.v.toFixed(DEC)}%</text>`).join('');
    chart.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="美國 ${N} 與核心 ${N} ${M.name}（${tag(mode)}）走勢圖">${g}${line(k2, 'sc-l2')}${line(k1, 'sc-l1')}${endG}</svg>`;
  };
  // 切換月增率／年增率
  document.querySelectorAll('#' + o.p + ' .cpi-tabs .tab').forEach(b => b.addEventListener('click', () => {
    mode = b.dataset.mode;
    document.querySelectorAll('#' + o.p + ' .cpi-tabs .tab').forEach(t => { const on = t === b; t.classList.toggle('active', on); t.setAttribute('aria-pressed', on); });
    draw();
  }));
  // 視窗寬度改變時重畫
  let lastW = chart.clientWidth, tm;
  addEventListener('resize', () => { clearTimeout(tm); tm = setTimeout(() => { if (chart.clientWidth !== lastW) { lastW = chart.clientWidth; draw(); } }, 150); });

  // 表格（新到舊，最近 12 個月）；預設收起，只顯示最近 PEEK 個月
  const shown = rows.slice(-12).reverse();
  const head = document.getElementById(o.p + '-head');
  const body = document.getElementById(o.p + '-rows');
  const toggle = document.getElementById(o.p + '-toggle');
  const PEEK = 3;
  let open = false;
  const setOpen = o => {
    open = o;
    [...body.querySelectorAll('tr')].slice(PEEK).forEach(tr => { tr.hidden = !open; });
    if (!toggle) return;
    toggle.setAttribute('aria-expanded', open);
    toggle.innerHTML = open ? '收起表格 <span aria-hidden="true">▴</span>' : `展開全部 ${shown.length} 個月 <span aria-hidden="true">▾</span>`;
  };
  if (toggle) toggle.addEventListener('click', () => setOpen(!open));
  const renderTable = () => {
    const kc = key('yoy', 'cpi');
    const cols = [['資料月份', r => mon(r.m)],
      [`${N} 月增率（${tag('mom')}）`, r => pct(r[key('mom', 'cpi')])], [`核心 ${N} 月增率（${tag('mom')}）`, r => pct(r[key('mom', 'core')])],
      [`${N} 年增率（${tag('yoy')}）`, r => pct(r[kc]), 'yoy'], [`核心 ${N} 年增率（${tag('yoy')}）`, r => pct(r[key('yoy', 'core')])]];
    if (any('exp')) cols.push(['市場預期（年增率）', r => pct(r.exp)]);
    if (any('release')) cols.push(['公布日期', r => esc(r.release || '—')]);
    if (shown.some(r => r.note)) cols.push(['備註', r => esc(r.note || ''), 'rem']);
    if (head) head.innerHTML = `<tr>${cols.map(c => `<th>${c[0]}</th>`).join('')}</tr>`;
    body.innerHTML = rows.length ? shown.map(r => {
      const s = has(r[kc]) && has(r.exp) ? r[kc] - r.exp : null;
      const cls = s === null || Math.abs(s) < 0.05 ? '' : s > 0 ? 'pos' : 'neg';
      const tds = cols.map(c => {
        const k = c[2] === 'yoy' && cls ? cls : c[2] === 'rem' ? 'cpi-rem' : '';
        return `<td${k ? ` class="${k}"` : ''}>${c[1](r)}</td>`;
      }).join('');
      return `<tr${okAny(r) ? '' : ' class="cpi-gap"'}>${tds}</tr>`;
    }).join('') : `<tr><td colspan="${cols.length}" class="cpi-none">數據準備中，更新後會依月份列在這裡</td></tr>`;
    if (toggle && shown.length > PEEK) { toggle.hidden = false; setOpen(open); }
  };

  // 表格下方說明
  const renderNote = () => {
    const note = document.getElementById(o.p + '-note');
    if (!note) return;
    const gaps = rows.filter(r => !okAny(r) && r.note).map(r => `${mon(r.m)}${r.note}`);
    const adjTxt = (o.adjText || {})[adj] || '';
    note.textContent = [
      `表格列出最近 12 個月（走勢圖顯示全部月份）。${adjTxt}${o.precisionText || ''}`,
      any('exp') ? `${N} 年增率標紅字代表高於市場預期、綠字代表低於市場預期。` : '',
      gaps.length ? `${gaps.join('；')}，走勢圖在該月斷開。` : '',
    ].join('');
  };

  // 季調／未季調切換（data.js 沒有季調、未季調另一組數字時就不顯示）
  const adjBar = document.getElementById(o.p + '-adj');
  const ADJ_HINT = o.adjHint || {};
  if (adjBar && hasAdj) {
    adjBar.hidden = false;
    adjBar.querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => {
      adj = b.dataset.adj;
      adjBar.querySelectorAll('.tab').forEach(t => { const on = t === b; t.classList.toggle('active', on); t.setAttribute('aria-pressed', on); });
      setText(o.p + '-adj-hint', ADJ_HINT[adj]);
      renderTiles(); draw(); renderTable(); renderNote();
    }));
    setText(o.p + '-adj-hint', ADJ_HINT[adj]);
  }

  renderTiles(); draw(); renderTable(); renderNote();
}

// 美國 CPI：年增率看未季調、月增率看季調（市場慣用），可切換全部季調／全部未季調
renderPriceIndex({
  p: 'cpi', name: 'CPI', cfg: D.usCpi, source: '美國勞工統計局 BLS',
  fields: {
    yoy: { cpi: { nsa: 'cpi', sa: 'cpiSA' }, core: { nsa: 'core', sa: 'coreSA' } },
    mom: { cpi: { sa: 'cpiMoM', nsa: 'cpiMoMNSA' }, core: { sa: 'coreMoM', nsa: 'coreMoMNSA' } },
  },
  adjKeys: ['cpiSA', 'cpiMoMNSA'],
  adjText: { mkt: '年增率為未經季節調整、與去年同月比較；月增率為經季節調整、與上月比較（與新聞報導相同）。', sa: '年增率與月增率都使用經季節調整的數字。', nsa: '年增率與月增率都使用未經季節調整的數字。' },
  adjHint: { mkt: '年增率看未季調、月增率看季調，與新聞報導相同', sa: '年增率與月增率都看經季節調整的數字', nsa: '年增率與月增率都看未經季節調整的數字' },
  precisionText: '數值依 BLS 公布的物價指數計算至小數兩位；BLS 官方新聞稿公布至小數一位，部分月份進位後會和新聞數字差 0.1 個百分點。',
});
// 美國 PCE：BEA 月資料只公布季調數字，所以不做季調切換
renderPriceIndex({
  p: 'pce', name: 'PCE', cfg: D.usPce, source: '美國經濟分析局 BEA',
  fields: {
    yoy: { cpi: { sa: 'pce', nsa: 'pce' }, core: { sa: 'core', nsa: 'core' } },
    mom: { cpi: { sa: 'pceMoM', nsa: 'pceMoM' }, core: { sa: 'coreMoM', nsa: 'coreMoM' } },
  },
  adjFixed: 'sa',
  adjText: { sa: '年增率與月增率都是經季節調整的數字（BEA 月資料只公布季調）。' },
  precisionText: '數值依 BEA 公布的物價指數計算至小數兩位；BEA 官方月增率公布至小數一位，部分月份進位後會和新聞數字差 0.1 個百分點。',
});

// ---------- 數據頁：指標下拉選單（只顯示選中的指標；網址 #cpi、#nfp 可直接開啟）----------
(function () {
  const sel = document.getElementById('ind-select');
  if (!sel) return;
  const panels = [...document.querySelectorAll('.ind-panel')];
  const show = (v, push) => {
    if (!panels.some(p => p.dataset.ind === v)) v = panels[0] && panels[0].dataset.ind;
    panels.forEach(p => { p.hidden = p.dataset.ind !== v; });
    sel.value = v;
    if (push) try { history.replaceState(null, '', '#' + v); } catch (e) {}
    dispatchEvent(new Event('resize'));   // 讓剛顯示的圖表依實際寬度重畫
  };
  sel.addEventListener('change', () => show(sel.value, true));
  addEventListener('hashchange', () => show(location.hash.slice(1), false));
  show(location.hash.slice(1) || sel.value, false);
})();

// ---------- 數據頁：美國非農就業（資料在 data.js 的 usNfp，沒有資料時顯示預留位置）----------
(function () {
  const kpis = document.getElementById('nfp-kpis');
  if (!kpis) return;
  const cfg = D.usNfp || {};
  const rows = (cfg.rows || []).filter(r => r && r.m).slice().sort((a, b) => a.m < b.m ? -1 : 1);
  const has = v => typeof v === 'number' && isFinite(v);
  const mon = m => { const [y, mm] = String(m).split('-'); return `${y} 年 ${+mm} 月`; };
  const any = k => rows.some(r => has(r[k]));
  const setText = (id, t) => { const el = document.getElementById(id); if (el) el.textContent = t; };
  // 季節調整：sa＝季調（預設，市場慣用）；nsa＝未季調（欄位名稱加 NSA）
  let adj = 'sa';
  const hasNSA = any('nfpNSA');
  const K = k => adj === 'nsa' ? k + 'NSA' : k;
  const tag = () => adj === 'nsa' ? '未季調' : '季調';
  // 小數位數：依 data.js 裡該欄實際的位數（1～2 位）
  const decOf = k => Math.min(2, Math.max(1, ...rows.filter(r => has(r[k])).map(r => (String(r[k]).split('.')[1] || '').length)));
  const pct = (v, k) => has(v) ? v.toFixed(decOf(k)) + '%' : '—';
  const wan = v => has(v) ? `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v / 10).toFixed(1)} 萬` : '—';   // 千人 → 萬人
  const sign = (d, dec, unit) => `${d > 0.0001 ? '+' : d < -0.0001 ? '−' : '±'}${Math.abs(d).toFixed(dec)}${unit}`;
  const okAny = r => ['nfp', 'ur', 'aheMoM', 'aheYoY', 'lfpr'].some(k => has(r[k]) || has(r[k + 'NSA']));
  const latestOf = k => { for (let i = rows.length - 1; i >= 0; i--) if (has(rows[i][k])) return i; return -1; };

  // 最新數據
  const tile = (label, k, fmt, diffFmt) => {
    const i = latestOf(k);
    if (i < 0) return [label, '—', '待更新'];
    const r = rows[i], p = rows[i - 1];
    const d = p && has(p[k]) ? r[k] - p[k] : null;
    return [label, fmt(r[k]), mon(r.m) + (d === null || !diffFmt ? '' : `　較上月 ${diffFmt(d)}`)];
  };
  const renderTiles = () => {
    const tiles = [
      tile(`非農新增就業（${tag()}）`, K('nfp'), v => wan(v) + '人', d => sign(d / 10, 1, ' 萬人')),
      tile(`失業率（${tag()}）`, K('ur'), v => pct(v, K('ur')), d => sign(d, decOf(K('ur')), ' 個百分點')),
      tile(`平均時薪月增率（${tag()}）`, K('aheMoM'), v => pct(v, K('aheMoM')), d => sign(d, decOf(K('aheMoM')), ' 個百分點')),
      tile(`平均時薪年增率（${tag()}）`, K('aheYoY'), v => pct(v, K('aheYoY')), d => sign(d, decOf(K('aheYoY')), ' 個百分點')),
    ];
    kpis.innerHTML = tiles.map(([k, v, s]) => `<div class="card cpi-kpi"><span class="cpi-k">${k}</span><b class="cpi-v">${esc(v)}</b><small>${esc(s)}</small></div>`).join('');
  };
  const meta = document.getElementById('nfp-meta');
  if (meta && rows.length) meta.textContent = `${mon(rows[0].m)} ～ ${mon(rows[rows.length - 1].m)}｜資料來源：${cfg.source || '美國勞工統計局 BLS'}${cfg.updated ? `｜更新：${cfg.updated}` : ''}`;

  // 圖表：新增就業（長條，萬人）／失業率（折線）／平均時薪年增率（折線）
  const chart = document.getElementById('nfp-chart');
  const legend = document.getElementById('nfp-legend');
  const MODES = {
    nfp: { k: 'nfp', bar: true, scale: 0.1, title: '非農新增就業人數', unit: '（萬人）', lg: '非農新增就業', ref: 0, refLg: '0 基準線' },
    ur: { k: 'ur', title: '失業率', unit: '（%）', lg: '失業率' },
    ahe: { k: 'aheYoY', title: '平均時薪年增率', unit: '（%）', lg: '平均時薪年增率' },
  };
  let mode = 'nfp';
  const draw = () => {
    const M = MODES[mode], k = K(M.k), sc = M.scale || 1;
    setText('nfp-title', `${M.title}（${tag()}）`); setText('nfp-unit', M.unit);
    if (legend) legend.innerHTML = `<span><i class="sc-sw sc-sw1"></i>${M.lg}（${tag()}）</span>` + (has(M.ref) ? `<span><i class="sc-sw sc-sw-spot"></i>${M.refLg}</span>` : '');
    const i0 = rows.findIndex(r => has(r[k]));
    let i1 = rows.length - 1; while (i1 >= 0 && !has(rows[i1][k])) i1--;
    const pts = i0 < 0 ? [] : rows.slice(i0, i1 + 1);
    if (pts.filter(r => has(r[k])).length < 2) {
      chart.classList.add('cpi-empty');
      chart.innerHTML = `<div class="cpi-ph"><b>圖表位置</b><span>數據更新後，這裡會顯示${M.title}的走勢圖</span></div>`;
      return;
    }
    chart.classList.remove('cpi-empty');
    const W = Math.max(320, Math.round(chart.clientWidth || 720)), H = W < 560 ? 240 : 300, L = 44, R = 68, T = 16, B = 34;   // 右邊留空間給最後一點的數值（例如 +16.5 萬）
    const vals = pts.filter(r => has(r[k])).map(r => r[k] * sc);
    if (has(M.ref)) vals.push(M.ref);
    const span0 = Math.max(...vals) - Math.min(...vals) || 1;
    const nice = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200];
    const stepY = nice.find(s => span0 / s <= 6) || 500;
    const pad = stepY * 0.3;
    let lo = Math.floor((Math.min(...vals) - pad) / stepY) * stepY, hi = Math.ceil((Math.max(...vals) + pad) / stepY) * stepY;
    if (M.bar) { lo = Math.min(lo, 0); hi = Math.max(hi, 0); }
    const n = pts.length, bw = (W - L - R) / n;
    const x = i => M.bar ? L + bw * (i + 0.5) : L + (W - L - R) * (n === 1 ? 0.5 : i / (n - 1));
    const y = v => T + (H - T - B) * (hi - v) / (hi - lo);
    const yDec = stepY < 1 ? 1 : 0;
    let g = '';
    for (let v = lo; v <= hi + 1e-9; v += stepY) g += `<line class="sc-grid" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text class="sc-ty" x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${(+v.toFixed(2)).toFixed(yDec)}</text>`;
    // 橫軸
    const lastI = n - 1, yearly = n > 30;
    const every = Math.max(1, Math.ceil(n / Math.max(3, Math.floor((W - L - R) / 70))));
    const yStep = Math.max(1, Math.ceil((n / 12) / Math.max(2, Math.floor((W - L - R) / 56))));
    pts.forEach((r, i) => {
      const [yy, mm] = r.m.split('-');
      if (yearly) {
        if (mm !== '01' || (+yy - +pts[0].m.slice(0, 4)) % yStep) return;
        g += `<line class="sc-grid" x1="${x(i)}" x2="${x(i)}" y1="${T}" y2="${H - B}"/><text class="sc-ty" x="${x(i)}" y="${H - 12}" text-anchor="${i === 0 ? 'start' : 'middle'}">${yy}</text>`;
        return;
      }
      if (i !== lastI && (i % every || lastI - i < every)) return;
      g += `<text class="sc-ty" x="${x(i)}" y="${H - 12}" text-anchor="${i === 0 ? 'start' : i === lastI ? 'end' : 'middle'}">${yy.slice(2)}/${mm}</text>`;
    });
    if (has(M.ref)) g += `<line class="sc-spot" x1="${L}" x2="${W - R}" y1="${y(M.ref)}" y2="${y(M.ref)}"/>`;
    // 這一項沒公布的月份：標「未公布」，線在那裡斷開
    pts.forEach((r, i) => { if (!has(r[k])) g += `<line class="sc-mark" x1="${x(i)}" x2="${x(i)}" y1="${T}" y2="${H - B}"/><text class="sc-mark-l" x="${x(i) - 4}" y="${T + 10}" text-anchor="end">未公布</text>`; });
    const fmtV = v => M.bar ? wan(v) : pct(v, k);
    let body = '';
    if (M.bar) {
      const w = Math.max(1.5, bw * 0.68);
      body = pts.map((r, i) => {
        if (!has(r[k])) return '';
        const v = r[k] * sc, y0 = y(0), y1 = y(v);
        return `<rect class="nfp-bar${v < 0 ? ' neg' : ''}${i === lastI ? ' last' : ''}" x="${(x(i) - w / 2).toFixed(1)}" y="${Math.min(y0, y1).toFixed(1)}" width="${w.toFixed(1)}" height="${Math.max(0.5, Math.abs(y1 - y0)).toFixed(1)}"><title>${mon(r.m)}：${fmtV(r[k])}人</title></rect>`;
      }).join('');
    } else {
      let d = '', on = false;
      pts.forEach((r, i) => { if (has(r[k])) { d += `${on ? 'L' : 'M'}${x(i).toFixed(1)},${y(r[k]).toFixed(1)} `; on = true; } else on = false; });
      const rad = n > 36 ? 2 : 3;
      body = `<path class="sc-l sc-l1" d="${d}"/>` + pts.map((r, i) => has(r[k]) ? `<circle class="cpi-dot sc-l1" cx="${x(i).toFixed(1)}" cy="${y(r[k]).toFixed(1)}" r="${rad}"><title>${mon(r.m)}：${fmtV(r[k])}</title></circle>` : '').join('');
    }
    // 最後一點標數值
    let li = n - 1; while (li >= 0 && !has(pts[li][k])) li--;
    const lv = pts[li][k], ly = y(lv * sc);
    const endG = (M.bar ? '' : `<circle class="cpi-dot sc-l1" cx="${x(li).toFixed(1)}" cy="${ly.toFixed(1)}" r="4.5"/>`) +
      `<text class="cpi-end sc-l1" x="${(x(li) + (M.bar ? bw / 2 + 4 : 8)).toFixed(1)}" y="${(ly + 4).toFixed(1)}">${fmtV(lv)}</text>`;
    chart.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="美國${M.title}（${tag()}）走勢圖">${g}${body}${endG}</svg>`;
  };
  document.querySelectorAll('.nfp-tabs .tab').forEach(b => b.addEventListener('click', () => {
    mode = b.dataset.mode;
    document.querySelectorAll('.nfp-tabs .tab').forEach(t => { const on = t === b; t.classList.toggle('active', on); t.setAttribute('aria-pressed', on); });
    draw();
  }));
  let lastW = chart.clientWidth, tm;
  addEventListener('resize', () => { clearTimeout(tm); tm = setTimeout(() => { if (chart.clientWidth !== lastW) { lastW = chart.clientWidth; draw(); } }, 150); });

  // 表格（新到舊，最近 12 個月；預設只顯示 3 個月）
  const shown = rows.slice(-12).reverse();
  const head = document.getElementById('nfp-head'), body = document.getElementById('nfp-rows'), toggle = document.getElementById('nfp-toggle');
  const PEEK = 3;
  let open = false;
  const setOpen = o => {
    open = o;
    [...body.querySelectorAll('tr')].slice(PEEK).forEach(tr => { tr.hidden = !open; });
    if (!toggle) return;
    toggle.setAttribute('aria-expanded', open);
    toggle.innerHTML = open ? '收起表格 <span aria-hidden="true">▴</span>' : `展開全部 ${shown.length} 個月 <span aria-hidden="true">▾</span>`;
  };
  if (toggle) toggle.addEventListener('click', () => setOpen(!open));
  const renderTable = () => {
    const cols = [['資料月份', r => mon(r.m)], [`新增就業（${tag()}）`, r => has(r[K('nfp')]) ? wan(r[K('nfp')]) + '人' : '—'], ['失業率', r => pct(r[K('ur')], K('ur'))], ['平均時薪月增率', r => pct(r[K('aheMoM')], K('aheMoM'))], ['平均時薪年增率', r => pct(r[K('aheYoY')], K('aheYoY'))]];
    if (any(K('lfpr'))) cols.push(['勞動參與率', r => pct(r[K('lfpr')], K('lfpr'))]);
    if (any('first')) cols.push(['首次公布', r => has(r.first) ? wan(r.first) + '人' : '—']);
    if (shown.some(r => r.note)) cols.push(['備註', r => esc(r.note || ''), 'rem']);
    if (head) head.innerHTML = `<tr>${cols.map(c => `<th>${c[0]}</th>`).join('')}</tr>`;
    body.innerHTML = rows.length ? shown.map(r => `<tr${okAny(r) ? '' : ' class="cpi-gap"'}>${cols.map(c => `<td${c[2] === 'rem' ? ' class="cpi-rem"' : ''}>${c[1](r)}</td>`).join('')}</tr>`).join('')
      : `<tr><td colspan="${cols.length}" class="cpi-none">數據準備中，更新後會依月份列在這裡</td></tr>`;
    if (toggle && shown.length > PEEK) { toggle.hidden = false; setOpen(open); }
  };

  // 表格下方說明
  const renderNote = () => {
    const note = document.getElementById('nfp-note');
    if (!note) return;
    const gaps = rows.filter(r => r.note).map(r => `${mon(r.m)}${r.note}`);
    note.textContent = [
      `表格列出最近 12 個月（圖表顯示全部月份），目前顯示${tag()}數字。新增就業人數為當月變動，以萬人表示（1 萬人＝10 千人）；前兩個月的數字會在新報告中修正，本頁顯示最新修正值。`,
      '失業率、平均時薪依 BLS 公布的數字計算至小數兩位，BLS 官方公布至小數一位。',
      adj === 'nsa' ? '未季調的新增就業受季節性招募影響很大（例如年底假期、1 月與 7 月），比較趨勢時建議看季調數字。' : '',
      gaps.length ? `${gaps.join('；')}。` : '',
    ].join('');
  };

  // 季調／未季調切換
  const adjBar = document.getElementById('nfp-adj');
  const ADJ_HINT = { sa: '季調數字排除季節性因素，與新聞報導相同', nsa: '未季調數字受季節性招募影響大，月與月之間跳動明顯' };
  if (adjBar && hasNSA) {
    adjBar.hidden = false;
    adjBar.querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => {
      adj = b.dataset.adj;
      adjBar.querySelectorAll('.tab').forEach(t => { const on = t === b; t.classList.toggle('active', on); t.setAttribute('aria-pressed', on); });
      setText('nfp-adj-hint', ADJ_HINT[adj]);
      renderTiles(); draw(); renderTable(); renderNote();
    }));
    setText('nfp-adj-hint', ADJ_HINT[adj]);
  }

  renderTiles(); draw(); renderTable(); renderNote();
})();

// ---------- 數據頁：通用日頻折線圖（公債殖利率、VIXTWN 共用；pts 每筆要有 d＝YYYY-MM-DD）----------
// opt：fmt 數值格式、label 無障礙說明、ref 參考線、shadeBelowRef 參考線以下加底色
const lineChart = (el, pts, series, opt) => {
  const has = v => typeof v === 'number' && isFinite(v);
  const day = d => { const [y, m, dd] = d.split('-'); return `${y}/${+m}/${+dd}`; };
  const md = d => { const [, m, dd] = d.split('-'); return `${+m}/${+dd}`; };
  const W = Math.max(320, Math.round(el.clientWidth || 720)), H = W < 560 ? 250 : 320, L = 40, R = 58, T = 14, B = 34;
  const vals = [];
  pts.forEach(p => series.forEach(s => { const v = s.get(p); if (has(v)) vals.push(v); }));
  if (has(opt.ref)) vals.push(opt.ref);
  if (vals.length < 2) { el.innerHTML = ''; return; }
  const span0 = Math.max(...vals) - Math.min(...vals) || 1;
  const stepY = [0.05, 0.1, 0.2, 0.25, 0.5, 1, 2, 5, 10].find(s => span0 / s <= 6) || 20;
  let lo = Math.floor((Math.min(...vals) - stepY * 0.25) / stepY) * stepY, hi = Math.ceil((Math.max(...vals) + stepY * 0.25) / stepY) * stepY;
  const n = pts.length;
  const x = i => L + (W - L - R) * (n === 1 ? 0.5 : i / (n - 1));
  const y = v => T + (H - T - B) * (hi - v) / (hi - lo);
  const yDec = stepY < 0.1 ? 2 : stepY < 1 ? (stepY === 0.25 ? 2 : 1) : 0;
  let g = '';
  if (opt.shadeBelowRef && has(opt.ref) && lo < opt.ref) g += `<rect class="yld-inv-band" x="${L}" y="${y(Math.min(opt.ref, hi)).toFixed(1)}" width="${W - L - R}" height="${(y(lo) - y(Math.min(opt.ref, hi))).toFixed(1)}"/>`;
  for (let v = lo; v <= hi + 1e-9; v += stepY) g += `<line class="sc-grid" x1="${L}" x2="${W - R}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}"/><text class="sc-ty" x="${L - 8}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end">${v.toFixed(yDec)}</text>`;
  // 橫軸刻度：超過約 1 年半標年份、超過 2 個月標月份、更短標日期
  const spanDays = (new Date(pts[n - 1].d) - new Date(pts[0].d)) / 864e5;
  const ticks = [];
  if (spanDays > 540) pts.forEach((p, i) => { if (i === 0 || p.d.slice(0, 4) !== pts[i - 1].d.slice(0, 4)) ticks.push([i, p.d.slice(0, 4)]); });
  else if (spanDays > 62) pts.forEach((p, i) => { if (i === 0 || p.d.slice(0, 7) !== pts[i - 1].d.slice(0, 7)) ticks.push([i, `${p.d.slice(2, 4)}/${p.d.slice(5, 7)}`]); });
  else { const every = Math.max(1, Math.ceil(n / Math.max(3, Math.floor((W - L - R) / 60)))); pts.forEach((p, i) => { if (i % every === 0) ticks.push([i, md(p.d)]); }); }
  const minGap = 46; let lastX = -1e9;
  if (ticks.length > 1 && ticks[0][0] === 0 && x(ticks[1][0]) - x(0) < minGap) ticks.shift();   // 起點太靠近下一個刻度時，改標下一個（例如 2024 年）
  ticks.forEach(([i, t]) => {
    if (x(i) - lastX < minGap || x(i) > W - R - 10) return;
    lastX = x(i);
    g += `<line class="sc-grid" x1="${x(i).toFixed(1)}" x2="${x(i).toFixed(1)}" y1="${T}" y2="${H - B}"/><text class="sc-ty" x="${x(i).toFixed(1)}" y="${H - 12}" text-anchor="${i === 0 ? 'start' : 'middle'}">${t}</text>`;
  });
  if (has(opt.ref)) g += `<line class="sc-spot" x1="${L}" x2="${W - R}" y1="${y(opt.ref).toFixed(1)}" y2="${y(opt.ref).toFixed(1)}"/>`;
  // 折線（資料點多時用每像素抽樣，線條比較順）
  const stride = Math.max(1, Math.floor(n / ((W - L - R) * 1.5)));
  series.forEach(s => {
    let d = '', pen = false;
    pts.forEach((p, i) => {
      if (i % stride && i !== n - 1) return;
      const v = s.get(p);
      if (has(v)) { d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`; pen = true; } else pen = false;
    });
    g += `<path class="yld-l ${s.cls}" d="${d}"/>`;
  });
  // 最後一點標數值，太靠近時上下錯開
  const ends = series.map(s => { let i = n - 1; while (i >= 0 && !has(s.get(pts[i]))) i--; return i < 0 ? null : { s, i, v: s.get(pts[i]), ly: y(s.get(pts[i])) + 4 }; }).filter(Boolean).sort((a, b) => a.ly - b.ly);
  for (let k = 1; k < ends.length; k++) if (ends[k].ly - ends[k - 1].ly < 13) ends[k].ly = ends[k - 1].ly + 13;
  ends.forEach(e => { g += `<circle class="yld-dot ${e.s.cls}" cx="${x(e.i).toFixed(1)}" cy="${y(e.v).toFixed(1)}" r="3.5"/><text class="cpi-end yld-end ${e.s.cls}" x="${(x(e.i) + 7).toFixed(1)}" y="${e.ly.toFixed(1)}">${opt.fmt(e.v)}</text>`; });
  g += `<line class="yld-guide" x1="0" x2="0" y1="${T}" y2="${H - B}" visibility="hidden"/><rect class="yld-hit" x="${L}" y="${T}" width="${W - L - R}" height="${H - T - B}"/>`;
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opt.label)}">${g}</svg><div class="yld-tip" hidden></div>`;
  // 滑鼠／手指移動時顯示當天數值
  const svg = el.querySelector('svg'), guide = svg.querySelector('.yld-guide'), tip = el.querySelector('.yld-tip');
  const move = e => {
    const r = svg.getBoundingClientRect(), px = (e.clientX - r.left) * W / r.width;
    const i = Math.max(0, Math.min(n - 1, Math.round((px - L) / (W - L - R) * (n - 1))));
    const p = pts[i], gx = x(i);
    guide.setAttribute('x1', gx); guide.setAttribute('x2', gx); guide.setAttribute('visibility', 'visible');
    tip.innerHTML = `<b>${day(p.d)}</b>` + series.map(s => `<span><i class="${s.cls}"></i>${s.label}<em>${has(s.get(p)) ? opt.fmt(s.get(p)) : '—'}</em></span>`).join('');
    tip.hidden = false;
    const left = gx * r.width / W, tw = tip.offsetWidth;
    tip.style.left = Math.max(4, Math.min(r.width - tw - 4, left + (left > r.width / 2 ? -tw - 12 : 12))) + 'px';
  };
  const leave = () => { guide.setAttribute('visibility', 'hidden'); tip.hidden = true; };
  svg.addEventListener('pointermove', move); svg.addEventListener('pointerdown', move); svg.addEventListener('pointerleave', leave);
};

// ---------- 數據頁：美國公債殖利率（資料在 yield-data.js 的 US_YIELD，每日一筆）----------
// 原始數據（5 個天期）與加工指標（2 個利差）分開呈現
(function () {
  const kpis = document.getElementById('yld-kpis');
  if (!kpis) return;
  const cfg = window.US_YIELD || {};
  const rows = (cfg.rows || []).filter(r => Array.isArray(r) && r[0]).map(r => ({ d: r[0], v: r.slice(1, 6), s: r.slice(6, 8) })).sort((a, b) => a.d < b.d ? -1 : 1);
  const has = v => typeof v === 'number' && isFinite(v);
  const TENORS = ['3 個月', '2 年', '5 年', '10 年', '30 年'];
  const SPREADS = ['10 年 − 2 年', '10 年 − 3 個月'];
  const day = d => { const [y, m, dd] = d.split('-'); return `${y}/${+m}/${+dd}`; };
  const md = d => { const [, m, dd] = d.split('-'); return `${+m}/${+dd}`; };
  const bp = d => `${d > 0.0001 ? '+' : d < -0.0001 ? '−' : '±'}${Math.round(Math.abs(d) * 100)} bp`;
  const sgn = v => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(2)}`;
  const setText = (id, t) => { const el = document.getElementById(id); if (el) el.textContent = t; };
  const last = rows[rows.length - 1], prev = rows[rows.length - 2];

  if (!rows.length) {
    kpis.innerHTML = TENORS.map(t => `<div class="card cpi-kpi"><span class="cpi-k">${t}期</span><b class="cpi-v">—</b><small>待更新</small></div>`).join('');
    ['yld-chart', 'yld-spread-chart'].forEach(id => { const el = document.getElementById(id); if (el) { el.classList.add('cpi-empty'); el.innerHTML = '<div class="cpi-ph"><b>圖表位置</b><span>數據更新後，這裡會顯示走勢圖</span></div>'; } });
    return;
  }

  // 最新數據：原始數據 5 格、加工指標 2 格（較前一個交易日的變動用 bp 表示）
  const chg = (a, b) => has(a) && has(b) ? `　較前一交易日 ${bp(a - b)}` : '';
  kpis.innerHTML = TENORS.map((t, i) => `<div class="card cpi-kpi"><span class="cpi-k">${t}期</span><b class="cpi-v">${has(last.v[i]) ? last.v[i].toFixed(2) + '%' : '—'}</b><small>${day(last.d)}${prev ? chg(last.v[i], prev.v[i]) : ''}</small></div>`).join('');
  const k2 = document.getElementById('yld-kpis2');
  if (k2) k2.innerHTML = SPREADS.map((t, i) => {
    const v = last.s[i];
    const state = !has(v) ? '' : v < 0 ? '<span class="yld-state inv">倒掛中</span>' : '<span class="yld-state">正斜率</span>';
    return `<div class="card cpi-kpi"><span class="cpi-k">${t}利差</span><b class="cpi-v">${has(v) ? sgn(v) : '—'}${state}</b><small>${day(last.d)}${prev ? chg(v, prev.s[i]) : ''}</small></div>`;
  }).join('');
  setText('yld-meta', `${day(rows[0].d)} ～ ${day(last.d)}｜每日收盤（美國日期，休市日沒有資料）｜資料來源：${cfg.source || '美國財政部'}${cfg.updated ? `｜更新：${cfg.updated}` : ''}`);

  // 期間與天期選擇
  let days = 0;
  const on = [true, true, true, true, true];
  const inRange = () => {
    if (!days) return rows;
    const t = new Date(last.d + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() - days);
    const from = t.toISOString().slice(0, 10);
    return rows.filter(r => r.d >= from);
  };
  const tenorBox = document.getElementById('yld-tenors');
  if (tenorBox) {
    tenorBox.innerHTML = TENORS.map((t, i) => `<button type="button" class="yld-chip yl${i} active" data-i="${i}" aria-pressed="true"><i></i>${t}</button>`).join('');
    tenorBox.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      const i = +b.dataset.i;
      if (on[i] && on.filter(Boolean).length === 1) return;   // 至少留一條線
      on[i] = !on[i]; b.classList.toggle('active', on[i]); b.setAttribute('aria-pressed', on[i]);
      drawRaw();
    });
  }

  const rawEl = document.getElementById('yld-chart'), spEl = document.getElementById('yld-spread-chart');
  const drawRaw = () => lineChart(rawEl, inRange(), TENORS.map((t, i) => ({ label: t, cls: 'yl' + i, get: p => p.v[i] })).filter((s, i) => on[i]), { fmt: v => v.toFixed(2) + '%', label: '美國公債殖利率走勢圖' });
  const drawSpread = () => lineChart(spEl, inRange(), SPREADS.map((t, i) => ({ label: t, cls: 'ys' + i, get: p => p.s[i] })), { ref: 0, shadeBelowRef: true, fmt: v => sgn(v), label: '美國公債利差走勢圖（加工指標）' });
  const drawAll = () => { drawRaw(); drawSpread(); };
  const rangeBox = document.getElementById('yld-range');
  if (rangeBox) rangeBox.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    days = +b.dataset.days;
    rangeBox.querySelectorAll('button').forEach(t => { const a = t === b; t.classList.toggle('active', a); t.setAttribute('aria-pressed', a); });
    drawAll();
  });
  drawAll();
  let lastW = rawEl.clientWidth, tm;
  addEventListener('resize', () => { clearTimeout(tm); tm = setTimeout(() => { if (rawEl.clientWidth !== lastW) { lastW = rawEl.clientWidth; drawAll(); } }, 150); });

  // 表格：原始數據，最近 20 個交易日（預設顯示 5 天）
  const head = document.getElementById('yld-head'), body = document.getElementById('yld-rows'), toggle = document.getElementById('yld-toggle');
  const shown = rows.slice(-20).reverse(), PEEK = 5;
  if (head) head.innerHTML = `<tr><th>日期</th>${TENORS.map(t => `<th>${t}期</th>`).join('')}</tr>`;
  body.innerHTML = shown.map(r => `<tr><td>${day(r.d)}</td>${r.v.map(v => `<td>${has(v) ? v.toFixed(2) + '%' : '—'}</td>`).join('')}</tr>`).join('');
  if (toggle && shown.length > PEEK) {
    let open = false;
    const setOpen = o => {
      open = o; [...body.querySelectorAll('tr')].slice(PEEK).forEach(tr => { tr.hidden = !open; });
      toggle.setAttribute('aria-expanded', open);
      toggle.innerHTML = open ? '收起表格 <span aria-hidden="true">▴</span>' : `展開最近 ${shown.length} 個交易日 <span aria-hidden="true">▾</span>`;
    };
    setOpen(false); toggle.hidden = false;
    toggle.addEventListener('click', () => setOpen(!open));
  }

  // 加工指標說明：倒掛天數與期間（由資料計算）
  const note = document.getElementById('yld-note');
  if (note) note.textContent = '利差＝長天期殖利率減短天期殖利率，由本站依財政部原始數據計算（小數 2 位）。' + SPREADS.map((t, i) => {
    const neg = rows.filter(r => has(r.s[i]) && r.s[i] < 0);
    return neg.length ? `資料期間內，${t}利差共有 ${neg.length.toLocaleString('zh-TW')} 個交易日小於 0（${day(neg[0].d)}～${day(neg[neg.length - 1].d)}）` : `資料期間內，${t}利差沒有出現倒掛`;
  }).join('；') + '。';
})();

// ---------- 數據頁：臺指選擇權波動率指數 VIXTWN（資料在 data.js 的 twVix，期交所官方每日收盤值）----------
(function () {
  const kpis = document.getElementById('vix-kpis');
  if (!kpis) return;
  const cfg = D.twVix || {};
  const rows = (cfg.rows || []).filter(r => Array.isArray(r) && r[0]).map(r => ({ d: r[0], v: r[1] })).sort((a, b) => a.d < b.d ? -1 : 1);
  const has = v => typeof v === 'number' && isFinite(v);
  const day = d => { const [y, m, dd] = d.split('-'); return `${y}/${+m}/${+dd}`; };
  const sgn = v => `${v > 0.0001 ? '+' : v < -0.0001 ? '−' : '±'}${Math.abs(v).toFixed(2)}`;
  const setText = (id, t) => { const el = document.getElementById(id); if (el) el.textContent = t; };
  const chartEl = document.getElementById('vix-chart');

  if (!rows.length) {
    kpis.innerHTML = ['最新收盤', '期間最高', '期間最低', '期間平均'].map(t => `<div class="card cpi-kpi"><span class="cpi-k">${t}</span><b class="cpi-v">—</b><small>待更新</small></div>`).join('');
    if (chartEl) { chartEl.classList.add('cpi-empty'); chartEl.innerHTML = '<div class="cpi-ph"><b>圖表位置</b><span>數據更新後，這裡會顯示走勢圖</span></div>'; }
    return;
  }

  // 最新數據：最新收盤、期間最高、最低、平均
  const last = rows[rows.length - 1], prev = rows[rows.length - 2];
  const ok = rows.filter(r => has(r.v));
  const hi = ok.reduce((a, b) => b.v > a.v ? b : a), lo = ok.reduce((a, b) => b.v < a.v ? b : a);
  const avg = ok.reduce((t, r) => t + r.v, 0) / ok.length;
  kpis.innerHTML = [
    ['最新收盤', last.v, `${day(last.d)}${prev && has(prev.v) ? `　較前一交易日 ${sgn(last.v - prev.v)}` : ''}`],
    ['期間最高', hi.v, day(hi.d)],
    ['期間最低', lo.v, day(lo.d)],
    ['期間平均', avg, `${ok.length} 個交易日`],
  ].map(([k, v, sub]) => `<div class="card cpi-kpi"><span class="cpi-k">${k}</span><b class="cpi-v">${has(v) ? v.toFixed(2) : '—'}</b><small>${sub}</small></div>`).join('');
  setText('vix-meta', `${day(rows[0].d)} ～ ${day(last.d)}｜每日收盤（台股交易日）｜資料來源：${cfg.source || '臺灣期貨交易所'}${cfg.updated ? `｜更新：${cfg.updated}` : ''}`);

  // 走勢圖與期間切換
  let days = 0;
  const inRange = () => {
    if (!days) return rows;
    const t = new Date(last.d + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() - days);
    const from = t.toISOString().slice(0, 10);
    return rows.filter(r => r.d >= from);
  };
  const draw = () => lineChart(chartEl, inRange(), [{ label: 'VIXTWN', cls: 'yl3', get: p => p.v }], { fmt: v => v.toFixed(2), label: '臺指選擇權波動率指數走勢圖' });
  const rangeBox = document.getElementById('vix-range');
  if (rangeBox) rangeBox.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    days = +b.dataset.days;
    rangeBox.querySelectorAll('button').forEach(t => { const a = t === b; t.classList.toggle('active', a); t.setAttribute('aria-pressed', a); });
    draw();
  });
  draw();
  let lastW = chartEl.clientWidth, tm;
  addEventListener('resize', () => { clearTimeout(tm); tm = setTimeout(() => { if (chartEl.clientWidth !== lastW) { lastW = chartEl.clientWidth; draw(); } }, 150); });

  // 表格：最近 20 個交易日（預設顯示 5 天）
  const body = document.getElementById('vix-rows'), toggle = document.getElementById('vix-toggle');
  const idx = new Map(rows.map((r, i) => [r.d, i]));
  const shown = rows.slice(-20).reverse(), PEEK = 5;
  body.innerHTML = shown.map(r => {
    const p = rows[idx.get(r.d) - 1];
    const c = p && has(p.v) && has(r.v) ? r.v - p.v : null;
    return `<tr><td>${day(r.d)}</td><td>${has(r.v) ? r.v.toFixed(2) : '—'}</td><td class="${c > 0 ? 'pos' : c < 0 ? 'neg' : ''}">${c === null ? '—' : sgn(c)}</td></tr>`;
  }).join('');
  if (toggle && shown.length > PEEK) {
    let open = false;
    const setOpen = o => {
      open = o; [...body.querySelectorAll('tr')].slice(PEEK).forEach(tr => { tr.hidden = !open; });
      toggle.setAttribute('aria-expanded', open);
      toggle.innerHTML = open ? '收起表格 <span aria-hidden="true">▴</span>' : `展開最近 ${shown.length} 個交易日 <span aria-hidden="true">▾</span>`;
    };
    setOpen(false); toggle.hidden = false;
    toggle.addEventListener('click', () => setOpen(!open));
  }
  setText('vix-note', `數值為臺灣期貨交易所公布的每日收盤值（小數 2 位），本站未重新計算。期交所網站僅提供最近數個月的資料，因此本頁從 ${day(rows[0].d)} 開始。`);
})();

$('year').textContent = new Date().getFullYear();
