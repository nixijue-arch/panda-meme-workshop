// Collection — 草图管理板块
// Contributed by PandaHead (https://pandahead.fun · github.com/jokkibtc/panda)
//
// 灵感来自 PandaHead 自家 collection.jsx，按 LittleRed 提的"草图管理"形式重新设计：
// - 读 useQuickFavs 的 localStorage favs (与 QuickMode 共享)
// - 每张草图 polaroid 风格卡片（白边 + 微倾斜）
// - 单卡 hover 还原平直 + 显示 actions: 复制 / 下载 / 进编辑器精修 / 删除
// - 空 state 引导回 Quick Mode

import { useCallback, useMemo, useRef, useState } from 'react';
import { useMeme } from '@/context/MemeContext';
import { ALL_PANDAS, ALL_FACES, getPandaFaceOffset } from '@/data/materials';
import { useQuickFavs, type QuickFav } from '@/hooks/useQuickFavs';
import { copyImageToClipboard, downloadImage } from '@/lib/exportImage';
import {
  FolderOpen, Copy, Download, Trash2, ArrowRight, Sparkles, Edit2, Check, X,
} from 'lucide-react';
import { toast } from 'sonner';
import './Collection.css';

interface CollectionProps {
  onOpenQuick: () => void;
  onOpenEditor: () => void;
}

export function Collection({ onOpenQuick, onOpenEditor }: CollectionProps) {
  const { state, dispatch, generateId } = useMeme();
  const { favs, remove, rename } = useQuickFavs();
  const lang = state.language;

  const items = useMemo<QuickFav[]>(
    () => Object.values(favs).sort((a, b) => b.ts - a.ts),
    [favs]
  );

  // 空 state
  if (items.length === 0) {
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

  // 进编辑器精修：dispatch 3 elements + 跳编辑器
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
        id: generateId(),
        type: 'image' as const,
        src: panda.src, name: panda.id,
        x: 75, y: 50, width: 350, height: 350,
        rotation: 0, opacity: 1, zIndex: 0, flipX: false,
      },
    });
    setTimeout(() => {
      dispatch({
        type: 'ADD_ELEMENT',
        element: {
          id: generateId(),
          type: 'image' as const,
          src: face.src, name: face.id,
          x: offset.x, y: offset.y, width: offset.w, height: offset.h,
          rotation: 0, opacity: 1, zIndex: 1, flipX: false,
        },
      });
      if (fav.text) {
        dispatch({
          type: 'ADD_ELEMENT',
          element: {
            id: generateId(),
            type: 'text' as const,
            text: fav.text,
            x: 60, y: 410, width: 380, height: 56,
            rotation: 0, opacity: 1, zIndex: 2,
            fontFamily: fav.fontFamily || 'sans-serif',
            fontSize: 32, fontWeight: 'bold' as const,
            textAlign: 'center' as const,
            fillColor: '#000000', strokeColor: '#ffffff',
            strokeWidth: 0,
          },
        });
      }
      onOpenEditor();
    }, 30);
  }, [dispatch, generateId, lang, onOpenEditor]);

  return (
    <div className="col-root">
      <div className="col-hero">
        <div className="col-hero-title">
          <FolderOpen size={20} color="#FF5E00" />
          <h2>{lang === 'zh' ? '我的草图' : 'My Drafts'}</h2>
          <span className="col-count">{items.length}</span>
        </div>
        <p className="col-hero-sub">
          {lang === 'zh'
            ? '点开任意一张可改名 / 进编辑器精修 / 复制 / 下载 / 删除'
            : 'Click any draft to rename / open in editor / copy / download / delete'}
        </p>
      </div>

      <div className="col-grid">
        {items.map((fav) => (
          <DraftCard
            key={fav.id}
            fav={fav}
            lang={lang}
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
    </div>
  );
}

interface DraftCardProps {
  fav: QuickFav;
  lang: 'zh' | 'en';
  onDelete: () => void;
  onRename: (name: string) => void;
  onSendToEditor: () => void;
}

function DraftCard({ fav, lang, onDelete, onRename, onSendToEditor }: DraftCardProps) {
  const panda = ALL_PANDAS.find((p) => p.id === fav.pandaId);
  const face = ALL_FACES.find((f) => f.id === fav.faceId);
  const previewRef = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState(fav.name || fav.text || '');

  // 微倾斜（手账感）— 基于 fav.id hash 稳定不随机
  const tilt = useMemo(() => {
    let h = 0;
    for (const c of fav.id) h = (h * 31 + c.charCodeAt(0)) | 0;
    return ((h % 7) - 3) * 0.8; // -2.4° ~ +2.4°
  }, [fav.id]);

  if (!panda || !face) {
    return (
      <div className="draft-card draft-card-broken" style={{ transform: `rotate(${tilt}deg)` }}>
        <div className="draft-broken-msg">{lang === 'zh' ? '素材丢失' : 'Missing'}</div>
      </div>
    );
  }

  // panda body 在 polaroid 内显示 200×200，face 按 200/350 比例缩放
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
      toast.success(lang === 'zh' ? '已复制到剪贴板' : 'Copied');
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
    <div className="draft-card" style={{ transform: `rotate(${tilt}deg)` }}>
      <div ref={previewRef} className="draft-preview">
        <img src={panda.src} alt={panda.id} draggable={false} className="draft-panda-img" />
        <img src={face.src} alt={face.id} draggable={false} className="draft-face-img" style={faceStyle} />
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
