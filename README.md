```
   ___   _____ _____ _____ _____   _____                  _             _
  / _ \ /  ___/  __ \_   _|_   _| |_   _|                (_)           | |
 / /_\ \\ `--.| /  \/ | |   | |     | | ___ _ __ _ __ ___  _ _ __   __ _| |
 |  _  | `--. \ |     | |   | |     | |/ _ \ '__| '_ ` _ \| | '_ \ / _` | |
 | | | |/\__/ / \__/\_| |_ _| |_    | |  __/ |  | | | | | | | | | | (_| | |
 \_| |_/\____/ \____/\___/ \___/    \_/\___|_|  |_| |_| |_|_|_| |_|\__,_|_|
```

# ASCII Terminal — Vintage Mac Edition

### 🌐 [Live Deployment Link](https://https://crt-ascii-converter.vercel.app/)
<!-- Badges Section -->
[![Framework](https://img.shields.io/badge/Framework-React%2019-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![Bundler](https://img.shields.io/badge/Bundler-Vite%207-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev/)
[![Styling](https://img.shields.io/badge/Styling-Tailwind%20CSS%20v4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Deployment](https://img.shields.io/badge/Deployment-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/)

> Drop an image into a 1984-era Macintosh CRT and watch it dissolve into glowing phosphor-green ASCII. Pixels in, glyphs out — rendered entirely in your browser, no server round-trips.

---

## 📸 Preview

<p align="center">
  <img src="vintage-mac.png" width="900" alt="Vintage Mac ASCII Screen Preview" style="border-radius: 8px; box-shadow: 0 4px 30px rgba(0, 0, 0, 0.5);"/>
</p>

---

## Core Features

- **Interactive Mac/CRT frame** — a full-page vintage Macintosh chassis with a live, drop-target screen inset (drag any image onto the glass or click to browse).
- **Live image-to-ASCII conversion** — re-renders on every parameter change, instantly, against the cached source bitmap.
- **Floating control panel** — neon-green chrome with:
  - **Detail** slider (20–200%) — contrast pivot around mid-gray.
  - **Resolution** slider (40–240 columns) — output grid width in characters.
  - **Character matrix** dropdown — Blocks, Standard, Minimal, Detailed, Binary.
- **CRT realism** — layered scanlines, phosphor noise dots, inset glow, dashed status header.
- **Toolbar actions** — Copy to clipboard, export `.txt`, export `.png`, Invert ramp, Color mode (per-glyph source RGB).
- **Animated loader** — phosphor progress bar with `Loading NN%` readout while the bitmap decodes.

---

## Tech Stack & Architecture

| Layer        | Choice                                                              |
|--------------|---------------------------------------------------------------------|
| Framework    | **React 19** on **TanStack Start v1** (Vite 7, file-based routing)  |
| Styling      | **Tailwind CSS v4** via `@import` in `src/styles.css`, oklch tokens |
| CRT FX       | Inline CSS: `repeating-linear-gradient` scanlines, radial phosphor dots, inset box-shadow glow, scoped `.ascii-slider` thumbs |
| Imaging      | HTMLCanvasElement 2D context (`willReadFrequently: true`), `getImageData`, offscreen render-to-canvas for PNG export |
| State        | Local React state + `useCallback` / `useMemo` / `useRef` — no store, no server functions |
| Assets       | Generated background and Mac chassis PNGs imported as ES modules    |

**Route shell.** Single page at `src/routes/index.tsx`. Mac chassis is positioned with `aspectRatio: 1/1` against `100vh`; the screen overlay is absolutely placed at `left: 21% / top: 20% / width: 58% / height: 47%` to land precisely inside the bezel art at any viewport.

---

## Architecture

High-level component, state, and pipeline layout. GitHub renders the diagram inline.

```mermaid
graph TB
  subgraph Client["Browser (React 19 / TanStack Start)"]
    Route["src/routes/index.tsx<br/>Index component"]
    Panel["Floating Control Panel<br/>Detail / Res / CharSet / Invert / Color"]
    Mac["Vintage Mac Chassis<br/>(absolute screen overlay)"]
    Pre["&lt;pre&gt; glyph grid<br/>(ascii + colorData spans)"]
  end

  subgraph State["Local React State"]
    S1["detail, res, charSet,<br/>invert, color"]
    S2["ascii, colorData,<br/>loading, progress"]
    Ref["imgRef (cached HTMLImageElement)"]
  end

  subgraph Pipeline["Conversion Pipeline (useCallback convert)"]
    C1["Offscreen &lt;canvas&gt;<br/>willReadFrequently"]
    C2["getImageData →<br/>Uint8ClampedArray RGBA"]
    C3["Luminance + Contrast"]
    C4["Ramp index → glyph"]
  end

  subgraph Export["Export"]
    E1["Copy to clipboard"]
    E2[".txt download"]
    E3[".png canvas render"]
  end

  File["File input / drag-drop"] --> Load["loadFile()<br/>createObjectURL + Image"]
  Load --> Ref
  Ref --> C1
  Panel --> S1
  S1 -.triggers.-> Pipeline
  C1 --> C2 --> C3 --> C4 --> S2
  S2 --> Pre
  Pre --> Mac
  Mac --> Route
  S2 --> Export
```

---

## Data Flow: image load → canvas read → luminance → ramp mapping → render/export

```mermaid
flowchart LR
  A["Source Image<br/>(srcW × srcH)"] --> B["Downscale to grid<br/>w = res<br/>h = round(srcH/srcW · w · 0.5)"]
  B --> C["canvas.drawImage(img, 0,0, w,h)<br/>(GPU box filter)"]
  C --> D["getImageData → RGBA bytes<br/>i = (y·w + x) · 4"]
  D --> E["Rec. 601 luma<br/>Y = (0.299R + 0.587G + 0.114B) / 255"]
  E --> F["Contrast around mid-gray<br/>Y' = clamp((Y − 0.5)·c + 0.5, 0, 1)<br/>c = detail / 100"]
  F --> G["Ramp mapping<br/>ramp = invert ? reverse(chars) : chars<br/>idx = floor(Y' · (ramp.length − 1))"]
  G --> H1["ascii string<br/>(rows joined by \\n)"]
  G --> H2["colorData[y][x] = rgb(r,g,b)"]
  H1 --> R1["&lt;pre&gt; render in CRT"]
  H2 --> R1
  H1 --> R2[".txt Blob download"]
  H1 --> R3["PNG: 2D canvas<br/>fs=10px, advance=0.6·fs"]
  H2 --> R3
```

Plain-text fallback of the pipeline:

```
File ──► createObjectURL ──► <img>.onload ──► imgRef (cached)
                                   │
                                   ▼
   slider/charset change ──► convert(img) ──► setAscii + setColorData
                                   │
                                   ▼
                            <pre> glyph grid  ──►  Copy / .txt / .png
```



## Under the Hood: The ASCII Conversion Engine

### 1. Downscale with monospace aspect correction

A target grid is computed from the source dimensions and the resolution slider:

```
w = res
h = round( (srcH / srcW) * w * 0.5 )
```

The `0.5` (≈ the canonical `~0.55` monospace correction) compensates for the fact that terminal glyphs are roughly **twice as tall as they are wide**. Without it, a portrait image would render stretched vertically by a factor of two. The image is drawn into an offscreen `<canvas>` at this exact grid so each canvas pixel corresponds to one output character cell — no per-cell sampling loop, the GPU rasterizer does the box filter for us.

### 2. Per-pixel luminance (Rec. 601 luma)

`getImageData` returns a flat `Uint8ClampedArray` of RGBA bytes. For each cell:

```
Y = (0.299 · R + 0.587 · G + 0.114 · B) / 255
```

This is the Rec. 601 luma — the perceptual-brightness twin of the Rec. 709 formulation `Y = 0.2126R + 0.7152G + 0.0722B`. Both weight green heaviest because the human eye is most sensitive to it; 601 is used here for closer fidelity to the 1980s CRT phosphor response the design evokes.

### 3. Brightness / contrast adjustment

The Detail slider applies a contrast curve pivoted on mid-gray so it stretches dynamic range without shifting exposure:

```
contrast = detail / 100                       // 0.2 … 2.0
Y' = clamp( (Y − 0.5) · contrast + 0.5,  0, 1 )
```

Fully transparent source pixels (`alpha < 32`) snap to `0` or `1` depending on invert state so PNGs with alpha never speckle the background.

### 4. Character-ramp mapping

Each character set is an ordered string from darkest → lightest:

```ts
Blocks:   " ░▒▓█"
Standard: " .:-=+*#%@"
Minimal:  " .:-=+*"
Detailed: " .'`^\",:;Il!i><~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$"
Binary:   " 01"
```

The mapping is a direct index:

```
ramp = invert ? reverse(chars) : chars
idx  = floor( Y' · (ramp.length − 1) )
glyph = ramp[idx]
```

**Invert** simply reverses the ramp string — no second pass over the pixel buffer. **Color mode** stores `rgb(r,g,b)` in a parallel `colorData[y][x]` matrix and the renderer emits one `<span style={{color}}>` per glyph; PNG export rebuilds the same mapping onto a 2D canvas at `fs=10px` with a `0.6·fs` advance width to match monospace metrics.

---

### Project layout

```
src/
├── routes/
│   ├── __root.tsx        # app shell
│   └── index.tsx         # the entire ASCII terminal app
├── assets/
│   ├── bliss-bg.jpg      # full-page wallpaper
│   └── vintage-mac.png   # Mac chassis art
└── styles.css            # Tailwind v4 + design tokens
```

---

## License

MIT — do whatever you want, just don't claim you invented ASCII art.
