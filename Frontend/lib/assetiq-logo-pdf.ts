/** Public path to Assetiq brand logo (SVG). */
export const ASSETIQ_LOGO_SVG_PATH = "/asset-iq-logo.svg";

/**
 * Loads the Assetiq SVG from the same origin and rasterizes it to a PNG data URL
 * so @react-pdf/renderer `Image` can embed it (PNG/JPEG only).
 */
export async function getAssetiqLogoPngDataUrl(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const res = await fetch(`${window.location.origin}${ASSETIQ_LOGO_SVG_PATH}`);
    if (!res.ok) return null;
    const svgText = await res.text();
    const objectUrl = URL.createObjectURL(
      new Blob([svgText], { type: "image/svg+xml;charset=utf-8" })
    );
    const img = new window.Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Assetiq logo failed to load"));
      img.src = objectUrl;
    });
    const w = img.naturalWidth || 225;
    const h = img.naturalHeight || 45;
    const scale = 3;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      URL.revokeObjectURL(objectUrl);
      return null;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(objectUrl);
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}
