# MemeForge — Technical Specification

## Dependencies

### Production

| Package | Version | Purpose |
|---------|---------|---------|
| `react` | `^19.0.0` | UI framework |
| `react-dom` | `^19.0.0` | React DOM renderer |
| `html2canvas` | `^1.4.1` | Screenshot canvas DOM → PNG export |
| `react-draggable` | `^4.4.6` | Draggable canvas elements |
| `lucide-react` | `^0.460.0` | Icon set (shipped with shadcn) |
| `clsx` | `^2.1.1` | Conditional classNames |
| `tailwind-merge` | `^2.6.0` | Merge Tailwind classes without conflicts |
| `class-variance-authority` | `^0.7.1` | Component variant management (shadcn dep) |
| `@fontsource/noto-sans-sc` | `^5.0.0` | Chinese font |

### Dev

| Package | Version | Purpose |
|---------|---------|---------|
| `typescript` | `^5.7.0` | Type checking |
| `vite` | `^6.0.0` | Build tool |
| `@vitejs/plugin-react` | `^4.3.0` | React support for Vite |
| `tailwindcss` | `^3.4.0` | Utility CSS framework |
| `postcss` | `^8.4.0` | CSS processing |
| `autoprefixer` | `^10.4.0` | CSS vendor prefixes |
| `@types/react` | `^19.0.0` | React type definitions |
| `@types/react-dom` | `^19.0.0` | React DOM type definitions |

---

## Component Inventory

### Layout

| Component | Source | Reuse |
|-----------|--------|-------|
| `Header` | Custom | Single |
| `Toolbar` | Custom | Single |
| `LeftSidebar` | Custom | Single |
| `RightSidebar` | Custom | Single |
| `MainWorkspace` | Custom | Single — flex layout container |
| `Footer` | Custom | Single |

### shadcn/ui Components

| Component | Install Command | Usage |
|-----------|----------------|-------|
| `Button` | `npx shadcn add button` | Toolbar actions, dialog buttons |
| `Dialog` | `npx shadcn add dialog` | Clear confirmation modal |
| `Slider` | `npx shadcn add slider` | Size, rotation, opacity controls |
| `Tooltip` | `npx shadcn add tooltip` | Icon button labels |
| `Select` | `npx shadcn add select` | Font family dropdown |
| `Toggle` | `npx shadcn add toggle` | Bold/alignment toggles |
| `Tabs` | `npx shadcn add tabs` | Left sidebar tab switcher |

### Custom Components

| Component | Description | Key Props |
|-----------|-------------|-----------|
| `ColorPicker` | Circular swatch row with selection ring | `colors: string[]`, `value`, `onChange` |
| `MemeCanvas` | Canvas container with checkerboard bg, renders all elements | `elements`, `selectedId`, `zoom` |
| `CanvasImage` | Draggable image element on canvas | `element: ImageElement`, `selected`, `onUpdate` |
| `CanvasText` | Draggable editable text element | `element: TextElement`, `selected`, `onUpdate`, `onEdit` |
| `MaterialCard` | Draggable thumbnail in left sidebar | `image`, `label`, `onClick`, `onDragStart` |
| `TemplateCard` | Template preview card | `preview`, `label`, `onClick` |
| `PropertyPanel` | Wrapper for right sidebar property cards | `title`, `children` |
| `SegmentedControl` | Language toggle (two-option switch) | `options`, `value`, `onChange` |
| `ExportNotification` | Toast notification after export | `visible`, `onDismiss` |
| `ResizeHandles` | 4-corner resize handles for selected elements | `onResize` |

### Hooks

| Hook | Purpose |
|------|---------|
| `useMemeStore` | Central state: elements, selection, zoom, history, i18n |
| `useTranslation` | Language switching, text lookup |
| `useHistory` | Undo/redo stack management (max 50 states) |
| `useExport` | html2canvas capture → PNG download |

---

## Animation Implementation

| Animation | Library / Approach | Implementation |
|-----------|-------------------|----------------|
| Header slide-in | CSS transition | `translateY(-100%) → translateY(0)`, `transition: all 0.25s ease`, delay 0.1s |
| Sidebar slide-in (left) | CSS transition | `translateX(-100%) → translateX(0)`, delay 0.2s |
| Sidebar slide-in (right) | CSS transition | `translateX(100%) → translateX(0)`, delay 0.25s |
| Canvas entrance | CSS transition | `opacity: 0, scale(0.95) → opacity: 1, scale(1)`, spring-like with `cubic-bezier(0.175, 0.885, 0.32, 1.275)` |
| Material card stagger | CSS animation | `@keyframes fadeInUp`, `animation-delay: index * 0.05s` |
| Property panel stagger | CSS animation | Same pattern, `delay: index * 0.06s` |
| Element drag ghost | `react-draggable` + CSS | `opacity: 0.5`, `pointer-events: none`, `transform: scale(0.6)` |
| Selection marching-ants | CSS `@keyframes` | Animate `background-position` on `repeating-linear-gradient` border |
| Element delete | CSS transition | `scale(1) → scale(0.9) → scale(0)` over 150ms |
| Button hover | CSS transition | `translateY(-1px)` on hover |
| Color picker hover | CSS transition | `scale(1.1)` |
| Export notification | CSS transition | `translateY(100%) → translateY(0)`, auto-dismiss after 3s |
| Clear confirmation | Dialog component | shadcn Dialog built-in animation |
| Undo/redo crossfade | CSS transition | Canvas container `opacity` blink (0.7 → 1) over 0.2s |

---

## State & Logic

### Architecture

React Context (`MemeContext`) + `useReducer` for global state. No external state library — the state shape is simple enough for built-in React patterns.

### Reducer Actions

```typescript
type Action =
  | { type: 'ADD_ELEMENT'; element: CanvasElement }
  | { type: 'REMOVE_ELEMENT'; id: string }
  | { type: 'UPDATE_ELEMENT'; id: string; updates: Partial<CanvasElement> }
  | { type: 'SELECT_ELEMENT'; id: string | null }
  | { type: 'SET_ZOOM'; zoom: number }
  | { type: 'SET_LANGUAGE'; lang: 'zh' | 'en' }
  | { type: 'SET_TAB'; tab: 'materials' | 'templates' }
  | { type: 'CLEAR_CANVAS' }
  | { type: 'LOAD_TEMPLATE'; elements: CanvasElement[] }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'BRING_FORWARD'; id: string }
  | { type: 'SEND_BACKWARD'; id: string }
  | { type: 'REORDER_ELEMENT'; id: string; zIndex: number };
```

### History Implementation

- **Trigger**: After every `ADD_ELEMENT`, `REMOVE_ELEMENT`, `UPDATE_ELEMENT`, `CLEAR_CANVAS`, `LOAD_TEMPLATE`
- **Storage**: Array of full `elements[]` snapshots (max 50)
- **Memory optimization**: Use `structuredClone` for deep copy; evict oldest state at index 0 when exceeding 50
- **Undo**: Restore `elements` from `history[historyIndex - 1]`, decrement index
- **Redo**: Restore from `history[historyIndex + 1]`, increment index
- **Branch handling**: On new action after undo, truncate history at current index before pushing new state

### Export Flow

1. User clicks Export → set `isExporting: true`
2. Deselect all elements (hide selection borders)
3. `html2canvas(canvasRef.current, { backgroundColor: null, scale: 2 })` — `scale: 2` for 2x resolution export
4. Convert to blob, trigger download via `a.download = 'memeforge-${timestamp}.png'`
5. Re-select previously selected element
6. Set `isExporting: false`, show notification toast

### Canvas Element Positioning

- All elements use `position: absolute` within canvas container
- `(x, y)` = top-left corner in canvas coordinate space
- react-draggable provides delta-based position updates
- Bounds checking: clamp `x` and `y` so element stays within canvas

### Zoom Implementation

- CSS `transform: scale(zoom)` on canvas wrapper
- Does NOT affect element coordinates (internal model stays at 100%)
- Zoom out wrapper compensates: `transform-origin: center`, parent handles overflow

### Resize Logic

- Corner handles emit deltaX/deltaY
- For images with `lockRatio: true`: maintain aspect ratio using diagonal proportion
- For text/free elements: resize width/height independently

---

## Other Key Decisions

### DOM-over-Canvas Rendering

All canvas elements rendered as absolutely-positioned DOM nodes rather than `<canvas>` API. Rationale:
- Native text editing via `contentEditable`
- CSS styling for text effects (stroke/shadow)
- Simpler drag/resize with react-draggable
- html2canvas can snapshot DOM directly

### Image Asset Strategy

Meme face images stored in `public/assets/` as static PNG files. Fetched once on app load. No CDN — small file count, self-contained.

### Font Loading

- `@fontsource/noto-sans-sc` for Chinese support
- Impact font loaded via Google Fonts CDN for classic meme aesthetic
- `JetBrains Mono` for monospace (keyboard shortcut hints)

### Mobile Bottom Sheet

On viewport < 768px, left/right sidebars collapse into a single bottom sheet. Implementation: conditional rendering + CSS `transform: translateY()` animation. Not a separate library — simple enough for hand-rolled.
