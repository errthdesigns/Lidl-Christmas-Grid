/**
 * Lidl brand color palette and quantization functions
 */

import type { RGB } from '../types';

/**
 * Lidl brand colors in linearized RGB [0, 1] range
 * Colors are defined in sRGB and converted to linear for accurate blending
 * Exact color palette as specified
 */
export const LIDL_COLORS: Record<string, RGB> = {
  blueRoyal: [0x21 / 255, 0x51 / 255, 0xA9 / 255], // #2151A9 - Lidl Blue (royal)
  navy: [0x0B / 255, 0x23 / 255, 0x60 / 255], // #0B2360 - Lidl Navy (dark) - background
  yellow: [0xFF / 255, 0xE9 / 255, 0x33 / 255], // #FFE933 - Lidl Yellow
  yellowSoft: [0xFB / 255, 0xEB / 255, 0x81 / 255], // #FBEB81 - Soft Yellow BG (festive)
  blueMid: [0x3C / 255, 0x88 / 255, 0xCB / 255], // #3C88CB - Mid Blue accent (optional)
  // Legacy colors kept for reference but not used in active palette
  blue: [0x12 / 255, 0x45 / 255, 0xAB / 255], // #1245AB - Legacy
  blueDeep: [0x0F / 255, 0x26 / 255, 0x5C / 255], // #0F265C - Legacy
  blueLight: [0x33 / 255, 0x88 / 255, 0xCC / 255], // #3388CC - Legacy
  red: [0xE3 / 255, 0x1E / 255, 0x24 / 255], // #E31E24 - Lidl red
  green: [0x1D / 255, 0x6B / 255, 0x2B / 255], // #1D6B2B - Festive green
  cream: [0xEE / 255, 0xE8 / 255, 0xD5 / 255], // #EEE8D5 - Cream
  charcoal: [0x40 / 255, 0x43 / 255, 0x48 / 255], // #404348 - Charcoal
};

/**
 * Active palette - exact colors for image quantization
 * Only these three colors will be used
 */
export const ACTIVE_PALETTE: RGB[] = [
  [0x00 / 255, 0x52 / 255, 0xB0 / 255], // #0052B0 - Blue
  [0x01 / 255, 0x24 / 255, 0x64 / 255], // #012464 - Dark blue/navy
  [0xFF / 255, 0xF2 / 255, 0x02 / 255], // #FFF202 - Yellow
];

/**
 * Convert sRGB to linear RGB (gamma correction)
 */
function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/**
 * Convert RGB tuple from sRGB to linear
 */
function toLinear(rgb: RGB): RGB {
  return [srgbToLinear(rgb[0]), srgbToLinear(rgb[1]), srgbToLinear(rgb[2])];
}


/**
 * Calculate Euclidean distance between two RGB colors in linear space
 */
function colorDistance(a: RGB, b: RGB): number {
  const aLin = toLinear(a);
  const bLin = toLinear(b);
  const dr = aLin[0] - bLin[0];
  const dg = aLin[1] - bLin[1];
  const db = aLin[2] - bLin[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/**
 * Find the nearest Lidl brand color to the given RGB
 * Uses only the active palette (colors from reference images)
 */
export function nearestBrandColor(rgb: RGB): RGB {
  let minDist = Infinity;
  let nearest: RGB = ACTIVE_PALETTE[0];

  for (const color of ACTIVE_PALETTE) {
    const dist = colorDistance(rgb, color);
    if (dist < minDist) {
      minDist = dist;
      nearest = color;
    }
  }

  return nearest;
}

/**
 * Blend between original color and nearest brand color
 * For strict palette enforcement, always returns the nearest palette color
 * @param rgb Original RGB color
 * @param mix Mix amount (0 = original, 1 = full brand color)
 * @returns Always returns the nearest palette color (strict enforcement)
 */
export function applyPaletteMix(rgb: RGB, _mix: number): RGB {
  // Always use strict palette quantization - return nearest palette color
  // This ensures only the three palette colors are ever used
  return nearestBrandColor(rgb);
}

/**
 * 4×4 Bayer dithering matrix
 * Values are normalized to [0, 1] range
 */
const BAYER_4X4: number[] = [
  0 / 16, 8 / 16, 2 / 16, 10 / 16,
  12 / 16, 4 / 16, 14 / 16, 6 / 16,
  3 / 16, 11 / 16, 1 / 16, 9 / 16,
  15 / 16, 7 / 16, 13 / 16, 5 / 16,
];

/**
 * Get Bayer dither value for a given pixel position
 * @param x Pixel x coordinate
 * @param y Pixel y coordinate
 * @returns Dither value in [0, 1] range
 */
export function bayer4(x: number, y: number): number {
  const bx = x % 4;
  const by = y % 4;
  return BAYER_4X4[by * 4 + bx];
}

/**
 * Apply Bayer dithering to an RGB color
 * @param rgb Original RGB color
 * @param amount Dither amount (0 = no dither, 1 = full dither)
 * @param x Pixel x coordinate
 * @param y Pixel y coordinate
 * @returns Dithered RGB color
 */
export function applyDither(rgb: RGB, amount: number, x: number, y: number): RGB {
  if (amount <= 0) return rgb;

  const threshold = bayer4(x, y);
  const ditherValue = (threshold - 0.5) * amount * 0.1; // Scale to ±5% max

  return [
    Math.max(0, Math.min(1, rgb[0] + ditherValue)),
    Math.max(0, Math.min(1, rgb[1] + ditherValue)),
    Math.max(0, Math.min(1, rgb[2] + ditherValue)),
  ];
}

/**
 * Apply contrast adjustment to RGB color
 * @param rgb Original RGB color
 * @param contrast Contrast multiplier (1.0 = no change, >1 = more contrast)
 * @returns Adjusted RGB color
 */
export function applyContrast(rgb: RGB, contrast: number): RGB {
  if (contrast === 1.0) return rgb;

  // Apply contrast around 0.5 midpoint
  return [
    Math.max(0, Math.min(1, (rgb[0] - 0.5) * contrast + 0.5)),
    Math.max(0, Math.min(1, (rgb[1] - 0.5) * contrast + 0.5)),
    Math.max(0, Math.min(1, (rgb[2] - 0.5) * contrast + 0.5)),
  ];
}

/**
 * Apply saturation adjustment to RGB color
 * @param rgb Original RGB color
 * @param saturation Saturation multiplier (1.0 = no change, 0 = grayscale, >1 = more saturated)
 * @returns Adjusted RGB color
 */
export function applySaturation(rgb: RGB, saturation: number): RGB {
  if (saturation === 1.0) return rgb;

  // Convert to grayscale using luminance weights
  const luma = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];

  // Blend between grayscale and original
  return [
    Math.max(0, Math.min(1, luma + (rgb[0] - luma) * saturation)),
    Math.max(0, Math.min(1, luma + (rgb[1] - luma) * saturation)),
    Math.max(0, Math.min(1, luma + (rgb[2] - luma) * saturation)),
  ];
}
