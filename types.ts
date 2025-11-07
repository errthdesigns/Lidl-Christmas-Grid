/**
 * Shared types for Lidl Knit Grid application
 */

/** Glyph shapes available for rendering */
export type GlyphType = 'diamond' | 'square' | 'circle';

/** RGB color as a tuple of three numbers in [0, 1] range */
export type RGB = [number, number, number];

/** Preset configuration names */
export type PresetName = 'classic' | 'airy' | 'quilted';

/** Knit grid parameters */
export interface KnitParams {
  /** Grid cell size in pixels */
  stitchPx: number;
  /** Palette mix amount (0 = original colors, 1 = full brand colors) */
  paletteMix: number;
  /** Dither amount (0 = no dither, 1 = full dither) */
  dither: number;
  /** Contrast multiplier (0.5 to 1.5) */
  contrast: number;
  /** Saturation multiplier (0 to 2) */
  saturation: number;
  /** Edge crispness bias (0 = no bias, 1 = strong edge bias) */
  edgeCrispness: number;
  /** Show grid lines */
  showGridLines: boolean;
}

/** Default parameters */
export const DEFAULT_PARAMS: KnitParams = {
  stitchPx: 20,
  paletteMix: 1.0, // Always use palette colors by default
  dither: 0.3,
  contrast: 1.0,
  saturation: 1.0,
  edgeCrispness: 0.2,
  showGridLines: false,
};

/** Preset configurations */
export const PRESETS: Record<PresetName, KnitParams> = {
  classic: {
    stitchPx: 20,
    paletteMix: 1.0, // Always use palette colors
    dither: 0.3,
    contrast: 1.1,
    saturation: 1.2,
    edgeCrispness: 0.2,
    showGridLines: false,
  },
  airy: {
    stitchPx: 24,
    paletteMix: 1.0, // Always use palette colors
    dither: 0.2,
    contrast: 1.0,
    saturation: 1.0,
    edgeCrispness: 0.1,
    showGridLines: false,
  },
  quilted: {
    stitchPx: 18,
    paletteMix: 1.0, // Always use palette colors
    dither: 0.35,
    contrast: 1.15,
    saturation: 1.1,
    edgeCrispness: 0.2,
    showGridLines: true,
  },
};

/** Cell data for rendering */
export interface CellData {
  /** Glyph type to render */
  glyph: GlyphType;
  /** Color to use (RGB in [0, 1]) */
  color: RGB;
  /** Whether this cell is on an edge */
  isEdge: boolean;
}
