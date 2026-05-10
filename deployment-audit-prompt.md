Audit this site for deployment integrity and fix any issues that would cause "page not found" errors, missing assets, or broken functionality after deployment.
审核此站点以确保部署完整性，并修复任何可能导致"找不到网页"、资源丢失或功能损坏的问题。

Priority areas: {{PRIORITY_AREAS}}
优先领域：{{PRIORITY_AREAS}}

If no priority areas are specified, focus on **routing configuration** and **asset path resolution** — these are the most common causes of 404 errors after deployment. Apply the following checks and fixes:
如果未指定优先领域，请重点关注**路由配置**和**资源路径解析**——这些是导致部署后 404 错误最常见的原因。应用以下检查和修复：

---

## 1. SPA Route Fallback / SPA 路由回退

Ensure all deployment platforms can properly serve the single-page application when users refresh or access deep links directly.
确保所有部署平台都能在用户刷新或直接访问深层链接时正确提供单页应用。

### Vite base path / Vite 基础路径
- Check `vite.config.ts` (or `vite.config.js`).
- 检查 `vite.config.ts`（或 `vite.config.js`）。
- If deploying to the domain root, use: `base: '/'`
- 如果部署到域名根目录，使用：`base: '/'`
- If deploying to a subdirectory (e.g., GitHub Pages project site, `example.com/subpath/`), use: `base: './'` or `base: '/subpath/'`
- 如果部署到子目录（例如 GitHub Pages 项目站点，`example.com/subpath/`），使用：`base: './'` 或 `base: '/subpath/'`
- **Fix:** If the deployed URL shows 404 on refresh or direct access to non-root paths, change `base` to `'./'` for maximum compatibility.
- **修复：** 如果部署后的 URL 在刷新或直接访问非根路径时显示 404，将 `base` 改为 `'./'` 以获得最大兼容性。

### Static hosting redirect rules / 静态托管重定向规则
Create or update platform-specific redirect files in the `public/` folder (they will be copied to `dist/` during build):
在 `public/` 文件夹中创建或更新平台特定的重定向文件（构建时会复制到 `dist/`）：

| Platform 平台 | File 文件 | Required content 必需内容 |
|---|---|---|
| **Netlify** | `public/_redirects` | `/* /index.html 200` |
| **Netlify** | `public/netlify.toml` | `[[redirects]]\n  from = "/*"\n  to = "/index.html"\n  status = 200` |
| **Vercel** | `public/vercel.json` | `{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }` |
| **Cloudflare Pages** | `public/_redirects` | `/* /index.html 200` |
| **Cloudflare Pages** | `public/_routes.json` | `{ "version": 1, "include": ["/*"], "exclude": ["/assets/*"] }` |
| **GitHub Pages** | Use `base: './'` in Vite | `vite.config.ts` → `base: './'` |

- **Fix:** If any of these files are missing for the target platform, create them immediately.
- **修复：** 如果目标平台缺少任何这些文件，立即创建它们。

---

## 2. Asset Path Resolution / 资源路径解析

Verify that all static assets will load correctly after deployment, especially if the site is served from a subdirectory.
验证所有静态资源在部署后能正确加载，特别是从子目录提供服务时。

### Built index.html / 构建后的 index.html
- After running `npm run build` (or equivalent), open `dist/index.html`.
- 运行 `npm run build`（或等效命令）后，打开 `dist/index.html`。
- Check that `<script>` and `<link>` tags use **relative paths** (`./assets/...`) when `base: './'` is set, or **absolute paths** (`/assets/...`) only when deploying to the domain root.
- 检查 `<script>` 和 `<link>` 标签是否使用**相对路径**（`./assets/...`）（当设置了 `base: './'`），或仅在部署到域名根目录时使用**绝对路径**（`/assets/...`）。
- **Fix:** If paths are absolute (`/assets/...`) but the site is deployed to a subdirectory, rebuild after setting `base: './'`.
- **修复：** 如果路径是绝对路径（`/assets/...`）但站点部署到子目录，在设置 `base: './'` 后重新构建。

### In-code asset references / 代码中的资源引用
- Search the source code for hardcoded absolute paths like `src="/something"`, `href="/something"`, or `url(/something)`.
- 在源代码中搜索硬编码的绝对路径，如 `src="/something"`、`href="/something"` 或 `url(/something)`。
- **Fix:** Convert absolute paths to relative paths for any assets inside the project: `src="./something"`, `href="./something"`, or use `import` / `new URL(..., import.meta.url)` for Vite-handled assets.
- **修复：** 将项目内任何资源的绝对路径转换为相对路径：`src="./something"`、`href="./something"`，或使用 `import` / `new URL(..., import.meta.url)` 让 Vite 处理资源。

### Public folder assets / public 文件夹资源
- Ensure files in `public/` (images, fonts, JSON data) are referenced by their **post-build paths** (e.g., `/museum/image.jpg` becomes `./museum/image.jpg` if using `base: './'`).
- 确保 `public/` 中的文件（图片、字体、JSON 数据）通过其**构建后的路径**引用（例如，如果使用 `base: './'`，`/museum/image.jpg` 应变为 `./museum/image.jpg`）。
- **Fix:** Update all references to public-folder assets to match the Vite `base` configuration.
- **修复：** 更新所有对 public 文件夹资源的引用，使其与 Vite 的 `base` 配置匹配。

---

## 3. Build Output Verification / 构建输出验证

Confirm the `dist/` (or configured output directory) contains everything needed for deployment.
确认 `dist/`（或配置的输出目录）包含部署所需的一切。

### Directory structure / 目录结构
- After build, verify `dist/` contains:
- 构建后，验证 `dist/` 包含：
  - `index.html` (entry point / 入口点)
  - `assets/` directory with JS/CSS files / 包含 JS/CSS 文件的 `assets/` 目录
  - Any subdirectories from `public/` (e.g., `museum/`, `images/`) / 来自 `public/` 的任何子目录（例如 `museum/`、`images/`）
  - Platform config files (`_redirects`, `vercel.json`, `netlify.toml`) / 平台配置文件（`_redirects`、`vercel.json`、`netlify.toml`）
- **Fix:** If any critical files are missing, check `vite.config.ts` → `build.outDir` and ensure `public/` files are being copied.
- **修复：** 如果缺少任何关键文件，检查 `vite.config.ts` → `build.outDir` 并确保 `public/` 文件被复制。

### Build-time errors / 构建时错误
- Check the build log for warnings about:
- 检查构建日志中是否有以下警告：
  - "Cannot find module" / "找不到模块"
  - "Unresolved import" / "未解析的导入"
  - "Missing type definitions" / "缺少类型定义"
- **Fix:** Install missing dependencies (`npm install <package>`) or fix import paths before deploying.
- **修复：** 安装缺少的依赖（`npm install <package>`）或在部署前修复导入路径。

---

## 4. Runtime Page State / 运行时页面状态

If the app uses client-side state (e.g., `useState` in React) instead of a router to switch pages:
如果应用使用客户端状态（例如 React 中的 `useState`）而不是路由来切换页面：

- Ensure there is **no URL path change** when switching views (e.g., from `/` to `/museum`).
- 确保切换视图时**没有 URL 路径变化**（例如，从 `/` 到 `/museum`）。
- If URL paths are used without a router (react-router, etc.), add the corresponding SPA redirect rules immediately.
- 如果在没有路由（react-router 等）的情况下使用了 URL 路径，立即添加相应的 SPA 重定向规则。
- **Fix:** Either implement a proper router, or ensure all path-like navigation is handled via hash routes (`#/museum`) or query strings (`?page=museum`), which do not trigger server 404s.
- **修复：** 要么实现一个真正的路由，要么确保所有类似路径的导航通过 hash 路由（`#/museum`）或查询字符串（`?page=museum`）处理，这些不会触发服务器 404。

---

## 5. Post-Build Smoke Test / 构建后冒烟测试

Perform these manual checks on the built `dist/` folder before deploying:
在部署前，对构建的 `dist/` 文件夹执行以下手动检查：

1. Open `dist/index.html` in a text editor — confirm `<script src="...">` and `<link href="...">` point to existing files in `dist/assets/`.
   在文本编辑器中打开 `dist/index.html` — 确认 `<script src="...">` 和 `<link href="...">` 指向 `dist/assets/` 中存在的文件。
2. Serve `dist/` locally with a static server: `npx serve dist` or `python -m http.server 8080 --directory dist`
   使用静态服务器在本地提供 `dist/`：`npx serve dist` 或 `python -m http.server 8080 --directory dist`
3. Open `http://localhost:8080` — verify the app loads without console errors.
   打开 `http://localhost:8080` — 验证应用加载时没有控制台错误。
4. Refresh the page on each "view" or "page" state — confirm no 404 occurs.
   在每个"视图"或"页面"状态刷新页面 — 确认没有出现 404。
5. Check the Network tab — confirm all images, fonts, and data files load with HTTP 200.
   检查 Network 标签页 — 确认所有图片、字体和数据文件都以 HTTP 200 加载。

---

Start by checking `vite.config.ts` and the `public/` folder configuration, then run a build and verify the `dist/` output. These foundational checks prevent 99% of "page not found" and "missing asset" issues after deployment.
从检查 `vite.config.ts` 和 `public/` 文件夹配置开始，然后运行构建并验证 `dist/` 输出。这些基础检查可以预防 99% 的部署后"找不到网页"和"资源丢失"问题。
