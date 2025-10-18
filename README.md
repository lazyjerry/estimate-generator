報價單產生器 · v2 (Hono + Cloudflare Workers + TypeScript)

本專案是一套 基於  Hono 與 Cloudflare Workers 的報價單產生器。
使用者透過網頁表單輸入資料，系統會：

1.  由 Worker 端計算小計 / 稅金 / 總計
2.  把資料套用 quote.html 模板，產生格式化的報價單頁面
3.  內建 「下載  PDF」 按鈕，方便列印或留存。

新版本重點

- 採 TypeScript + Hono，程式更簡潔、易維護。
- 靜態資產改放 /public，由 Wrangler assets.directory 自動部署。

⸻

線上 Demo

👉 https://estimate-generator.crazyjerry.workers.dev/

⚠ Demo 可能與最新程式碼版本略有差異，請以實際部署為準。
可在瀏覽器 DevTools console 執行 autofillForm() 觀摩自動填入效果。

⸻

功能特色

功能 說明
表單輸入 乙方 / 甲方資料、報價單編號、日期、截止日、品項清單、稅率、備註。
自動試算 Worker 端以整數計算並加上千分位逗號。
PDF 下載 前端呼叫  html2pdf.js，可直接匯出 A4 PDF。
Logo Base64 伺服端將外部 Logo 轉 Base64，避免 PDF 跨域失敗。
Hono Middleware 已內建基本機器人檢查，可擴充 JWT/BasicAuth…。
匯入 / 匯出 JSON 表單底部可備份/還原輸入內容。
LocalStorage 快取 關閉頁面資料不遺失。

⸻

專案結構
```
estimate-generator/
├─ public/ # 靜態頁面與資產
│ ├─ index.html # 填寫表單
│ ├─ style.css
│ └─ ...
├─ src/
│ ├─ index.ts # Hono 入口
│ └─ templates/
│ └─ quote.html # 報價單模板（以 ?raw 匯入）
├─ wrangler.toml
└─ package.json
```
⸻

快速開始

1. 下載專案

git clone https://github.com/your-repo/estimate-generator.git
cd estimate-generator

2. 安裝相依

npm install

3. 修改 wrangler.toml

name = "estimate-generator"
account_id = "<你的 Cloudflare 帳戶 ID>"
compatibility_date = "2025-04-20"

# 靜態資產目錄

assets = { directory = "public" }

若要綁定 KV／D1／R2，請依 Wrangler 文件添加對應設定。

4. 本機開發

npm run dev # 等同 wrangler dev

# http://localhost:8787/

5. 部署

npm run deploy # wrangler deploy

部署完成後，可透過  https://<worker-name>.<subdomain>.workers.dev/
或綁定的自訂網域存取。

⸻

自訂化

方向 說明
樣式 / 版面 編輯 public/style.css 或在 quote.html 中覆寫 CSS。
模板欄位 修改 src/templates/quote.html，並在 handleQuote() 中新增對應 {{placeholder}}。
防機器人 Hono 提供 basicAuth(), jwt() 中介軟體；也可接 reCAPTCHA。
PDF 品質 public/index.html 中 html2pdf 參數可調解析度、邊距。
CI/CD 將 wrangler deploy 併入 GitHub Actions 即可自動發布。

⸻

常見問題

問題 解答
圖片太大導致 Data URI 超過 10 MiB？ 在前端先縮圖、或改用 Cloudflare R2／圖床並允許 img 直接連外。
要改用 Deno Deploy? Hono 語法不變，只需把 wrangler.toml 換成 deno.json 並移除 assets.directory，再用 hono/deno 的 serveStatic。
如何新增品項欄位驗證？ 在 handleQuote 取值後加入邏輯，或使用 zod 搭配 c.req.valid()。

⸻

授權

MIT License – 歡迎自由使用、修改與商業化。如有問題或建議，歡迎開  Issue 或提  PR 🙌
