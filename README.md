# 期貨・選擇權入門指南

一個介紹期貨與選擇權基本概念的靜態網站，包含：期貨與選擇權是什麼、契約要素、保證金與槓桿、損益試算器、常見商品、風險與名詞表。

## 檔案結構

| 檔案 | 用途 | 什麼時候改它 |
|---|---|---|
| `data.js` | **網站內容資料**（名詞表、商品、卡片、守則、試算器選單） | ✅ 最常改：新增／修改內容 |
| `index.html` | 首頁架構與段落文字（標題、說明段落、表格標題） | 要改段落文字或新增整個章節 |
| `glossary.html` | 名詞表獨立頁（名詞內容在 `data.js` 的 `glossary`） | 要改名詞表頁的標題或說明 |
| `analysis.html` | 數據頁：用下拉選單切換「美國 CPI」、「美國 PCE」、「美國非農就業」、「美國公債殖利率」（CPI、PCE、非農數據在 `data.js` 的 `usCpi.rows`、`usPce.rows`、`usNfp.rows`；殖利率在 `yield-data.js`）；選擇權策略篩選器目前隱藏（預設值在 `optScreener`） | 要更新數據或改說明時 |
| `yield-data.js` | 美國公債殖利率每日數據（只有數據頁會載入）：前 5 欄是財政部原始數據，後 2 欄是利差（加工指標） | 要更新殖利率數據時 |
| `news.html` | 新聞頁（目前為「內容準備中」） | 要放新聞或公告時 |
| `contact.html` | 聯絡我們頁（聯絡資訊在 `data.js` 的 `contact`） | 要改這一頁的標題或說明 |
| `settlement.html` | 結算價與維持率頁（內容在 `data.js` 的 `settlement`、`riskExample`） | 要改這一頁的標題或說明 |
| `margin-calc.html` | 維持率計算機（商品與保證金預設值在 `data.js` 的 `ratioCalc`） | 要改這一頁的標題或說明 |
| `options-strategy.html` | 選擇權策略（策略分組、內容與每隻腳在 `data.js` 的 `optStrategyGroups`，損益與損益圖自動計算） | 要改這一頁的標題或說明 |
| `overseas.html` | 海外期貨規格與保證金（資料在 `data.js` 的 `overseasSpecs`、`overseasMargins`） | 要改這一頁的標題或說明 |
| `style.css` | 顏色、字體、版面 | 想換配色或樣式 |
| `script.js` | 互動功能（試算、分頁、搜尋、深色模式） | 通常不用動 |

## 怎麼新增內容（以名詞表為例）

打開 `data.js`，找到 `glossary:`，複製一行、貼上、改文字：

```js
glossary: [
  { term: "平倉", desc: "做一筆反向交易，把手上的部位了結。" },
  { term: "新名詞", desc: "這裡寫解釋。" },   // ← 新增的這一行
],
```

注意：
- 文字放在 `"..."` 中，每筆結尾要有逗號 `,`
- 存檔後，重新整理瀏覽器就會看到變化
- 如果整區突然空白，通常是少了引號或逗號

其他區塊（`terms`、`productsTW`、`productsIntl`、`risks`、`rules`、`calcProducts`）的改法都一樣。

## 怎麼修改主色

在 `style.css` 最上面的 `:root` 裡改 `--accent`（淺色模式）。深色模式的顏色寫在下面兩段的 `--accent`。

## 本機預覽

直接用瀏覽器打開 `index.html` 就可以。

## 發布到 GitHub Pages

1. 在 GitHub 建立新的 repository（例如 `futures-intro`）
2. 上傳 `index.html`、`style.css`、`script.js`、`data.js`、`README.md`
   - 沒裝 git 的話：在 repo 頁面按 **Add file → Upload files**，把檔案拖進去後按 Commit
3. 到 repo 的 **Settings → Pages**，Source 選 **Deploy from a branch**，Branch 選 `main`、資料夾選 `/ (root)`，按 Save
4. 等一兩分鐘，網址會是 `https://你的帳號.github.io/futures-intro/`

之後要修改：在 GitHub 上點開檔案 → 按鉛筆圖示編輯 → Commit，網站會自動更新。

---

> 免責聲明：內容僅供教育用途，不構成投資建議。商品規格、保證金與稅費請以臺灣期貨交易所及期貨商最新公告為準。
