// src/index.ts
import { Hono } from "hono"; // Hono 是一個輕量級的 Web 框架
import quoteTemplate from "./templates/quote.html"; // 引入報價單範本

// ——— helper ———
/**
 * 將字串模板中的 {{key}} 佔位符全部替換成對應值
 * —— 適合小型、無邏輯判斷的簡易樣板渲染
 *
 * @param tpl  含有 `{{key}}` 佔位符的模板字串
 * @param vars 欲替換的變數物件；鍵名需與模板中的 key 對應
 * @returns    已替換完成的字串
 */
function templateReplace(
	tpl: string,
	vars: Record<string, string | number>
): string {
	/*
    Object.entries(vars) 會把物件轉成陣列，如：
      { a: 1, b: 2 }  →  [['a', 1], ['b', 2]]

    reduce() 從初始值 `tpl` 開始累計 (acc)，
    對陣列中的每一組 [key, value]：
      • 使用 replaceAll() 把所有 {{key}} 換成 value
      • 產生新的字串再傳給下一輪
  */
	return Object.entries(vars).reduce(
		(acc, [k, v]) =>
			// 這裡將 value 轉成字串，確保 number 也能替換
			acc.replaceAll(`{{${k}}}`, String(v)),
		tpl // 初始累計值：原始模板字串
	);
}

/**
 * 將數值「無條件捨去小數」後，依 en‑US 語系格式化成千分位字串
 * 例：123456.78 → "123,456"
 *
 * @param {number|string} num - 任何可被轉成數字的值
 * @returns {string}          - 已加上逗號分隔的整數字串
 */
function formatNumber(num) {
	// 1. 先確保為數字並 Math.floor() 捨去小數位
	const intVal = Math.floor(Number(num));

	// 2. 使用 toLocaleString() 依語系自動加入千分位逗號
	return intVal.toLocaleString("en-US");
}

/**
 * 將遠端圖片網址轉為 Base64 Data URI
 * ------------------------------------------------------------------
 * 1. 透過 fetch 取得圖片 (支援 HTTP / HTTPS)
 * 2. 檢查回應狀態碼；若非 2xx 則丟出錯誤
 * 3. 讀取 Content‑Type，若沒有就以 "image/png" 為預設
 * 4. 確認 Content‑Type 不包含 "text" / "html" 等黑名單，避免誤抓到網頁
 * 5. 將 ArrayBuffer → base64 字串
 * 6. 回傳 `data:<mime>;base64,<data>` 形式，方便直接嵌入 <img src="">
 *
 * @param  url  圖片的絕對或相對 URL
 * @returns     Base64 Data URI (e.g. "data:image/png;base64,AAAA...")
 * @throws      Error            抓取失敗或 Content‑Type 不合法時
 */
async function convertImageToBase64(url: string): Promise<string> {
	const response = await fetch(url);

	// (1) 狀態碼不是 2xx → 拋錯
	if (!response.ok) {
		throw new Error(
			`Failed to fetch image. Status: ${response.status} ${response.statusText}`
		);
	}

	// (2) 讀取 Content‑Type；若未提供則預設 png
	const contentType = response.headers.get("Content-Type") || "image/png";

	// (3) 黑名單檢查，避免把 HTML / 文字檔誤當圖片
	const blackList = ["text", "html"];
	if (blackList.some((w) => contentType.toLowerCase().includes(w))) {
		throw new Error(`Invalid Content-Type: ${contentType}`);
	}

	// (4) ArrayBuffer → Base64
	const buffer = await response.arrayBuffer();
	const base64 = arrayBufferToBase64(buffer);

	return `data:${contentType};base64,${base64}`;
}

/**
 * 將 ArrayBuffer 轉成 Base64 字串
 *
 * @param  buffer Uint8Array/ArrayBuffer
 * @returns       base64 encoded string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
	let binary = "";
	const bytes = new Uint8Array(buffer);

	// 將每個位元組轉為對應字符，再用 btoa 編碼
	for (let i = 0; i < bytes.byteLength; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary);
}

// ——— 建立 Hono App ———
const app = new Hono();

/**
 * 依據使用者提交的表單資料，組出報價單 HTML
 * ------------------------------------------------
 * 流程：
 *  1. 透過 FormData 取得所有欄位（包含多筆品項）
 *  2. 計算小計、稅額、總計，並組出 <tr> 列表
 *  3.（可選）將遠端 Logo 轉成 Base64，避免引用外部連結
 *  4. 把所有欄位塞進 quoteTemplate 的 {{placeholder}}
 *  5. 回傳完整 HTML 給瀏覽器
 */
const handleQuote = async (c) => {
	// --- 1. 取得表單資料 --------------------------------------------------------
	// 先複製 raw Request，再呼叫 .formData()，可避免 body stream 已讀取完畢
	const formData = await c.req.raw.clone().formData();

	// 單值欄位（若不存在則回傳空字串 / 0）
	const logoUrl = formData.get("logoUrl") || "";
	const providerName = formData.get("providerName") || "";
	const providerContact = formData.get("providerContact") || "";
	const customerName = formData.get("customerName") || "";
	const customerContact = formData.get("customerContact") || "";
	const quoteNumber = formData.get("quoteNumber") || "";
	const date = formData.get("date") || "";
	const deadline = formData.get("deadline") || "";
	const taxPercent = parseFloat(formData.get("taxPercent") || "0");
	const remarks = formData.get("remarks") || "";

	// 多值欄位（getAll() 保證回傳陣列，即使只有一筆）
	const itemDescriptions = formData.getAll("itemDescription") as string[];
	const itemQuantities = formData.getAll("itemQuantity") as string[];
	const itemUnitPrices = formData.getAll("itemUnitPrice") as string[];

	// --- 2. 組 <tr> 與金額 ------------------------------------------------------
	let itemsHtml = "";
	let subtotal = 0;

	for (let i = 0; i < itemDescriptions.length; i++) {
		const desc = itemDescriptions[i];
		const qty = Math.floor(parseFloat(itemQuantities[i]) || 0);
		const price = Math.floor(parseFloat(itemUnitPrices[i]) || 0);
		const lineTotal = qty * price;

		subtotal += lineTotal;

		itemsHtml += `<tr>
      <td>${desc}</td>
      <td>${formatNumber(price)}</td>
      <td>${formatNumber(qty)}</td>
      <td>${formatNumber(lineTotal)}</td>
    </tr>`;
	}

	// 稅額與總計（皆無條件捨去至整數）
	const taxAmount = Math.floor(subtotal * (taxPercent / 100));
	const total = subtotal + taxAmount;

	// --- 3. 可選：將 Logo 圖片轉成 Base64 ---------------------------------------
	let logoBase64 = "";
	if (logoUrl) {
		try {
			// convertImageToBase64(url) 需自行實作：
			// fetch → ArrayBuffer → btoa / Buffer.toString('base64')
			logoBase64 = await convertImageToBase64(logoUrl);
		} catch (err) {
			console.error("Error converting logo to Base64:", err);
			// 若失敗則退回原連結，確保畫面仍能顯示
			logoBase64 = logoUrl;
		}
	}

	// 其他額外資料（若前端有傳）
	const formJSON = formData.get("data") || "{}";

	// --- 4. 封裝變數，替換模板 ---------------------------------------------------
	const data = {
		logoUrl,
		logoBase64,
		providerName,
		providerContact: providerContact.replace(/\n/g, "<br>"),
		customerName,
		customerContact: customerContact.replace(/\n/g, "<br>"),
		quoteNumber,
		date,
		deadline,
		itemsHtml,
		subtotalFormatted: formatNumber(subtotal),
		taxPercent,
		taxAmountFormatted: formatNumber(taxAmount),
		totalFormatted: formatNumber(total),
		remarks: remarks.replace(/\n/g, "<br>"),
		formJSON: encodeURIComponent(formJSON),
	};

	// 將 {{key}} 佔位符替換成實際值
	const outputHtml = templateReplace(quoteTemplate, data);

	// --- 5. 回傳 HTML -----------------------------------------------------------
	return c.html(outputHtml);
};

// 2. 處理報價單產生
// app.post("/", handleQuote);
app.post("/quote", handleQuote);

// 3. 404
app.notFound((c) => c.text("Not Found", 404));

export default app;
