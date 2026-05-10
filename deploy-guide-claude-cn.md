# MemeForge 表情包生成器 — Claude Agent 部署提示词（中文版）

## 项目概述

这是一个**熊猫头表情包生成网站**（单页应用 SPA），支持：
- 11种熊猫头身体模板 + 15种人脸表情，人脸自动对齐到熊猫头眼睛位置
- 添加文字、左右翻转、旋转素材
- 随机组合 / 一键换图 / AI推荐文案（各100条中英文）
- 上传自定义熊猫头/人脸素材（不上传至官方库）
- 预览并下载高清PNG表情包
- **手机端自适应**：左右面板变为底部浮层抽屉，触摸操作
- 中英双语切换

## 技术栈

React 19 + TypeScript + Vite + Tailwind CSS + html2canvas + react-draggable

## 你拿到的文件

一个 `xiongmaotou.zip`，解压后结构：

```
├── netlify.toml              ← 根级配置：publish = "xiongmaotou"
└── xiongmaotou/              ← 构建产物
    ├── index.html            ← SPA入口
    ├── _redirects            ← SPA回退规则：/* /index.html 200
    ├── netlify.toml          ← 内部备用配置
    └── assets/               ← JS/CSS/26张PNG素材
        ├── index-xxx.js
        ├── index-xxx.css
        └── *.png             ← 11熊猫头 + 15人脸
```

## ⚠️ 部署前必看：404 的 3 个原因

根据 Netlify 官方指南和实际踩坑经验：

### 原因1：发布目录错误（最常见）
`index.html` 在 `xiongmaotou/` 子文件夹里，Netlify 默认从根目录发布。

**解决**：外层的 `netlify.toml` 已配置 `publish = "xiongmaotou"`，Netlify 会自动从子目录发布。

### 原因2：SPA 回退规则缺失
单页应用刷新会404，因为路由由前端处理。

**解决**：已包含双重保障：
- 根级 `netlify.toml`：`[[redirects]] from="/*" to="/index.html" status=200`
- 内部 `_redirects`：`/* /index.html 200`

### 原因3：浏览器缓存
修改后仍看到旧页面。

**解决**：清除缓存，或使用无痕模式/强制刷新（Ctrl+Shift+R）。

---

## 部署步骤（Netlify Drop）

### Step 1：解压 ZIP

解压 `xiongmaotou.zip`，确认结构如上所示。

### Step 2：上传到 Netlify

1. 打开 https://app.netlify.com/drop
2. **把整个解压后的文件夹**（包含外层 `netlify.toml` 和 `xiongmaotou/` 子目录）拖到页面上
3. **不要**只拖 `xiongmaotou/` 子目录进去，也不要只拖 `index.html`
4. 等待上传完成（约10秒）
5. 获得 `xxx.netlify.app` 域名

### Step 3：验证部署

**基础访问测试：**
- [ ] 打开 `https://xxx.netlify.app` 能看到网站首页
- [ ] **刷新页面（F5）** 不出现404
- [ ] 在地址栏输入任意不存在的路径（如 `/abc`），自动回退到首页

**功能测试（桌面端）：**
- [ ] 左侧点击熊猫头 → 画布出现白色熊猫头
- [ ] 左侧点击人脸 → 人脸叠加到熊猫头眼睛位置（自动对齐）
- [ ] 右侧"随机组合" → 生成完整表情包
- [ ] 右侧"一键换图" → 熊猫头和人脸同时更换
- [ ] 右侧"推荐文字" → 底部出现随机文案
- [ ] 点击画布素材 → 右侧出现"左右翻转"和"旋转"控制
- [ ] 右侧"上传熊猫头"/"上传人脸" → 选择图片后替换对应素材
- [ ] 右侧"下载表情" → 弹出PNG下载（不要卡住转圈圈）
- [ ] 右上角"EN/中文" → 全站文字切换

**功能测试（手机端）：**
- [ ] 用手机或浏览器开发者工具模拟手机访问
- [ ] 左下角出现 🐼 浮动按钮 → 点击展开素材选择抽屉
- [ ] 右下角出现 ↥ 浮动按钮 → 点击展开工具面板
- [ ] 画布自动缩放适配屏幕宽度
- [ ] 触摸拖拽素材可以移动位置

---

## 关键注意事项

### 素材完整性
`xiongmaotou/assets/` 必须有 **26张PNG**：
- 11张熊猫头：`panda-head.png`, `panda-salute.png`, `panda-stand.png`, `panda-lie.png`, `panda-crossarm.png`, `panda-side.png`, `panda-railing.png`, `panda-plane.png`, `panda-lean.png`, `panda-hand.png`, `panda-question.png`
- 15张人脸：`face-01.png` ~ `face-15.png`

### 命名规则（上传素材）
- 上传熊猫头：`name = "upload-panda-${timestamp}"`
- 上传人脸：`name = "upload-face-${timestamp}"`
- 官方素材：保持原有 `id` 命名

### 互斥逻辑
- 画布上**最多一个熊猫头**（官方或上传的，新的替换旧的）
- 画布上**最多一个人脸**（官方或上传的，新的替换旧的）
- 这"一个熊猫头 + 一个人脸"**可以同时存在**
- 上传素材**不加入左侧官方素材库**

---

## 如果仍然看到 404

### 排查1：确认发布目录
1. 进入 Netlify 控制台 → 站点 → **Deploys**
2. 点击最新部署 → **Deploy file browser**
3. 确认文件结构是：
   ```
   /
   ├── index.html          ← 在根目录
   ├── _redirects
   └── assets/
   ```
4. 如果看到的是：
   ```
   /
   └── xiongmaotou/        ← 这是错误的！多了一个层级
       ├── index.html
   ```
   **修复**：去 Site settings → Build & deploy → Publish directory 改为 `xiongmaotou` 重新部署

### 排查2：确认 _redirects 生效
1. 直接访问 `https://xxx.netlify.app/_redirects`
2. 应该显示：`/* /index.html 200`
3. 如果看不到，说明文件没上传或位置不对

### 排查3：清除缓存
1. Ctrl+Shift+R（Windows）/ Cmd+Shift+R（Mac）强制刷新
2. 或用无痕模式访问

---

## 品牌信息

| 项目 | 内容 |
|------|------|
| 品牌 | `$熊猫头` |
| X社区 | https://x.com/xiongmaotoubnb |
| 头像制作 | https://xiongmaotouweb.linbuxiao.workers.dev/ |
| CA地址 | `0xf3525965a4ad3ca0ac13f4d2f237113691194444` |

---

## 禁止事项

- ❌ **不要** 只上传 `index.html` 或只上传 `xiongmaotou/` 子目录
- ❌ **不要** 删除 `netlify.toml` 或 `_redirects` 文件
- ❌ **不要** 重命名 `assets/` 文件夹
- ❌ **不要** 把源码和构建产物混着上传

严格按照以上步骤操作，外层 `netlify.toml` 的 `publish = "xiongmaotou"` 是避免 404 的关键。
