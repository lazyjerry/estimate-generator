# 報價單產生器

這個專案是一個基於 Cloudflare Workers 的報價單產生器。使用者可以透過網頁表單輸入報價資料，系統會自動產生格式化的報價單頁面，並支援列印成 A4 PDF。報價單頁面還包含「下載 PDF」按鈕，方便用戶下載報價單 PDF。

## 線上 Demo

請點擊以下網址查看線上 Demo：  
[https://estimate-generator.crazyjerry.workers.dev/](https://estimate-generator.crazyjerry.workers.dev/)

⚠ **請注意：**
- **Demo 網址可能會因版本變更而有所不同，未必是當前版本，請依實際情況調整。**
- **可在 Chrome 開發人員工具（F12 或 Ctrl + Shift + I）中執行 `autofillForm()` 來測試自動填入功能。**

## 功能特色

- **網頁表單輸入資料**  
  使用者可在表單中輸入乙方（提供單位）與甲方（客戶）的資訊、報價單編號、日期、截止日期、品項細節（包括品項描述、數量、單價）、稅金百分比及備註。

- **自動產生報價單頁面**  
  根據輸入資料，系統將自動計算小計、稅金和總計（採用整數運算並加上逗號千位分隔），並將資料套用至報價單模板中，生成格式化的報價單頁面。

- **PDF 下載功能**  
  報價單頁面提供一個右下角的浮動圓形按鈕「下載 PDF」，點擊後透過 html2pdf.js 將頁面轉換成 PDF，方便用戶下載與列印。

- **Logo Base64 轉換**  
  為了避免 PDF 轉換時因跨域問題無法載入外部圖片，系統在後端會將 logo 圖片 URL 轉換為 Base64 字串，直接嵌入報價單中。

- **分享網址功能（選擇性）**  
  系統可將報價單資料編碼成 query string，生成一個可分享的網址，打開該網址時可以預填資料生成報價單。

- **基礎防機器人保護**  
  透過檢查 HTTP User-Agent 標頭，對自動化呼叫進行基本過濾。

## 專案結構

- **index.js**  
  Cloudflare Worker 主程式，負責處理 HTTP 請求、讀取表單資料、計算報價金額、將 logo 轉換成 Base64、套用模板生成報價單 HTML，以及基本的防機器人檢查。

- **form.html**  
  報價單輸入表單頁面的 HTML 模板，使用 Bootstrap 和 jQuery 打造響應式介面。

- **quote.html**  
  報價單頁面的 HTML 模板，包含報價單格式、樣式與「下載 PDF」功能，適用於 A4 列印。

## 運作原理

1. **使用者輸入資料**  
   使用者在表單中輸入報價資料，包含乙方、甲方、品項、日期等資訊，並提交表單。

2. **資料處理與模板套用**  
   Worker 後端接收 POST 請求，計算各項數據（小計、稅金、總計），並將數字格式化成帶逗號的整數格式；同時從外部取得 logo 圖片並轉換成 Base64。接著，利用模板替換將資料填入報價單模板 (quote.html)。

3. **生成與下載 PDF**  
   產生的報價單頁面中包含「下載 PDF」按鈕，點擊後會使用 html2pdf.js 將頁面轉換成 PDF 文件，供使用者下載與列印。

4. **分享功能**  
   可將表單資料編碼為 query string，生成一個分享用的 URL，打開該 URL 時自動填入報價單內容。

## 部署

您可以使用 Cloudflare Wrangler 工具將此專案部署到 Cloudflare Workers：

1. **安裝 Wrangler**  
   如果尚未安裝，請執行：
   ```bash
   npm install -g @cloudflare/wrangler
   ```

2. **建立 wrangler.toml**  
   在專案根目錄建立 `wrangler.toml`，例如：
   ```toml
   name = "estimate-generator"
   type = "javascript"
   account_id = "<你的帳號 ID>"
   workers_dev = true
   compatibility_date = "2025-03-08"
   ```

3. **部署**  
   執行以下命令將 Worker 部署到 Cloudflare：
   ```bash
   wrangler publish
   ```

部署成功後，您的 Worker 將可在 `https://estimate-generator.crazyjerry.workers.dev/`（或您設定的自訂域名）訪問。

## 自定義

- **介面樣式**  
  您可以編輯 `form.html` 與 `quote.html` 中的 CSS，調整排版、色調與字體以符合您的品牌需求。

- **功能擴展**  
  如需增加進階的防機器人功能、分享功能或其他自定義邏輯，請修改 `index.js` 中相應的程式碼。

## 授權

本專案採用 MIT 授權，歡迎參考與修改。