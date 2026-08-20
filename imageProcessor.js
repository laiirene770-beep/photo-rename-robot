/* ==========================================
   Photo Rename Robot V6.0
   imageProcessor.js
   Part A (1~170)
========================================== */

const LABEL_CONFIG = {
    searchX: 0.42,
    searchY: 0.35,
    minWhite: 225,
    scale: 4
};

/* -----------------------------
   主流程
------------------------------ */

async function processImage(file){

    const image = await loadImage(file);

    const source = createCanvas(
        image.width,
        image.height
    );

    const sctx = source.getContext("2d",{
        willReadFrequently:true
    });

    sctx.drawImage(image,0,0);

    const roi = detectWhiteLabel(source);

    const crop = cropCanvas(source,roi);

    const enhanced = enhanceCanvas(crop);

    const regions = splitRegions(enhanced);

    const result = await recognizeRegions(regions);

    cleanupCanvas(source);
    cleanupCanvas(crop);
    cleanupCanvas(enhanced);

    return result;

}

/* -----------------------------
   載入圖片
------------------------------ */

function loadImage(file){

    return new Promise((resolve,reject)=>{

        const img = new Image();

        img.onload = ()=>resolve(img);

        img.onerror = reject;

        img.src = URL.createObjectURL(file);

    });

}

/* -----------------------------
   建立 Canvas
------------------------------ */

function createCanvas(w,h){

    const canvas = document.createElement("canvas");

    canvas.width = w;
    canvas.height = h;

    return canvas;

}

/* -----------------------------
   找白色標籤
------------------------------ */

function detectWhiteLabel(canvas){

    const ctx = canvas.getContext("2d",{
        willReadFrequently:true
    });

    const w = canvas.width;
    const h = canvas.height;

    const img = ctx.getImageData(0,0,w,h);

    const d = img.data;

    const startX = Math.floor(
        w*LABEL_CONFIG.searchX
    );

    const startY = Math.floor(
        h*LABEL_CONFIG.searchY
    );

    let minX = w;
    let minY = h;
    let maxX = 0;
    let maxY = 0;

    let pixels = 0;

    for(let y=startY;y<h;y++){

        for(let x=startX;x<w;x++){

            const i = (y*w+x)*4;

            const r=d[i];
            const g=d[i+1];
            const b=d[i+2];

            if(
                r>LABEL_CONFIG.minWhite &&
                g>LABEL_CONFIG.minWhite &&
                b>LABEL_CONFIG.minWhite
            ){

                pixels++;

                if(x<minX) minX=x;
                if(y<minY) minY=y;

                if(x>maxX) maxX=x;
                if(y>maxY) maxY=y;

            }

        }

    }

    if(pixels<600){

        return defaultROI(w,h);

    }

    const pad = 14;

    return {

        x: Math.max(0,minX-pad),

        y: Math.max(0,minY-pad),

        width: Math.min(
            w-(minX-pad),
            (maxX-minX)+pad*2
        ),

        height: Math.min(
            h-(minY-pad),
            (maxY-minY)+pad*2
        )

    };

}

/* -----------------------------
   找不到時備援
------------------------------ */

function defaultROI(w,h){

    return{

        x: Math.floor(w*0.60),

        y: Math.floor(h*0.58),

        width: Math.floor(w*0.32),

        height: Math.floor(h*0.22)

    };

}
/* ==========================================
   Photo Rename Robot V6.0
   imageProcessor.js
   Part B (171~340)
========================================== */

/* -----------------------------
   裁切白框
------------------------------ */

function cropCanvas(source, roi){

    const canvas = createCanvas(
        roi.width,
        roi.height
    );

    const ctx = canvas.getContext("2d");

    ctx.drawImage(
        source,
        roi.x,
        roi.y,
        roi.width,
        roi.height,
        0,
        0,
        roi.width,
        roi.height
    );

    return canvas;

}

/* -----------------------------
   白框增強
------------------------------ */

function enhanceCanvas(source){

    const scale = LABEL_CONFIG.scale;

    const canvas = createCanvas(
        source.width * scale,
        source.height * scale
    );

    const ctx = canvas.getContext("2d",{
        willReadFrequently:true
    });

    ctx.imageSmoothingEnabled = false;

    ctx.drawImage(
        source,
        0,
        0,
        canvas.width,
        canvas.height
    );

    grayscale(canvas);

    adaptiveThreshold(canvas);

    removeNoise(canvas);

    sharpen(canvas);

    return canvas;

}

/* -----------------------------
   灰階
------------------------------ */

function grayscale(canvas){

    const ctx = canvas.getContext("2d",{
        willReadFrequently:true
    });

    const img = ctx.getImageData(
        0,0,canvas.width,canvas.height
    );

    const d = img.data;

    for(let i=0;i<d.length;i+=4){

        const gray =
            d[i]*0.299 +
            d[i+1]*0.587 +
            d[i+2]*0.114;

        d[i]=gray;
        d[i+1]=gray;
        d[i+2]=gray;

    }

    ctx.putImageData(img,0,0);

}

/* -----------------------------
   Adaptive Threshold
------------------------------ */

function adaptiveThreshold(canvas){

    const ctx = canvas.getContext("2d",{
        willReadFrequently:true
    });

    const w = canvas.width;
    const h = canvas.height;

    const img = ctx.getImageData(0,0,w,h);

    const d = img.data;

    const block = 15;

    for(let y=0;y<h;y++){

        for(let x=0;x<w;x++){

            let sum=0;
            let count=0;

            for(let yy=-block;yy<=block;yy+=3){

                const py=y+yy;

                if(py<0 || py>=h) continue;

                for(let xx=-block;xx<=block;xx+=3){

                    const px=x+xx;

                    if(px<0 || px>=w) continue;

                    const idx=(py*w+px)*4;

                    sum+=d[idx];
                    count++;

                }

            }

            const avg=sum/count;

            const i=(y*w+x)*4;

            const value=d[i]>(avg+10)?255:0;

            d[i]=value;
            d[i+1]=value;
            d[i+2]=value;

        }

    }

    ctx.putImageData(img,0,0);

}

/* -----------------------------
   去雜點
------------------------------ */

function removeNoise(canvas){

    const ctx = canvas.getContext("2d",{
        willReadFrequently:true
    });

    const w=canvas.width;
    const h=canvas.height;

    const img=ctx.getImageData(0,0,w,h);

    const d=img.data;

    const copy=new Uint8ClampedArray(d);

    for(let y=1;y<h-1;y++){

        for(let x=1;x<w-1;x++){

            let black=0;

            for(let yy=-1;yy<=1;yy++){

                for(let xx=-1;xx<=1;xx++){

                    const idx=((y+yy)*w+(x+xx))*4;

                    if(copy[idx]===0) black++;

                }

            }

            const i=(y*w+x)*4;

            const value=black>=5?0:255;

            d[i]=value;
            d[i+1]=value;
            d[i+2]=value;

        }

    }

    ctx.putImageData(img,0,0);

}

/* -----------------------------
   銳利化
------------------------------ */

function sharpen(canvas){

    const ctx = canvas.getContext("2d",{
        willReadFrequently:true
    });

    ctx.filter="contrast(170%) brightness(105%)";

    const img=ctx.getImageData(
        0,0,canvas.width,canvas.height
    );

    ctx.putImageData(img,0,0);

    ctx.filter="none";

}

/* -----------------------------
   切成三行
------------------------------ */

function splitRegions(canvas){

    const w=canvas.width;
    const h=canvas.height;

    const top=Math.floor(h*0.05);

    const unitH=Math.floor(h*0.30);

    const locatorH=Math.floor(h*0.26);

    const assetH=Math.floor(h*0.26);

    return{

        unit: cropArea(
            canvas,
            0,
            top,
            w,
            unitH
        ),

        locator: cropArea(
            canvas,
            0,
            top+unitH,
            w,
            locatorH
        ),

        asset: cropArea(
            canvas,
            0,
            top+unitH+locatorH,
            w,
            assetH
        )

    };

}
/* ==========================================
   Photo Rename Robot V6.0
   imageProcessor.js
   Part C (341~End)
========================================== */

/* -----------------------------
   Crop Area
------------------------------ */

function cropArea(source,x,y,w,h){

    const canvas=createCanvas(w,h);

    const ctx=canvas.getContext("2d");

    ctx.drawImage(
        source,
        x,
        y,
        w,
        h,
        0,
        0,
        w,
        h
    );

    return canvas;

}

/* -----------------------------
   白框品質評估
------------------------------ */

function evaluateROI(canvas){

    const ctx=canvas.getContext("2d",{
        willReadFrequently:true
    });

    const img=ctx.getImageData(
        0,
        0,
        canvas.width,
        canvas.height
    );

    const d=img.data;

    let black=0;
    let white=0;

    for(let i=0;i<d.length;i+=4){

        if(d[i]<60){

            black++;

        }else if(d[i]>200){

            white++;

        }

    }

    const total=black+white;

    if(total===0) return 0;

    return Math.round(
        black/total*100
    );

}

/* -----------------------------
   自動增強
------------------------------ */

function enhanceIfNeeded(canvas){

    const score=evaluateROI(canvas);

    if(score>18){

        return canvas;

    }

    const ctx=canvas.getContext("2d",{
        willReadFrequently:true
    });

    const img=ctx.getImageData(
        0,
        0,
        canvas.width,
        canvas.height
    );

    const d=img.data;

    for(let i=0;i<d.length;i+=4){

        let v=d[i];

        v=(v-128)*1.6+128;

        v=Math.max(0,Math.min(255,v));

        d[i]=v;
        d[i+1]=v;
        d[i+2]=v;

    }

    ctx.putImageData(img,0,0);

    return canvas;

}

/* -----------------------------
   OCR 前整理
------------------------------ */

async function prepareRegions(regions){

    regions.unit=enhanceIfNeeded(
        regions.unit
    );

    regions.locator=enhanceIfNeeded(
        regions.locator
    );

    regions.asset=enhanceIfNeeded(
        regions.asset
    );

    return regions;

}

/* -----------------------------
   Debug（開發可開啟）
------------------------------ */

const DEBUG=false;

function showDebug(regions){

    if(!DEBUG) return;

    const wrap=document.createElement("div");

    wrap.style.position="fixed";
    wrap.style.right="10px";
    wrap.style.bottom="10px";
    wrap.style.background="#FFF";
    wrap.style.border="1px solid #CCC";
    wrap.style.padding="8px";
    wrap.style.zIndex="99999";

    [
        regions.unit,
        regions.locator,
        regions.asset
    ].forEach((canvas)=>{

        const img=new Image();

        img.src=canvas.toDataURL();

        img.style.width="180px";
        img.style.display="block";
        img.style.marginBottom="6px";

        wrap.appendChild(img);

    });

    document.body.appendChild(wrap);

}

/* -----------------------------
   Memory Cleanup
------------------------------ */

function cleanupCanvas(canvas){

    canvas.width=1;
    canvas.height=1;

}

/* -----------------------------
   覆寫 OCR Wrapper
------------------------------ */

async function processImage(file){

    const image=await loadImage(file);

    const source=createCanvas(
        image.width,
        image.height
    );

    const ctx=source.getContext("2d");

    ctx.drawImage(image,0,0);

    const roi=detectWhiteLabel(source);

    const crop=cropCanvas(source,roi);

    const enhanced=enhanceCanvas(crop);

    const regions=splitRegions(enhanced);

    await prepareRegions(regions);

    showDebug(regions);

    const result=
        await recognizeRegions(regions);

    cleanupCanvas(source);
    cleanupCanvas(crop);
    cleanupCanvas(enhanced);

    return result;

}
