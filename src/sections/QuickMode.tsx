// QuickMode — 简易"点选 + 立即出图"模式
// Contributed by PandaHead (https://pandahead.fun · github.com/jokkibtc/panda)
//
// 设计哲学：3 步出图（选熊猫头 → 选脸 → 打字），跟编辑器拖拽流程互补
// 集成方式：独立 page，不入侵编辑器内部 LeftSidebar / RightSidebar / CanvasArea
// "进编辑器精修"按钮 dispatch ADD_ELEMENT × 3 → setPage('editor')，无缝转流

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMeme } from '@/context/MemeContext';
import { PANDA_HEADS, FACES, type Material } from '@/data/materials';
import { pickRandomText, RANDOM_TEXTS_ZH, RANDOM_TEXTS_EN } from '@/data/quickModeTexts';
import { useQuickFavs, makeFavKey } from '@/hooks/useQuickFavs';
import { copyImageToClipboard, downloadImage } from '@/lib/exportImage';
import {
  Sparkles, Copy, Download, Heart, Wand2, ArrowRight, Type,
} from 'lucide-react';
import { toast } from 'sonner';
import './QuickMode.css';

const FONT_OPTIONS = [
  { id: 'default', labelKey: 'quickFontDefault' as const, stack: '"Noto Sans SC", system-ui, sans-serif' },
  { id: 'serif',   labelKey: 'quickFontSerif'   as const, stack: '"Songti SC", "STSong", "SimSun", serif' },
  { id: 'mono',    labelKey: 'quickFontMono'    as const, stack: 'ui-monospace, SFMono-Regular, "Noto Sans SC", monospace' },
];

interface QuickModeProps {
  onOpenEditor: () => void;
}

export function QuickMode({ onOpenEditor }: QuickModeProps) {
  const { state, dispatch, t, generateId } = useMeme();
  const lang = state.language;

  const [pandaId, setPandaId] = useState<string>(() => PANDA_HEADS[0]?.id ?? '');
  const [faceId, setFaceId] = useState<string>(() => FACES[0]?.id ?? '');
  const [text, setText] = useState<string>(
    () => (lang === 'zh' ? RANDOM_TEXTS_ZH : RANDOM_TEXTS_EN)[0] ?? ''
  );
  const [fontKey, setFontKey] = useState<string>('default');

  const previewRef = useRef<HTMLDivElement>(null);
  const { favs, toggle } = useQuickFavs();

  const panda = useMemo(
    () => PANDA_HEADS.find((p) => p.id === pandaId) ?? PANDA_HEADS[0],
    [pandaId]
  );
  const face = useMemo(() => FACES.find((f) => f.id === faceId) ?? FACES[0], [faceId]);
  const fontStack = FONT_OPTIONS.find((f) => f.id === fontKey)?.stack ?? FONT_OPTIONS[0].stack;
  const favKey = makeFavKey(pandaId, faceId, text, fontKey);
  const isFavored = Boolean(favs[favKey]);

  // -------- actions --------

  const onRandomText = useCallback(() => {
    setText((cur) => pickRandomText(lang === 'zh' ? 'zh' : 'en', cur));
  }, [lang]);

  const onRandomize = useCallback(() => {
    const otherPandas = PANDA_HEADS.filter((p) => p.id !== pandaId);
    const otherFaces = FACES.filter((f) => f.id !== faceId);
    const np = otherPandas.length ? otherPandas : PANDA_HEADS;
    const nf = otherFaces.length ? otherFaces : FACES;
    setPandaId(np[Math.floor(Math.random() * np.length)].id);
    setFaceId(nf[Math.floor(Math.random() * nf.length)].id);
    setText((cur) => pickRandomText(lang === 'zh' ? 'zh' : 'en', cur));
  }, [pandaId, faceId, lang]);

  const onCopy = useCallback(async () => {
    if (!previewRef.current) return;
    try {
      await copyImageToClipboard(previewRef.current);
      toast.success(t('quickCopied'));
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'unknown';
      toast.error(`${t('quickCopyFail')}: ${msg}`);
    }
  }, [t]);

  const onDownload = useCallback(async () => {
    if (!previewRef.current) return;
    try {
      await downloadImage(previewRef.current, `panda-${pandaId}-${faceId}-${Date.now()}.png`);
    } catch (e) {
      toast.error(`Download failed: ${e instanceof Error ? e.message : 'unknown'}`);
    }
  }, [pandaId, faceId]);

  const onFav = useCallback(() => {
    const wasOn = isFavored;
    toggle({ id: favKey, pandaId, faceId, text, fontFamily: fontKey });
    toast.success(wasOn ? t('quickUnsaved') : t('quickSaved'));
  }, [isFavored, toggle, favKey, pandaId, faceId, text, fontKey, t]);

  const onToEditor = useCallback(() => {
    // 把当前选择 dispatch 成编辑器 elements，然后切到编辑器
    const pandaEl = {
      id: generateId(),
      type: 'image' as const,
      src: panda.src,
      name: panda.id,
      x: 75, y: 50, width: 350, height: 350,
      rotation: 0, opacity: 1, zIndex: 0, flipX: false,
    };
    dispatch({ type: 'CLEAR_CANVAS' });
    dispatch({ type: 'ADD_ELEMENT', element: pandaEl });
    setTimeout(() => {
      const offset = panda.faceOffset;
      const faceEl = {
        id: generateId(),
        type: 'image' as const,
        src: face.src,
        name: face.id,
        x: offset.x, y: offset.y, width: offset.w, height: offset.h,
        rotation: 0, opacity: 1, zIndex: 1, flipX: false,
      };
      dispatch({ type: 'ADD_ELEMENT', element: faceEl });
      if (text.trim()) {
        const textEl = {
          id: generateId(),
          type: 'text' as const,
          text,
          x: 60, y: 410, width: 380, height: 56,
          rotation: 0, opacity: 1, zIndex: 2,
          fontFamily: fontStack,
          fontSize: 32,
          fontWeight: 'bold' as const,
          textAlign: 'center' as const,
          fillColor: '#000000',
          strokeColor: '#ffffff',
          strokeWidth: 0,
        };
        dispatch({ type: 'ADD_ELEMENT', element: textEl });
      }
      onOpenEditor();
    }, 30);
  }, [dispatch, generateId, panda, face, text, fontStack, onOpenEditor]);

  // 键盘快捷键
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'r' || e.key === 'R') onRandomize();
      if (e.key === 'c' || e.key === 'C') onCopy();
      if (e.key === 'd' || e.key === 'D') onDownload();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onRandomize, onCopy, onDownload]);

  // -------- render --------

  return (
    <div className="quickmode-root">
      <div className="quickmode-hero">
        <div className="quickmode-hero-title">
          <Sparkles size={18} color="#FF5E00" />
          <h2>{t('quickMode')}</h2>
        </div>
        <p className="quickmode-hero-sub">{t('quickModeSubtitle')}</p>
      </div>

      {/* Preview */}
      <div className="quickmode-preview-wrap">
        <div
          ref={previewRef}
          className="quickmode-preview"
          style={{ fontFamily: fontStack }}
        >
          <img
            src={panda.src} alt={panda.id} draggable={false}
            className="qm-panda-img"
          />
          <img
            src={face.src} alt={face.id} draggable={false}
            className="qm-face-img"
            style={{
              left: 25 + panda.faceOffset.x,
              top: 25 + panda.faceOffset.y,
              width: panda.faceOffset.w,
              height: panda.faceOffset.h,
            }}
          />
          {text && (
            <div className="qm-caption" style={{ fontFamily: fontStack }}>
              {text}
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="quickmode-actions">
        <button onClick={onCopy} className="qm-btn qm-btn-primary" title="C">
          <Copy size={14} /> {t('quickCopy')}
        </button>
        <button onClick={onDownload} className="qm-btn" title="D">
          <Download size={14} /> {t('quickDownload')}
        </button>
        <button onClick={onFav} className={'qm-btn ' + (isFavored ? 'qm-btn-fav-on' : '')}>
          <Heart size={14} fill={isFavored ? '#FF5E00' : 'none'} />
          {t('quickFav')}
        </button>
        <span className="qm-divider" />
        <button onClick={onRandomize} className="qm-btn qm-btn-accent" title="R">
          <Wand2 size={14} /> {t('quickRandom')}
        </button>
        <button onClick={onToEditor} className="qm-btn qm-btn-ghost">
          {t('quickToEditor')} <ArrowRight size={14} />
        </button>
      </div>

      {/* Panda head rail */}
      <RailSection
        emoji="🐼"
        title={t('quickPickPanda')}
        items={PANDA_HEADS}
        value={pandaId}
        onChange={setPandaId}
        lang={lang}
      />

      {/* Face rail */}
      <RailSection
        emoji="😂"
        title={t('quickPickFace')}
        items={FACES}
        value={faceId}
        onChange={setFaceId}
        lang={lang}
      />

      {/* Text + font */}
      <div className="quickmode-text-row">
        <div className="qm-text-label">
          <Type size={14} /> {t('quickText')}
        </div>
        <button
          onClick={onRandomText}
          className="qm-icon-btn"
          title={t('quickRandomText')}
        >
          <Wand2 size={14} />
        </button>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('quickTextPlaceholder')}
          className="qm-text-input"
        />
        <select
          value={fontKey}
          onChange={(e) => setFontKey(e.target.value)}
          className="qm-font-select"
        >
          {FONT_OPTIONS.map((f) => (
            <option key={f.id} value={f.id}>{t(f.labelKey)}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

interface RailSectionProps {
  emoji: string;
  title: string;
  items: Material[];
  value: string;
  onChange: (id: string) => void;
  lang: 'zh' | 'en';
}

function RailSection({ emoji, title, items, value, onChange, lang }: RailSectionProps) {
  const railRef = useRef<HTMLDivElement>(null);
  const idx = items.findIndex((it) => it.id === value);

  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY === 0) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  return (
    <div className="quickmode-rail-section">
      <div className="quickmode-rail-header">
        <span className="qm-rail-title">
          <span className="qm-rail-emoji">{emoji}</span>
          {title}
        </span>
        <span className="qm-rail-count">{Math.max(0, idx) + 1} / {items.length}</span>
      </div>
      <div ref={railRef} className="quickmode-rail">
        {items.map((it) => (
          <button
            key={it.id}
            onClick={() => onChange(it.id)}
            className={'qm-rail-item ' + (it.id === value ? 'qm-rail-item-active' : '')}
            title={lang === 'zh' ? it.labelCn : it.labelEn}
          >
            <img src={it.src} alt={it.id} draggable={false} loading="lazy" />
          </button>
        ))}
      </div>
    </div>
  );
}
