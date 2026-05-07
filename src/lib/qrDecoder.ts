import { BrowserMultiFormatReader } from "@zxing/browser";

/**
 * Decodifica un QR a partir d'un fitxer d'imatge. Robust amb fotos de mòbil:
 *   1) Intent directe sobre la imatge tal qual.
 *   2) Si falla, prova versions pre-processades (downscale, grayscale + Otsu).
 *   3) Si encara falla, prova quadrants (per QRs que ocupen poc de la foto).
 *
 * Retorna el text desxifrat (la `checkin_url`) o null.
 */
export async function decodeQrFromFile(file: File): Promise<string | null> {
  const reader = new BrowserMultiFormatReader();
  const dataUrl = await fileToDataUrl(file);
  const img = await loadImage(dataUrl);

  const tryDecode = async (canvas: HTMLCanvasElement) => {
    try {
      const url = canvas.toDataURL("image/png");
      const result = await reader.decodeFromImageUrl(url);
      return result.getText();
    } catch {
      return null;
    }
  };

  // 1) Imatge sencera, downscale si massa gran
  const main = drawDownscaled(img, 1024);
  let text = await tryDecode(main);
  if (text) return text;

  // 2) Grayscale + threshold (Otsu simplificat)
  const bw = applyThreshold(main);
  text = await tryDecode(bw);
  if (text) return text;

  // 3) Quadrants — per QRs en una part petita de la foto
  const w = main.width, h = main.height;
  const quads: [number, number, number, number][] = [
    [0, 0, w / 2 + 50, h / 2 + 50],
    [w / 2 - 50, 0, w / 2 + 50, h / 2 + 50],
    [0, h / 2 - 50, w / 2 + 50, h / 2 + 50],
    [w / 2 - 50, h / 2 - 50, w / 2 + 50, h / 2 + 50],
  ];
  for (const [x, y, cw, ch] of quads) {
    const c = cropCanvas(main, x, y, cw, ch);
    text = await tryDecode(c);
    if (text) return text;
    const cBw = applyThreshold(c);
    text = await tryDecode(cBw);
    if (text) return text;
  }
  return null;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image_load_failed"));
    img.src = src;
  });
}

function drawDownscaled(img: HTMLImageElement, maxEdge: number): HTMLCanvasElement {
  const ratio = Math.min(1, maxEdge / Math.max(img.width, img.height));
  const w = Math.round(img.width * ratio);
  const h = Math.round(img.height * ratio);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, w, h);
  return canvas;
}

function cropCanvas(src: HTMLCanvasElement, x: number, y: number, w: number, h: number): HTMLCanvasElement {
  const cx = Math.max(0, Math.floor(x));
  const cy = Math.max(0, Math.floor(y));
  const cw = Math.min(src.width - cx, Math.floor(w));
  const ch = Math.min(src.height - cy, Math.floor(h));
  const out = document.createElement("canvas");
  out.width = cw;
  out.height = ch;
  out.getContext("2d")!.drawImage(src, cx, cy, cw, ch, 0, 0, cw, ch);
  return out;
}

function applyThreshold(src: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = src.getContext("2d")!;
  const img = ctx.getImageData(0, 0, src.width, src.height);
  const d = img.data;
  // Grayscale
  const gray = new Uint8Array(d.length / 4);
  for (let i = 0, j = 0; i < d.length; i += 4, j++) {
    gray[j] = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) | 0;
  }
  // Otsu threshold
  const hist = new Array(256).fill(0);
  for (let i = 0; i < gray.length; i++) hist[gray[i]]++;
  const total = gray.length;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0, wB = 0, max = 0, threshold = 127;
  for (let i = 0; i < 256; i++) {
    wB += hist[i];
    if (!wB) continue;
    const wF = total - wB;
    if (!wF) break;
    sumB += i * hist[i];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > max) { max = between; threshold = i; }
  }
  // Apply
  for (let i = 0, j = 0; i < d.length; i += 4, j++) {
    const v = gray[j] > threshold ? 255 : 0;
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  const out = document.createElement("canvas");
  out.width = src.width;
  out.height = src.height;
  out.getContext("2d")!.putImageData(img, 0, 0);
  return out;
}

/**
 * Si l'URL desxifrada conté un team_id (ex: ?team=ABC123 o /equip/ABC123),
 * l'extreu. Si no, retorna l'URL sencera per buscar a la BBDD.
 */
export function extractTeamIdFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const fromQuery = u.searchParams.get("team") || u.searchParams.get("teamId") || u.searchParams.get("id");
    if (fromQuery) return fromQuery;
    const m = u.pathname.match(/\/equip\/([^/?#]+)/);
    if (m) return m[1];
    return url;
  } catch {
    return url;
  }
}
