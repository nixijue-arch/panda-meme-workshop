import { lazy, Suspense, useRef, useState } from 'react';
import { MemeProvider } from '@/context/MemeContext';
import { Header } from '@/sections/Header';
import { LeftSidebar } from '@/sections/LeftSidebar';
import { RightSidebar } from '@/sections/RightSidebar';
import { CanvasArea } from '@/sections/CanvasArea';
import { Museum } from '@/sections/Museum';
import { AboutPanda } from '@/sections/AboutPanda';
import { QuickMode } from '@/sections/QuickMode';
import { Collection } from '@/sections/Collection';
import { Toaster } from 'sonner';
import './App.css';

// 'calibrate' 仅 DEV mode 可达 — 用 React.lazy + DEV conditional
// 让 production build 完全 tree-shake 掉 CalibrateAnchor + 所有 anchorOverrides 代码
// 之前用 static import + DEV 条件渲染，CalibrateAnchor module 还会进 prod bundle
const CalibrateAnchorLazy = import.meta.env.DEV
  ? lazy(() => import('@/sections/CalibrateAnchor').then((m) => ({ default: m.CalibrateAnchor })))
  : null;

export type Page = 'quick' | 'editor' | 'collection' | 'museum' | 'about' | 'calibrate';

function App() {
  const canvasRef = useRef<HTMLDivElement>(null);
  // 默认 'editor' 不破坏既有用户；Header 把 ⚡ Quick 排第一位让新人先看到
  // DEV mode 支持 URL ?page=calibrate 直接跳校准页（dev-calibrate.bat 用）
  const [page, setPage] = useState<Page>(() => {
    if (import.meta.env.DEV) {
      const url = new URLSearchParams(window.location.search);
      const p = url.get('page');
      if (p === 'calibrate' || p === 'quick' || p === 'collection' || p === 'editor' || p === 'museum' || p === 'about') {
        return p as Page;
      }
    }
    return 'editor';
  });

  return (
    <MemeProvider>
      <div className="h-screen w-screen flex flex-col overflow-hidden" style={{ backgroundColor: '#0f0f0f' }}>
        <Header page={page} setPage={setPage} />
        {page === 'quick' ? (
          <QuickMode onOpenEditor={() => setPage('editor')} />
        ) : page === 'collection' ? (
          <Collection onOpenQuick={() => setPage('quick')} onOpenEditor={() => setPage('editor')} />
        ) : page === 'editor' ? (
          <div className="flex-1 flex overflow-hidden main-content">
            <LeftSidebar />
            <CanvasArea canvasRef={canvasRef} />
            <RightSidebar canvasRef={canvasRef} />
          </div>
        ) : page === 'museum' ? (
          <Museum onBack={() => setPage('editor')} setPage={setPage} />
        ) : page === 'calibrate' && CalibrateAnchorLazy ? (
          <Suspense fallback={<div style={{ flex: 1, padding: 32, color: '#888' }}>加载校准工具...</div>}>
            <CalibrateAnchorLazy onBack={() => setPage('editor')} />
          </Suspense>
        ) : (
          <AboutPanda onBack={() => setPage('editor')} />
        )}
        <Toaster position="top-right" theme="dark" richColors closeButton />
      </div>
    </MemeProvider>
  );
}

export default App;
