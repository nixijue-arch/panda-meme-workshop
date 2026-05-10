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
  faceFill?: number; // face content bbox 占 anchor 的比例，校准工具用
  className?: string;
  style?: React.CSSProperties;
  alt?: string;
  draggable?: boolean;
  onRendered?: (info: { naturalW: number; naturalH: number }) => void;
}

interface Rendered {
  key: string;
  url: string;
  naturalW: number;
  naturalH: number;
}

function makeKey(p: Props): string {
  return [p.pandaSrc, p.faceSrc, p.faceOffset.x, p.faceOffset.y, p.faceOffset.w, p.faceOffset.h, p.rotation ?? 0, p.flipX ? 1 : 0, p.size ?? 1024, p.faceFill ?? 0.95].join('|');
}

export function PandaCanvas(props: Props) {
  const { className, style, alt, draggable = false, onRendered } = props;
  const [rendered, setRendered] = useState<Rendered>({ key: '', url: '', naturalW: 0, naturalH: 0 });
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
      faceFill: props.faceFill,
    })
      .then((url) => {
        if (cancelled || reqId !== reqRef.current) return;
        // dataURL 生成的 img 加载后会在 onLoad 回调里报告尺寸；这里先记 url
        setRendered({ key: targetKey, url, naturalW: 0, naturalH: 0 });
      })
      .catch((e) => {
        if (cancelled || reqId !== reqRef.current) return;
        console.error('[PandaCanvas]', e);
      });
    return () => {
      cancelled = true;
    };
  }, [targetKey, props.pandaSrc, props.faceSrc, props.faceOffset, props.rotation, props.flipX, props.size, props.faceFill]);

  // 频闪修法（user 反馈滚轮调 rotation 时频闪）：
  // 去掉 'stale 时 opacity 0.7' 的渐变 — dataURL 是同步可用的，每次 props 变都先 dim 再渐变到 1
  // 用户视觉上就是反复闪。新 url 直接全亮显示。仅首次加载（url 空）保留 0.4 占位
  return (
    <img
      src={rendered.url || undefined}
      alt={alt}
      draggable={draggable}
      className={className}
      onLoad={(e) => {
        const im = e.currentTarget;
        if (onRendered) onRendered({ naturalW: im.naturalWidth, naturalH: im.naturalHeight });
      }}
      style={{
        ...style,
        opacity: rendered.url ? 1 : 0.4,
      }}
    />
  );
}
