// 匯出 JSON => 產生檔案
function exportFormJSON() {
  // 先將目前表單的內容組合成物件
  const formData = gatherFormData();
  // 轉成 JSON
  const jsonStr = JSON.stringify(formData, null, 2);
  // 準備下載檔名
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  const sec = String(now.getSeconds()).padStart(2, "0");
  const dateTimeStr = `${yyyy}_${mm}_${dd}_${hh}_${min}_${sec}`;
  const blob = new Blob([jsonStr], {
    type: "application/json;charset=utf-8",
  });
  saveAs(blob, `quoteData_${dateTimeStr}.json`);
}

// 匯入 JSON
function importFormJSON(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const data = JSON.parse(e.target.result);
      fillFormData(data);
      alert("匯入成功！表單已更新。");
    } catch (error) {
      alert("JSON 格式錯誤或無法解析。");
    }
  };
  reader.readAsText(file);
  // reset input value
  event.target.value = "";
}

// 讀取當前表單 (quoteForm) 並轉成物件
function gatherFormData() {
  const formData = {
    logoUrl: $("#logoUrl").val(),
    providerName: $("#providerName").val(),
    providerContact: $("#providerContact").val(),
    customerName: $("#customerName").val(),
    customerContact: $("#customerContact").val(),
    quoteNumber: $("#quoteNumber").val(),
    date: $("#dateInput").val(),
    deadline: $("#deadlineInput").val(),
    taxPercent: $("#taxPercent").val(),
    remarks: $("#remarks").val(),
    items: [],
  };
  // 取得所有品項
  $("#itemsTable tbody tr.descRow").each(function (index) {
    const desc = $(this).find("textarea[name='itemDescription']").val();
    const qty = parseInt(
      $(this).next(".numberRow").find("input[name='itemQuantity']").val(),
      10
    );
    const price = parseInt(
      $(this)
        .next(".numberRow")
        .find("input[name='itemUnitPrice']")
        .val(),
      10
    );
    formData.items.push({ desc, qty, price });
  });
  return formData;
}

// 將 JSON 內容填回表單
function fillFormData(data) {
  $("#logoUrl").val(data.logoUrl || "");
  $("#providerName").val(data.providerName || "");
  $("#providerContact").val(data.providerContact || "");
  $("#customerName").val(data.customerName || "");
  $("#customerContact").val(data.customerContact || "");
  $("#quoteNumber").val(data.quoteNumber || "");
  $("#dateInput").val(data.date || "");
  $("#deadlineInput").val(data.deadline || "");
  $("#taxPercent").val(data.taxPercent || 0);
  $("#remarks").val(data.remarks || "");

  // 清空現有的items
  $("#itemsTable tbody").empty();
  // 新增
  if (Array.isArray(data.items)) {
    data.items.forEach((item) => {
      const templateHtml = $("#itemTemplate").html();
      const $cloned = $($.parseHTML(templateHtml));

      $cloned
        .filter(".descRow")
        .find("textarea[name='itemDescription']")
        .val(item.desc);
      $cloned
        .filter(".numberRow")
        .find("input[name='itemQuantity']")
        .val(item.qty);
      $cloned
        .filter(".numberRow")
        .find("input[name='itemUnitPrice']")
        .val(item.price);

      $("#itemsTable tbody").append($cloned);
    });
  }
  updateTotals();
}

// 固定前綴，可自行修改
const LS_PREFIX = "estg";

// 頁面載入後
$(document).ready(function () {
  restoreAllFields();

  $("#quoteForm").on(
    "blue change",
    "input, select, textarea",
    function (e) {
      console.log("SAVE");
      const formData = gatherFormData();
      const jsonStr = JSON.stringify(formData, null, 2);
      localStorage.setItem(LS_PREFIX, jsonStr);
    }
  );
});

function removeAllFields() {
  localStorage.removeItem(LS_PREFIX);
}

// 還原所有欄位的值
function restoreAllFields() {
  const data = JSON.parse(localStorage.getItem(LS_PREFIX));
  console.log(data);
  if (data) {
    fillFormData(data);
  }
}