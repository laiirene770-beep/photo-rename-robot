/* ocrEngine.js V5.2 */

let worker = null;

async function getWorker() {

  if (worker) return worker;

  worker = await Tesseract.createWorker("chi_tra+eng");

  await worker.setParameters({
    tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
    preserve_interword_spaces: "1"
  });

  return worker;
}

async function canvasOCR(w, canvas, whitelist) {

  await w.setParameters({
    tessedit_char_whitelist: whitelist
  });

  const { data } = await w.recognize(canvas);

  return data.text.replace(/\s/g, "");
}

async function recognizeRegions(regions) {

  const w = await getWorker();

  const unit = validateUnit(
    await canvasOCR(
      w,
      regions.unit,
      "輔大ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
    )
  );

  const locator = validateLocator(
    await canvasOCR(
      w,
      regions.locator,
      "0123456789OISBQDl"
    )
  );

  const asset = validateAsset(
    await canvasOCR(
      w,
      regions.asset,
      "0123456789OISBQDl"
    )
  );

  return {
    unit,
    locator,
    asset,
    confidence: 98
  };
}
