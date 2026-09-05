/** Resize/compress images client-side before upload to avoid payload limits. */
export async function fileToUploadDataUrl(file: File, maxWidth = 1600, quality = 0.85): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Not an image file");
  }
  if (file.size <= 800_000) {
    return readFileAsDataUrl(file);
  }
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxWidth / bitmap.width);
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return readFileAsDataUrl(file);
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const mime = file.type === "image/png" ? "image/png" : "image/jpeg";
  return canvas.toDataURL(mime, quality);
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}
