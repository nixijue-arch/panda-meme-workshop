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

interface Rendered {
  key: string;
  url: string;
}

function makeKey(p: Props): string {
  return [p.pandaSrc, p.faceSrc, p.faceOffset.x, p.faceOffset.y, p.faceOffset.w, p.faceOffset.h, p.rotation ?? 0, p.flipX ? 1 : 0, p.size ?? 1024].join('|');
}

export function PandaCanvas(props: Props) {
  const { className, style, alt, draggable = false } = props;
  const [rendered, setRendered] = useState<Rendered>({ key: '', url: '' });
  const reqRef = useRef<number>(0);
  const targetKey = makeKey(props);

  useEffect(() => {
    const reqId = ++reqRef.current;
    let cancelled = false;
    composeMeme({
      pandaSrc: props.pandaSrc,
      faceSrc: props.faceSrc,
      faceOffset: props.faceOffset,
      rotation: props.rotation,
      flipX: props.flipX,
      size: props.size,
    })
      .then((url) => {
        if (cancelled || reqId !== reqRef.current) return;
        setRendered({ key: targetKey, url });
      })
      .catch((e) => {
        if (cancelled || reqId !== reqRef.current) return;
        console.error('[PandaCanvas]', e);
      });
    return () => {
      cancelled = true;
    };
  }, [targetKey, props.pandaSrc, props.faceSrc, props.faceOffset, props.rotation, props.flipX, props.size]);

  // stale = 当前输入与上次成功 render 不一致 → 半透明指示加载中
  const stale = rendered.key !== targetKey;

  return (
    <img
      src={rendered.url || undefined}
      alt={alt}
      draggable={draggable}
      className={className}
      style={{
        ...style,
        opacity: !rendered.url ? 0.4 : stale ? 0.7 : 1,
        transition: 'opacity 0.15s ease-out',
      }}
    />
  );
}
