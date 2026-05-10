// composeMeme — canvas-based panda + face 合成（v4 — bbox crop + 等比例输出）
//
// 核心问题（用户多轮反馈解决）：
//   1. <img> 双 overlay 方案：face 白边 cover panda 黑廓
//   2. v1 white-mask：描边款 panda（透明脸区）face 完全消失
//   3. v2 face-mask "非暗-opaque"：face 撑满 faceOffset 矩形，旋转后漏角
//   4. v3 ellipse + dark-out：解决漏角，但 panda 在画布里"忽大忽小"，因为不同 panda PNG
//      包含不同程度的 whitespace padding，object-fit:contain 把 padding 算进去
//   5. v4 (本版本): bbox crop —— 检测 panda alpha>50 的 bbox，输出画布尺寸 = bbox 比例
//      panda 内容总是填满输出画布，不再"忽大忽小"；caption 在 DOM 里 flex 紧贴下方
//
// 渲染管线 v4:
//   a. detect panda content bbox in native PNG (alpha>50)
//   b. output canvas size = bbox 比例 缩放到 max=size
//   c. draw cropped panda (bbox region) → fills output canvas
//   d. faceOffset 350-coord → native pixel → cropped canvas pixel 三步换算
//   e. face into temp canvas at face position (with rotation/flip)
//   f. ellipse mask (constrains face to oval inside faceOffset)
//   g. destination-out + dark-opaque mask (preserves sunglasses/signs)
//   h. composite face onto cropped panda
//
// Contributed by PandaHead (https://pandahead.fun · github.com/jokkibtc/panda)

const _imgCache = new Map<string, Promise<HTMLImageElement>>();

export function loadImage(src: string): Promise<HTMLImageElement> {
  const hit = _imgCache.get(src);
  if (hit) return hit;
  const p = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      _imgCache.delete(src);
      reject(new Error(`loadImage fail: ${src}`));
    };
    img.src = src;
  });
  _imgCache.set(src, p);
  return p;
}

type Bbox = [number, number, number, number]; // [x1, y1, x2, y2]

const _bboxCache = new Map<string, Bbox>();

// 检测 panda PNG 内 alpha>50 像素的 bounding box（去除 whitespace padding）
// cache by src — 每个 panda 算一次（~50-200ms 取决于 native 分辨率）
function getPandaContentBbox(panda: HTMLImageElement): Bbox {
  const cached = _bboxCache.get(panda.src);
  if (cached) return cached;
  const W = panda.naturalWidth;
  const H = panda.naturalHeight;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('canvas 2d ctx unavailable');
  ctx.drawImage(panda, 0, 0);
  const data = ctx.getImageData(0, 0, W, H).data;
  let x1 = W;
  let y1 = H;
  let x2 = -1;
  let y2 = -1;
  for (let y = 0; y < H; y++) {
    const rowBase = y * W * 4;
    for (let x = 0; x < W; x++) {
      const a = data[rowBase + x * 4 + 3];
      if (a > 50) {
        if (x < x1) x1 = x;
        if (y < y1) y1 = y;
        if (x > x2) x2 = x;
        if (y > y2) y2 = y;
      }
    }
  }
  const bbox: Bbox =
    x2 < 0 ? [0, 0, W, H] : [x1, y1, x2 + 1, y2 + 1];
  _bboxCache.set(panda.src, bbox);
  return bbox;
}

const _darkMaskCache = new Map<string, HTMLCanvasElement>();

// panda 暗-opaque pixel mask in CROPPED canvas coordinates
// cache by src + crop bbox + output dimensions
// destination-out 用：从 face 减去这些像素，保留 panda 黑廓/墨镜/暗道具
function getPandaDarkMaskCropped(
  panda: HTMLImageElement,
  bbox: Bbox,
  Wout: number,
  Hout: number,
): HTMLCanvasElement {
  const key = `${panda.src}|${bbox.join(',')}|${Wout}x${Hout}`;
  const cached = _darkMaskCache.get(key);
  if (cached) return cached;
  const c = document.createElement('canvas');
  c.width = Wout;
  c.height = Hout;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('canvas 2d ctx unavailable');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  const [bx1, by1, bx2, by2] = bbox;
  ctx.drawImage(panda, bx1, by1, bx2 - bx1, by2 - by1, 0, 0, Wout, Hout);
  const data = ctx.getImageData(0, 0, Wout, Hout);
  const arr = data.data;
  for (let i = 0; i < arr.length; i += 4) {
    const r = arr[i];
    const g = arr[i + 1];
    const b = arr[i + 2];
    const a = arr[i + 3];
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;
    const isDarkOpaque = a > 200 && luma < 80;
    arr[i] = 0;
    arr[i + 1] = 0;
    arr[i + 2] = 0;
    arr[i + 3] = isDarkOpaque ? 255 : 0;
  }
  ctx.putImageData(data, 0, 0);
  _darkMaskCache.set(key, c);
  return c;
}

export interface ComposeOpts {
  panda: HTMLImageElement;
  face: HTMLImageElement;
  faceOffset: { x: number; y: number; w: number; h: number }; // 350-coord space (align_panda.py)
  rotation?: number; // degrees
  flipX?: boolean;
  size?: number; // max output dim (proportional output may be Wout=size, Hout<size 或反之)
}

export function composeMemeCanvas(opts: ComposeOpts): HTMLCanvasElement {
  const { panda, face, faceOffset, rotation = 0, flipX = false, size = 1024 } = opts;

  // 1. 检测 panda 实际内容 bbox（去 whitespace）
  const bbox = getPandaContentBbox(panda);
  const [bx1, by1, bx2, by2] = bbox;
  const BW = bx2 - bx1;
  const BH = by2 - by1;

  // 2. 输出画布：bbox 比例缩放到 max dim = size
  const outScale = Math.min(size / BW, size / BH);
  const Wout = Math.max(1, Math.round(BW * outScale));
  const Hout = Math.max(1, Math.round(BH * outScale));

  const main = document.createElement('canvas');
  main.width = Wout;
  main.height = Hout;
  const mctx = main.getContext('2d');
  if (!mctx) throw new Error('canvas 2d ctx unavailable');
  mctx.imageSmoothingEnabled = true;
  mctx.imageSmoothingQuality = 'high';

  // 3. 画 cropped panda — 覆盖整个输出画布
  mctx.drawImage(panda, bx1, by1, BW, BH, 0, 0, Wout, Hout);

  // 4. faceOffset 三步换算: 350-coord → native pixel → cropped canvas pixel
  //    align_panda.py: x_350 = native_x * scale_orig + pad_x_orig
  //    where scale_orig = min(350/NW, 350/NH), pad = letterbox padding
  //    反推 native: native_x = (x_350 - pad_x_orig) / scale_orig
  //    再到 cropped: crop_x = (native_x - bx1) * outScale
  const NW = panda.naturalWidth;
  const NH = panda.naturalHeight;
  const scaleOrig = Math.min(350 / NW, 350 / NH);
  const padXOrig = (350 - NW * scaleOrig) / 2;
  const padYOrig = (350 - NH * scaleOrig) / 2;

  const nfx1 = (faceOffset.x - padXOrig) / scaleOrig;
  const nfy1 = (faceOffset.y - padYOrig) / scaleOrig;
  const nfw = faceOffset.w / scaleOrig;
  const nfh = faceOffset.h / scaleOrig;

  const fox = (nfx1 - bx1) * outScale;
  const foy = (nfy1 - by1) * outScale;
  const fow = nfw * outScale;
  const foh = nfh * outScale;

  // 5. face 画到临时 canvas (rotation/flip 围绕 face 中心)
  const fc = document.createElement('canvas');
  fc.width = Wout;
  fc.height = Hout;
  const fctx = fc.getContext('2d');
  if (!fctx) throw new Error('canvas 2d ctx unavailable');
  fctx.imageSmoothingEnabled = true;
  fctx.imageSmoothingQuality = 'high';

  const FW = face.naturalWidth;
  const FH = face.naturalHeight;
  const faceScale = Math.min(fow / FW, foh / FH);
  const drawFw = FW * faceScale;
  const drawFh = FH * faceScale;

  fctx.save();
  fctx.translate(fox + fow / 2, foy + foh / 2);
  if (rotation) fctx.rotate((rotation * Math.PI) / 180);
  if (flipX) fctx.scale(-1, 1);
  fctx.drawImage(face, -drawFw / 2, -drawFh / 2, drawFw, drawFh);
  fctx.restore();

  // 6. 双 mask 裁 face：
  //    a) ellipse: face 限制在 faceOffset 椭圆内 — 防 rect 角漏出（rotation 时尤其重要）
  //    b) destination-out + dark mask: 减 panda 黑廓/墨镜/暗道具 — 保留它们盖在 face 上
  fctx.globalCompositeOperation = 'destination-in';
  fctx.beginPath();
  fctx.ellipse(fox + fow / 2, foy + foh / 2, fow / 2, foh / 2, 0, 0, Math.PI * 2);
  fctx.fillStyle = '#fff';
  fctx.fill();
  fctx.globalCompositeOperation = 'destination-out';
  const dmask = getPandaDarkMaskCropped(panda, bbox, Wout, Hout);
  fctx.drawImage(dmask, 0, 0);
  fctx.globalCompositeOperation = 'source-over';

  // 7. composite face onto cropped panda
  mctx.drawImage(fc, 0, 0);
  return main;
}

export interface ComposeMemeArgs {
  pandaSrc: string;
  faceSrc: string;
  faceOffset: { x: number; y: number; w: number; h: number };
  rotation?: number;
  flipX?: boolean;
  size?: number;
}

export async function composeMeme(args: ComposeMemeArgs): Promise<string> {
  const [panda, face] = await Promise.all([loadImage(args.pandaSrc), loadImage(args.faceSrc)]);
  const c = composeMemeCanvas({
    panda,
    face,
    faceOffset: args.faceOffset,
    rotation: args.rotation,
    flipX: args.flipX,
    size: args.size,
  });
  return c.toDataURL('image/png');
}

export async function composeMemeBlob(args: ComposeMemeArgs): Promise<Blob> {
  const [panda, face] = await Promise.all([loadImage(args.pandaSrc), loadImage(args.faceSrc)]);
  const c = composeMemeCanvas({
    panda,
    face,
    faceOffset: args.faceOffset,
    rotation: args.rotation,
    flipX: args.flipX,
    size: args.size,
  });
  return new Promise<Blob>((resolve, reject) => {
    c.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png');
  });
}
