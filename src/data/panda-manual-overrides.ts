// 11 panda 的手动校准 faceOffset
// 算法 align_panda.py 自动算出 11 个 shell 的 faceOffset 不可用：
// 用 alpha-bbox 取最大白色联通区会包整个 panda body（不是头脸），导致 face 漂飘
//
// 处理：肉眼看每张 PNG → 选 head 内 face anchor 椭圆 → 估 native pixel coord
// → 用 align_panda.py 同样 letterbox 公式转 350-coord
//   x_350 = native_x * scale + pad_x  (scale = min(350/NW, 350/NH))
//
// Contributed by PandaHead — github.com/jokkibtc/panda
//
// 优先级：手动 > align 自动 > 默认

export const PANDA_MANUAL_OVERRIDES: Record<string, { x: number; y: number; w: number; h: number }> = {
  'panda-01': { x: 95,  y: 92,  w: 158, h: 156 }, // 经典大头：face 居中头白区，70% of head
  'panda-06': { x: 128, y: 34,  w: 107, h: 87  }, // 叉腰款：head 在上 1/3
  'panda-07': { x: 110, y: 139, w: 136, h: 161 }, // 飞被踢：head 在下中
  'panda-10': { x: 162, y: 114, w: 124, h: 123 }, // 敬礼款：head 在中右，避开举手
  'panda-13': { x: 95,  y: 81,  w: 159, h: 168 }, // 椭圆呆萌带腮红：full head
  'panda-14': { x: 148, y: 93,  w: 160, h: 171 }, // 三角挑衅 + !!：head 在右半
  'panda-15': { x: 129, y: 136, w: 86,  h: 101 }, // 蜘蛛形：小白头在中
  'panda-17': { x: 100, y: 88,  w: 144, h: 119 }, // 黄帽顶视：face 在黄圈内
  'panda-18': { x: 114, y: 148, w: 136, h: 136 }, // 红顶冒汗：face 在卷曲身体内
  'panda-21': { x: 144, y: 58,  w: 144, h: 144 }, // 挠头思考：head 在中右
  'panda-22': { x: 69,  y: 70,  w: 112, h: 128 }, // 趴地投降：head 在左（身倾）
};
