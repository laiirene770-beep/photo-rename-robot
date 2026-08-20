/* ==========================================
   Photo Rename Robot V5.0
   app.js（完整版）
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

/* ==========================================
   上傳 / 拖曳
========================================== */

// 點擊選擇
selectBtn.addEventListener("click", () => {
    fileInput.click();
});

// 選擇完成
fileInput.addEventListener("change", (e) => {
    loadFiles(Array.from(e.target.files));
});

// 防止瀏覽器開啟圖片
["dragenter","dragover","dragleave","drop"].forEach(eventName=>{
    document.addEventListener(eventName,(e)=>{
        e.preventDefault();
        e.stopPropagation();
    },false);
});

// 拖曳效果
dropZone.addEventListener("dragenter",()=>{
    dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragover",()=>{
    dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragleave",()=>{
    dropZone.classList.remove("dragover");
});

// 放開
dropZone.addEventListener("drop",(e)=>{

    dropZone.classList.remove("dragover");

    const files = Array.from(e.dataTransfer.files).filter(file=>{
        return file.type.startsWith("image/");
    });

    loadFiles(files);

});

/* ==========================================
   載入圖片
========================================== */

function loadFiles(files){

    photos = files.filter(file=>file.type.startsWith("image/"));

    results=[];

    previewGrid.innerHTML="";
    resultBody.innerHTML="";

    progressFill.style.width="0%";
    progressText.innerText="0%";

    photoCount.innerText=`${photos.length} 張`;

    if(photos.length===0){

        resultBody.innerHTML=`
        <tr class="empty-row">
            <td colspan="5">沒有圖片</td>
        </tr>`;

        return;
    }

    photos.forEach((file,index)=>{

        const reader=new FileReader();

        reader.onload=(e)=>{

            const div=document.createElement("div");
            div.className="preview-item";

            div.innerHTML=`
                <img src="${e.target.result}">
                <div class="preview-name">${file.name}</div>
            `;

            previewGrid.appendChild(div);

        };

        reader.readAsDataURL(file);

        const tr=document.createElement("tr");

        tr.innerHTML=`
            <td>${file.name}</td>
            <td>-</td>
            <td>-</td>
            <td>-</td>
            <td>-</td>
        `;

        resultBody.appendChild(tr);

    });

}

/* ==========================================
   開始辨識
========================================== */

startBtn.addEventListener("click", async()=>{

    if(photos.length===0){

        alert("請先加入照片！");
        return;

    }

    loading.classList.remove("hidden");

    results=[];

    for(let i=0;i<photos.length;i++){

        loadingText.innerText=
        `辨識中 ${i+1}/${photos.length}`;

        try{

            const result=await processImage(photos[i]);

            results.push(result);

            updateRow(i,result);

        }catch(err){

            console.error(err);

            results.push({
                unit:"辨識失敗",
                locator:"00000",
                asset:"000000",
                confidence:0
            });

            updateRow(i,results[i]);

        }

        const percent=Math.round(((i+1)/photos.length)*100);

        progressFill.style.width=percent+"%";
        progressText.innerText=percent+"%";

    }

    loading.classList.add("hidden");

    excelBtn.disabled=false;
    zipBtn.disabled=false;

    alert(`完成！共辨識 ${photos.length} 張照片`);

});

/* ==========================================
   更新表格
========================================== */

function updateRow(index,data){

    const row=resultBody.rows[index];

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

function scoreClass(score){

    if(score>=95) return "good";

    if(score>=85) return "warn";

    return "bad";

}

/* ==========================================
   Excel
========================================== */

excelBtn.addEventListener("click",()=>{

    const rows=[[
        "原始照片",
        "單位",
        "定位器",
        "財產編號",
        "信心"
    ]];

    Array.from(resultBody.rows).forEach((row,index)=>{

        rows.push([
            photos[index].name,
            row.cells[1].firstElementChild.value,
            row.cells[2].firstElementChild.value,
            row.cells[3].firstElementChild.value,
            row.cells[4].innerText
        ]);

    });

    const wb=XLSX.utils.book_new();

    const ws=XLSX.utils.aoa_to_sheet(rows);

    XLSX.utils.book_append_sheet(wb,ws,"OCR");

    XLSX.writeFile(wb,"辨識結果.xlsx");

});

/* ==========================================
   ZIP 重新命名
========================================== */

zipBtn.addEventListener("click",async()=>{

    const zip=new JSZip();

    for(let i=0;i<photos.length;i++){

        const row=resultBody.rows[i];

        const unit=row.cells[1].firstElementChild.value;

        const locator=row.cells[2].firstElementChild.value;

        const asset=row.cells[3].firstElementChild.value;

        const ext=photos[i].name.split(".").pop();

        const filename=
        `${unit}-${locator}-${asset}.${ext}`;

        zip.file(filename,photos[i]);

    }

    const blob=await zip.generateAsync({
        type:"blob"
    });

    const url=URL.createObjectURL(blob);

    const a=document.createElement("a");

    a.href=url;

    a.download="重新命名照片.zip";

    a.click();

    URL.revokeObjectURL(url);

});
