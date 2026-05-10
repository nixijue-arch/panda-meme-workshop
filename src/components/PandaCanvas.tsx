// PandaCanvas — React wrapper of composeMeme
// 替换 <img panda /> + <img face /> 双 overlay 方案
// 用 canvas 合成 + 白色 mask 裁 face → 解决 face 白边遮 panda 黑廓 + 超出 shell 区
//
// Contributed by PandaHead (https://pandahead.fun · github.com/jokkibtc/panda)

import { useEffect, useRef, useState } from 'react';
import { composeMeme } from '@/lib/composeMeme';

interface Props {
  pandaSrc: string;
  faceSrc: string;
  faceOffset: { x: number; y: number; w: number; h: number };
  rotation?: number;
  flipX?: boolean;
  size?: number; // canvas resolution, default 1024 for export quality (display via CSS)
  className?: string;
  style?: React.CSSProperties;
  alt?: string;
  draggable?: boolean;
}

export function PandaCanvas({
  pandaSrc,
  faceSrc,
  faceOffset,
  rotation = 0,
  flipX = false,
  size = 1024,
  className,
  style,
  alt,
  draggable = false,
}: Props) {
  const [dataUrl, setDataUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const reqRef = useRef<number>(0);

  useEffect(() => {
    let cancelled = false;
    const reqId = ++reqRef.current;
    setLoading(true);
    composeMeme({ pandaSrc, faceSrc, faceOffset, rotation, flipX, size })
      .then((url) => {
        if (cancelled || reqId !== reqRef.current) return;
        setDataUrl(url);
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled || reqId !== reqRef.current) return;
        // eslint-disable-next-line no-console
        console.error('[PandaCanvas]', e);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pandaSrc, faceSrc, faceOffset.x, faceOffset.y, faceOffset.w, faceOffset.h, rotation, flipX, size]);

  return (
    <img
      src={dataUrl || undefined}
      alt={alt}
      draggable={draggable}
      className={className}
      style={{
        ...style,
        opacity: !dataUrl && loading ? 0.4 : 1,
        transition: 'opacity 0.15s ease-out',
      }}
    />
  );
}
