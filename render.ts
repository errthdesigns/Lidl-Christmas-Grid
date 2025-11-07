/**
 * Rendering utilities for knit grid
 */

import { sampleImage, getPixelFromImageData } from './sampler';
import { detectEdges } from './mapping';
import {
  applyPaletteMix,
  applyDither,
  applyContrast,
  applySaturation,
  nearestBrandColor,
} from './palette';
import { drawGlyph } from './glyphs';
import type { RGB, GlyphType, KnitParams } from '../types';
import { ACTIVE_PALETTE } from './palette';

// Use the light blue from the active palette as background (#0052B0)
const BACKGROUND_COLOR: RGB = ACTIVE_PALETTE[0]; // #0052B0 - Light blue

/**
 * Render a knit grid frame from an image to a canvas context
 * @param ctx Canvas rendering context
 * @param image Source image (ImageBitmap)
 * @param params Knit parameters
 * @param size Canvas size (square)
 */
export function renderKnitFrame(
  ctx: CanvasRenderingContext2D,
  image: ImageBitmap,
  params: KnitParams,
  size: number
): void {
  // Fill background
  ctx.fillStyle = `rgb(${Math.round(BACKGROUND_COLOR[0] * 255)}, ${Math.round(BACKGROUND_COLOR[1] * 255)}, ${Math.round(BACKGROUND_COLOR[2] * 255)})`;
  ctx.fillRect(0, 0, size, size);

  // Calculate grid dimensions
  const stitchPx = Math.max(4, Math.min(100, params.stitchPx));
  const cols = Math.floor(size / stitchPx);
  const rows = Math.floor(size / stitchPx);

  if (cols === 0 || rows === 0) return;

  // Sample image to grid size
  const sampledData = sampleImage(image, cols, rows);
  const edgeMap = detectEdges(sampledData, cols, rows);

  // Render each cell
  const cellWidth = size / cols;
  const cellHeight = size / rows;
  const glyphSize = Math.min(cellWidth, cellHeight) * 0.8; // 80% of cell size

  // Disable smoothing for crisp rendering
  ctx.imageSmoothingEnabled = false;

  // Draw grid lines if enabled
  if (params.showGridLines) {
    ctx.strokeStyle = `rgba(18, 34, 91, 0.25)`;
    ctx.lineWidth = 1;
    for (let y = 0; y <= rows; y++) {
      const py = Math.round(y * cellHeight);
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(size, py);
      ctx.stroke();
    }
    for (let x = 0; x <= cols; x++) {
      const px = Math.round(x * cellWidth);
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, size);
      ctx.stroke();
    }
  }

  // Helper function to match colors with tolerance
  const colorMatch = (c1: RGB, c2: RGB, tolerance = 0.01) => {
    return Math.abs(c1[0] - c2[0]) < tolerance &&
           Math.abs(c1[1] - c2[1]) < tolerance &&
           Math.abs(c1[2] - c2[2]) < tolerance;
  };

  // First pass: determine prominent color by counting color usage
  const colorCounts = new Map<string, number>();
  const cellColors: RGB[][] = [];
  
  for (let y = 0; y < rows; y++) {
    cellColors[y] = [];
    for (let x = 0; x < cols; x++) {
      const pixelIndex = (y * cols + x) * 4;
      const alpha = sampledData.data[pixelIndex + 3] / 255;
      
      if (alpha < 0.05) {
        cellColors[y][x] = BACKGROUND_COLOR;
        continue;
      }

      // Get pixel color from sampled data
      const rgb: RGB = getPixelFromImageData(sampledData, x, y, cols);

      // Apply contrast
      const contrasted = applyContrast(rgb, params.contrast);

      // Apply saturation
      const saturated = applySaturation(contrasted, params.saturation);

      // Apply dither
      const dithered = applyDither(saturated, params.dither, x, y);

      // Apply palette mix
      let finalColor = applyPaletteMix(dithered, params.paletteMix);
      
      // Final quantization step
      finalColor = nearestBrandColor(finalColor);
      
      cellColors[y][x] = finalColor;
      
      // Skip background color in counts
      const colorKey = `${Math.round(finalColor[0] * 255)},${Math.round(finalColor[1] * 255)},${Math.round(finalColor[2] * 255)}`;
      if (!colorMatch(finalColor, BACKGROUND_COLOR)) {
        colorCounts.set(colorKey, (colorCounts.get(colorKey) || 0) + 1);
      }
    }
  }

  // Determine prominent color
  let prominentColor: RGB | null = null;
  let maxCount = 0;
  
  for (const [colorKey, count] of colorCounts.entries()) {
    if (count > maxCount) {
      maxCount = count;
      const [r, g, b] = colorKey.split(',').map(Number);
      prominentColor = [r / 255, g / 255, b / 255] as RGB;
    }
  }

  // Second pass: render with shape mapping
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const finalColor = cellColors[y][x];
      
      // Skip background color cells
      if (colorMatch(finalColor, BACKGROUND_COLOR)) {
        continue;
      }

      // Determine glyph
      let glyph: GlyphType;
      const isEdge = edgeMap[y]?.[x] ?? false;
      const isProminent = prominentColor && colorMatch(finalColor, prominentColor);
      
      if (isProminent) {
        const pattern = (x + y) % 2;
        glyph = pattern === 0 ? 'circle' : 'square';
      } else {
        glyph = 'diamond';
      }
      
      // Apply edge bias
      if (isEdge && params.edgeCrispness > 0) {
        const bias = params.edgeCrispness;
        if (Math.random() < bias * 0.3) {
          glyph = 'diamond';
        }
      }

      // Calculate cell center
      const cx = (x + 0.5) * cellWidth;
      const cy = (y + 0.5) * cellHeight;

      // Convert color to CSS string
      const r = Math.round(finalColor[0] * 255);
      const g = Math.round(finalColor[1] * 255);
      const b = Math.round(finalColor[2] * 255);
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;

      // Draw glyph
      drawGlyph(ctx, glyph, cx, cy, glyphSize);
    }
  }
}

