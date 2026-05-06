# MemeForge 表情包生成器 — Claude Agent 部署提示词（中文版）

## 项目概述

这是一个**熊猫头表情包生成网站**，用户可以：
- 选择11种熊猫头身体模板 + 15种人脸表情
- 人脸自动对齐到熊猫头的眼睛位置
- 添加文字、左右翻转、旋转素材
- 随机组合 / 一键换图 / AI推荐文案
- 预览并下载高清PNG表情包

## 技术栈

- React 19 + TypeScript
- Vite 构建工具
- Tailwind CSS
- html2canvas（截图导出）
- react-draggable（拖拽）

## 你拿到的文件

一个 `xiongmaotou.zip` 压缩包，解压后得到 `xiongmaotou/` 文件夹。

**关键文件说明：**

```
xiongmaotou/
├── index.html              ← SPA入口
├── _redirects              ← Netlify SPA回退规则（内容：/* /index.html 200）
├── netlify.toml            ← Netlify备用配置
├── assets/                 ← 构建产物（JS/CSS/图片）
│   ├── index-*.js
│   ├── index-*.css
│   └── *.png               ← 26张表情包素材（11熊猫头 + 15人脸）
```

## 部署步骤

### 方案A：Netlify Drop（推荐，无需账号）

1. 打开 https://app.netlify.com/drop
2. 将 `xiongmaotou` 文件夹**整体拖拽**到网页上
3. 等待上传完成（约10秒）
4. 获得 `xxx.netlify.app` 域名，直接访问测试

**验证清单：**
- [ ] 首页正常显示
- [ ] 点击"随机组合"按钮能生成完整表情包
- [ ] 刷新页面（F5）不出现404
- [ ] 点击"下载表情"能保存PNG

### 方案B：Netlify 绑定自定义域名

1. 部署完成后进入站点设置
2. **Domain management** → **Add custom domain**
3. 输入用户域名
4. 按提示在域名服务商处添加 CNAME 记录指向 Netlify

## ⚠️ 关键注意事项

### 1. SPA 路由问题（最重要）

本项目是单页应用（SPA），所有路由由前端处理。**必须确保**以下文件随代码一起上传：

- `_redirects` 文件内容必须是：
  ```
  /* /index.html 200
  ```
- `netlify.toml` 文件内容必须是：
  ```toml
  [[redirects]]
    from = "/*"
    to = "/index.html"
    status = 200
  ```

**如果刷新页面出现 "Page not found"，说明上述文件未生效。** 请检查：
- 文件是否上传到了根目录（和 index.html 同级）
- 文件名是否正确（不要重命名）

### 2. 素材文件完整性

`assets/` 目录必须包含 **26张PNG素材**：
- 11张熊猫头身体模板：`panda-head.png`, `panda-salute.png`, `panda-stand.png`, `panda-lie.png`, `panda-crossarm.png`, `panda-side.png`, `panda-railing.png`, `panda-plane.png`, `panda-lean.png`, `panda-hand.png`, `panda-question.png`
- 15张人脸表情：`face-01.png` ~ `face-15.png`

**缺失任何一张图片都会导致表情包显示空白。**

### 3. 不要做的事

- ❌ 不要只上传 `index.html`
- ❌ 不要把 `xiongmaotou` 文件夹改名为其他名字后上传（CSS/JS路径依赖）
- ❌ 不要删除 `_redirects` 或 `netlify.toml` 文件
- ❌ 不要把源码（`src/`）和构建产物混着上传

## 功能验证清单

部署完成后，请逐项测试：

| 功能 | 操作 | 预期结果 |
|------|------|---------|
| 选择熊猫头 | 左侧面板点击任意熊猫头 | 画布出现白色底熊猫头 |
| 选择人脸 | 左侧面板点击任意人脸 | 人脸叠加到熊猫头眼睛位置 |
| 随机组合 | 右侧"随机组合"按钮 | 随机熊猫+人脸+文字组合出现 |
| 一键换图 | 右侧"一键换图"按钮 | 熊猫头和人脸同时更换 |
| 推荐文字 | 右侧"推荐文字"按钮 | 底部文字变成随机有趣文案 |
| 左右翻转 | 选中素材 → 右侧"左右翻转" | 素材水平镜像 |
| 旋转 | 选中素材 → 右侧"旋转90°"或滑块 | 素材旋转 |
| 预览 | 右侧点击预览区域 | 显示当前画布缩略图 |
| 下载 | 右侧"下载表情"按钮 | 弹出PNG下载 |
| 中英切换 | 右上角"EN/中文"按钮 | 全站文字切换语言 |
| CA复制 | 底部CA地址旁的Copy按钮 | 地址写入剪贴板 |

## 品牌信息

- 左上角品牌：`$熊猫头`（中文）/ `$PandaHead`（英文模式显示）
- X社区链接：https://x.com/xiongmaotoubnb
- 头像制作链接：https://xiongmaotouweb.linbuxiao.workers.dev/
- CA地址：`0xf3525965a4ad3ca0ac13f4d2f237113691194444`

## 如果遇到问题

**问题1：页面空白**
- 检查浏览器控制台是否有404错误
- 确认 `assets/` 目录中的 JS/CSS 文件存在

**问题2：刷新后404**
- 确认 `_redirects` 和 `netlify.toml` 已上传
- 在Netlify控制台 **Site configuration** → **Build & deploy** → **Post processing** 中确认无错误

**问题3：素材显示空白**
- 检查 `assets/` 目录中PNG文件是否完整（共26张）
- 确认文件名大小写匹配

---

请严格按照以上步骤操作，确保 `_redirects` 和 `netlify.toml` 文件完整上传，这是避免404的关键。
