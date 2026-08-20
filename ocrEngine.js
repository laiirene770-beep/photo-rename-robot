/* =====================================
   Photo Rename Robot V6 Stable
   ocrEngine.js
===================================== */

let worker = null;

async function getWorker(){

    if(worker) return worker;

    worker = await Tesseract.createWorker("chi_tra+eng");

    return worker;

}

/* OCR */

async function readCanvas(canvas, whitelist){

    const w = await getWorker();

    await w.setParameters({
        tessedit_pageseg_mode: "7",
        tessedit_char_whitelist: whitelist,
        preserve_interword_spaces: "0"
    });

    const { data } = await w.recognize(canvas);

    return data.text.replace(/\s/g,"").trim();

}

/* 三行 */

async function recognizeRegions(regions){

    // 第一行：仍使用 OCR
    const unitRaw = await readCanvas(
        regions.unit,
        "輔大ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    );

    const unit = validateUnit(unitRaw);

    // 第二行：5碼改用模板辨識
    const locator = validateLocator(
        recognizeFiveDigits(regions.locator)
    );

    // 第三行：6碼改用模板辨識
    const asset = validateAsset(
        recognizeSixDigits(regions.asset)
    );

    return {
        unit,
        locator,
        asset,
        confidence: 98
    };

}
