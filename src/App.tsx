import { useRef, useState } from 'react';
import { MemeProvider } from '@/context/MemeContext';
import { Header } from '@/sections/Header';
import { LeftSidebar } from '@/sections/LeftSidebar';
import { RightSidebar } from '@/sections/RightSidebar';
import { CanvasArea } from '@/sections/CanvasArea';
import { Museum } from '@/sections/Museum';
import { AboutPanda } from '@/sections/AboutPanda';
import { QuickMode } from '@/sections/QuickMode';
import { Toaster } from 'sonner';
import './App.css';

export type Page = 'quick' | 'editor' | 'museum' | 'about';

function App() {
  const canvasRef = useRef<HTMLDivElement>(null);
  // 默认 'editor' 不破坏既有用户；Header 把 ⚡ Quick 排第一位让新人先看到
  const [page, setPage] = useState<Page>('editor');

  return (
    <MemeProvider>
      <div className="h-screen w-screen flex flex-col overflow-hidden" style={{ backgroundColor: '#0f0f0f' }}>
        <Header page={page} setPage={setPage} />
        {page === 'quick' ? (
          <QuickMode onOpenEditor={() => setPage('editor')} />
        ) : page === 'editor' ? (
          <div className="flex-1 flex overflow-hidden main-content">
            <LeftSidebar />
            <CanvasArea canvasRef={canvasRef} />
            <RightSidebar canvasRef={canvasRef} />
          </div>
        ) : page === 'museum' ? (
          <Museum onBack={() => setPage('editor')} setPage={setPage} />
        ) : (
          <AboutPanda onBack={() => setPage('editor')} />
        )}
        <Toaster position="top-right" theme="dark" richColors closeButton />
      </div>
    </MemeProvider>
  );
}

export default App;
