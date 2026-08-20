/* ==========================================
   Photo Rename Robot V5.0
   app.js
========================================== */

const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");
const selectBtn = document.getElementById("selectBtn");

const previewGrid = document.getElementById("previewGrid");
const resultBody = document.getElementById("resultBody");

const startBtn = document.getElementById("startBtn");
const excelBtn = document.getElementById("excelBtn");
const zipBtn = document.getElementById("zipBtn");

const progressFill = document.getElementById("progressFill");
const progressText = document.getElementById("progressText");

const loading = document.getElementById("loading");
const loadingText = document.getElementById("loadingText");

const photoCount = document.getElementById("photoCount");

let photos = [];
let results = [];

/* -------------------------
   Upload
-------------------------- */

selectBtn.onclick = () => fileInput.click();

fileInput.onchange = e => {
    loadFiles([...e.target.files]);
};

dropZone.ondragover = e => {
    e.preventDefault();
    dropZone.classList.add("dragover");
};

dropZone.ondragleave = () => {
    dropZone.classList.remove("dragover");
};

dropZone.ondrop = e => {

    e.preventDefault();

    dropZone.classList.remove("dragover");

    loadFiles([...e.dataTransfer.files]);

};

/* -------------------------
   Load Images
-------------------------- */

function loadFiles(files){

    photos = files.filter(f=>{

        return /image/i.test(f.type);

    });

    results = [];

    previewGrid.innerHTML = "";
    resultBody.innerHTML = "";

    photoCount.innerText = photos.length + " 張";

    if(photos.length===0){

        resultBody.innerHTML = `
        <tr class="empty-row">
            <td colspan="5">沒有圖片</td>
        </tr>`;

        return;
    }

    photos.forEach(file=>{

        const reader = new FileReader();

        reader.onload = e=>{

            const div = document.createElement("div");
            div.className = "preview-item";

            div.innerHTML = `
                <img src="${e.target.result}">
                <div class="preview-name">${file.name}</div>
            `;

            previewGrid.appendChild(div);

        };

        reader.readAsDataURL(file);

    });

    resultBody.innerHTML = "";

    photos.forEach(file=>{

        const tr = document.createElement("tr");

        tr.innerHTML = `
        <td>${file.name}</td>
        <td>-</td>
        <td>-</td>
        <td>-</td>
        <td>-</td>
        `;

        resultBody.appendChild(tr);

    });

}

/* -------------------------
   OCR Start
-------------------------- */

startBtn.onclick = async()=>{

    if(photos.length===0){

        alert("請先加入照片");
        return;
    }

    loading.classList.remove("hidden");

    results=[];

    for(let i=0;i<photos.length;i++){

        loadingText.innerText =
        `辨識中 ${i+1}/${photos.length}`;

        const result = await processImage(photos[i]);

        results.push(result);

        updateRow(i,result);

        const p = Math.round((i+1)/photos.length*100);

        progressFill.style.width = p+"%";
        progressText.innerText = p+"%";

    }

    loading.classList.add("hidden");

    excelBtn.disabled=false;
    zipBtn.disabled=false;

    alert("辨識完成！");

};

/* -------------------------
   Update Table
-------------------------- */

function updateRow(index,data){

    const row = resultBody.rows[index];

    row.innerHTML=`

    <td>${photos[index].name}</td>

    <td>
      <input value="${data.unit}">
    </td>

    <td>
      <input value="${data.locator}">
    </td>

    <td>
      <input value="${data.asset}">
    </td>

    <td class="${scoreClass(data.confidence)}">
      ${data.confidence}%
    </td>

    `;

}

/* -------------------------
   Confidence Color
-------------------------- */

function scoreClass(score){

    if(score>=95) return "good";

    if(score>=85) return "warn";

    return "bad";

}

/* -------------------------
   Excel
-------------------------- */

excelBtn.onclick=()=>{

    const rows=[[
        "原始照片",
        "單位",
        "定位器",
        "財產編號",
        "信心值"
    ]];

    [...resultBody.rows].forEach((row,i)=>{

        rows.push([
            photos[i].name,
            row.cells[1].firstElementChild.value,
            row.cells[2].firstElementChild.value,
            row.cells[3].firstElementChild.value,
            row.cells[4].innerText
        ]);

    });

    const wb = XLSX.utils.book_new();

    const ws = XLSX.utils.aoa_to_sheet(rows);

    XLSX.utils.book_append_sheet(wb,ws,"OCR");

    XLSX.writeFile(wb,"辨識結果.xlsx");

};

/* -------------------------
   ZIP Rename
-------------------------- */

zipBtn.onclick=async()=>{

    const zip = new JSZip();

    for(let i=0;i<photos.length;i++){

        const row = resultBody.rows[i];

        const unit = row.cells[1].firstElementChild.value;

        const locator = row.cells[2].firstElementChild.value;

        const asset = row.cells[3].firstElementChild.value;

        const ext = photos[i].name.split(".").pop();

        const newName =
        `${unit}-${locator}-${asset}.${ext}`;

        zip.file(newName,photos[i]);

    }

    const blob = await zip.generateAsync({
        type:"blob"
    });

    const a = document.createElement("a");

    a.href = URL.createObjectURL(blob);

    a.download="重新命名照片.zip";

    a.click();

};