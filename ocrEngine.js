/* ==========================================
   Photo Rename Robot V5.0
   ocrEngine.js
========================================== */

let workerReady = false;
let worker = null;

/* -----------------------------
   建立 OCR Worker
------------------------------ */

async function getWorker(){

    if(workerReady) return worker;

    worker = await Tesseract.createWorker("eng+chi_tra");

    workerReady = true;

    return worker;

}

/* -----------------------------
   三區辨識
------------------------------ */

async function recognizeRegions(regions){

    const w = await getWorker();

    /* 第一行：單位 */
    await w.setParameters({
        tessedit_pageseg_mode: 7,
        tessedit_char_whitelist:
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz輔大 "
    });

    const unitText = await canvasOCR(w,regions.unit);

    /* 第二行：5碼 */
    await w.setParameters({
        tessedit_pageseg_mode:7,
        tessedit_char_whitelist:
        "0123456789OISBQDl"
    });

    const locatorText = await canvasOCR(w,regions.locator);

    /* 第三行：6碼 */
    await w.setParameters({
        tessedit_pageseg_mode:7,
        tessedit_char_whitelist:
        "0123456789OISBQDl"
    });

    const assetText = await canvasOCR(w,regions.asset);

    /* 修正 */

    const unit = validateUnit(unitText);

    const locator = validateLocator(locatorText);

    const asset = validateAsset(assetText);

    const confidence = calculateConfidence(
        unit,
        locator,
        asset
    );

    return{

        unit,
        locator,
        asset,
        confidence

    };

}

/* -----------------------------
   Canvas OCR
------------------------------ */

async function canvasOCR(worker,canvas){

    const {data:{text}}
    = await worker.recognize(canvas);

    return text
        .replace(/\n/g,"")
        .replace(/\s/g,"")
        .trim();

}

/* -----------------------------
   信心值
------------------------------ */

function calculateConfidence(
    unit,
    locator,
    asset
){

    let score = 100;

    if(unit==="未知單位") score-=20;

    if(locator.length!==5) score-=30;

    if(asset.length!==6) score-=30;

    if(!/^輔大/.test(unit)) score-=15;

    score=Math.max(0,score);

    return score;

}

/* -----------------------------
   Debug（開發用）
------------------------------ */

async function previewOCR(canvas){

    const w = await getWorker();

    const result =
    await w.recognize(canvas);

    console.log(result.data.text);

    return result.data.text;

}