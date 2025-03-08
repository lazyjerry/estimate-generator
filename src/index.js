// index.js
import formHtml from './form.html';
import quoteTemplate from './quote.html';

export default {
	async fetch(request, env, ctx) {

		// 檢查是否為機器人自動呼叫
		const botCheckResponse = await checkForBots(request);
		if (botCheckResponse) {
			return botCheckResponse;
		}

		if (request.method === "GET") {
			return new Response(formHtml, {
				headers: { "Content-Type": "text/html; charset=utf-8" }
			});
		} else if (request.method === "POST") {
			const formData = await request.formData();
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

			// 取得所有品項資料（可能有多筆品項）
			const itemDescriptions = formData.getAll("itemDescription");
			const itemQuantities = formData.getAll("itemQuantity");
			const itemUnitPrices = formData.getAll("itemUnitPrice");

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

			// 採用 Math.floor 捨去小數
			const taxAmount = Math.floor(subtotal * (taxPercent / 100));
			const total = subtotal + taxAmount;

			// 在後端轉換 logoUrl 為 Base64
			let logoBase64 = "";
			if (logoUrl) {
				try {
					logoBase64 = await convertImageToBase64(logoUrl);
				} catch (error) {
					console.error("Error converting logo to Base64:", error);
				}
			}

			// 將資料轉換為字串並格式化（例如換行符號替換成 <br>）
			const data = {
				logoUrl,
				logoBase64: logoBase64,
				providerName,
				providerContact: providerContact.replace(/\n/g, "<br>"),
				customerName,
				customerContact: customerContact.replace(/\n/g, "<br>"),
				quoteNumber,
				date,
				deadline,
				itemsHtml,
				subtotalFormatted: formatNumber(subtotal),
				taxPercent: taxPercent,
				taxAmountFormatted: formatNumber(taxAmount),
				totalFormatted: formatNumber(total),
				remarks: remarks.replace(/\n/g, "<br>")
			};

			// 使用模板字串替換，產生最終 HTML
			const outputHtml = templateReplace(quoteTemplate, data);

			return new Response(outputHtml, {
				headers: { "Content-Type": "text/html; charset=utf-8" }
			});
		} else {
			return new Response("Method Not Allowed", { status: 405 });
		}
	}
};

// 將數字轉為整數並以逗號分隔的格式，例如 25000 -> "25,000"
function formatNumber(num) {
	return Math.floor(num).toLocaleString('en-US');
}

// 簡單的模板替換函式，會把 {{key}} 替換成 data[key]
function templateReplace(template, data) {
	return template.replace(/{{\s*([\w]+)\s*}}/g, (match, key) => {
		return data[key] !== undefined ? data[key] : "";
	});
}

async function convertImageToBase64(url) {
	const response = await fetch(url);
	const contentType = response.headers.get("Content-Type") || "image/png";
	const buffer = await response.arrayBuffer();
	const base64 = arrayBufferToBase64(buffer);
	return `data:${contentType};base64,${base64}`;
}

function arrayBufferToBase64(buffer) {
	let binary = '';
	const bytes = new Uint8Array(buffer);
	const len = bytes.byteLength;
	for (let i = 0; i < len; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary);
}

// 簡單的反機器人檢查：檢查 User-Agent 中是否包含常見的自動化關鍵字
async function checkForBots(request) {
	const userAgent = request.headers.get("User-Agent") || "";
	// 如果 User-Agent 為空，或包含 "bot", "crawler", "spider", "curl", "wget", "python", "java" 等字串則拒絕請求
	if (!userAgent || /bot|crawler|spider|curl|wget|python|java/i.test(userAgent)) {
		return new Response("Forbidden", { status: 403 });
	}
	return null;
}
