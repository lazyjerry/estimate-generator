// index.js
import formHtml from './form.html';
import quoteTemplate from './quote.html';


const hotComputerRoasts = [
	"你這台電腦是打算兼職烤箱嗎？看樣子手撐一下就能烤麵包了！",
	"這麼燙還不關機，你是想親自試驗「電腦煮泡麵」的新奇做法嗎？",
	"CPU 散熱器都快變火山口了，你要不要乾脆從裡面煉點金出來？",
	"別再開遊戲了，再開下去恐怕要先預約一台消防車來待命了！",
	"你這電腦溫度比夏天的熱浪還強，是打算拿它來當暖爐過冬嗎？"
];

export default {
	async fetch(request, env, ctx) {

		// 檢查是否為機器人或超過請求頻率
		const botCheck = await checkForBots(request);
		if (botCheck.status !== 200) {
			// 如果狀態不是 200，直接返回對應錯誤
			return new Response(botCheck.message, { status: botCheck.status });
		}

		if (request.method === "GET") {
			// 產生回應
			const response = new Response(formHtml, {
				headers: { "Content-Type": "text/html; charset=utf-8" }
			});
			// 若有 newCookie，添增到回應中
			if (botCheck.newCookie) {
				response.headers.append("Set-Cookie", botCheck.newCookie);
			}
			return response;

		} else if (request.method === "POST") {

			// 先檢查上一頁 Referer（或檢查 Cookie）
			const refererHeader = request.headers.get("Referer") || "";
			const cookies = getCookies(request);
			const clientIP = request.headers.get("CF-Connecting-IP") || "unknown";
			const lastRequestData = cookies[clientIP] ? cookies[clientIP].split("|") : null;

			if (!refererHeader || !lastRequestData) {

				// 不符合條件
				const randomIndex = Math.floor(Math.random() * hotComputerRoasts.length);
				const str = hotComputerRoasts[randomIndex];
				return new Response(str, {
					status: 400,
				});
			}


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

			// 回應
			const response = new Response(outputHtml, {
				headers: { "Content-Type": "text/html; charset=utf-8" }
			});
			// 若有 newCookie，添增到回應中
			if (botCheck.newCookie) {
				response.headers.append("Set-Cookie", botCheck.newCookie);
			}
			return response;

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

// **反機器人與 IP 限制請求檢查**
async function checkForBots(request) {
	const userAgent = request.headers.get("User-Agent") || "";
	const clientIP = request.headers.get("CF-Connecting-IP") || "unknown";
	const maxRequests = 10; // 每分鐘最大請求數
	const timeWindow = 60 * 1000; // 60 秒

	// 若檢測到機器人，返回 dict
	if (!userAgent || /bot|crawler|spider|curl|wget|python|java/i.test(userAgent)) {
		return {
			status: 403,
			message: "Forbidden: Automated requests are not allowed",
			newCookie: ""
		};
	}

	const cookies = getCookies(request);
	const lastRequestData = cookies[clientIP] ? cookies[clientIP].split("|") : null;
	let requestCount = 0;
	let firstRequestTime = Date.now();

	if (lastRequestData) {

		requestCount = parseInt(lastRequestData[0], 10);
		firstRequestTime = parseInt(lastRequestData[1], 10);

		if (Date.now() - firstRequestTime < timeWindow) {
			if (requestCount >= maxRequests) {

				const randomIndex = Math.floor(Math.random() * hotComputerRoasts.length);
				const str = hotComputerRoasts[randomIndex];

				return {
					status: 429,
					message: str,
					newCookie: ""
				};
			}
			requestCount++;
		} else {
			// 超過 60 秒重置計數
			requestCount = 1;
			firstRequestTime = Date.now();
		}
	} else {
		requestCount = 1;
		firstRequestTime = Date.now();
	}
	// 設置新的 Cookie（更新請求次數和時間戳）
	const newCookie = `${clientIP}=${requestCount}|${firstRequestTime}; Max-Age=60; Path=/; HttpOnly; Secure`;

	return {
		status: 200,
		message: "OK",
		newCookie
	};
}

// **輔助函數：解析 Cookie**
function getCookies(request) {
	const cookieHeader = request.headers.get("Cookie");
	if (!cookieHeader) return {};

	return Object.fromEntries(
		cookieHeader.split(";").map(cookie => {
			const [key, value] = cookie.trim().split("=");
			return [key, value];
		})
	);
}
