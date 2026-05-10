// composeMeme — canvas-based panda + face 合成
// 解决 <img> overlay 方案的两个核心问题：
//   1. face PNG 白色 padding cover panda 黑廓
//   2. face 内容超出 panda 头白色区（墨镜/嘴巴/边缘）
//
// 方法：从 panda PNG 实时算白色像素 mask，把 face 用 destination-in 裁到 mask 内
// 移植自 PandaHead drawFaceLayer + getShellWhiteMask（panda.jsx:152-214）
// pmw 单 PNG-per-panda 模型适配版 — 不需要预生成 shell-mask + shell-pmask
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

// object-fit: contain 等价计算 — panda PNG 缩放后塞 size x size box
function containFit(W: number, H: number, target: number) {
  const scale = Math.min(target / W, target / H);
  const drawW = W * scale;
  const drawH = H * scale;
  return { x: (target - drawW) / 2, y: (target - drawH) / 2, w: drawW, h: drawH, scale };
}

const _darkMaskCache = new Map<string, HTMLCanvasElement>();

// panda 暗-opaque pixel mask（cache by src + size）
// 用 destination-out 从 face 减去这些像素：保留 panda 的黑廓/墨镜/暗道具
// 不再单独识别"face 区"——face 区由 faceOffset 椭圆 mask 决定（drawFaceLayer 内）
function getPandaDarkMask(panda: HTMLImageElement, size: number): HTMLCanvasElement {
  const key = `${panda.src}|${size}`;
  const cached = _darkMaskCache.get(key);
  if (cached) return cached;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('canvas 2d ctx unavailable');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  const fit = containFit(panda.naturalWidth, panda.naturalHeight, size);
  ctx.drawImage(panda, fit.x, fit.y, fit.w, fit.h);
  const data = ctx.getImageData(0, 0, size, size);
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
  size?: number; // output canvas side length, default 350 (display) — 1024 for export quality
}

export function composeMemeCanvas(opts: ComposeOpts): HTMLCanvasElement {
  const { panda, face, faceOffset, rotation = 0, flipX = false, size = 350 } = opts;
  const k = size / 350; // faceOffset 是 350-coord，scale 到 size

  const main = document.createElement('canvas');
  main.width = size;
  main.height = size;
  const mctx = main.getContext('2d');
  if (!mctx) throw new Error('canvas 2d ctx unavailable');
  mctx.imageSmoothingEnabled = true;
  mctx.imageSmoothingQuality = 'high';

  // 1. panda — object-fit: contain 到 size x size
  const fit = containFit(panda.naturalWidth, panda.naturalHeight, size);
  mctx.drawImage(panda, fit.x, fit.y, fit.w, fit.h);

  // 2. face 画到临时 canvas，position 用 faceOffset
  const fc = document.createElement('canvas');
  fc.width = size;
  fc.height = size;
  const fctx = fc.getContext('2d');
  if (!fctx) throw new Error('canvas 2d ctx unavailable');
  fctx.imageSmoothingEnabled = true;
  fctx.imageSmoothingQuality = 'high';

  const fox = faceOffset.x * k;
  const foy = faceOffset.y * k;
  const fow = faceOffset.w * k;
  const foh = faceOffset.h * k;

  // face object-fit: contain 进 fow x foh box
  const faceScale = Math.min(fow / face.naturalWidth, foh / face.naturalHeight);
  const drawFw = face.naturalWidth * faceScale;
  const drawFh = face.naturalHeight * faceScale;

  fctx.save();
  fctx.translate(fox + fow / 2, foy + foh / 2);
  if (rotation) fctx.rotate((rotation * Math.PI) / 180);
  if (flipX) fctx.scale(-1, 1);
  fctx.drawImage(face, -drawFw / 2, -drawFh / 2, drawFw, drawFh);
  fctx.restore();

  // 3. 双 mask 裁 face（v3，仿 PandaHead 的双 mask clip）：
  //    a) ellipse mask: face 限制在 faceOffset 内的椭圆形 — 防止矩形 face 在 panda 头廓外漏角
  //       （rotation 时尤其重要，旋转后矩形角会突出到头外）
  //    b) panda 暗-opaque 减法: 减去 panda 黑廓/墨镜/暗道具 — 保留 sunglasses, signs, props
  //    不再用"识别 face area"的 hack — face area 由 faceOffset 椭圆显式定义
  fctx.globalCompositeOperation = 'destination-in';
  fctx.beginPath();
  fctx.ellipse(fox + fow / 2, foy + foh / 2, fow / 2, foh / 2, 0, 0, Math.PI * 2);
  fctx.fillStyle = '#fff';
  fctx.fill();
  // 减 panda 暗 opaque 像素 — sunglasses / 牌子 / 黑物体 保留 panda 原色
  fctx.globalCompositeOperation = 'destination-out';
  const dmask = getPandaDarkMask(panda, size);
  fctx.drawImage(dmask, 0, 0);
  fctx.globalCompositeOperation = 'source-over';

  // 4. composite face 层到 main
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
