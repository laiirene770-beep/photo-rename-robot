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

    const unitRaw = await readCanvas(
        regions.unit,
        "輔大ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    );

    const locatorRaw = await readCanvas(
        regions.locator,
        "0123456789OISBQDl"
    );

    const assetRaw = await readCanvas(
        regions.asset,
        "0123456789OISBQDl"
    );

    const unit = validateUnit(unitRaw);
    const locator = validateLocator(locatorRaw);
    const asset = validateAsset(assetRaw);

    return{
        unit,
        locator,
        asset,
        confidence:95
    };

}
