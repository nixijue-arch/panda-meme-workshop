# MemeForge Panda Meme Generator — Claude Agent Deployment Guide (English)

> Based on Netlify's official 404 troubleshooting guide. Covers all common issues.

## Project Overview

A **panda-head meme generator** (SPA single-page application) where users can:
- Choose from 11 panda body templates + 15 human face expressions
- Auto-align faces onto panda eyes
- Add text, flip horizontally, rotate elements
- Random combo / switch image / AI text suggestion
- Preview and download high-res PNG memes

## Tech Stack

- React 19 + TypeScript + Vite + Tailwind CSS
- html2canvas (screenshot export) + react-draggable (drag elements)

---

## What You Have

A `xiongmaotou.zip` archive. **Extract it to get a `xiongmaotou/` folder**.

```
xiongmaotou/                    ← THIS is your Publish Directory
├── index.html                  ← SPA entry, must be at publish root
├── _redirects                  ← SPA fallback rule, must be at publish root
├── netlify.toml                ← Netlify config backup, must be at publish root
├── assets/
│   ├── index-xxx.js            ← Built JS bundle
│   ├── index-xxx.css           ← Built CSS bundle
│   └── *.png                   ← 26 meme assets (11 panda heads + 15 faces)
```

---

## ⚠️ Before You Deploy: 4 Main Causes of Netlify 404

Based on Netlify's official support guide (https://answers.netlify.com/t/support-guide/125):

### Cause 1: Incorrect Publish Directory (Most Common!)

**Problem**: You uploaded `xiongmaotou` as a sub-folder, so files live at `https://xxx.netlify.app/xiongmaotou/index.html` instead of `https://xxx.netlify.app/index.html`.

**Solution**: Do NOT upload `xiongmaotou` as a sub-folder. Correct approaches:

**Option A**: Enter the `xiongmaotou` folder, select ALL files inside, and drag those directly to Netlify Drop.

**Option B**: Upload the entire `xiongmaotou` folder, then set **Publish directory** to `xiongmaotou` in Netlify settings.

### Cause 2: Missing SPA Redirect Rules

**Problem**: Single-page apps handle routing via JavaScript, not actual HTML files per path. Refreshing a non-root URL causes 404 because the HTML file doesn't physically exist at that path.

**Solution**: Ensure these files exist at the **publish directory root** (same level as index.html):

- `_redirects` file contents:
  ```
  /* /index.html 200
  ```
- `netlify.toml` file contents:
  ```toml
  [[redirects]]
    from = "/*"
    to = "/index.html"
    status = 200
  ```

### Cause 3: Incorrect Asset Paths (JS/CSS/Images 404)

**Problem**: `index.html` references assets at `./assets/...`, but if the publish directory is wrong, these paths become 404.

**Solution**: After deployment, verify in browser DevTools → Network that `assets/index-xxx.js`, `assets/index-xxx.css`, and `assets/*.png` all load with HTTP 200 status.

### Cause 4: Browser Cache

**Problem**: You fixed the issue but still see the old 404 page.

**Solution**: Clear browser cache, or use Incognito/Private mode, or force refresh with Ctrl+Shift+R (Windows) / Cmd+Shift+R (Mac).

---

## Deployment Steps (Netlify Drop)

### Step 1: Verify File Integrity

After extracting `xiongmaotou.zip`, confirm these files exist:

```
xiongmaotou/
├── index.html          ✅ Must exist
├── _redirects          ✅ Must exist
├── netlify.toml        ✅ Must exist
└── assets/             ✅ Must exist, contains JS/CSS/PNGs
```

### Step 2: Upload (Two Correct Ways)

**Method A: Upload folder contents directly (Recommended)**

1. Go to https://app.netlify.com/drop
2. Enter the extracted `xiongmaotou` folder
3. Select ALL files and folders inside (Ctrl+A / Cmd+A)
4. **Drag them directly** onto the Netlify Drop page (do NOT drag the outer `xiongmaotou` folder itself)
5. Wait for upload (~10 seconds)
6. Get your `xxx.netlify.app` URL

**Method B: Upload outer folder, then configure publish directory**

1. Drag the entire `xiongmaotou` folder to Netlify Drop
2. After deployment, go to **Site settings** → **Build & deploy** → **Continuous Deployment**
3. Set **Publish directory** to `xiongmaotou`
4. Click **Deploy site** to redeploy

### Step 3: Verify Deployment

After deployment, test each item:

#### A. Basic Access Tests
- [ ] Open `https://xxx.netlify.app` — homepage loads, NOT a 404 page
- [ ] **Refresh the page (F5)** — does NOT show 404
- [ ] Type `https://xxx.netlify.app/abc` (any non-existent path) in address bar — should fall back to homepage, NOT 404

#### B. File Integrity Check
- [ ] Press F12 → Network tab
- [ ] Refresh page, confirm NO red (404) requests
- [ ] Confirm `assets/index-xxx.js` loads successfully (HTTP 200)
- [ ] Confirm `assets/index-xxx.css` loads successfully
- [ ] Confirm `assets/*.png` images load successfully

#### C. Feature Tests
- [ ] Click any panda in left panel → white-background panda appears on canvas
- [ ] Click any face in left panel → face overlays onto panda eyes
- [ ] Click "Random Combo" on right → generates complete meme
- [ ] Click "Switch Image" → panda and face change simultaneously
- [ ] Click "Text Idea" → random funny caption appears at bottom
- [ ] Click an element on canvas → "Transform" panel appears on right
- [ ] Click "Flip Horizontal" → element mirrors horizontally
- [ ] Drag "Rotation" slider → element rotates
- [ ] Click "Download" → PNG download triggers

---

## ⚠️ If You Still See 404

### Troubleshoot Step 1: Check Publish Directory

1. Go to Netlify Console → Your Site → **Deploys**
2. Click latest deploy → **Deploy file browser**
3. Confirm this structure:
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
4. **If you see this instead**:
   ```
   /
   └── xiongmaotou/          ← WRONG! Extra sub-folder level
       ├── index.html
       └── ...
   ```
   **Fix**: Go to **Site settings** → **Build & deploy**, set **Publish directory** to `xiongmaotou`, then redeploy.

### Troubleshoot Step 2: Check _redirects is Working

1. In Deploy file browser, confirm `_redirects` exists with correct content
2. Visit `https://xxx.netlify.app/_redirects` directly — should show `/* /index.html 200`
3. If not visible, the file was not uploaded or is in the wrong place

### Troubleshoot Step 3: Check Asset Paths

1. In browser, directly visit `https://xxx.netlify.app/assets/index-xxx.js` (use actual filename)
2. If you see JavaScript code → paths are correct
3. If 404 → `assets/` folder is misplaced, fix per Troubleshoot Step 1

### Troubleshoot Step 4: Clear Cache

1. Press **Ctrl+Shift+R** (Windows) or **Cmd+Shift+R** (Mac) to force refresh
2. Or use browser Incognito/Private mode

---

## Brand Information

| Item | Content |
|------|---------|
| Brand | `$熊猫头` (Chinese) / `$PandaHead` (English) |
| X Community | https://x.com/xiongmaotoubnb |
| Avatar Maker | https://xiongmaotouweb.linbuxiao.workers.dev/ |
| CA Address | `0xf3525965a4ad3ca0ac13f4d2f237113691194444` |

---

## FAQ

**Q: Homepage loads but refresh shows 404?**
> A: `_redirects` or `netlify.toml` is not taking effect. Follow Troubleshoot Step 2.

**Q: Page opens but images are blank?**
> A: PNG assets in `assets/` folder are missing or paths are wrong. Follow Troubleshoot Step 1 and Step 3.

**Q: I see "Page not found" instead of my site?**
> A: Publish directory is misconfigured. Follow Troubleshoot Step 1.

**Q: Deployment succeeded but features don't work?**
> A: Browser cache issue. Force refresh with Ctrl+Shift+R.

**Q: `_redirects` shows as a text file on Windows?**
> A: That's normal. As long as Netlify Deploy file browser shows `_redirects`, it's fine.

---

## Do NOT Do These

- ❌ **Do NOT** only upload `index.html` — must include all files
- ❌ **Do NOT** upload `xiongmaotou` as a sub-folder without setting Publish directory
- ❌ **Do NOT** delete `_redirects` or `netlify.toml`
- ❌ **Do NOT** mix source code (`src/`) with build output
- ❌ **Do NOT** rename `assets/` folder or files inside it

---

Follow the steps above strictly. Ensure `_redirects` and `netlify.toml` are at the publish directory root — this is the key to avoiding 404 errors.
