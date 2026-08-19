import { extractLabel } from "./imageProcessor.js";

const files = document.getElementById("files");
const cards = document.getElementById("cards");
const status = document.getElementById("status");

let resultData = [];

// OCR 辨識
async function recognizePhoto(file) {

  const img = new Image();
  img.src = URL.createObjectURL(file);
  await img.decode();

  // 取得白色標籤
  const labelCanvas = await extractLabel(img);

  const result = await Tesseract.recognize(
    labelCanvas,
    "chi_tra+eng",
    {
      tessedit_pageseg_mode: "6",
      tessedit_char_whitelist:
        "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz輔大ERICUSO"
    }
  );

  const text = result.data.text.replace(/\s+/g, " ");

  // ---------- 單位 ----------
  let unit = "未知單位";

  if (text.includes("輔大")) unit = "輔大ER";
  else if (text.includes("ER")) unit = "輔大ER";
  else if (text.includes("ICU")) unit = "ICU";
  else if (text.includes("SICU")) unit = "SICU";
  else if (text.includes("OR")) unit = "OR";

  // ---------- 5碼 ----------
  let locator = (text.match(/\d{5}/) || [""])[0];

  // ---------- 6碼 ----------
  let asset = (text.match(/\d{6}/) || [""])[0];

  // 常見 OCR 修正
  locator = locator
    .replace(/O/g, "0")
    .replace(/S/g, "5")
    .replace(/G/g, "6")
    .replace(/I/g, "1");

  asset = asset
    .replace(/O/g, "0")
    .replace(/S/g, "5")
    .replace(/G/g, "6")
    .replace(/I/g, "1");

  return {
    unit,
    locator,
    asset,
    preview: URL.createObjectURL(file)
  };
}

// 開始辨識
document.getElementById("scan").onclick = async () => {

  cards.innerHTML = "";
  resultData = [];

  const list = [...files.files];

  if (list.length === 0) {
    alert("請先選擇照片！");
    return;
  }

  for (let i = 0; i < list.length; i++) {

    const file = list[i];

    status.textContent =
      `辨識中 ${i + 1} / ${list.length}`;

    const data = await recognizePhoto(file);

    const row = {
      file,
      ext: file.name.split(".").pop(),
      original: file.name,
      ...data
    };

    resultData.push(row);

    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <img src="${data.preview}">
      <div>

        <div class="row">
          <label>單位</label>
          <input class="unit" value="${data.unit}">
        </div>

        <div class="row">
          <label>定位器</label>
          <input class="locator" maxlength="5" value="${data.locator}">
        </div>

        <div class="row">
          <label>財產</label>
          <input class="asset" maxlength="6" value="${data.asset}">
        </div>

        <small>${file.name}</small>

      </div>
    `;

    const unit = card.querySelector(".unit");
    const locator = card.querySelector(".locator");
    const asset = card.querySelector(".asset");

    unit.oninput = e => row.unit = e.target.value;
    locator.oninput = e => row.locator = e.target.value;
    asset.oninput = e => row.asset = e.target.value;

    cards.appendChild(card);
  }

  status.textContent =
    `完成，共 ${resultData.length} 張照片`;
};

// ZIP
document.getElementById("zip").onclick = async () => {

  if (resultData.length === 0) {
    alert("尚未辨識！");
    return;
  }

  const zip = new JSZip();

  for (const r of resultData) {

    const filename =
      `${r.unit}-${r.locator}-${r.asset}.${r.ext}`;

    zip.file(
      filename,
      await r.file.arrayBuffer()
    );
  }

  const blob =
    await zip.generateAsync({ type: "blob" });

  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "重新命名照片.zip";
  a.click();
};

// Excel
document.getElementById("excel").onclick = () => {

  if (resultData.length === 0) {
    alert("尚未辨識！");
    return;
  }

  const rows = resultData.map(r => ({
    原始檔名: r.original,
    單位: r.unit,
    定位器編號: r.locator,
    財產編號: r.asset,
    新檔名:
      `${r.unit}-${r.locator}-${r.asset}.${r.ext}`
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);

  XLSX.utils.book_append_sheet(
    wb,
    ws,
    "盤點結果"
  );

  XLSX.writeFile(
    wb,
    "辨識結果.xlsx"
  );
};