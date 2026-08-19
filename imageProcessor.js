
export async function extractLabel(image) {
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0);

  // 只掃描右下角區域
  const sx = Math.floor(image.width * 0.45);
  const sy = Math.floor(image.height * 0.35);
  const sw = image.width - sx;
  const sh = image.height - sy;

  const out = document.createElement("canvas");
  out.width = sw * 2;
  out.height = sh * 2;

  out.getContext("2d").drawImage(
    canvas,
    sx, sy, sw, sh,
    0, 0, out.width, out.height
  );

  return out;
}