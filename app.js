import { extractLabel } from "./imageProcessor.js";

const files = document.getElementById("files");
const cards = document.getElementById("cards");
const status = document.getElementById("status");

let resultData = [];

// ===== 醫院單位字典 =====
const UNIT_LIST = [
  "SICU",
  "MICU",
  "PICU",
  "NICU",
  "ICU",
  "ER",
  "OR"
];

// ===== OCR =====
async function recognizePhoto(file){

  const img = new Image();
  img.src = URL.createObjectURL(file);
  await img.decode();

  const label = await extractLabel(img);

  const result = await Tesseract.recognize(
    label,
    "chi_tra+eng",
    {
      tessedit_pageseg_mode: "6",
      tessedit_char_whitelist:
        "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz輔大"
    }
  );

  const raw = result.data.text;

  // 去空白
  const text = raw.replace(/\s+/g,"");

  // ---------- 修正常見OCR ----------
  let clean = text
    .toUpperCase()
    .replace(/0R/g,"OR")
    .replace(/E[D0]/g,"ER")
    .replace(/1CU/g,"ICU")
    .replace(/S1CU/g,"SICU")
    .replace(/M1CU/g,"MICU")
    .replace(/P1CU/g,"PICU")
    .replace(/N1CU/g,"NICU");

  // ---------- 判斷單位 ----------
  let dept = "";

  for(const u of UNIT_LIST){
    if(clean.includes(u)){
      dept = u;
      break;
    }
  }

  let unit = dept ? `輔大${dept}` : "未知單位";

  // ---------- 5碼 ----------
  let locator = (clean.match(/\d{5}/) || [""])[0];

  // ---------- 6碼 ----------
  let asset = (clean.match(/\d{6}/) || [""])[0];

  locator = locator
    .replace(/O/g,"0")
    .replace(/I/g,"1")
    .replace(/S/g,"5")
    .replace(/G/g,"6");

  asset = asset
    .replace(/O/g,"0")
    .replace(/I/g,"1")
    .replace(/S/g,"5")
    .replace(/G/g,"6");

  // 若單位沒讀到，但數字完整，預設輔大ER
  if(unit==="未知單位" && locator.length===5 && asset.length===6){
    unit="輔大ER";
  }

  return{
    unit,
    locator,
    asset,
    preview:URL.createObjectURL(file)
  };
}

// ===== 開始辨識 =====
document.getElementById("scan").onclick = async()=>{

  cards.innerHTML="";
  resultData=[];

  const list=[...files.files];

  if(list.length===0){
    alert("請先選擇照片");
    return;
  }

  for(let i=0;i<list.length;i++){

    status.textContent=`辨識中 ${i+1}/${list.length}`;

    const file=list[i];
    const data=await recognizePhoto(file);

    const row={
      file,
      ext:file.name.split(".").pop(),
      original:file.name,
      ...data
    };

    resultData.push(row);

    const card=document.createElement("div");
    card.className="card";

    card.innerHTML=`
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

    const u=card.querySelector(".unit");
    const l=card.querySelector(".locator");
    const a=card.querySelector(".asset");

    u.oninput=e=>row.unit=e.target.value;
    l.oninput=e=>row.locator=e.target.value;
    a.oninput=e=>row.asset=e.target.value;

    cards.appendChild(card);
  }

  status.textContent=`完成 ${resultData.length} 張`;
};

// ===== ZIP =====
document.getElementById("zip").onclick = async()=>{

  if(resultData.length===0){
    alert("請先辨識");
    return;
  }

  const zip=new JSZip();

  for(const r of resultData){

    const filename=
      `${r.unit}-${r.locator}-${r.asset}.${r.ext}`;

    zip.file(filename,await r.file.arrayBuffer());
  }

  const blob=await zip.generateAsync({type:"blob"});

  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download="重新命名照片.zip";
  a.click();
};

// ===== Excel =====
document.getElementById("excel").onclick=()=>{

  if(resultData.length===0){
    alert("請先辨識");
    return;
  }

  const rows=resultData.map(r=>({
    原始檔名:r.original,
    單位:r.unit,
    定位器編號:r.locator,
    財產編號:r.asset,
    新檔名:`${r.unit}-${r.locator}-${r.asset}.${r.ext}`
  }));

  const wb=XLSX.utils.book_new();
  const ws=XLSX.utils.json_to_sheet(rows);

  XLSX.utils.book_append_sheet(wb,ws,"盤點結果");

  XLSX.writeFile(wb,"辨識結果.xlsx");
};