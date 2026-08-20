/* ==========================================
   Photo Rename Robot V5.1
   imageProcessor.js
   Part 4A / 3
========================================== */

let cvReady = false;

/* -----------------------------
   初始化 OpenCV
------------------------------ */

async function initOpenCV(){

    if(cvReady) return;

    return new Promise((resolve)=>{

        if(window.cv){

            cv["onRuntimeInitialized"]=()=>{

                cvReady=true;
                resolve();

            };

        }else{

            const script=document.createElement("script");

            script.src="https://docs.opencv.org/4.x/opencv.js";

            script.async=true;

            script.onload=()=>{

                cv["onRuntimeInitialized"]=()=>{

                    cvReady=true;
                    resolve();

                };

            };

            document.body.appendChild(script);

        }

    });

}

/* -----------------------------
   主流程
------------------------------ */

async function processImage(file){

    await initOpenCV();

    const img=await loadImage(file);

    const srcCanvas=document.createElement("canvas");
    const ctx=srcCanvas.getContext("2d");

    srcCanvas.width=img.width;
    srcCanvas.height=img.height;

    ctx.drawImage(img,0,0);

    // 找白框
    const roi=findWhiteLabel(srcCanvas);

    // 裁切
    const crop=cropCanvas(srcCanvas,roi);

    // 下一段會做前處理
    const clean=preprocessROI(crop);

    // 切三行
    const regions=splitRegions(clean);

    // OCR
    const result=await recognizeRegions(regions);

    return result;

}

/* -----------------------------
   載入圖片
------------------------------ */

function loadImage(file){

    return new Promise(resolve=>{

        const img=new Image();

        img.onload=()=>resolve(img);

        img.src=URL.createObjectURL(file);

    });

}

/* -----------------------------
   OpenCV 找白色標籤
------------------------------ */

function findWhiteLabel(canvas){

    const src=cv.imread(canvas);

    const gray=new cv.Mat();

    const blur=new cv.Mat();

    const binary=new cv.Mat();

    cv.cvtColor(src,gray,cv.COLOR_RGBA2GRAY);

    cv.GaussianBlur(
        gray,
        blur,
        new cv.Size(5,5),
        0
    );

    cv.threshold(
        blur,
        binary,
        210,
        255,
        cv.THRESH_BINARY
    );

    const contours=new cv.MatVector();
    const hierarchy=new cv.Mat();

    cv.findContours(
        binary,
        contours,
        hierarchy,
        cv.RETR_EXTERNAL,
        cv.CHAIN_APPROX_SIMPLE
    );

    let best=null;
    let bestArea=0;

    for(let i=0;i<contours.size();i++){

        const cnt=contours.get(i);

        const rect=cv.boundingRect(cnt);

        const area=rect.width*rect.height;

        const ratio=rect.width/rect.height;

        // 白框條件
        if(
            area>15000 &&
            ratio>1.8 &&
            ratio<6
        ){

            // 偏右下
            if(
                rect.x>canvas.width*0.35 &&
                rect.y>canvas.height*0.25
            ){

                if(area>bestArea){

                    bestArea=area;
                    best=rect;

                }

            }

        }

    }

    src.delete();
    gray.delete();
    blur.delete();
    binary.delete();
    contours.delete();
    hierarchy.delete();

    if(best){

        return{

            x:Math.max(best.x-8,0),

            y:Math.max(best.y-8,0),

            width:Math.min(best.width+16,canvas.width),

            height:Math.min(best.height+16,canvas.height)

        };

    }

    // 找不到時備援
    return{

        x:canvas.width*0.58,

        y:canvas.height*0.56,

        width:canvas.width*0.34,

        height:canvas.height*0.22

    };

}

/* -----------------------------
   Crop ROI
------------------------------ */

function cropCanvas(canvas,roi){

    const c=document.createElement("canvas");
    const ctx=c.getContext("2d");

    c.width=roi.width;
    c.height=roi.height;

    ctx.drawImage(
        canvas,
        roi.x,
        roi.y,
        roi.width,
        roi.height,
        0,
        0,
        roi.width,
        roi.height
    );

    return c;

}
/* ==========================================
   Part 4B (Line 181~350)
========================================== */

/* -----------------------------
   白框前處理
------------------------------ */

function preprocessROI(canvas){

    const src = cv.imread(canvas);

    const gray = new cv.Mat();
    const binary = new cv.Mat();
    const opened = new cv.Mat();

    // 灰階
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

    // 自適應二值化（比固定 threshold 更穩）
    cv.adaptiveThreshold(
        gray,
        binary,
        255,
        cv.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv.THRESH_BINARY,
        31,
        8
    );

    // 去除小雜訊
    const kernel = cv.getStructuringElement(
        cv.MORPH_RECT,
        new cv.Size(2,2)
    );

    cv.morphologyEx(
        binary,
        opened,
        cv.MORPH_OPEN,
        kernel
    );

    // Deskew
    const corrected = deskew(opened);

    // 放大 4 倍
    const enlarged = enlarge(corrected,4);

    src.delete();
    gray.delete();
    binary.delete();
    opened.delete();
    corrected.delete();
    kernel.delete();

    return enlarged;

}

/* -----------------------------
   Deskew
------------------------------ */

function deskew(mat){

    const points = new cv.Mat();
    cv.findNonZero(mat,points);

    if(points.rows < 10){

        points.delete();
        return mat.clone();

    }

    const box = cv.minAreaRect(points);

    let angle = box.angle;

    if(angle < -45){
        angle += 90;
    }

    const center = new cv.Point(
        mat.cols/2,
        mat.rows/2
    );

    const M = cv.getRotationMatrix2D(
        center,
        angle,
        1
    );

    const rotated = new cv.Mat();

    cv.warpAffine(
        mat,
        rotated,
        M,
        new cv.Size(mat.cols,mat.rows),
        cv.INTER_LINEAR,
        cv.BORDER_CONSTANT,
        new cv.Scalar(255,255,255)
    );

    points.delete();
    M.delete();

    return rotated;

}

/* -----------------------------
   放大
------------------------------ */

function enlarge(mat,scale){

    const dst = new cv.Mat();

    cv.resize(
        mat,
        dst,
        new cv.Size(
            mat.cols*scale,
            mat.rows*scale
        ),
        0,
        0,
        cv.INTER_CUBIC
    );

    return dst;

}

/* -----------------------------
   OpenCV → Canvas
------------------------------ */

function matToCanvas(mat){

    const canvas = document.createElement("canvas");

    canvas.width = mat.cols;
    canvas.height = mat.rows;

    cv.imshow(canvas,mat);

    return canvas;

}

/* -----------------------------
   三行切割
------------------------------ */

function splitRegions(mat){

    const canvas = matToCanvas(mat);

    const w = canvas.width;
    const h = canvas.height;

    const top = Math.floor(h*0.06);

    const unitHeight = Math.floor(h*0.30);

    const locatorHeight = Math.floor(h*0.26);

    const assetHeight = Math.floor(h*0.26);

    return{

        unit: cropArea(
            canvas,
            0,
            top,
            w,
            unitHeight
        ),

        locator: cropArea(
            canvas,
            0,
            top+unitHeight,
            w,
            locatorHeight
        ),

        asset: cropArea(
            canvas,
            0,
            top+unitHeight+locatorHeight,
            w,
            assetHeight
        )

    };

}
/* ==========================================
   Part 4C (Line 351~End)
========================================== */

/* -----------------------------
   Crop Canvas
------------------------------ */

function cropArea(canvas,x,y,w,h){

    const c=document.createElement("canvas");
    const ctx=c.getContext("2d");

    c.width=w;
    c.height=h;

    ctx.drawImage(
        canvas,
        x,
        y,
        w,
        h,
        0,
        0,
        w,
        h
    );

    return c;

}

/* -----------------------------
   白框品質評估
------------------------------ */

function evaluateROI(canvas){

    const ctx=canvas.getContext("2d");

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

    if(score>18) return canvas;

    const ctx=canvas.getContext("2d");

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
   Debug
------------------------------ */

function debugPreview(regions){

    const wrap=document.createElement("div");

    wrap.style.position="fixed";
    wrap.style.right="10px";
    wrap.style.bottom="10px";
    wrap.style.background="#fff";
    wrap.style.padding="8px";
    wrap.style.zIndex="9999";

    [regions.unit,regions.locator,regions.asset]
    .forEach(c=>{

        const img=new Image();

        img.src=c.toDataURL();

        img.style.width="180px";
        img.style.display="block";
        img.style.marginBottom="6px";

        wrap.appendChild(img);

    });

    document.body.appendChild(wrap);

}

/* -----------------------------
   OCR 前最後整理
------------------------------ */

async function prepareOCR(canvas){

    const better=enhanceIfNeeded(canvas);

    return better;

}

/* -----------------------------
   記憶體釋放
------------------------------ */

function releaseCanvas(canvas){

    canvas.width=1;
    canvas.height=1;

}

/* -----------------------------
   最終 OCR Wrapper
------------------------------ */

async function processRegions(regions){

    regions.unit=await prepareOCR(regions.unit);

    regions.locator=await prepareOCR(regions.locator);

    regions.asset=await prepareOCR(regions.asset);

    return await recognizeRegions(regions);

}

/* -----------------------------
   覆寫主流程
------------------------------ */

async function processImage(file){

    await initOpenCV();

    const img=await loadImage(file);

    const src=document.createElement("canvas");
    const ctx=src.getContext("2d");

    src.width=img.width;
    src.height=img.height;

    ctx.drawImage(img,0,0);

    const roi=findWhiteLabel(src);

    const crop=cropCanvas(src,roi);

    const clean=preprocessROI(crop);

    const regions=splitRegions(clean);

    const result=await processRegions(regions);

    releaseCanvas(src);
    releaseCanvas(crop);

    return result;

}
