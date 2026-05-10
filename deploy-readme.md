# 熊猫头表情包工坊 (Panda Meme Workshop)

## 技术栈
- React 19 + TypeScript + Vite + Tailwind CSS
- react-draggable（拖拽组件）
- html2canvas（画布导出）
- shadcn/ui 组件库

## 项目结构
```
src/
  App.tsx              # 主入口（editor/museum/about 三页面切换）
  App.css              # 全局样式
  main.tsx             # React 渲染入口
  index.css            # Tailwind 导入
  components/          
    PhotoCropModal.tsx # 图片裁剪模态框
  context/
    MemeContext.tsx    # 全局状态管理（elements/zoom/language）
    translations.ts    # 中英双语翻译
  data/
    materials.ts       # 熊猫头(24张) + 人脸(67张)素材数据+标签
    museum-images.ts  # 99张表情包博物馆图片列表
    museum-tags.ts    # 99张表情包标签数据
  hooks/
    useMediaQuery.ts   # 移动端检测
  sections/
    Header.tsx         # 顶部导航（编辑器/博物馆/了解/CA/语言切换）
    LeftSidebar.tsx    # 左侧素材面板（熊猫头/人脸/搜索）
    CanvasArea.tsx     # 中央画板（拖拽/缩放/编辑/删除）
    RightSidebar.tsx   # 右侧工具栏（文字/导出/分享）
    Museum.tsx         # 表情博物馆（99张/搜索/标签/灯箱）
    AboutPanda.tsx     # 了解熊猫头（历史/时间线/表情包宇宙）

public/
  assets/              # 素材图片
    panda-01.png ~ panda-24.png（熊猫头24张）
    face-01.png ~ face-15.png（人脸15张）
    faces/1 (10).png ~ faces/1 (61).png（金馆长52张）
  museum/              # 99张表情包博物馆图片
  index.html
```

## 核心功能
1. **编辑器**：画布500x500，拖拽素材/文字，8方向缩放，画笔橡皮擦编辑
2. **博物馆**：99张表情包，标签搜索，Lightbox查看，一键分享X/下载/编辑
3. **了解熊猫头**：熊猫头Meme文化介绍页面，历史时间线，表情包展示
4. **导出**：html2canvas生成PNG下载
5. **分享**：复制图片到剪贴板 + 打开X分享窗口

## 部署方式
1. 构建：`npm run build` → 生成 `dist/` 目录
2. 托管：Cloudflare Pages / Vercel / Netlify（静态托管）
3. 构建命令：`npm run build`
4. 输出目录：`dist`
