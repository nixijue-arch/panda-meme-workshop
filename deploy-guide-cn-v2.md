# MemeForge 表情包生成器 — Claude Agent 部署指南（中文版）

> 基于 Netlify 官方 404 排除指南编写，覆盖所有常见问题。

## 项目概述

这是一个**熊猫头表情包生成网站**（SPA单页应用），用户可以：
- 选择11种熊猫头身体模板 + 15种人脸表情
- 人脸自动对齐到熊猫头眼睛位置
- 添加文字、左右翻转、旋转素材
- 随机组合 / 一键换图 / AI推荐文案
- 预览并下载高清PNG表情包

## 技术栈

- React 19 + TypeScript + Vite + Tailwind CSS
- html2canvas（截图导出）+ react-draggable（拖拽）

---

## 你拿到的文件

一个 `xiongmaotou.zip` 压缩包，**解压后会得到一个 `xiongmaotou/` 文件夹**。

```
xiongmaotou/                    ← 这就是你的发布目录（Publish Directory）
├── index.html                  ← SPA 入口，必须在发布目录根下
├── _redirects                  ← SPA 回退规则，必须在发布目录根下
├── netlify.toml                ← Netlify 备用配置，必须在发布目录根下
├── assets/
│   ├── index-xxx.js            ← 构建后的 JS
│   ├── index-xxx.css           ← 构建后的 CSS
│   └── *.png                   ← 26张表情包素材（11熊猫头 + 15人脸）
```

---

## ⚠️ 部署前必看：Netlify 404 的 4 个主要原因

根据 Netlify 官方支持指南（https://answers.netlify.com/t/support-guide/125），404 主要有以下原因：

### 原因1：发布目录配置错误（最常见！）

**问题**：你把 `xiongmaotou` 作为一个子文件夹上传了，导致文件实际路径变成 `https://xxx.netlify.app/xiongmaotou/index.html`，而不是 `https://xxx.netlify.app/index.html`。

**解决**：上传时**不要**把 `xiongmaotou` 当作子文件夹。正确的做法是：
- 进入 `xiongmaotou` 文件夹内部
- 选中里面**所有文件**（index.html、_redirects、netlify.toml、assets/）
- 把这些文件直接拖到 Netlify Drop 上

或者：
- 在 Netlify 设置中，将 **Publish directory** 设置为 `/xiongmaotou`

### 原因2：SPA 回退规则文件缺失或位置错误

**问题**：单页应用刷新时会404，因为 Netlify 找不到对应路径的 HTML 文件。

**解决**：确保以下文件存在，并且放在**发布目录的根目录**下（和 index.html 同级）：

- `_redirects` 文件内容：
  ```
  /* /index.html 200
  ```
- `netlify.toml` 文件内容：
  ```toml
  [[redirects]]
    from = "/*"
    to = "/index.html"
    status = 200
  ```

### 原因3：资源文件路径错误（JS/CSS/图片加载失败）

**问题**：index.html 里引用的 CSS/JS 路径是相对路径 `./assets/...`，但如果发布目录配置错误，这些路径就会404。

**解决**：确认 index.html 中引用的资源路径是否可访问。如果路径是 `./assets/index-xxx.js`，确保 `assets/` 文件夹和 `index.html` 在同一目录下。

### 原因4：浏览器缓存

**问题**：修改后仍然看到旧的404页面。

**解决**：清除浏览器缓存，或使用无痕模式/强制刷新（Ctrl+F5）访问。

---

## 部署步骤（Netlify Drop）

### Step 1：检查文件完整性

解压 `xiongmaotou.zip` 后，确认以下文件存在：

```
xiongmaotou/
├── index.html          ✅ 必须存在
├── _redirects          ✅ 必须存在
├── netlify.toml        ✅ 必须存在
└── assets/             ✅ 必须存在，里面有 JS/CSS/PNG
```

### Step 2：上传（两种正确方式）

**方式A：直接上传文件夹内容（推荐）**

1. 打开 https://app.netlify.com/drop
2. 进入解压后的 `xiongmaotou` 文件夹
3. 选中**所有文件和文件夹**（Ctrl+A / Cmd+A）
4. **直接拖拽**到 Netlify Drop 页面上（不要拖拽 `xiongmaotou` 这个外层文件夹本身）
5. 等待上传完成（约 10 秒）
6. 获得 `xxx.netlify.app` 域名

**方式B：上传外层文件夹，然后配置发布目录**

1. 拖拽整个 `xiongmaotou` 文件夹到 Netlify Drop
2. 部署完成后，进入 **Site settings** → **Build & deploy** → **Continuous Deployment**
3. 找到 **Publish directory**，设置为 `xiongmaotou`
4. 点击 **Deploy site** 重新部署

### Step 3：验证部署

部署完成后，按以下清单逐项验证：

#### A. 基础访问测试
- [ ] 打开 `https://xxx.netlify.app`，首页正常显示，不是404
- [ ] **刷新页面（F5）**，不显示404
- [ ] 在地址栏输入 `https://xxx.netlify.app/abc`（任意不存在的路径），应该回退到首页而不是404

#### B. 文件完整性验证
- [ ] 按 F12 打开浏览器开发者工具 → Network 面板
- [ ] 刷新页面，确认没有红色（404）的请求
- [ ] 确认 `assets/index-xxx.js` 和 `assets/index-xxx.css` 加载成功（状态码 200）
- [ ] 确认 `assets/*.png` 图片加载成功

#### C. 功能测试
- [ ] 左侧点击任意熊猫头 → 画布出现白色底熊猫头
- [ ] 左侧点击任意人脸 → 人脸叠加到熊猫头眼睛位置
- [ ] 右侧点击"随机组合" → 生成完整表情包
- [ ] 右侧点击"一键换图" → 熊猫头和人脸同时更换
- [ ] 右侧点击"推荐文字" → 底部出现随机有趣文案
- [ ] 点击画布上的素材 → 右侧出现"调整素材"面板
- [ ] 点击"左右翻转" → 素材水平镜像
- [ ] 拖动"旋转角度"滑块 → 素材旋转
- [ ] 点击"下载表情" → 弹出PNG下载

---

## ⚠️ 如果仍然看到 404

### 排查步骤 1：确认发布目录

1. 进入 Netlify 控制台 → 您的站点 → **Deploys**
2. 点击最新的部署记录 → **Deploy file browser**
3. 确认文件结构如下：
   ```
   /
   ├── index.html
   ├── _redirects
   ├── netlify.toml
   └── assets/
       ├── index-xxx.js
       ├── index-xxx.css
       └── *.png
   ```
4. **如果看到的是**：
   ```
   /
   └── xiongmaotou/          ← 这是错误的！多了一个子文件夹层级
       ├── index.html
       └── ...
   ```
   **解决**：进入 **Site settings** → **Build & deploy**，将 **Publish directory** 改为 `xiongmaotou`，然后重新部署。

### 排查步骤 2：确认 _redirects 生效

1. 在 Deploy file browser 中，确认 `_redirects` 文件存在且内容正确
2. 直接访问 `https://xxx.netlify.app/_redirects`，应该能看到内容 `/* /index.html 200`
3. 如果看不到，说明文件未上传或位置错误

### 排查步骤 3：确认资源路径正确

1. 在浏览器中直接访问 `https://xxx.netlify.app/assets/index-xxx.js`（替换为实际的文件名）
2. 如果能看到 JS 代码，说明路径正确
3. 如果404，说明 `assets/` 文件夹位置错误，参考排查步骤1修复

### 排查步骤 4：清除缓存重试

1. 按 **Ctrl+Shift+R**（Windows）或 **Cmd+Shift+R**（Mac）强制刷新
2. 或使用浏览器无痕模式访问

---

## 品牌信息

| 项目 | 内容 |
|------|------|
| 品牌名 | `$熊猫头`（中文）/ `$PandaHead`（英文） |
| X社区 | https://x.com/xiongmaotoubnb |
| 头像制作 | https://xiongmaotouweb.linbuxiao.workers.dev/ |
| CA地址 | `0xf3525965a4ad3ca0ac13f4d2f237113691194444` |

---

## 常见问题 FAQ

**Q：上传后首页能访问，但刷新就404？**
> A：`_redirects` 或 `netlify.toml` 没有生效。请按"排查步骤2"检查。

**Q：页面能打开，但图片不显示（空白）？**
> A：`assets/` 文件夹里的 PNG 素材未上传或路径错误。请按"排查步骤1"检查文件结构。

**Q：部署后看到的是 "Page not found" 而不是我的网站？**
> A：发布目录配置错误。请按"排查步骤1"检查文件是否在根目录。

**Q：部署成功了，但功能不正常？**
> A：可能是浏览器缓存。按 Ctrl+Shift+R 强制刷新，或清除缓存后重试。

**Q：_redirects 文件在 Windows 上显示为文本文件？**
> A：正常现象。只要上传到 Netlify 后，Deploy file browser 中能看到 `_redirects` 即可。

---

## 禁止事项

- ❌ **不要** 只上传 `index.html`，必须包含所有文件
- ❌ **不要** 把 `xiongmaotou` 作为一个子文件夹上传而不配置 Publish directory
- ❌ **不要** 删除 `_redirects` 或 `netlify.toml` 文件
- ❌ **不要** 把源码（`src/`）和构建产物混着上传
- ❌ **不要** 重命名 `assets/` 文件夹或里面的文件

---

严格按照以上步骤操作，确保 `_redirects` 和 `netlify.toml` 在发布目录根目录下，这是避免 404 的关键。
