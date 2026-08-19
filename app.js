async function startOCR(){

    const files=document.getElementById("files").files;

    if(files.length===0){
        alert("請選擇照片");
        return;
    }

    const tbody=document.getElementById("resultBody");
    tbody.innerHTML="";

    for(let i=0;i<files.length;i++){

        status.innerText=`辨識中 ${i+1}/${files.length}`;

        const result=await processImage(files[i]);

        const url=URL.createObjectURL(files[i]);

        const row=document.createElement("tr");

        row.innerHTML=`
        <td><img src="${url}" class="preview"></td>
        <td>${files[i].name}</td>
        <td>${result.unit}</td>
        <td>${result.id5}</td>
        <td>${result.id6}</td>
        <td>${result.filename}</td>
        `;

        tbody.appendChild(row);

    }

    status.innerText="✅ 全部完成";

}