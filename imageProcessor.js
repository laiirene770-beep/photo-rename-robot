// =========================================
// Photo Rename Robot V4.1
// 輔大病人標籤專用
// 第一行：英文單位（自動補上「輔大」）
// 第二行：5碼數字
// 第三行：6碼數字
// =========================================

const UNIT_LIST = [
  "SICU",
  "MICU",
  "NICU",
  "PICU",
  "ICU",
  "ER",
  "OR"
];

// ----------------------------

async function processImage(file){

  const img = await loadImage(file);

  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = img.width;
  canvas.height = img.height;

  ctx.drawImage(img,0,0);

  // ===== 白色標籤比例 =====
  const x = img.width * 0.08;
  const y = img.height * 0.58;
  const w = img.width * 0.84;
  const h = img.height * 0.22;

  const unit = await readRegion(ctx,x,y,w,h*0.32,"unit");

  const id5 = await readRegion(
      ctx,
      x,
      y+h*0.32,
      w,
      h*0.28,
      "id5"
  );

  const id6 = await readRegion(
      ctx,
      x,
      y+h*0.60,
      w,
      h*0.28,
      "id6"
  );

  return{
    unit,
    id5,
    id6,
    filename:`${unit}_${id5}_${id6}.jpg`
  };

}

// ----------------------------

function loadImage(file){

  return new Promise(resolve=>{

    const img=new Image();

    img.onload=()=>resolve(img);

    img.src=URL.createObjectURL(file);

  });

}

// ----------------------------

async function readRegion(ctx,x,y,w,h,mode){

  const c=document.createElement("canvas");
  const g=c.getContext("2d");

  c.width=Math.floor(w*3);
  c.height=Math.floor(h*3);

  g.drawImage(
    ctx.canvas,
    x,y,w,h,
    0,0,c.width,c.height
  );

  // ===== 黑白化 =====
  const img=g.getImageData(0,0,c.width,c.height);
  const d=img.data;

  for(let i=0;i<d.length;i+=4){

    const gray=(d[i]+d[i+1]+d[i+2])/3;

    const value=gray>170?255:0;

    d[i]=value;
    d[i+1]=value;
    d[i+2]=value;

  }

  g.putImageData(img,0,0);

  let result;

  // 第一行：只允許英文
  if(mode==="unit"){

    result=await Tesseract.recognize(c,"eng",{
      tessedit_pageseg_mode:7,
      tessedit_char_whitelist:"ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    });

    return parseUnit(result.data.text);

  }

  // 第二、三行：只允許數字
  result=await Tesseract.recognize(c,"eng",{
    tessedit_pageseg_mode:7,
    tessedit_char_whitelist:"0123456789OISBL"
  });

  let text=result.data.text.toUpperCase();

  text=text
      .replace(/O/g,"0")
      .replace(/[IL]/g,"1")
      .replace(/S/g,"5")
      .replace(/B/g,"8")
      .replace(/\D/g,"");

  if(mode==="id5"){

    const m=text.match(/\d{5}/);

    return m?m[0]:"-----";

  }

  const m=text.match(/\d{6}/);

  return m?m[0]:"------";

}

// ----------------------------
// 單位判斷（不依賴「輔大」）
// ----------------------------

function parseUnit(text){

  text=text
      .toUpperCase()
      .replace(/\s/g,"")
      .replace(/[^A-Z0-9]/g,"");

  // 常見誤判修正
  text=text
      .replace(/5ICU/g,"SICU")
      .replace(/S1CU/g,"SICU")
      .replace(/M1CU/g,"MICU")
      .replace(/N1CU/g,"NICU")
      .replace(/P1CU/g,"PICU")
      .replace(/1CU/g,"ICU")
      .replace(/0R/g,"OR");

  for(const u of UNIT_LIST){

    if(text.includes(u)){
      return "輔大"+u;
    }

  }

  return "UNKNOWN";

}