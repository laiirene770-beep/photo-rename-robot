/* ==========================================
   Photo Rename Robot V5.0
   imageProcessor.js
========================================== */

async function processImage(file){

    const img = await loadImage(file);

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d",{willReadFrequently:true});

    canvas.width = img.width;
    canvas.height = img.height;

    ctx.drawImage(img,0,0);

    // 找白色方框
    const roi = detectWhiteLabel(canvas,ctx);

    // 裁切
    const crop = cropCanvas(canvas,roi);

    // 前處理
    const clean = preprocess(crop);

    // 切三行
    const regions = splitRegions(clean);

    // OCR
    const result = await recognizeRegions(regions);

    return result;

}

/* -----------------------------
   Image Loader
------------------------------ */

function loadImage(file){

    return new Promise(resolve=>{

        const img = new Image();

        img.onload=()=>resolve(img);

        img.src=URL.createObjectURL(file);

    });

}

/* -----------------------------
   找白色方框
------------------------------ */

function detectWhiteLabel(canvas,ctx){

    const w=canvas.width;
    const h=canvas.height;

    const img=ctx.getImageData(0,0,w,h);

    const data=img.data;

    let minX=w,maxX=0;
    let minY=h,maxY=0;

    // 只搜尋右下70%
    const startX=Math.floor(w*0.45);
    const startY=Math.floor(h*0.35);

    for(let y=startY;y<h;y++){

        for(let x=startX;x<w;x++){

            const i=(y*w+x)*4;

            const r=data[i];
            const g=data[i+1];
            const b=data[i+2];

            if(r>210 && g>210 && b>210){

                if(x<minX) minX=x;
                if(x>maxX) maxX=x;

                if(y<minY) minY=y;
                if(y>maxY) maxY=y;

            }

        }

    }

    if(maxX-minX<80){

        return{
            x:w*0.58,
            y:h*0.55,
            width:w*0.34,
            height:h*0.25
        };

    }

    const pad=12;

    return{

        x:Math.max(minX-pad,0),

        y:Math.max(minY-pad,0),

        width:Math.min(maxX-minX+pad*2,w),

        height:Math.min(maxY-minY+pad*2,h)

    };

}

/* -----------------------------
   Crop
------------------------------ */

function cropCanvas(canvas,roi){

    const c=document.createElement("canvas");
    const ctx=c.getContext("2d");

    c.width=roi.width;
    c.height=roi.height;

    ctx.drawImage(
        canvas,
        roi.x,roi.y,roi.width,roi.height,
        0,0,roi.width,roi.height
    );

    return c;

}

/* -----------------------------
   前處理
------------------------------ */

function preprocess(source){

    const scale=4;

    const c=document.createElement("canvas");

    const ctx=c.getContext("2d",{willReadFrequently:true});

    c.width=source.width*scale;
    c.height=source.height*scale;

    ctx.imageSmoothingEnabled=false;

    ctx.drawImage(source,0,0,c.width,c.height);

    const img=ctx.getImageData(0,0,c.width,c.height);

    const d=img.data;

    // 灰階
    for(let i=0;i<d.length;i+=4){

        const gray=
        d[i]*0.299+
        d[i+1]*0.587+
        d[i+2]*0.114;

        d[i]=gray;
        d[i+1]=gray;
        d[i+2]=gray;

    }

    // 自動二值化
    let total=0;

    for(let i=0;i<d.length;i+=4){

        total+=d[i];

    }

    const avg=total/(d.length/4);

    const threshold=avg+18;

    for(let i=0;i<d.length;i+=4){

        const v=d[i]>threshold?255:0;

        d[i]=v;
        d[i+1]=v;
        d[i+2]=v;

    }

    ctx.putImageData(img,0,0);

    return c;

}

/* -----------------------------
   切三行
------------------------------ */

function splitRegions(canvas){

    const w=canvas.width;
    const h=canvas.height;

    const top=Math.floor(h*0.08);

    const unitH=Math.floor(h*0.28);

    const locH=Math.floor(h*0.24);

    const assetH=Math.floor(h*0.24);

    return{

        unit:cropArea(canvas,0,top,w,unitH),

        locator:cropArea(canvas,0,top+unitH,w,locH),

        asset:cropArea(canvas,0,top+unitH+locH,w,assetH)

    };

}

function cropArea(src,x,y,w,h){

    const c=document.createElement("canvas");
    const ctx=c.getContext("2d");

    c.width=w;
    c.height=h;

    ctx.drawImage(src,x,y,w,h,0,0,w,h);

    return c;

}