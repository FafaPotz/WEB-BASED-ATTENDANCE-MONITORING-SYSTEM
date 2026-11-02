import jsQR from 'jsqr';
import { Html5Qrcode } from 'html5-qrcode';

/**
 * Extracts and cleans a student identifier from raw decoded QR text.
 * Handles raw student codes (e.g. SITE01), JSON payloads ({"student_code":"SITE01"}),
 * URLs with query params (https://...?code=SITE01), or prefixes (code:SITE01).
 */
export function extractStudentCode(rawText: string): string {
  if (!rawText) return '';
  const trimmed = rawText.trim();

  // 1. Try parsing JSON format: { "student_code": "SITE01" } or { "code": "SITE01" }
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const obj = JSON.parse(trimmed);
      const code = obj.student_code || obj.studentCode || obj.code || obj.id || obj.nfc_id;
      if (code) return String(code).trim().toUpperCase();
    } catch {
      // not JSON
    }
  }

  // 2. Try parsing URL format: https://domain.edu/pass?code=SITE01
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const url = new URL(trimmed);
      const codeParam = url.searchParams.get('code') || 
                        url.searchParams.get('student_code') || 
                        url.searchParams.get('studentCode') || 
                        url.searchParams.get('id');
      if (codeParam) return codeParam.trim().toUpperCase();

      // Check URL pathname (e.g. /pass/SITE01)
      const pathSegments = url.pathname.split('/').filter(Boolean);
      const last = pathSegments[pathSegments.length - 1];
      if (last && /^[A-Za-z0-9_-]+$/.test(last)) {
        return last.toUpperCase();
      }
    } catch {
      // not URL
    }
  }

  // 3. Check for prefixes like "code:", "student:", "id:"
  if (trimmed.toLowerCase().startsWith('code:')) {
    return trimmed.substring(5).trim().toUpperCase();
  }
  if (trimmed.toLowerCase().startsWith('student:')) {
    return trimmed.substring(8).trim().toUpperCase();
  }
  if (trimmed.toLowerCase().startsWith('student_code:')) {
    return trimmed.substring(13).trim().toUpperCase();
  }

  // 4. Return trimmed uppercase string
  return trimmed.toUpperCase();
}

/**
 * High-performance, multi-strategy QR code decoder from an image File or Blob.
 * 1) Loads file into HTMLImageElement.
 * 2) Tests jsQR at 1:1 original resolution.
 * 3) If not found, downsamples high-resolution photos (800px, 600px, 400px) and tests jsQR.
 * 4) If not found, applies luminance contrast thresholding to decode colored QRs (e.g. emerald green).
 * 5) Fallback to Html5Qrcode with offscreen DOM node.
 */
export async function decodeQRCodeFromImage(file: File | Blob): Promise<string> {
  // Step 1: Read image data URL
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });

  // Step 2: Load into HTML Image
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not render image file'));
    image.src = dataUrl;
  });

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Canvas 2D context unavailable in browser');
  }

  const origWidth = img.naturalWidth || img.width;
  const origHeight = img.naturalHeight || img.height;

  if (origWidth === 0 || origHeight === 0) {
    throw new Error('Invalid image dimensions');
  }

  // Strategy 1: jsQR at 1:1 native resolution
  canvas.width = origWidth;
  canvas.height = origHeight;
  ctx.drawImage(img, 0, 0, origWidth, origHeight);
  let imgData = ctx.getImageData(0, 0, origWidth, origHeight);
  let result = jsQR(imgData.data, origWidth, origHeight, { inversionAttempts: 'attemptBoth' });
  if (result && result.data) {
    return extractStudentCode(result.data);
  }

  // Strategy 2: If image is large (>800px) or phone photo, test scaled dimensions
  const scaleDims = [800, 600, 450, 320];
  for (const maxDim of scaleDims) {
    if (origWidth > maxDim || origHeight > maxDim) {
      const scale = Math.min(maxDim / origWidth, maxDim / origHeight);
      const w = Math.round(origWidth * scale);
      const h = Math.round(origHeight * scale);
      canvas.width = w;
      canvas.height = h;
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      imgData = ctx.getImageData(0, 0, w, h);
      result = jsQR(imgData.data, w, h, { inversionAttempts: 'attemptBoth' });
      if (result && result.data) {
        return extractStudentCode(result.data);
      }
    }
  }

  // Strategy 3: Binarize image (convert emerald green or colored QR to black/white)
  const binarizeDim = Math.min(origWidth, 640);
  const bScale = binarizeDim / origWidth;
  const bW = Math.round(origWidth * bScale);
  const bH = Math.round(origHeight * bScale);
  canvas.width = bW;
  canvas.height = bH;
  ctx.drawImage(img, 0, 0, bW, bH);
  imgData = ctx.getImageData(0, 0, bW, bH);
  const pixels = imgData.data;

  // Try two threshold levels: 140 and 180
  for (const threshold of [140, 180]) {
    for (let i = 0; i < pixels.length; i += 4) {
      // Luminance: 0.299*R + 0.587*G + 0.114*B
      const lum = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
      const val = lum < threshold ? 0 : 255;
      pixels[i] = val;
      pixels[i + 1] = val;
      pixels[i + 2] = val;
    }
    ctx.putImageData(imgData, 0, 0);
    result = jsQR(pixels, bW, bH, { inversionAttempts: 'attemptBoth' });
    if (result && result.data) {
      return extractStudentCode(result.data);
    }
  }

  // Strategy 4: Fallback to Html5Qrcode.scanFile with offscreen container
  try {
    const offscreenId = `offscreen-qr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const offscreenDiv = document.createElement('div');
    offscreenDiv.id = offscreenId;
    offscreenDiv.style.position = 'fixed';
    offscreenDiv.style.left = '-9999px';
    offscreenDiv.style.top = '-9999px';
    offscreenDiv.style.width = '350px';
    offscreenDiv.style.height = '350px';
    offscreenDiv.style.visibility = 'hidden';
    document.body.appendChild(offscreenDiv);

    try {
      const html5Scanner = new Html5Qrcode(offscreenId);
      const scanRes = await html5Scanner.scanFile(file as File, false);
      try {
        await html5Scanner.clear();
      } catch {}
      if (scanRes) {
        return extractStudentCode(scanRes);
      }
    } finally {
      offscreenDiv.remove();
    }
  } catch {
    // Html5Qrcode fallback also did not find QR
  }

  throw new Error('No QR code detected in the uploaded image. Please ensure the QR code is clearly visible.');
}
