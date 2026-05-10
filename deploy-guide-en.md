# MemeForge Panda Meme Generator — Claude Agent Deployment Guide (English)

## Project Overview

A **panda-head meme generator** where users can:
- Choose from 11 panda body templates + 15 human face expressions
- Auto-align faces onto panda eyes
- Add text, flip horizontally, rotate elements
- Random combo / switch image / AI text suggestion
- Preview and download high-res PNG memes

## Tech Stack

- React 19 + TypeScript
- Vite build tool
- Tailwind CSS
- html2canvas (screenshot export)
- react-draggable (drag elements)

## What You Have

A `xiongmaotou.zip` archive. Extract it to get the `xiongmaotou/` folder.

**Key files explained:**

```
xiongmaotou/
├── index.html              ← SPA entry point
├── _redirects              ← Netlify SPA fallback rule (content: /* /index.html 200)
├── netlify.toml            ← Netlify backup config
├── assets/                 ← Build output (JS/CSS/images)
│   ├── index-*.js
│   ├── index-*.css
│   └── *.png               ← 26 meme assets (11 panda heads + 15 faces)
```

## Deployment Steps

### Option A: Netlify Drop (Recommended, no account needed)

1. Go to https://app.netlify.com/drop
2. **Drag the entire `xiongmaotou` folder** onto the page
3. Wait for upload to complete (~10 seconds)
4. Get a `xxx.netlify.app` URL and test it

**Verification checklist:**
- [ ] Homepage loads correctly
- [ ] Clicking "Random Combo" generates a complete meme
- [ ] Refreshing the page (F5) does NOT show 404
- [ ] Clicking "Download" saves a PNG file

### Option B: Netlify with Custom Domain

1. After deployment, go to site settings
2. **Domain management** → **Add custom domain**
3. Enter the user's domain name
4. Follow prompts to add a CNAME record at the domain registrar pointing to Netlify

## ⚠️ Critical Notes

### 1. SPA Routing Issue (MOST IMPORTANT)

This is a Single Page Application (SPA). All routes are handled by the frontend. **You MUST ensure** these files are uploaded alongside the code:

- `_redirects` file content must be:
  ```
  /* /index.html 200
  ```
- `netlify.toml` file content must be:
  ```toml
  [[redirects]]
    from = "/*"
    to = "/index.html"
    status = 200
  ```

**If refreshing shows "Page not found", these files are not taking effect.** Check:
- Are the files in the root directory (same level as index.html)?
- Are the filenames correct (do not rename them)?

### 2. Asset File Integrity

The `assets/` directory MUST contain **26 PNG images**:
- 11 panda body templates: `panda-head.png`, `panda-salute.png`, `panda-stand.png`, `panda-lie.png`, `panda-crossarm.png`, `panda-side.png`, `panda-railing.png`, `panda-plane.png`, `panda-lean.png`, `panda-hand.png`, `panda-question.png`
- 15 face expressions: `face-01.png` through `face-15.png`

**Missing any image will cause blank spaces in the meme canvas.**

### 3. Do NOT Do These

- ❌ Only upload `index.html`
- ❌ Rename the `xiongmaotou` folder before uploading (CSS/JS paths depend on it)
- ❌ Delete `_redirects` or `netlify.toml` files
- ❌ Mix source code (`src/`) with build output

## Feature Verification Checklist

After deployment, test each feature:

| Feature | Action | Expected Result |
|---------|--------|-----------------|
| Choose Panda | Click any panda in left panel | White-background panda appears on canvas |
| Choose Face | Click any face in left panel | Face overlays onto panda eyes |
| Random Combo | Click "Random Combo" button | Random panda + face + text combo appears |
| Switch Image | Click "Switch Image" button | Both panda and face change simultaneously |
| Suggest Text | Click "Text Idea" button | Bottom text becomes random funny caption |
| Flip Horizontal | Select element → click "Flip Horizontal" | Element mirrors horizontally |
| Rotate | Select element → click "Rotate 90°" or slider | Element rotates |
| Preview | Click preview area on right | Shows current canvas thumbnail |
| Download | Click "Download" button | Triggers PNG download |
| Language Toggle | Click "EN/中文" button | All UI text switches language |
| CA Copy | Click Copy button next to CA address | Address copied to clipboard |

## Brand Information

- Top-left brand: `$熊猫头` (Chinese) / `$PandaHead` (English mode)
- X Community link: https://x.com/xiongmaotoubnb
- Avatar maker link: https://xiongmaotouweb.linbuxiao.workers.dev/
- CA Address: `0xf3525965a4ad3ca0ac13f4d2f237113691194444`

## Troubleshooting

**Issue 1: Blank page**
- Check browser console for 404 errors
- Confirm JS/CSS files exist in `assets/` directory

**Issue 2: 404 after refresh**
- Confirm `_redirects` and `netlify.toml` were uploaded
- In Netlify console: **Site configuration** → **Build & deploy** → **Post processing**, check for errors

**Issue 3: Assets show blank**
- Check `assets/` directory has all 26 PNG files
- Confirm filenames match exactly (case-sensitive)

---

Please follow the steps above strictly. Ensure `_redirects` and `netlify.toml` are fully uploaded — this is the key to avoiding 404 errors.
