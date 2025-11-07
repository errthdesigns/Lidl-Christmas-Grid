/**
 * Glyph drawing functions - pixel-aligned for crisp rendering
 */

import type { GlyphType } from '../types';

/**
 * Draw a square glyph, pixel-aligned
 * @param ctx Canvas 2D context
 * @param cx Center x coordinate
 * @param cy Center y coordinate
 * @param size Size of the glyph (diameter/width)
 */
export function drawSquare(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number): void {
  const half = size * 0.5;
  // Snap to pixel grid for crisp rendering
  const x = Math.round(cx - half);
  const y = Math.round(cy - half);
  const w = Math.round(size);

  ctx.fillRect(x, y, w, w);
}

/**
 * Draw a circle glyph
 * @param ctx Canvas 2D context
 * @param cx Center x coordinate
 * @param cy Center y coordinate
 * @param size Size of the glyph (diameter)
 */
export function drawCircle(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number): void {
  const radius = size * 0.5;
  // Snap center to half-pixels for better anti-aliasing
  const x = Math.round(cx * 2) / 2;
  const y = Math.round(cy * 2) / 2;

  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Draw a diamond glyph (rotated square), pixel-aligned
 * @param ctx Canvas 2D context
 * @param cx Center x coordinate
 * @param cy Center y coordinate
 * @param size Size of the glyph (diameter)
 */
export function drawDiamond(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number): void {
  const half = size * 0.5;
  // Snap center to pixel grid
  const x = Math.round(cx);
  const y = Math.round(cy);

  ctx.beginPath();
  // Draw diamond: top, right, bottom, left
  ctx.moveTo(x, y - half);
  ctx.lineTo(x + half, y);
  ctx.lineTo(x, y + half);
  ctx.lineTo(x - half, y);
  ctx.closePath();
  ctx.fill();
}

/**
 * Draw a glyph based on type
 * @param ctx Canvas 2D context
 * @param glyph Glyph type to draw
 * @param cx Center x coordinate
 * @param cy Center y coordinate
 * @param size Size of the glyph
 */
export function drawGlyph(
  ctx: CanvasRenderingContext2D,
  glyph: GlyphType,
  cx: number,
  cy: number,
  size: number
): void {
  switch (glyph) {
    case 'square':
      drawSquare(ctx, cx, cy, size);
      break;
    case 'circle':
      drawCircle(ctx, cx, cy, size);
      break;
    case 'diamond':
      drawDiamond(ctx, cx, cy, size);
      break;
  }
}
