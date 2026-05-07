Please update the existing Panda Meme Workshop website based on the following requirements. I will provide you with a zip file containing the current codebase and image assets.

**Tech Stack:** React 19 + TypeScript + Vite + Tailwind CSS. Pure frontend static website.

**Current Status:** The site already has a basic framework with three pages (Editor, Meme Museum, and About Panda Meme). Please implement all the following changes.

---

## 1. MEME MUSEUM

1. The museum displays finished meme images. Clicking any image opens a Lightbox for full-size viewing.
2. The "Tweet" button should be renamed to "Copy Image & Go to X". It must first copy the image to clipboard (using ClipboardItem API or canvas fallback), then open `twitter.com/intent/tweet?text=...&url=...`. The share URL must include a `#meme=filename` anchor.
3. The "Save" button downloads the original image to the user's device.
4. The "Edit Meme" button loads that meme onto the editor canvas and switches to the editor page. The canvas should contain only that image as the background.
5. Remove the "Hot Collection" button (the orange star icon in the header) — it is obsolete.
6. Remove template assets from the museum: delete `1.png` (blank template) and all `Snipaste_*.png` files (screenshot templates and face blanks). Only keep genuine finished memes.
7. **Museum Edit Mode:** When clicking "Edit" from the museum and entering the editor, the site enters a locked mode — the left sidebar shows a 🔒 lock icon (mobile hides the material FAB). The right sidebar hides: Random Combo, Switch Image, Upload Panda, Upload Face, and Custom Panda Face buttons. Only Add Text, Recommend Text, text editing, Download, and Share buttons remain visible.
8. Every museum image must have at least one tag. Support search by tag (e.g., "happy", "angry"). Support tag cloud filtering.
9. Total museum images: 99 finished memes (52 original + 47 new ones).

---

## 2. EDITOR — CANVAS

10. Canvas is 500x500px with a white (#FFFFFF) background. Elements are draggable (react-draggable). Selected elements show an orange (#FF5E00) dashed border.
11. **8-direction resize handles:** Midpoints on all four edges plus all four corners (8 total). Each handle is a 10x10px circle, filled #FF5E00, with a 2px white border. Dragging any handle scales the element from that direction.
12. **Red X delete button on the top-right corner of the selection border:** 18x18px red circle (#EF4444), white X icon, 2px white border. Clicking it deletes that element.
13. **Delete / Backspace keyboard shortcut:** When any element is selected, pressing Delete or Backspace removes it.
14. **Eraser real-time sync:** In image edit mode, erasing on the canvas shows effects immediately. On pointer-up, the canvas is automatically saved to the element's `src` — no need to click "Finish" first.
15. **Edit toolbar in two rows:**
    - Row 1: Brush button, Eraser button, Color picker, Size slider
    - Row 2: Finish (green #00CC66, exits edit mode), Undo (blue #0080FF, undo last stroke), Exit (gray #888, abandon changes), Clear (dark gray #2a2a2a, restores original image)
16. **Undo supports multi-step:** Save a reference to the original image. Record a snapshot on every pointer-up (max 30 snapshots). Users can undo consecutively back to the original state.
17. **Clear restores original:** Clicking Clear reloads the original image from when edit mode was entered, covering all brush/eraser marks.
18. **"Save" button renamed to "Finish":** Clicking it exits edit mode and returns to the canvas (no file download needed).
19. **Text elements on canvas only support drag-move and 8-direction resize handles** (for font-size adjustment). No inline text editing on the canvas itself.

---

## 3. EDITOR — TEXT FEATURES

20. Add an independent **"Add Text"** button (purple #9333EA) below the "Recommend Text" button.
21. **All text editing moved to the right sidebar:** When a text element is selected, the right panel shows:
    - Text content input field
    - Font size slider (8-80px)
    - Text color picker
    - Stroke color picker
    - Stroke width slider (0-8px)
    - Left / Center / Right align buttons
    - Bold toggle button
    - Delete text button (red)
22. Text edits sync to the canvas in real-time.

---

## 4. EDITOR — MATERIAL PANELS (Left Sidebar)

23. **24 Panda Head materials** (12 original + 12 new: Oval Dazed, Triangular Provocative, Square Honest, Heart Ring, Yellow Cap, Red Top Sweat, Bed Sleep, Curtain Peep, Scratch Head, Surrender, Big Face, Pink Bow). Each has a Chinese name, English name, 2 Chinese tags, and 2 English tags.
24. **67 Face materials** (15 classic + 52 Kim Jae-hoon series). Same naming and tagging structure.
25. **Material cards must have white background (#FFFFFF)**, showing thumbnail + name + small orange tag badges. Ensure transparent images are clearly visible against the dark theme.
26. **Search box above each panel** (one for Panda, one for Faces). Search by name or tag, with real-time filtering.
27. **Face materials include `faceOffset` data** to auto-align to the current panda head's face position.

---

## 5. EDITOR — RIGHT SIDEBAR

28. **Share buttons show only icons, no text:** X and Facebook buttons display only their brand icons. Browser native tooltip on hover shows "Post to X" / "Post to Facebook".
29. **When an image is selected, show the Transform panel:** Flip Horizontal, Rotate 90°, Rotation angle slider (-180 to 180).
30. **When text is selected, show the Edit Text panel** (see item 21).

---

## 6. ABOUT PANDA MEME PAGE

31. Add an **"About Panda Meme"** page next to the museum. Add a 📖 icon tab to the Header navigation.
32. Page sections: Hero (dynamic background + title + stats) / Origin Story (3 cards) / Evolution Timeline (5 nodes, alternating left/right) / Meme Universe (static grid of 24 selected memes, **NO hover animations, NO tag filters**, pure showcase) / Status & Influence (4 cards) / Why It Lasts (4 items) / Footer (rotating quotes + "Make a Meme" button).
33. **All sections use scroll-triggered entrance animations** (IntersectionObserver).

---

## 7. HEADER NAVIGATION

34. **Three page tabs:** ✏️ Editor / 🖼️ Meme Museum / 📖 About Panda Meme. Selected tab uses green highlight (`backgroundColor: rgba(0,204,102,0.2)`, `borderColor: #00CC66`, `color: #00CC66`).
35. **CA badge:** Green abbreviated "CA: 0xf35...4444". On hover, expands to full address `0xf3525965a4ad3ca0ac13f4d2f237113691194444`. Click to copy.
36. **Language toggle:** 🌐 Chinese / English (`中/En` or `En/中`).
37. **Mobile (<768px):** Hide brand text, show only icons for tabs, hide external links (X Community, Avatar Maker), minimize CA badge, show only icon for language toggle.

---

## 8. MOBILE ADAPTATION

38. **Canvas auto-scales:** Proportionally scales down based on screen width so the full 500x500 canvas is always visible.
39. **Left panel:** Bottom sheet triggered by bottom-left FAB button 🐼. Closes automatically after selecting a material so the user returns to the canvas.
40. **Right panel:** Bottom sheet triggered by bottom-right FAB button ⚙️. Closes automatically after any action.

---

## 9. UI COLOR SPECIFICATIONS

- Main background: #0f0f0f
- Card/panel background: #1a1a1a
- Border: #2a2a2a
- Accent (orange): #FF5E00
- Success (green): #00CC66
- Canvas white: #FFFFFF
- Delete red: #EF4444
- Edit blue: #0080FF
- Material card bg: #FFFFFF

---

## FILES I WILL PROVIDE

I will upload a zip file containing:
1. The current source code (React + Vite project)
2. Editor material images (24 panda heads + 67 faces = 91 images in `public/assets/`)
3. Museum meme images (99 images in `public/museum/`)

Please update the code according to every requirement listed above and ensure each one is fully implemented.
