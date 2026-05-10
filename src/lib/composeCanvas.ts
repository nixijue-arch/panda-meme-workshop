// composeCanvas — 直接 port PandaHead 自家 panda.jsx 三层合成 logic
// 解决 pmw <img> overlay 渲染的核心问题：face PNG 白边 cover panda 黑廓 + 杂质边缘
//
// 三层（user 一句话精准）："shell 始终是顶部图层，face 在下一图层（会被 panda 黑廓覆盖部分细节）"
//
// 算法：
//   layer 0 (底): face（带 transform: rotate + flip）
//   layer 1 (中): panda body 处理过 — 白色 / 浅灰 alpha=0 → face 透出 panda 白脸区
//                                       黑色 / 装饰物保留 → cover face padding / 装饰物在 face 之上
//   layer 2 (顶): caption text

const _processedPandaCache = new Map<string, HTMLCanvasElement>();
const _imageCache = new Map<string, HTMLImageElement>();

export function loadImage(src: string): Promise<HTMLImageElement> {
  const cached = _imageCache.get(src);
  if (cached) return Promise.resolve(cached);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => { _imageCache.set(src, img); resolve(img); };
    img.onerror = () => reject(new Error(`load fail: ${src}`));
    img.src = src;
  });
}

/**
 * 处理 panda body PNG: 白色 / 浅灰 → alpha=0，黑色 / 装饰物保留
 * 借鉴 PandaHead 自家 shellEdgeToAlpha：
 *   - luma >= 200 (白色 / 浅灰)：alpha=0
 *   - luma < 200 + isGray：黑色边缘 alpha gradient (anti-aliasing 软化)
 *   - 彩色像素（装饰物）：保留原色
 */
export function getProcessedPanda(img: HTMLImageElement, W: number, H: number): HTMLCanvasElement {
  const key = img.src + '|' + W + 'x' + H;
  const cached = _processedPandaCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, W, H);

  const data = ctx.getImageData(0, 0, W, H);
  const arr = data.data;
  for (let i = 0; i < arr.length; i += 4) {
    if (arr[i + 3] === 0) continue;
    const r = arr[i], g = arr[i + 1], b = arr[i + 2];
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;
    const maxC = Math.max(r, g, b);
    const minC = Math.min(r, g, b);
    const isGray = maxC - minC < 30;

    if (luma >= 220) {
      // 白色 / 浅色：alpha=0 让 face 透出
      arr[i + 3] = 0;
    } else if (isGray && luma < 200) {
      // 灰黑色边缘：anti-aliasing 软化（黑实白透 gradient）
      arr[i] = 0; arr[i + 1] = 0; arr[i + 2] = 0;
      arr[i + 3] = Math.min(255, Math.round(255 - luma * 0.85));
    }
    // 彩色像素 / 中间灰阶 保留
  }
  ctx.putImageData(data, 0, 0);

  _processedPandaCache.set(key, canvas);
  return canvas;
}

export interface ComposeArgs {
  canvas: HTMLCanvasElement;
  pandaImg: HTMLImageElement;
  faceImg: HTMLImageElement;
  faceOffset: { x: number; y: number; w: number; h: number };
  faceRotation?: number;
  faceFlipX?: boolean;
  text?: string;
  fontStack?: string;
  /** panda body render 在 canvas 内的 size，默认 350×350 */
  size?: number;
  /** 整 canvas 高度（panda + caption），默认 panda + 100 */
  totalHeight?: number;
}

/**
 * 三层合成到目标 canvas
 */
export function compose(args: ComposeArgs) {
  const {
    canvas, pandaImg, faceImg, faceOffset,
    faceRotation = 0, faceFlipX = false,
    text = '', fontStack = '"Noto Sans SC", system-ui, sans-serif',
    size = 350, totalHeight,
  } = args;

  const W = size;
  const H = size;
  const captionH = text ? Math.floor(W * 0.22) : 0;
  const totalH = totalHeight ?? (H + captionH);

  canvas.width = W;
  canvas.height = totalH;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // 白底
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, W, totalH);

  // === Layer 0: face (底) ===
  const fx = faceOffset.x;
  const fy = faceOffset.y;
  const fw = faceOffset.w;
  const fh = faceOffset.h;
  ctx.save();
  // 在 face 中心做 transform
  ctx.translate(fx + fw / 2, fy + fh / 2);
  if (faceRotation) ctx.rotate((faceRotation * Math.PI) / 180);
  if (faceFlipX) ctx.scale(-1, 1);
  ctx.drawImage(faceImg, -fw / 2, -fh / 2, fw, fh);
  ctx.restore();

  // === Layer 1: 处理过的 panda 在 face 之上 ===
  // (白色 alpha=0 让 face 透出，黑色 / 装饰物保留 cover face)
  const processedPanda = getProcessedPanda(pandaImg, W, H);
  ctx.drawImage(processedPanda, 0, 0, W, H);

  // === Layer 2: caption ===
  if (text && captionH > 0) {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, H, W, captionH);
    let fs = Math.floor(captionH * 0.55);
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // 自动缩字
    let lines = wrapText(ctx, text, W * 0.92, fs, fontStack);
    while (lines.length * fs * 1.25 > captionH * 0.95 && fs > 14) {
      fs = Math.floor(fs * 0.88);
      lines = wrapText(ctx, text, W * 0.92, fs, fontStack);
    }
    ctx.font = `700 ${fs}px ${fontStack}`;
    const lineH = fs * 1.2;
    const startY = H + (captionH - lineH * lines.length) / 2 + lineH / 2;
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], W / 2, startY + i * lineH);
    }
  }
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  fontSize: number,
  fontStack: string
): string[] {
  ctx.font = `700 ${fontSize}px ${fontStack}`;
  const lines: string[] = [];
  for (const para of text.split('\n')) {
    let cur = '';
    for (const ch of para) {
      const test = cur + ch;
      if (ctx.measureText(test).width > maxWidth && cur) {
        lines.push(cur);
        cur = ch;
      } else cur = test;
    }
    if (cur) lines.push(cur);
    else if (para === '') lines.push('');
  }
  return lines;
}

/**
 * 异步合成 (resolves loading + 一次性 compose)
 */
export async function composeAsync(args: Omit<ComposeArgs, 'pandaImg' | 'faceImg'> & {
  pandaSrc: string; faceSrc: string;
}): Promise<void> {
  const [pandaImg, faceImg] = await Promise.all([loadImage(args.pandaSrc), loadImage(args.faceSrc)]);
  compose({ ...args, pandaImg, faceImg });
}
