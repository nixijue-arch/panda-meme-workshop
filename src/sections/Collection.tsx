// Collection v2 — 草图管理板块（批量选 + ZIP 导出 + filter）
// Contributed by PandaHead (https://pandahead.fun · github.com/jokkibtc/panda)

import { useCallback, useMemo, useRef, useState } from 'react';
import JSZip from 'jszip';
import { useMeme } from '@/context/MemeContext';
import { ALL_PANDAS, ALL_FACES, getPandaFaceOffset } from '@/data/materials';
import { useQuickFavs, type QuickFav } from '@/hooks/useQuickFavs';
import { captureNode, copyImageToClipboard, downloadImage } from '@/lib/exportImage';
import {
  FolderOpen, Copy, Download, Trash2, ArrowRight, Sparkles, Edit2, Check, X,
  Package, CheckSquare, Square,
} from 'lucide-react';
import { toast } from 'sonner';
import './Collection.css';

interface CollectionProps {
  onOpenQuick: () => void;
  onOpenEditor: () => void;
}

type Filter = 'all' | 'recent';

export function Collection({ onOpenQuick, onOpenEditor }: CollectionProps) {
  const { state, dispatch, generateId } = useMeme();
  const { favs, remove, rename } = useQuickFavs();
  const lang = state.language;

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<Filter>('all');
  const offscreenContainerRef = useRef<HTMLDivElement>(null);

  const items = useMemo<QuickFav[]>(() => {
    let list = Object.values(favs).sort((a, b) => b.ts - a.ts);
    if (filter === 'recent') list = list.slice(0, 12);
    return list;
  }, [favs, filter]);

  const toggleSelect = useCallback((id: string) => {
    setSelected((s) => {
      const ns = new Set(s);
      if (ns.has(id)) ns.delete(id);
      else ns.add(id);
      return ns;
    });
  }, []);

  const selectAll = useCallback(() => setSelected(new Set(items.map((i) => i.id))), [items]);
  const clearSelection = useCallback(() => setSelected(new Set()), []);

  const onBatchDelete = useCallback(() => {
    Array.from(selected).forEach((id) => remove(id));
    setSelected(new Set());
    toast.success(lang === 'zh' ? `已删除 ${selected.size} 张` : `Deleted ${selected.size}`);
  }, [selected, remove, lang]);

  // 批量打 ZIP — 每张草图渲染到离屏 element → captureNode → blob → zip.file
  const onBatchZip = useCallback(async () => {
    if (selected.size === 0) return;
    const itemsToPack = items.filter((it) => selected.has(it.id));
    if (!itemsToPack.length) return;
    if (!offscreenContainerRef.current) return;

    toast.info(lang === 'zh' ? `打包 ${itemsToPack.length} 张...` : `Packing ${itemsToPack.length}...`);

    try {
      const zip = new JSZip();
      // 离屏渲染容器：每张草图 render → captureNode → 加进 zip
      const container = offscreenContainerRef.current;
      for (let i = 0; i < itemsToPack.length; i++) {
        const fav = itemsToPack[i];
        const panda = ALL_PANDAS.find((p) => p.id === fav.pandaId);
        const face = ALL_FACES.find((f) => f.id === fav.faceId);
        if (!panda || !face) continue;
        // 创建临时 preview node
        const node = document.createElement('div');
        node.style.cssText = 'position:absolute;width:400px;height:480px;background:#fff;left:-99999px;top:0;';
        node.innerHTML = `
          <img src="${panda.src}" style="position:absolute;left:25px;top:25px;width:350px;height:350px;object-fit:contain;" crossorigin="anonymous" />
          <img src="${face.src}" style="position:absolute;left:${25 + panda.faceOffset.x}px;top:${25 + panda.faceOffset.y}px;width:${panda.faceOffset.w}px;height:${panda.faceOffset.h}px;object-fit:contain;" crossorigin="anonymous" />
          ${fav.text ? `<div style="position:absolute;left:0;right:0;bottom:18px;text-align:center;font-size:32px;font-weight:700;color:#000;padding:0 16px;line-height:1.2;font-family:${fav.fontFamily || 'sans-serif'};">${fav.text}</div>` : ''}
        `;
        container.appendChild(node);
        // 等图片加载（简单 await frame + 100ms）
        await new Promise((r) => setTimeout(r, 200));
        const blob = await captureNode(node);
        const safeName = (fav.name || fav.text || `panda-${i + 1}`).replace(/[^\w一-龥-]/g, '_').slice(0, 40);
        zip.file(`${String(i + 1).padStart(2, '0')}-${safeName}.png`, blob);
        container.removeChild(node);
      }
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `panda-drafts-${Date.now()}.zip`;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
      toast.success(lang === 'zh' ? `已打包 ${itemsToPack.length} 张 ZIP` : `Packed ${itemsToPack.length} as ZIP`);
    } catch (e) {
      toast.error(lang === 'zh' ? `打包失败: ${e instanceof Error ? e.message : 'unknown'}` : `Pack failed`);
    }
  }, [selected, items, lang]);

  // 进编辑器精修单张
  const onSendToEditor = useCallback((fav: QuickFav) => {
    const panda = ALL_PANDAS.find((p) => p.id === fav.pandaId);
    const face = ALL_FACES.find((f) => f.id === fav.faceId);
    if (!panda || !face) {
      toast.error(lang === 'zh' ? '素材丢失' : 'Material missing');
      return;
    }
    const offset = getPandaFaceOffset(panda.id);
    dispatch({ type: 'CLEAR_CANVAS' });
    dispatch({
      type: 'ADD_ELEMENT',
      element: {
        id: generateId(), type: 'image' as const, src: panda.src, name: panda.id,
        x: 75, y: 50, width: 350, height: 350,
        rotation: 0, opacity: 1, zIndex: 0, flipX: false,
      },
    });
    setTimeout(() => {
      dispatch({
        type: 'ADD_ELEMENT',
        element: {
          id: generateId(), type: 'image' as const, src: face.src, name: face.id,
          x: offset.x, y: offset.y, width: offset.w, height: offset.h,
          rotation: 0, opacity: 1, zIndex: 1, flipX: false,
        },
      });
      if (fav.text) {
        dispatch({
          type: 'ADD_ELEMENT',
          element: {
            id: generateId(), type: 'text' as const, text: fav.text,
            x: 60, y: 410, width: 380, height: 56,
            rotation: 0, opacity: 1, zIndex: 2,
            fontFamily: fav.fontFamily || 'sans-serif',
            fontSize: 32, fontWeight: 'bold' as const,
            textAlign: 'center' as const,
            fillColor: '#000000', strokeColor: '#ffffff', strokeWidth: 0,
          },
        });
      }
      onOpenEditor();
    }, 30);
  }, [dispatch, generateId, lang, onOpenEditor]);

  // 空 state
  if (Object.keys(favs).length === 0) {
    return (
      <div className="col-root">
        <div className="col-empty">
          <FolderOpen size={48} color="#666" />
          <h3>{lang === 'zh' ? '草图本是空的' : 'No drafts yet'}</h3>
          <p>{lang === 'zh' ? '去快速生图收藏几张试试' : 'Open Quick mode and save some drafts'}</p>
          <button onClick={onOpenQuick} className="col-cta">
            <Sparkles size={14} />
            {lang === 'zh' ? '打开快速生图' : 'Open Quick Mode'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="col-root">
      <div className="col-hero">
        <div className="col-hero-title">
          <FolderOpen size={20} color="#FF5E00" />
          <h2>{lang === 'zh' ? '我的草图' : 'My Drafts'}</h2>
          <span className="col-count">{items.length}</span>
          <div style={{ flex: 1 }} />
          <div className="col-filter">
            {(['all', 'recent'] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={'col-filter-btn ' + (filter === f ? 'col-filter-btn-on' : '')}
              >
                {lang === 'zh' ? (f === 'all' ? '全部' : '最近') : (f === 'all' ? 'All' : 'Recent')}
              </button>
            ))}
          </div>
        </div>
        <p className="col-hero-sub">
          {lang === 'zh'
            ? '点 ☐ 多选 → 批量打包 ZIP / 删除；卡片 hover 看 actions'
            : 'Click ☐ to multi-select → batch ZIP / delete; hover card for actions'}
        </p>
      </div>

      <div className="col-grid">
        {items.map((fav) => (
          <DraftCard
            key={fav.id}
            fav={fav}
            lang={lang}
            isSelected={selected.has(fav.id)}
            onToggleSelect={() => toggleSelect(fav.id)}
            onDelete={() => {
              remove(fav.id);
              toast.success(lang === 'zh' ? '已删除' : 'Deleted');
            }}
            onRename={(name) => {
              rename(fav.id, name);
              toast.success(lang === 'zh' ? '已改名' : 'Renamed');
            }}
            onSendToEditor={() => onSendToEditor(fav)}
          />
        ))}
      </div>

      {/* 离屏渲染容器（ZIP 打包时塞临时 preview node） */}
      <div ref={offscreenContainerRef} style={{ position: 'absolute', left: -99999, top: 0 }} />

      {/* Floating action bar — 选中时浮动 */}
      {selected.size > 0 && (
        <div className="col-action-bar">
          <span className="col-bar-count">
            {lang === 'zh' ? `已选 ${selected.size}` : `${selected.size} selected`}
          </span>
          <span className="col-bar-divider" />
          <button onClick={selectAll} className="col-bar-btn">
            {lang === 'zh' ? '全选' : 'All'}
          </button>
          <button onClick={clearSelection} className="col-bar-btn">
            {lang === 'zh' ? '取消' : 'Clear'}
          </button>
          <span className="col-bar-divider" />
          <button onClick={onBatchZip} className="col-bar-btn col-bar-btn-primary">
            <Package size={14} /> {lang === 'zh' ? '打包 ZIP' : 'Pack ZIP'}
          </button>
          <button onClick={onBatchDelete} className="col-bar-btn col-bar-btn-danger">
            <Trash2 size={14} /> {lang === 'zh' ? '删除' : 'Delete'}
          </button>
        </div>
      )}
    </div>
  );
}

interface DraftCardProps {
  fav: QuickFav;
  lang: 'zh' | 'en';
  isSelected: boolean;
  onToggleSelect: () => void;
  onDelete: () => void;
  onRename: (name: string) => void;
  onSendToEditor: () => void;
}

function DraftCard({ fav, lang, isSelected, onToggleSelect, onDelete, onRename, onSendToEditor }: DraftCardProps) {
  const panda = ALL_PANDAS.find((p) => p.id === fav.pandaId);
  const face = ALL_FACES.find((f) => f.id === fav.faceId);
  const previewRef = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState(fav.name || fav.text || '');

  const tilt = useMemo(() => {
    let h = 0;
    for (const c of fav.id) h = (h * 31 + c.charCodeAt(0)) | 0;
    return ((h % 7) - 3) * 0.8;
  }, [fav.id]);

  if (!panda || !face) {
    return (
      <div className="draft-card draft-card-broken" style={{ transform: `rotate(${tilt}deg)` }}>
        <div className="draft-broken-msg">{lang === 'zh' ? '素材丢失' : 'Missing'}</div>
      </div>
    );
  }

  const SCALE = 200 / 350;
  const faceStyle = {
    left: Math.round(panda.faceOffset.x * SCALE),
    top: Math.round(panda.faceOffset.y * SCALE),
    width: Math.round(panda.faceOffset.w * SCALE),
    height: Math.round(panda.faceOffset.h * SCALE),
  };

  const onCopy = async () => {
    if (!previewRef.current) return;
    try {
      await copyImageToClipboard(previewRef.current);
      toast.success(lang === 'zh' ? '已复制' : 'Copied');
    } catch {
      toast.error(lang === 'zh' ? '复制失败' : 'Copy failed');
    }
  };

  const onDownload = async () => {
    if (!previewRef.current) return;
    try {
      await downloadImage(
        previewRef.current,
        `panda-${fav.pandaId}-${fav.faceId}-${Date.now()}.png`
      );
    } catch {
      toast.error(lang === 'zh' ? '下载失败' : 'Download failed');
    }
  };

  const submitRename = () => {
    if (nameDraft.trim()) onRename(nameDraft.trim());
    setEditing(false);
  };

  return (
    <div className={'draft-card ' + (isSelected ? 'draft-card-selected' : '')} style={{ transform: `rotate(${tilt}deg)` }}>
      {/* 选择框 */}
      <button
        className={'draft-select-toggle ' + (isSelected ? 'draft-select-toggle-on' : '')}
        onClick={onToggleSelect}
        title={lang === 'zh' ? '选择' : 'Select'}
      >
        {isSelected ? <CheckSquare size={14} /> : <Square size={14} />}
      </button>

      <div ref={previewRef} className="draft-preview">
        <img src={panda.src} alt={panda.id} draggable={false} className="draft-panda-img" />
        <img
          src={face.src} alt={face.id} draggable={false}
          className="draft-face-img"
          style={{
            ...faceStyle,
            maskImage: `url("${panda.src.replace(/\.png$/, '-facemask.png')}")`,
            WebkitMaskImage: `url("${panda.src.replace(/\.png$/, '-facemask.png')}")`,
            maskSize: '100% 100%',
            WebkitMaskSize: '100% 100%',
            maskRepeat: 'no-repeat',
            WebkitMaskRepeat: 'no-repeat',
          }}
        />
        {fav.text && <div className="draft-caption">{fav.text}</div>}
      </div>

      <div className="draft-meta">
        {editing ? (
          <div className="draft-rename-row">
            <input
              autoFocus
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitRename();
                if (e.key === 'Escape') setEditing(false);
              }}
              placeholder={lang === 'zh' ? '起个名字...' : 'Name it...'}
              className="draft-rename-input"
            />
            <button onClick={submitRename} className="draft-rename-ok"><Check size={12} /></button>
            <button onClick={() => setEditing(false)} className="draft-rename-cancel"><X size={12} /></button>
          </div>
        ) : (
          <div className="draft-name-row">
            <span className="draft-name">{fav.name || fav.text || (lang === 'zh' ? '未命名' : 'Untitled')}</span>
            <button onClick={() => setEditing(true)} className="draft-icon-btn" title={lang === 'zh' ? '改名' : 'Rename'}>
              <Edit2 size={11} />
            </button>
          </div>
        )}
      </div>

      <div className="draft-actions">
        <button onClick={onCopy} className="draft-icon-btn" title={lang === 'zh' ? '复制' : 'Copy'}>
          <Copy size={13} />
        </button>
        <button onClick={onDownload} className="draft-icon-btn" title={lang === 'zh' ? '下载' : 'Download'}>
          <Download size={13} />
        </button>
        <button onClick={onSendToEditor} className="draft-icon-btn draft-icon-btn-accent" title={lang === 'zh' ? '进编辑器精修' : 'Open in Editor'}>
          <ArrowRight size={13} />
        </button>
        <button onClick={onDelete} className="draft-icon-btn draft-icon-btn-danger" title={lang === 'zh' ? '删除' : 'Delete'}>
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}
