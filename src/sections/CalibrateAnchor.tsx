// CalibrateAnchor — 表情对齐工具
// 在预览图上拖拽 anchor box 调整 faceOffset，存到 localStorage，可一键导出 TS code 永久生效
//
// Contributed by PandaHead — github.com/jokkibtc/panda

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ALL_PANDAS, ALL_FACES, type Material } from '@/data/materials';
import { PandaCanvas } from '@/components/PandaCanvas';
import { loadImage } from '@/lib/composeMeme';
import {
  readAnchorOverrides,
  saveAnchorOverride,
  removeAnchorOverride,
  exportToTSCode,
  clearAllAnchorOverrides,
  type AnchorOverride,
} from '@/lib/anchorOverrides';
import { Save, RotateCcw, Copy, Trash2, Download, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

const FACE_FILL_DEFAULT = 0.95;

// 350-coord ↔ native pixel ↔ 显示像素 三套坐标
// 同 composeMeme 的换算公式
function letterboxParams(NW: number, NH: number) {
  const scale = Math.min(350 / NW, 350 / NH);
  return {
    scale,
    padX: (350 - NW * scale) / 2,
    padY: (350 - NH * scale) / 2,
  };
}

// 350-coord faceOffset → native pixel rect
function offset350ToNative(off: { x: number; y: number; w: number; h: number }, NW: number, NH: number) {
  const { scale, padX, padY } = letterboxParams(NW, NH);
  return {
    x: (off.x - padX) / scale,
    y: (off.y - padY) / scale,
    w: off.w / scale,
    h: off.h / scale,
  };
}

// native pixel rect → 350-coord faceOffset
function nativeToOffset350(r: { x: number; y: number; w: number; h: number }, NW: number, NH: number) {
  const { scale, padX, padY } = letterboxParams(NW, NH);
  return {
    x: Math.round(r.x * scale + padX),
    y: Math.round(r.y * scale + padY),
    w: Math.round(r.w * scale),
    h: Math.round(r.h * scale),
  };
}

interface CalibrateAnchorProps {
  onBack: () => void;
}

// DEV-only: 仅 vite dev server 可见，production build (import.meta.env.DEV=false) 整个 return null
// 生产 tree-shake 后 bundle 不含此功能；防止用户误进
export function CalibrateAnchor({ onBack }: CalibrateAnchorProps) {
  if (!import.meta.env.DEV) {
    return (
      <div style={{ flex: 1, padding: 32, color: '#888', textAlign: 'center' }}>
        <p>校准工具仅本地 DEV 可用</p>
        <button onClick={onBack} style={{ marginTop: 12, padding: '6px 14px' }}>返回</button>
      </div>
    );
  }
  return <CalibrateAnchorImpl onBack={onBack} />;
}

function CalibrateAnchorImpl({ onBack }: CalibrateAnchorProps) {
  const [pandaIdx, setPandaIdx] = useState(0);
  const [faceIdx, setFaceIdx] = useState(0);
  const panda = ALL_PANDAS[pandaIdx];
  const face = ALL_FACES[faceIdx];

  // 加载 panda PNG 拿 native 尺寸 + alpha bbox（作为 cropped canvas 的换算依据）
  const [nativeDims, setNativeDims] = useState<{ NW: number; NH: number; bbox: [number, number, number, number] } | null>(null);
  useEffect(() => {
    let cancelled = false;
    setNativeDims(null);
    loadImage(panda.src).then((img) => {
      if (cancelled) return;
      const NW = img.naturalWidth;
      const NH = img.naturalHeight;
      // 算 alpha bbox（用 canvas）
      const c = document.createElement('canvas');
      c.width = NW;
      c.height = NH;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, NW, NH).data;
      let x1 = NW, y1 = NH, x2 = -1, y2 = -1;
      for (let y = 0; y < NH; y++) {
        const rb = y * NW * 4;
        for (let x = 0; x < NW; x++) {
          if (data[rb + x * 4 + 3] > 50) {
            if (x < x1) x1 = x;
            if (y < y1) y1 = y;
            if (x > x2) x2 = x;
            if (y > y2) y2 = y;
          }
        }
      }
      const bbox: [number, number, number, number] = x2 < 0 ? [0, 0, NW, NH] : [x1, y1, x2 + 1, y2 + 1];
      setNativeDims({ NW, NH, bbox });
    });
    return () => { cancelled = true; };
  }, [panda.src]);

  // 当前 anchor 状态：从 localStorage 读 → fallback 到 panda.faceOffset
  const allOverrides = useMemo(() => readAnchorOverrides(), [pandaIdx]); // eslint-disable-line react-hooks/exhaustive-deps
  const initialOff = allOverrides[panda.id]?.faceOffset ?? panda.faceOffset;
  const initialFill = allOverrides[panda.id]?.faceFill ?? FACE_FILL_DEFAULT;

  const [offset, setOffset] = useState(initialOff);
  const [faceFill, setFaceFill] = useState(initialFill);
  const [previewDispW, setPreviewDispW] = useState(0); // 预览 img 实际显示宽
  const [previewDispH, setPreviewDispH] = useState(0);

  // panda 切换时 reset state
  useEffect(() => {
    const ov = readAnchorOverrides()[panda.id];
    setOffset(ov?.faceOffset ?? panda.faceOffset);
    setFaceFill(ov?.faceFill ?? FACE_FILL_DEFAULT);
  }, [panda.id, panda.faceOffset]);

  const previewWrapRef = useRef<HTMLDivElement>(null);

  // 预览 img 加载后报告 displayed 尺寸
  const onPreviewRendered = useCallback(() => {
    const img = previewWrapRef.current?.querySelector('img');
    if (img) {
      setPreviewDispW(img.clientWidth);
      setPreviewDispH(img.clientHeight);
    }
  }, []);

  // 把 350-coord faceOffset 换算到 显示像素 (在 cropped + scaled 后的 PNG 上的位置)
  // 流程: 350-coord → native pixel → 减 bbox offset → 乘 (display/cropped) scale
  const overlay = useMemo(() => {
    if (!nativeDims || !previewDispW || !previewDispH) return null;
    const { NW, NH, bbox } = nativeDims;
    const [bx1, by1, bx2, by2] = bbox;
    const BW = bx2 - bx1;
    const BH = by2 - by1;
    // displayed img 是 cropped panda (BW x BH 的 native 区域) 缩到 (previewDispW x previewDispH)
    const displayScale = Math.min(previewDispW / BW, previewDispH / BH);
    // native face rect
    const nat = offset350ToNative(offset, NW, NH);
    // 换到 displayed 像素（相对预览框左上角）
    return {
      x: (nat.x - bx1) * displayScale,
      y: (nat.y - by1) * displayScale,
      w: nat.w * displayScale,
      h: nat.h * displayScale,
      displayScale,
      bx1,
      by1,
    };
  }, [nativeDims, previewDispW, previewDispH, offset]);

  // 拖拽逻辑：drag = 平移；resize 角 = 改宽高
  const dragRef = useRef<{ mode: 'move' | 'nw' | 'ne' | 'sw' | 'se'; startX: number; startY: number; startOffset: typeof offset } | null>(null);

  const onDragStart = (mode: 'move' | 'nw' | 'ne' | 'sw' | 'se') => (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const p = 'touches' in e ? e.touches[0] : e;
    dragRef.current = { mode, startX: p.clientX, startY: p.clientY, startOffset: { ...offset } };
  };

  useEffect(() => {
    if (!nativeDims || !overlay) return;
    const onMove = (e: MouseEvent | TouchEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const p = 'touches' in e ? e.touches[0] : e;
      if (!p) return;
      const dx = p.clientX - d.startX;
      const dy = p.clientY - d.startY;
      // 显示像素 → native pixel → 350-coord delta
      const ndx = dx / overlay.displayScale;
      const ndy = dy / overlay.displayScale;
      const { NW, NH } = nativeDims;
      const { scale } = letterboxParams(NW, NH);
      const ox = ndx * scale;
      const oy = ndy * scale;
      const so = d.startOffset;
      let next = { ...so };
      switch (d.mode) {
        case 'move':
          next.x = Math.round(so.x + ox);
          next.y = Math.round(so.y + oy);
          break;
        case 'se':
          next.w = Math.max(10, Math.round(so.w + ox));
          next.h = Math.max(10, Math.round(so.h + oy));
          break;
        case 'sw':
          next.x = Math.round(so.x + ox);
          next.w = Math.max(10, Math.round(so.w - ox));
          next.h = Math.max(10, Math.round(so.h + oy));
          break;
        case 'ne':
          next.y = Math.round(so.y + oy);
          next.w = Math.max(10, Math.round(so.w + ox));
          next.h = Math.max(10, Math.round(so.h - oy));
          break;
        case 'nw':
          next.x = Math.round(so.x + ox);
          next.y = Math.round(so.y + oy);
          next.w = Math.max(10, Math.round(so.w - ox));
          next.h = Math.max(10, Math.round(so.h - oy));
          break;
      }
      setOffset(next);
    };
    const onUp = () => { dragRef.current = null; };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onUp);
    };
  }, [nativeDims, overlay]);

  const onSave = () => {
    saveAnchorOverride(panda.id, { faceOffset: offset, faceFill });
    toast.success(`已保存 ${panda.id} (${offset.x},${offset.y},${offset.w},${offset.h})`);
  };
  const onResetCurrent = () => {
    removeAnchorOverride(panda.id);
    setOffset(panda.faceOffset);
    setFaceFill(FACE_FILL_DEFAULT);
    toast.info(`已重置 ${panda.id}`);
  };
  const onExport = async () => {
    const code = exportToTSCode();
    try {
      await navigator.clipboard.writeText(code);
      toast.success(`已复制 ${Object.keys(readAnchorOverrides()).length} 个 override 到剪贴板`);
    } catch {
      toast.error('复制失败，看 console');
      console.log(code);
    }
  };
  const onDownload = () => {
    const code = exportToTSCode();
    const blob = new Blob([code], { type: 'text/typescript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `panda-manual-overrides-${Date.now()}.ts`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const onClearAll = () => {
    if (!confirm('确认清空所有 override？此操作不可逆')) return;
    clearAllAnchorOverrides();
    setOffset(panda.faceOffset);
    setFaceFill(FACE_FILL_DEFAULT);
    toast.info('已清空所有 override');
  };

  const overrideCount = Object.keys(readAnchorOverrides()).length;
  const hasOverride = Boolean(readAnchorOverrides()[panda.id]);

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 60px', background: '#1a1a1a', color: '#f0f0f0' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <button onClick={onBack} style={btnStyle('ghost')}><ArrowLeft size={14} /> 返回</button>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>表情对齐工具</h2>
          <span style={{ fontSize: 12, color: '#888' }}>已校准 {overrideCount} / {ALL_PANDAS.length}</span>
          <div style={{ flex: 1 }} />
          <button onClick={onExport} style={btnStyle('primary')}><Copy size={14} /> 导出 TS code</button>
          <button onClick={onDownload} style={btnStyle('ghost')}><Download size={14} /> 下载 .ts</button>
          <button onClick={onClearAll} style={btnStyle('danger')}><Trash2 size={14} /> 清空全部</button>
        </div>
        <p style={{ margin: '0 0 18px', fontSize: 13, color: '#888' }}>
          拖动 anchor 框移动；拖动 4 角缩放；调好后点"保存当前"。所有 override 存 localStorage —— 永久生效需"导出 TS code"粘贴到 src/data/panda-manual-overrides.ts
        </p>

        {/* 主区: 左 panda 列表，中 预览+anchor，右 控制面板 */}
        <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr 280px', gap: 16, alignItems: 'flex-start' }}>
          {/* Panda 列表 */}
          <div style={{ background: '#222', borderRadius: 8, padding: 8, maxHeight: 600, overflowY: 'auto' }}>
            <div style={{ fontSize: 11, color: '#888', padding: '4px 6px 8px' }}>选 panda（{ALL_PANDAS.length} 个）</div>
            {ALL_PANDAS.map((p, i) => {
              const has = Boolean(readAnchorOverrides()[p.id]);
              return (
                <button
                  key={p.id}
                  onClick={() => setPandaIdx(i)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '6px 8px',
                    background: i === pandaIdx ? 'rgba(255,94,0,0.18)' : 'transparent',
                    border: i === pandaIdx ? '1px solid #FF5E00' : '1px solid transparent',
                    borderRadius: 6, color: '#ddd', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit',
                    marginBottom: 2,
                  }}
                >
                  <img src={p.src} alt={p.id} width={24} height={24} style={{ objectFit: 'contain', background: '#fff', borderRadius: 3 }} />
                  <span style={{ flex: 1, textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.id}</span>
                  {has && <span style={{ color: '#FF5E00', fontSize: 10 }}>●</span>}
                </button>
              );
            })}
          </div>

          {/* 预览 + anchor overlay */}
          <div ref={previewWrapRef} style={{ position: 'relative', background: '#fff', borderRadius: 8, padding: 12, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <PandaCanvas
                pandaSrc={panda.src}
                faceSrc={face.src}
                faceOffset={offset}
                faceFill={faceFill}
                size={1024}
                style={{ display: 'block', maxWidth: 600, maxHeight: 600 }}
                onRendered={onPreviewRendered}
              />
              {/* anchor overlay box */}
              {overlay && (
                <div
                  style={{
                    position: 'absolute',
                    left: overlay.x,
                    top: overlay.y,
                    width: overlay.w,
                    height: overlay.h,
                    border: '2px dashed #FF5E00',
                    borderRadius: '50%', // 椭圆指示
                    cursor: 'move',
                    boxSizing: 'border-box',
                    pointerEvents: 'auto',
                  }}
                  onMouseDown={onDragStart('move')}
                  onTouchStart={onDragStart('move')}
                >
                  {/* 4 角 resize handles */}
                  {(['nw', 'ne', 'sw', 'se'] as const).map((corner) => (
                    <div
                      key={corner}
                      onMouseDown={onDragStart(corner)}
                      onTouchStart={onDragStart(corner)}
                      style={{
                        position: 'absolute',
                        width: 12, height: 12, background: '#FF5E00', border: '1px solid #fff',
                        borderRadius: 2, cursor: `${corner}-resize`,
                        top: corner.startsWith('n') ? -6 : 'auto',
                        bottom: corner.startsWith('s') ? -6 : 'auto',
                        left: corner.endsWith('w') ? -6 : 'auto',
                        right: corner.endsWith('e') ? -6 : 'auto',
                      }}
                    />
                  ))}
                  {/* 中心十字标 */}
                  <div style={{
                    position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
                    width: 8, height: 8, background: '#FF5E00', borderRadius: '50%', pointerEvents: 'none',
                  }} />
                </div>
              )}
            </div>
          </div>

          {/* 右侧控制面板 */}
          <div style={{ background: '#222', borderRadius: 8, padding: 14, fontSize: 12 }}>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#fff' }}>{panda.labelCn} <span style={{ color: '#888' }}>{panda.id}</span></div>
              {nativeDims && (
                <div style={{ color: '#888', fontSize: 11 }}>native {nativeDims.NW}×{nativeDims.NH} · bbox {nativeDims.bbox.join(',')}</div>
              )}
              {hasOverride ? (
                <div style={{ color: '#FF5E00', fontSize: 11, marginTop: 4 }}>● 已有 override</div>
              ) : (
                <div style={{ color: '#666', fontSize: 11, marginTop: 4 }}>○ 未校准（用默认）</div>
              )}
            </div>

            {/* face 选择 */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ color: '#888', marginBottom: 4 }}>测试 face（{ALL_FACES.length} 选）</div>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <button onClick={() => setFaceIdx((i) => (i - 1 + ALL_FACES.length) % ALL_FACES.length)} style={iconBtn}><ChevronLeft size={14} /></button>
                <img src={face.src} alt={face.id} width={48} height={48} style={{ objectFit: 'contain', background: '#fff', borderRadius: 4 }} />
                <button onClick={() => setFaceIdx((i) => (i + 1) % ALL_FACES.length)} style={iconBtn}><ChevronRight size={14} /></button>
                <span style={{ fontSize: 11, color: '#888' }}>{face.id}</span>
              </div>
            </div>

            {/* 数值输入 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 6, alignItems: 'center', marginBottom: 12 }}>
              {(['x', 'y', 'w', 'h'] as const).map((k) => (
                <RowInput key={k} label={k} value={offset[k]} onChange={(v) => setOffset({ ...offset, [k]: v })} />
              ))}
            </div>

            {/* faceFill slider */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: '#888' }}>faceFill (五官饱满度)</span>
                <span style={{ color: '#FF5E00', fontVariantNumeric: 'tabular-nums' }}>{faceFill.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={0.7} max={1.1} step={0.01}
                value={faceFill}
                onChange={(e) => setFaceFill(Number(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            {/* 操作按钮 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button onClick={onSave} style={btnStyle('primary')}><Save size={14} /> 保存当前</button>
              <button onClick={onResetCurrent} style={btnStyle('ghost')}><RotateCcw size={14} /> 重置当前</button>
              <button onClick={() => setPandaIdx((i) => (i + 1) % ALL_PANDAS.length)} style={btnStyle('accent')}>下一只 →</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const iconBtn: React.CSSProperties = {
  width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  background: '#2a2a2a', border: '1px solid #3a3a3a', borderRadius: 4, color: '#ddd', cursor: 'pointer',
};

function btnStyle(variant: 'primary' | 'ghost' | 'accent' | 'danger'): React.CSSProperties {
  const base: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500,
    border: '1px solid', cursor: 'pointer', fontFamily: 'inherit',
  };
  switch (variant) {
    case 'primary':
      return { ...base, background: '#FF5E00', borderColor: '#FF5E00', color: '#fff' };
    case 'accent':
      return { ...base, background: 'rgba(0,204,102,0.15)', borderColor: '#00CC66', color: '#00CC66' };
    case 'danger':
      return { ...base, background: 'rgba(220,50,50,0.15)', borderColor: '#dc3232', color: '#dc3232' };
    default:
      return { ...base, background: '#2a2a2a', borderColor: '#3a3a3a', color: '#ddd' };
  }
}

function RowInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <>
      <label style={{ color: '#888', fontFamily: 'monospace', textTransform: 'uppercase' }}>{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => {
          const v = parseInt(e.target.value, 10);
          if (!Number.isNaN(v)) onChange(v);
        }}
        style={{
          background: '#1a1a1a', border: '1px solid #3a3a3a', borderRadius: 4,
          padding: '4px 8px', color: '#ddd', fontSize: 12, fontFamily: 'monospace',
          width: '100%',
        }}
      />
    </>
  );
}
