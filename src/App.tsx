import { useRef, useState } from 'react';
import { MemeProvider } from '@/context/MemeContext';
import { Header } from '@/sections/Header';
import { LeftSidebar } from '@/sections/LeftSidebar';
import { RightSidebar } from '@/sections/RightSidebar';
import { CanvasArea } from '@/sections/CanvasArea';
import { Museum } from '@/sections/Museum';
import { AboutPanda } from '@/sections/AboutPanda';
import './App.css';

function App() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState<'editor' | 'museum' | 'about'>('editor');

  return (
    <MemeProvider>
      <div className="h-screen w-screen flex flex-col overflow-hidden" style={{ backgroundColor: '#0f0f0f' }}>
        <Header page={page} setPage={setPage} />
        {page === 'editor' ? (
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
      </div>
    </MemeProvider>
  );
}

export default App;
