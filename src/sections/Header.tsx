import { useMeme } from '@/context/MemeContext';
import { Languages, Sparkles, Copy, CheckCircle2, Image, PenTool, BookOpen, User, Zap, FolderOpen, Crosshair } from 'lucide-react';
import { useState } from 'react';
import type { Page } from '@/App';

export function Header({ page, setPage }: { page: Page; setPage: (page: Page) => void }) {
  const { state, dispatch, t } = useMeme();
  const [copied, setCopied] = useState(false);

  const switchLang = () => {
    dispatch({ type: 'SET_LANGUAGE', lang: state.language === 'zh' ? 'en' : 'zh' });
  };

  const copyCA = async () => {
    const ca = '0xf3525965a4ad3ca0ac13f4d2f237113691194444';
    try {
      await navigator.clipboard.writeText(ca);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = ca;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <header className="header-bar">
      <div className="header-left">
        <div className="brand-icon">
          <Sparkles size={18} color="#fff" />
        </div>
        <div className="brand-text">
          <span className="brand-name">$熊猫头</span>
          <span className="brand-tag">{t('subtitle')}</span>
        </div>

        {/* Page Switcher — ⚡ Quick 排第一位（onboarding-friendly），后接 Editor / Museum / About */}
        <button
          onClick={() => setPage('quick')}
          className="header-link"
          style={page === 'quick' ? { backgroundColor: 'rgba(255,94,0,0.18)', borderColor: '#FF5E00', color: '#FF5E00' } : {}}
          title={t('quickMode')}
        >
          <Zap size={14} />
          <span className="link-label">{t('quickMode')}</span>
        </button>
        <button
          onClick={() => setPage('editor')}
          className="header-link"
          style={page === 'editor' ? { backgroundColor: 'rgba(0,204,102,0.2)', borderColor: '#00CC66', color: '#00CC66' } : {}}
          title={state.language === 'zh' ? '表情包编辑器' : 'Meme Editor'}
        >
          <PenTool size={14} />
          <span className="link-label">{state.language === 'zh' ? '编辑器' : 'Editor'}</span>
        </button>
        <button
          onClick={() => setPage('collection')}
          className="header-link"
          style={page === 'collection' ? { backgroundColor: 'rgba(255,94,0,0.18)', borderColor: '#FF5E00', color: '#FF5E00' } : {}}
          title={t('collectionTitle')}
        >
          <FolderOpen size={14} />
          <span className="link-label">{t('collectionTitle')}</span>
        </button>
        <button
          onClick={() => setPage('museum')}
          className="header-link"
          style={page === 'museum' ? { backgroundColor: 'rgba(0,204,102,0.2)', borderColor: '#00CC66', color: '#00CC66' } : {}}
          title={t('museum')}
        >
          <Image size={14} />
          <span className="link-label">{t('museum')}</span>
        </button>
        <button
          onClick={() => setPage('about')}
          className="header-link"
          style={page === 'about' ? { backgroundColor: 'rgba(0,204,102,0.2)', borderColor: '#00CC66', color: '#00CC66' } : {}}
          title={state.language === 'zh' ? '了解熊猫头' : 'About Panda Meme'}
        >
          <BookOpen size={14} />
          <span className="link-label">{state.language === 'zh' ? '了解' : 'About'}</span>
        </button>

        {/* 校准工具入口 — 仅 DEV mode 可见，import.meta.env.DEV 在 production build 是 false */}
        {/* PR/MR 标记此功能为 dev-only，不会进生产 bundle（CalibrateAnchor 顶部双重 gate） */}
        {import.meta.env.DEV && (
          <button
            onClick={() => setPage('calibrate')}
            className="header-link"
            style={page === 'calibrate'
              ? { backgroundColor: 'rgba(255,94,0,0.18)', borderColor: '#FF5E00', color: '#FF5E00' }
              : { borderStyle: 'dashed', opacity: 0.7 }}
            title="表情对齐工具 (DEV only)"
          >
            <Crosshair size={14} />
            <span className="link-label">校准</span>
          </button>
        )}

        {/* X Community Link - desktop only */}
        <a
          href="https://x.com/xiongmaotoubnb"
          target="_blank"
          rel="noopener noreferrer"
          className="header-link header-link-external"
          title="X Community"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          <span className="link-label">{t('xCommunity')}</span>
        </a>

        {/* Avatar Maker Link - desktop only */}
        <a
          href="https://xiongmaotouweb.linbuxiao.workers.dev/"
          target="_blank"
          rel="noopener noreferrer"
          className="header-link header-link-external avatar-link"
          title="Avatar Maker"
        >
          <User size={14} />
          <span className="link-label">{t('avatarMaker')}</span>
        </a>
      </div>

      {/* Right side: CA + Lang */}
      <div className="header-right">
        {/* CA Badge */}
        <button
          onClick={copyCA}
          className="ca-badge group"
          title="Click to copy CA"
        >
          <span className="ca-label">CA:</span>
          <span className="ca-abbrev">0xf35...4444</span>
          <span className="ca-full">0xf3525965a4ad3ca0ac13f4d2f237113691194444</span>
          {copied ? <CheckCircle2 size={12} /> : <Copy size={12} className="ca-copy-icon" />}
        </button>

        <button onClick={switchLang} className="lang-toggle" title="Switch language">
          <Languages size={14} />
          <span className="lang-label">{t('switchLang')}</span>
        </button>
      </div>
    </header>
  );
}
