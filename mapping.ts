/**
 * Luminance calculation and glyph mapping functions
 */

import type { GlyphType, RGB } from '../types';

/**
 * Calculate luminance from RGB using ITU-R BT.709 weights
 * @param r Red component [0, 1]
 * @param g Green component [0, 1]
 * @param b Blue component [0, 1]
 * @returns Luminance value [0, 1]
 */
export function luminance(r: number, g: number, b: number): number {
  // ITU-R BT.709 luminance weights
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calculate luminance from RGB tuple
 */
export function luminanceFromRGB(rgb: RGB): number {
  return luminance(rgb[0], rgb[1], rgb[2]);
}

/**
 * Detect edges in downsampled image using Sobel operator
 * Returns a 2D boolean array indicating edge cells
 * @param imageData Downsampled ImageData
 * @param width Width of the image
 * @param height Height of the image
 * @returns 2D boolean array (edgeMap[y][x])
 */
export function detectEdges(imageData: ImageData, width: number, height: number): boolean[][] {
  const edgeMap: boolean[][] = [];
  const data = imageData.data;
  const threshold = 0.15; // Edge detection threshold

  // Sobel kernels
  const sobelX = [
    -1, 0, 1,
    -2, 0, 2,
    -1, 0, 1,
  ];

  const sobelY = [
    -1, -2, -1,
    0, 0, 0,
    1, 2, 1,
  ];

  for (let y = 0; y < height; y++) {
    edgeMap[y] = [];
    for (let x = 0; x < width; x++) {
      let gx = 0;
      let gy = 0;

      // Apply Sobel operator
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const px = x + kx;
          const py = y + ky;

          // Handle edges by clamping
          const clampedX = Math.max(0, Math.min(width - 1, px));
          const clampedY = Math.max(0, Math.min(height - 1, py));

          const idx = (clampedY * width + clampedX) * 4;
          const luma = luminance(data[idx] / 255, data[idx + 1] / 255, data[idx + 2] / 255);

          const kernelIdx = (ky + 1) * 3 + (kx + 1);
          gx += luma * sobelX[kernelIdx];
          gy += luma * sobelY[kernelIdx];
        }
      }

      // Calculate gradient magnitude
      const magnitude = Math.sqrt(gx * gx + gy * gy);
      edgeMap[y][x] = magnitude > threshold;
    }
  }

  return edgeMap;
}

/**
 * Pick glyph type based on luminance and edge information
 * @param luma Luminance value [0, 1]
 * @param t1 Lower threshold (below = diamond)
 * @param t2 Upper threshold (above = circle)
 * @param edgeBias Edge crispness bias [0, 1]
 * @param isEdge Whether this cell is on an edge
 * @returns Selected glyph type
 */
export function pickGlyph(
  luma: number,
  t1: number,
  t2: number,
  edgeBias: number,
  isEdge: boolean
): GlyphType {
  // Apply edge bias: prefer diamonds on edges for crisp outlines
  let adjustedLuma = luma;
  if (isEdge && edgeBias > 0) {
    // Bias towards darker (diamond) on edges
    adjustedLuma = luma * (1 - edgeBias * 0.3);
  }

  if (adjustedLuma < t1) {
    return 'diamond';
  } else if (adjustedLuma > t2) {
    return 'circle';
  } else {
    return 'square';
  }
}

/**
 * Calculate default thresholds based on luminance distribution
 * Adjusted to ensure all three shapes (diamond, square, circle) appear
 * Based on the three palette colors:
 * - Dark blue (#012464): ~0.13 luminance → diamond
 * - Light blue (#0052B0): ~0.28 luminance → square
 * - Yellow (#FFF202): ~0.89 luminance → circle
 * @returns Tuple of [t1, t2] thresholds
 */
export function calculateThresholds(): [number, number] {
  // Thresholds adjusted to better distribute the three palette colors
  // t1: between dark blue (0.13) and light blue (0.28) → ~0.20
  // t2: between light blue (0.28) and yellow (0.89) → ~0.50
  return [0.20, 0.50];
}
