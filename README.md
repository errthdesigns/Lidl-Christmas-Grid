# Lidl Knit Grid

A React + TypeScript application that converts images into a grid of glyphs (diamond, square, circle) using Lidl brand colors, inspired by the [Uniqode design system](https://koto.studio/work/uniqode/).

## Features

- **Image & Video Processing**: Drag & drop images or videos to convert them into knit-style mosaics
- **Video Animation**: Videos automatically animate on the canvas with the knit grid effect applied in real-time
- **Live Controls**: Adjust grid size, palette mix, dither, contrast, saturation, and edge crispness in real-time
- **Presets**: Three built-in presets (Classic Knit, Airy Knit, Quilted)
- **Export Options**: 
  - Export static images as PNG (1080×1080)
  - Export videos as animated GIF
  - Export videos as MP4 (WebM format)
- **Performance**: Optimized for 1080p images and videos with efficient Canvas2D rendering
- **Accessibility**: Keyboard navigation and screen reader support

## Tech Stack

- **React 18** with TypeScript
- **Vite** for build tooling
- **Zustand** for state management
- **Canvas2D** for rendering (no WebGL)
- **gif.js** for GIF export
- **MediaRecorder API** for MP4/WebM export
- **Vitest** for testing

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

### Tests

```bash
npm test
```

## Project Structure

```
src/
├── main.tsx              # React bootstrap
├── App.tsx               # Main app component with controls
├── App.css               # App styles
├── types.ts              # Shared TypeScript types
├── canvas/
│   └── KnitCanvas.tsx   # Canvas rendering component
├── state/
│   └── useKnitStore.ts  # Zustand store for state management
├── lib/
│   ├── glyphs.ts        # Glyph drawing functions (diamond, square, circle)
│   ├── palette.ts        # Lidl color palette and quantization
│   ├── sampler.ts        # Image sampling and downscaling
│   ├── mapping.ts        # Luminance calculation and glyph mapping
│   ├── render.ts         # Reusable rendering utility for frames
│   └── export.ts         # PNG, GIF, and MP4 export functionality
└── tests/
    ├── palette.test.ts   # Tests for palette functions
    └── mapping.test.ts   # Tests for mapping functions
```

## Usage

1. **Load an Image or Video**: Drag and drop an image or video onto the drop zone, or click to browse
   - Videos will automatically start animating on the canvas
   - Images display as static knit grids
2. **Adjust Controls**: Use the sliders to fine-tune the knit effect:
   - **Stitch Size**: Grid cell size in pixels
   - **Palette Mix**: Blend between original colors and Lidl brand colors
   - **Dither**: Add texture with Bayer dithering
   - **Contrast**: Adjust image contrast
   - **Saturation**: Adjust color saturation
   - **Edge Crispness**: Bias towards diamonds on edges for sharper outlines
   - **Grid Lines**: Toggle grid line visibility
3. **Apply Presets**: Try the built-in presets for quick results
4. **Export**: 
   - **PNG**: Export static images (always available when an image/video is loaded)
   - **GIF**: Export animated GIF from videos (only available when a video is loaded)
   - **MP4**: Export video as MP4/WebM (only available when a video is loaded)

## Lidl Brand Colors

- **Blue**: #1245AB (Primary)
- **Blue Deep**: #0F265C (Variants)
- **Yellow**: #FFE933 (Primary foreground)
- **Red**: #E31E24
- **Green**: #1D6B2B (Festive)
- **Cream**: #EEE8D5
- **Charcoal**: #404348

## Algorithm

1. **Sampling**: Image is downsampled to grid resolution using offscreen canvas
2. **Edge Detection**: Sobel operator detects edges for crisp outline rendering
3. **Color Processing**: 
   - Contrast and saturation adjustment
   - Optional Bayer dithering
   - Palette quantization to Lidl brand colors
4. **Glyph Selection**: Luminance-based mapping with edge bias:
   - Dark areas → Diamond
   - Mid tones → Square
   - Light areas → Circle
5. **Rendering**: Pixel-aligned glyphs drawn to canvas for crisp output

## Browser Support

Modern browsers with support for:
- Canvas2D API
- ImageBitmap API
- ES2020 features
- CSS Grid and Flexbox

## License

This project is for internal use.

## Credits

Design inspiration from [Koto Studio's Uniqode project](https://koto.studio/work/uniqode/).
