import { extractLabel } from "./imageProcessor.js";

const files = document.getElementById("files");
const cards = document.getElementById("cards");
const status = document.getElementById("status");

let resultData = [];

async function ocrImage(file) {
  const img = new Image();
  img.src = URL.createObjectURL(file);
  await img.decode();

  const labelCanvas = await extractLabel(img);

  const result = await Tesseract.recognize(
    labelCanvas,
    "chi_tra+eng"
  );

  const text = result.data.text.replace(/\s+/g, " ");

  let unit = "未知單位";

  if (text.includes("ER")) unit = "輔大ER";
  if (text.includes("ICU")) unit = "ICU";
  if (text.includes("SICU")) unit = "SICU";
  if (text.includes("OR")) unit = "OR";

  const locator = (text.match(/\b\d{5}\b/) || [""])[0];
  const asset = (text.match(/\b\d{6}\b/) || [""])[0];

  return {
    unit,
    locator,
    asset,
    preview: URL.createObjectURL(file)
  };
}

document.getElementById("scan").onclick = async () => {

  cards.innerHTML = "";
  resultData = [];

  for (const file of files.files) {

    status.textContent = "辨識：" + file.name;

    const r = await ocrImage(file);

    const row = {
      file,
      ext: file.name.split(".").pop(),
      original: file.name,
      ...r
    };

    resultData.push(row);

    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <img src="${r.preview}">
      <div>
        <div class="row">
          <label>單位</label>
          <input value="${r.unit}">
        </div>

        <div class="row">
          <label>定位器</label>
          <input value="${r.locator}">
        </div>

        <div class="row">
          <label>財產</label>
          <input value="${r.asset}">
        </div>

        <small>${file.name}</small>
      </div>
    `;

    const input = card.querySelectorAll("input");

    input[0].oninput = e => row.unit = e.target.value;
    input[1].oninput = e => row.locator = e.target.value;
    input[2].oninput = e => row.asset = e.target.value;

    cards.appendChild(card);
  }

  status.textContent = `完成 ${resultData.length} 張`;
};

document.getElementById("zip").onclick = async () => {

  const zip = new JSZip();

  for (const r of resultData) {

    zip.file(
      `${r.unit}-${r.locator}-${r.asset}.${r.ext}`,
      await r.file.arrayBuffer()
    );
  }

  const blob = await zip.generateAsync({ type: "blob" });

  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "重新命名照片.zip";
  a.click();
};

document.getElementById("excel").onclick = () => {

  const wb = XLSX.utils.book_new();

  const ws = XLSX.utils.json_to_sheet(
    resultData.map(r => ({
      原始檔名: r.original,
      單位: r.unit,
      定位器: r.locator,
      財產編號: r.asset,
      新檔名:
        `${r.unit}-${r.locator}-${r.asset}.${r.ext}`
    }))
  );

  XLSX.utils.book_append_sheet(wb, ws, "盤點");

  XLSX.writeFile(wb, "辨識結果.xlsx");
};