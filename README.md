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

- **基礎防機器人保護**  
  透過檢查 HTTP User-Agent 標頭，對自動化呼叫進行基本過濾。

- **匯入匯出資料**  
  表單下方提供匯入與匯出資料功能，資料儲存成 JSON 檔案方便保存與未來擴展。

## 部署方式

您可以使用 **Cloudflare Wrangler** 工具將此專案部署到 Cloudflare Workers。

### 1. 下載專案

```bash
git pull https://github.com/your-repo/estimate-generator.git
cd estimate-generator
```

### 2. 修改 `package.json` 版本號

打開 `package.json`，找到 `"version"` 欄位，根據需求進行版本號更新，例如：

```json
{
  "name": "estimate-generator",
  "version": "1.0.1",
  ...
}
```

### 3. 確認 `wrangler.jsonc` 設定

請打開 `wrangler.jsonc`，檢查 **Cloudflare 帳戶 ID、名稱、環境變數** 是否正確(如果有的話)。例如：

```jsonc
{
  "name": "estimate-generator",
  "account_id": "<你的 Cloudflare 帳戶 ID>",
  "compatibility_date": "2025-03-08",
  "workers_dev": true
}
```

### 4. 安裝相依套件

```bash
npm install
```

### 5. 部署至 Cloudflare Workers 。請參考 package.json 中的 scripts 指令

```bash
wrangler deploy
```

部署成功後，您的 Worker 將可在類似的網址 `https://estimate-generator.crazyjerry.workers.dev/`或您設定的自訂域名訪問。

## 自定義

- **介面樣式**  
  您可以編輯 `form.html` 與 `quote.html` 中的 CSS，調整排版、色調與字體以符合您的品牌需求。

- **功能擴展**  
  如需增加進階的防機器人功能、分享功能或其他自定義邏輯，請修改 `index.js` 中相應的程式碼。

## 授權

本專案採用 MIT 授權，歡迎參考與修改。