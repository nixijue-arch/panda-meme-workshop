import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Upload, Sparkles, Check } from 'lucide-react';
import { translations } from '@/context/translations';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (dataUrl: string) => void;
  language: 'zh' | 'en';
}

// FACEMESH_FACE_OVAL 36 点（按 mediapipe connector 顺序闭环）
const FACE_OVAL_INDICES = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
  397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
  172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109,
];
const KP = { TOP: 10, CHIN: 152, RIGHT: 234, LEFT: 454 };
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

// 单例 landmarker（整个 app 共享，避免重复加载）
let _landmarker: any = null;
let _landmarkerPromise: Promise<any> | null = null;
async function getLandmarker(): Promise<any> {
  if (_landmarker) return _landmarker;
  if (_landmarkerPromise) return _landmarkerPromise;
  _landmarkerPromise = (async () => {
    // @ts-expect-error - CDN ES module, no types
    const mod = await import(
      /* @vite-ignore */
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/vision_bundle.mjs'
    );
    const vision = await mod.FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm'
    );
    let opts: any = {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
      runningMode: 'IMAGE',
      numFaces: 1,
      outputFaceBlendshapes: false,
    };
    try {
      _landmarker = await mod.FaceLandmarker.createFromOptions(vision, opts);
    } catch {
      opts.baseOptions.delegate = 'CPU';
      _landmarker = await mod.FaceLandmarker.createFromOptions(vision, opts);
    }
    return _landmarker;
  })();
  return _landmarkerPromise;
}

// Catmull-Rom 转 Bezier — 通过每个控制点的圆滑曲线（闭合）
function tracePolygonPath(
  ctx: CanvasRenderingContext2D,
  points: { x: number; y: number }[],
  scale = 1,
  offX = 0,
  offY = 0,
  tension = 0.5
) {
  const n = points.length;
  if (n < 3) {
    points.forEach((p, i) => {
      const x = p.x * scale + offX, y = p.y * scale + offY;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    return;
  }
  const pts = points.map(p => ({ x: p.x * scale + offX, y: p.y * scale + offY }));
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const cp1x = p1.x + (p2.x - p0.x) * tension / 6;
    const cp1y = p1.y + (p2.y - p0.y) * tension / 6;
    const cp2x = p2.x - (p3.x - p1.x) * tension / 6;
    const cp2y = p2.y - (p3.y - p1.y) * tension / 6;
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
  }
}

interface ProcessParams {
  headExpand: number;
  trimDark: number;
  contrast: number;
}

// 在 image 上跑：detect 之后 → polygon clip + Levels + trim → 1024x1024 白底 PNG
function processFace(
  image: HTMLImageElement,
  landmarks: any[],
  params: ProcessParams,
  outSize = 1024
): HTMLCanvasElement {
  const iw = image.naturalWidth, ih = image.naturalHeight;

  // 1. 计算 polygon（face_oval 径向扩展 + 额头/下巴智能延伸）
  const polygon = FACE_OVAL_INDICES.map(idx => ({
    x: landmarks[idx].x * iw,
    y: landmarks[idx].y * ih,
  }));
  const cx = polygon.reduce((s, p) => s + p.x, 0) / polygon.length;
  const cy = polygon.reduce((s, p) => s + p.y, 0) / polygon.length;
  const top = landmarks[KP.TOP], chin = landmarks[KP.CHIN];
  const upX = (top.x - chin.x) * iw, upY = (top.y - chin.y) * ih;
  const faceH = Math.hypot(upX, upY) || 1;
  const upUnitX = upX / faceH, upUnitY = upY / faceH;
  const radial = 1 + params.headExpand / 100;
  const foreheadBoost = -0.12 * faceH;  // 默认收紧到眉毛上方一点
  const expanded = polygon.map(p => {
    const dx = p.x - cx, dy = p.y - cy;
    const len = Math.hypot(dx, dy) || 1;
    let nx = cx + dx * radial, ny = cy + dy * radial;
    const align = (dx * upUnitX + dy * upUnitY) / len;
    if (align > 0.2) {
      const k = (align - 0.2) / 0.8;
      nx += upUnitX * foreheadBoost * k;
      ny += upUnitY * foreheadBoost * k;
    }
    return { x: nx, y: ny };
  });

  // 2. 输出 canvas
  const xs = expanded.map(p => p.x), ys = expanded.map(p => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const bw = maxX - minX, bh = maxY - minY;
  const scale = (outSize * 0.88) / Math.max(bw, bh);
  const cxOut = (minX + maxX) / 2, cyOut = (minY + maxY) / 2;
  const offX = outSize / 2 - cxOut * scale;
  const offY = outSize / 2 - cyOut * scale;

  const canvas = document.createElement('canvas');
  canvas.width = outSize; canvas.height = outSize;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.save();
  ctx.beginPath();
  tracePolygonPath(ctx, expanded, scale, offX, offY);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(image, offX, offY, iw * scale, ih * scale);
  ctx.restore();

  // 3. alpha 硬阈值（消除边缘半透明像素）
  let imgData = ctx.getImageData(0, 0, outSize, outSize);
  let data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 200) data[i + 3] = 0;
  }

  // 4. 灰度
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 250) continue;
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    data[i] = data[i + 1] = data[i + 2] = lum;
  }

  // 5. histogram auto normalize（mask 内 1%-99% 拉到 0-255）
  const histogram = new Uint32Array(256);
  let total = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 200) continue;
    const lum = (data[i]) | 0;
    histogram[lum]++; total++;
  }
  if (total > 0) {
    const lowT = total * 0.01, highT = total * 0.99;
    let cum = 0, lowV = 0, highV = 255, foundLow = false;
    for (let i = 0; i < 256; i++) {
      cum += histogram[i];
      if (!foundLow && cum >= lowT) { lowV = i; foundLow = true; }
      if (cum >= highT) { highV = i; break; }
    }
    if (highV > lowV) {
      const range = highV - lowV;
      const lut = new Uint8ClampedArray(256);
      for (let i = 0; i < 256; i++) lut[i] = Math.max(0, Math.min(255, Math.round((i - lowV) / range * 255)));
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 250) continue;
        data[i] = lut[data[i]]; data[i + 1] = lut[data[i + 1]]; data[i + 2] = lut[data[i + 2]];
      }
    }
  }

  // 6. Levels (default tuned for meme face)
  const blackPoint = 30, whitePoint = 225, gamma = 1.05;
  const range = whitePoint - blackPoint;
  if (range > 0) {
    const lut = new Uint8ClampedArray(256);
    for (let i = 0; i < 256; i++) {
      let v = (i - blackPoint) / range;
      v = Math.max(0, Math.min(1, v));
      v = Math.pow(v, 1 / gamma);
      lut[i] = Math.round(v * 255);
    }
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 250) continue;
      data[i] = lut[data[i]]; data[i + 1] = lut[data[i + 1]]; data[i + 2] = lut[data[i + 2]];
    }
  }

  // 7. 对比度
  if (params.contrast !== 0) {
    const factor = (259 * (params.contrast + 255)) / (255 * (259 - params.contrast));
    const lut = new Uint8ClampedArray(256);
    for (let i = 0; i < 256; i++) lut[i] = Math.max(0, Math.min(255, Math.round(factor * (i - 128) + 128)));
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 250) continue;
      data[i] = lut[data[i]]; data[i + 1] = lut[data[i + 1]]; data[i + 2] = lut[data[i + 2]];
    }
  }

  ctx.putImageData(imgData, 0, 0);

  // 8. 暗边修剪：靠近边缘的深色像素 fade（修自然脸阴影残留黑块）
  if (params.trimDark > 0) {
    const w = outSize, h = outSize;
    const orig = ctx.getImageData(0, 0, w, h);
    const d2 = orig.data;
    const alphaIn = new Uint8ClampedArray(w * h);
    for (let i = 0; i < w * h; i++) alphaIn[i] = d2[i * 4 + 3] > 200 ? 255 : 0;
    const blurred = boxBlur1D(alphaIn, w, h, 25);
    const darkThr = 60, strength = params.trimDark / 100;
    for (let i = 0; i < w * h; i++) {
      const di = i * 4;
      if (d2[di + 3] < 200) continue;
      const lum = 0.299 * d2[di] + 0.587 * d2[di + 1] + 0.114 * d2[di + 2];
      if (lum >= darkThr) continue;
      const edgeProx = blurred[i] / 255;
      if (edgeProx > 0.92) continue;
      const proxFactor = Math.max(0, 1 - edgeProx / 0.92);
      const darkFactor = 1 - lum / darkThr;
      const fade = strength * proxFactor * darkFactor;
      d2[di + 3] = Math.round(d2[di + 3] * (1 - fade));
    }
    ctx.putImageData(orig, 0, 0);
  }

  // 9. 白底（透明区填白）
  const finalData = ctx.getImageData(0, 0, outSize, outSize);
  const fd = finalData.data;
  for (let i = 0; i < fd.length; i += 4) {
    const a = fd[i + 3];
    if (a < 255) {
      const t = a / 255;
      fd[i] = fd[i] * t + 255 * (1 - t);
      fd[i + 1] = fd[i + 1] * t + 255 * (1 - t);
      fd[i + 2] = fd[i + 2] * t + 255 * (1 - t);
      fd[i + 3] = 255;
    }
  }
  ctx.putImageData(finalData, 0, 0);

  return canvas;
}

function boxBlur1D(src: Uint8ClampedArray, w: number, h: number, r: number): Uint8ClampedArray {
  const tmp = new Uint8ClampedArray(w * h);
  const out = new Uint8ClampedArray(w * h);
  for (let y = 0; y < h; y++) {
    let sum = 0;
    for (let x = -r; x <= r; x++) sum += src[y * w + Math.max(0, Math.min(w - 1, x))];
    const div = 2 * r + 1;
    for (let x = 0; x < w; x++) {
      tmp[y * w + x] = sum / div;
      const xR = Math.min(w - 1, x + r + 1), xL = Math.max(0, x - r);
      sum += src[y * w + xR] - src[y * w + xL];
    }
  }
  for (let x = 0; x < w; x++) {
    let sum = 0;
    for (let y = -r; y <= r; y++) sum += tmp[Math.max(0, Math.min(h - 1, y)) * w + x];
    const div = 2 * r + 1;
    for (let y = 0; y < h; y++) {
      out[y * w + x] = sum / div;
      const yD = Math.min(h - 1, y + r + 1), yU = Math.max(0, y - r);
      sum += tmp[yD * w + x] - tmp[yU * w + x];
    }
  }
  return out;
}

export function SmartExtractModal({ isOpen, onClose, onConfirm, language }: Props) {
  const t = (key: string) => (translations[language] as any)[key] || key;
  const [sourceImage, setSourceImage] = useState<HTMLImageElement | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string>('');
  const [landmarks, setLandmarks] = useState<any[] | null>(null);
  const [outputCanvas, setOutputCanvas] = useState<HTMLCanvasElement | null>(null);
  const [loadingModel, setLoadingModel] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string>('');
  const [headExpand, setHeadExpand] = useState(-2);
  const [trimDark, setTrimDark] = useState(50);
  const [contrast, setContrast] = useState(20);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const outputPreviewRef = useRef<HTMLCanvasElement>(null);

  // 预热 mediapipe (打开 modal 时)
  useEffect(() => {
    if (!isOpen) return;
    if (_landmarker) return;
    setLoadingModel(true);
    getLandmarker().catch(e => setError('模型加载失败: ' + e.message)).finally(() => setLoadingModel(false));
  }, [isOpen]);

  // 文件上传 → 加载图 → detect
  const handleFile = useCallback(async (file: File) => {
    setError('');
    setLandmarks(null);
    setOutputCanvas(null);
    const url = URL.createObjectURL(file);
    setSourceUrl(url);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = async () => {
      setSourceImage(img);
      setProcessing(true);
      try {
        const lm = await getLandmarker();
        const result = lm.detect(img);
        if (!result.faceLandmarks || result.faceLandmarks.length === 0) {
          setError(t('smartExtractNoFace'));
          setProcessing(false);
          return;
        }
        setLandmarks(result.faceLandmarks[0]);
      } catch (e: any) {
        setError(e.message || String(e));
        setProcessing(false);
      }
    };
    img.onerror = () => { setError('图片加载失败'); setProcessing(false); };
    img.src = url;
  }, [language]);

  // 参数 / landmarks 变化时重新处理
  useEffect(() => {
    if (!sourceImage || !landmarks) return;
    setProcessing(true);
    const id = requestAnimationFrame(() => {
      try {
        const out = processFace(sourceImage, landmarks, { headExpand, trimDark, contrast });
        setOutputCanvas(out);
        // 复制到 preview canvas
        if (outputPreviewRef.current) {
          const c = outputPreviewRef.current;
          c.width = 320; c.height = 320;
          c.getContext('2d')!.drawImage(out, 0, 0, 320, 320);
        }
      } catch (e: any) {
        setError(e.message || String(e));
      } finally {
        setProcessing(false);
      }
    });
    return () => cancelAnimationFrame(id);
  }, [sourceImage, landmarks, headExpand, trimDark, contrast]);

  const handleConfirm = () => {
    if (!outputCanvas) return;
    onConfirm(outputCanvas.toDataURL('image/png'));
    handleClose();
  };
  const handleClose = () => {
    setSourceImage(null); setSourceUrl(''); setLandmarks(null); setOutputCanvas(null);
    setError(''); setHeadExpand(-2); setTrimDark(50); setContrast(20);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={handleClose}>
      <div
        className="relative w-full max-w-3xl rounded-2xl p-6 max-h-[95vh] overflow-y-auto"
        style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles size={20} style={{ color: '#F59E0B' }} />
            <h2 className="text-lg font-bold text-white">{t('smartExtractTitle')}</h2>
            <span className="text-xs" style={{ color: '#888' }}>· {t('smartExtractHint')}</span>
          </div>
          <button onClick={handleClose} className="p-1 rounded hover:bg-white/10">
            <X size={20} className="text-white" />
          </button>
        </div>

        {/* Loading state */}
        {loadingModel && (
          <div className="mb-4 p-3 rounded-lg text-sm text-white" style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)' }}>
            <span className="inline-block w-3 h-3 mr-2 border-2 border-orange-300 border-r-transparent rounded-full animate-spin align-middle" />
            {t('smartExtractLoading')}
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 rounded-lg text-sm text-red-300" style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.4)' }}>
            {error}
          </div>
        )}

        {/* Upload zone */}
        {!sourceImage && !loadingModel && (
          <label
            className="block border-2 border-dashed rounded-xl py-12 px-6 text-center cursor-pointer transition-colors"
            style={{ borderColor: '#2a2a2a', background: 'rgba(245,158,11,0.05)' }}
            onDragOver={e => { e.preventDefault(); }}
            onDrop={e => {
              e.preventDefault();
              const f = Array.from(e.dataTransfer.files).find(x => /^image\//.test(x.type));
              if (f) handleFile(f);
            }}
          >
            <Upload size={32} className="mx-auto mb-2" style={{ color: '#F59E0B' }} />
            <div className="text-white font-semibold">{t('smartExtractUpload')}</div>
            <div className="text-xs mt-1" style={{ color: '#888' }}>JPG / PNG / WebP · 拖拽 / 点击</div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
            />
          </label>
        )}

        {/* Preview area */}
        {sourceImage && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-xs mb-1" style={{ color: '#aaa' }}>原图</div>
              <div className="rounded-lg overflow-hidden aspect-square flex items-center justify-center" style={{ background: '#0a0a0a' }}>
                <img src={sourceUrl} className="max-w-full max-h-full object-contain" alt="" />
              </div>
            </div>
            <div>
              <div className="text-xs mb-1" style={{ color: '#aaa' }}>
                输出 face {processing && <span style={{ color: '#F59E0B' }}>· {t('smartExtractProcessing')}</span>}
              </div>
              <div className="rounded-lg overflow-hidden aspect-square flex items-center justify-center" style={{ background: '#FFF', backgroundImage: 'repeating-conic-gradient(#F0F0F0 0% 25%, #FFF 0% 50%)', backgroundSize: '16px 16px' }}>
                <canvas ref={outputPreviewRef} className="max-w-full max-h-full" />
              </div>
            </div>
          </div>
        )}

        {/* Param sliders */}
        {sourceImage && landmarks && (
          <div className="mt-4 space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1" style={{ color: '#aaa' }}>
                <span>{t('smartExtractHeadExpand')}</span>
                <span className="font-mono">{headExpand >= 0 ? '+' : ''}{headExpand}%</span>
              </div>
              <input type="range" min={-30} max={40} step={1} value={headExpand}
                onChange={e => setHeadExpand(+e.target.value)}
                className="w-full" style={{ accentColor: '#F59E0B' }} />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1" style={{ color: '#aaa' }}>
                <span>{t('smartExtractTrimDark')}</span>
                <span className="font-mono">{trimDark}</span>
              </div>
              <input type="range" min={0} max={100} step={1} value={trimDark}
                onChange={e => setTrimDark(+e.target.value)}
                className="w-full" style={{ accentColor: '#F59E0B' }} />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1" style={{ color: '#aaa' }}>
                <span>{t('smartExtractContrast')}</span>
                <span className="font-mono">{contrast >= 0 ? '+' : ''}{contrast}</span>
              </div>
              <input type="range" min={0} max={100} step={1} value={contrast}
                onChange={e => setContrast(+e.target.value)}
                className="w-full" style={{ accentColor: '#F59E0B' }} />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-5 flex gap-2 justify-end">
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ background: '#2a2a2a' }}
          >
            {t('smartExtractCancel')}
          </button>
          <button
            onClick={handleConfirm}
            disabled={!outputCanvas || processing}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: '#00CC66' }}
          >
            <Check size={14} />
            {t('smartExtractConfirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
