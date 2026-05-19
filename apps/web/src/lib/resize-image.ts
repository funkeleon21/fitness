// Skaliert ein Bild im Browser auf maximal `maxDimension` Pixel an der laengsten
// Seite und gibt eine JPEG-Data-URL zurueck. Wird vor dem Upload an Vision-LLMs
// genutzt — verkleinert die Payload und beschleunigt den Inference-Call deutlich,
// ohne dass Naehrwert-Tabellen unleserlich werden.
export async function resizeImageFile(file: File, maxDimension = 1024): Promise<string> {
  const bitmap = await createImageBitmap(file);
  try {
    const { width, height } = bitmap;
    const scale = Math.min(1, maxDimension / Math.max(width, height));
    const targetW = Math.round(width * scale);
    const targetH = Math.round(height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas-Kontext nicht verfuegbar');
    ctx.drawImage(bitmap, 0, 0, targetW, targetH);
    return canvas.toDataURL('image/jpeg', 0.85);
  } finally {
    bitmap.close();
  }
}
