# MemeForge Panda Meme Generator — Claude Agent Deployment Guide (English)

## Project Overview

A **panda-head meme generator** (Single Page Application) featuring:
- 11 panda body templates + 15 human face expressions, faces auto-align to panda eyes
- Add text, flip horizontally, rotate elements
- Random combo / switch image / AI text suggestion (100 Chinese + 100 English captions)
- Upload custom panda/face images (not added to official library)
- Preview and download high-res PNG memes
- **Mobile responsive**: side panels become bottom floating drawers, touch support
- Chinese/English bilingual

## Tech Stack

React 19 + TypeScript + Vite + Tailwind CSS + html2canvas + react-draggable

## What You Have

A `xiongmaotou.zip` archive. When extracted:

```
├── netlify.toml              ← Root config: publish = "xiongmaotou"
└── xiongmaotou/              ← Build output
    ├── index.html            ← SPA entry
    ├── _redirects            ← SPA fallback: /* /index.html 200
    ├── netlify.toml          ← Internal backup config
    └── assets/               ← JS/CSS/26 PNG images
        ├── index-xxx.js
        ├── index-xxx.css
        └── *.png             ← 11 panda heads + 15 faces
```

## ⚠️ Before Deploying: 3 Main Causes of 404

Based on Netlify's official guide and real-world experience:

### Cause 1: Incorrect Publish Directory (Most Common)
`index.html` is inside the `xiongmaotou/` subfolder, but Netlify publishes from root by default.

**Solution**: The outer `netlify.toml` has `publish = "xiongmaotou"`, so Netlify will automatically publish from the subfolder.

### Cause 2: Missing SPA Fallback Rules
Single-page apps handle routing via JavaScript, not actual HTML files per path. Refreshing causes 404.

**Solution**: Double protection included:
- Root `netlify.toml`: `[[redirects]] from="/*" to="/index.html" status=200`
- Internal `_redirects`: `/* /index.html 200`

### Cause 3: Browser Cache
Still seeing the old page after fixes.

**Solution**: Clear cache, or use Incognito/Private mode, or force refresh with Ctrl+Shift+R.

---

## Deployment Steps (Netlify Drop)

### Step 1: Extract ZIP

Extract `xiongmaotou.zip`, confirm the structure matches above.

### Step 2: Upload to Netlify

1. Go to https://app.netlify.com/drop
2. **Drag the entire extracted folder** (containing the outer `netlify.toml` AND the `xiongmaotou/` subfolder) onto the page
3. **Do NOT** only drag the `xiongmaotou/` subfolder, and do NOT only drag `index.html`
4. Wait for upload (~10 seconds)
5. Get your `xxx.netlify.app` domain

### Step 3: Verify Deployment

**Basic Access Tests:**
- [ ] Open `https://xxx.netlify.app` — homepage loads correctly
- [ ] **Refresh the page (F5)** — does NOT show 404
- [ ] Type any non-existent path (e.g., `/abc`) — falls back to homepage

**Feature Tests (Desktop):**
- [ ] Click panda in left panel — white panda appears on canvas
- [ ] Click face in left panel — face overlays onto panda eyes (auto-aligned)
- [ ] Click "Random Combo" on right — generates complete meme
- [ ] Click "Switch Image" — panda and face change simultaneously
- [ ] Click "Text Idea" — random caption appears at bottom
- [ ] Click element on canvas — "Flip" and "Rotate" controls appear on right
- [ ] Click "Upload Panda" / "Upload Face" — select image to replace corresponding element
- [ ] Click "Download" — PNG download triggers (should NOT get stuck spinning)
- [ ] Click "EN/中文" in top-right — all UI text switches language

**Feature Tests (Mobile):**
- [ ] Access via phone or browser dev tools mobile simulation
- [ ] 🐼 floating button at bottom-left — tap to open material drawer
- [ ] ↥ floating button at bottom-right — tap to open tools panel
- [ ] Canvas auto-scales to fit screen width
- [ ] Touch-drag elements to move them

---

## Critical Notes

### Asset Integrity
`xiongmaotou/assets/` MUST contain **26 PNGs**:
- 11 panda heads: `panda-head.png`, `panda-salute.png`, `panda-stand.png`, `panda-lie.png`, `panda-crossarm.png`, `panda-side.png`, `panda-railing.png`, `panda-plane.png`, `panda-lean.png`, `panda-hand.png`, `panda-question.png`
- 15 faces: `face-01.png` through `face-15.png`

### Naming Convention (Uploaded Materials)
- Uploaded panda: `name = "upload-panda-${timestamp}"`
- Uploaded face: `name = "upload-face-${timestamp}"`
- Official materials: keep original `id` naming

### Exclusivity Logic
- **At most one panda** on canvas (official or uploaded; new replaces old)
- **At most one face** on canvas (official or uploaded; new replaces old)
- This "one panda + one face" **can coexist**
- Uploaded materials **do NOT join the official library** on the left panel

---

## If You Still See 404

### Troubleshoot 1: Check Publish Directory
1. Go to Netlify Console → Site → **Deploys**
2. Click latest deploy → **Deploy file browser**
3. Confirm structure is:
   ```
   /
   ├── index.html          ← at root
   ├── _redirects
   └── assets/
   ```
4. **If you see this instead**:
   ```
   /
   └── xiongmaotou/        ← WRONG! Extra folder level
       ├── index.html
   ```
   **Fix**: Go to Site settings → Build & deploy → Publish directory, set to `xiongmaotou`, then redeploy

### Troubleshoot 2: Check _redirects is Working
1. Directly visit `https://xxx.netlify.app/_redirects`
2. Should show: `/* /index.html 200`
3. If not visible, file was not uploaded or is misplaced

### Troubleshoot 3: Clear Cache
1. Press Ctrl+Shift+R (Windows) / Cmd+Shift+R (Mac) to force refresh
2. Or use Incognito/Private mode

---

## Brand Information

| Item | Content |
|------|---------|
| Brand | `$熊猫头` |
| X Community | https://x.com/xiongmaotoubnb |
| Avatar Maker | https://xiongmaotouweb.linbuxiao.workers.dev/ |
| CA Address | `0xf3525965a4ad3ca0ac13f4d2f237113691194444` |

---

## Do NOT Do These

- ❌ **Do NOT** only upload `index.html` or only the `xiongmaotou/` subfolder
- ❌ **Do NOT** delete `netlify.toml` or `_redirects` files
- ❌ **Do NOT** rename the `assets/` folder
- ❌ **Do NOT** mix source code with build output

Follow the steps above strictly. The outer `netlify.toml` with `publish = "xiongmaotou"` is the key to avoiding 404 errors.
