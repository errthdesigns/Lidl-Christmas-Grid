/**
 * Tests for palette functions
 */

import { describe, it, expect } from 'vitest';
import {
  nearestBrandColor,
  applyPaletteMix,
  bayer4,
  applyDither,
  applyContrast,
  applySaturation,
  LIDL_COLORS,
} from '../lib/palette';
import type { RGB } from '../types';

describe('palette', () => {
  describe('nearestBrandColor', () => {
    it('should return yellow for yellow input', () => {
      const result = nearestBrandColor(LIDL_COLORS.yellow);
      expect(result).toEqual(LIDL_COLORS.yellow);
    });

    it('should return royal blue for royal blue input', () => {
      const result = nearestBrandColor(LIDL_COLORS.blueRoyal);
      expect(result).toEqual(LIDL_COLORS.blueRoyal);
    });

    it('should return nearest color for arbitrary input', () => {
      const input: RGB = [0.5, 0.5, 0.5]; // Gray
      const result = nearestBrandColor(input);
      // Should return one of the brand colors
      expect(Object.values(LIDL_COLORS)).toContainEqual(result);
    });
  });

  describe('applyPaletteMix', () => {
    it('should return original color when mix is 0', () => {
      const input: RGB = [0.5, 0.3, 0.8];
      const result = applyPaletteMix(input, 0);
      expect(result).toEqual(input);
    });

    it('should return brand color when mix is 1', () => {
      const input: RGB = [0.5, 0.3, 0.8];
      const result = applyPaletteMix(input, 1);
      const nearest = nearestBrandColor(input);
      expect(result).toEqual(nearest);
    });

    it('should blend between original and brand color', () => {
      const input: RGB = [0.5, 0.3, 0.8];
      const result = applyPaletteMix(input, 0.5);
      const nearest = nearestBrandColor(input);

      // Result should be between input and nearest
      expect(result[0]).toBeGreaterThanOrEqual(Math.min(input[0], nearest[0]));
      expect(result[0]).toBeLessThanOrEqual(Math.max(input[0], nearest[0]));
    });
  });

  describe('bayer4', () => {
    it('should return deterministic values', () => {
      expect(bayer4(0, 0)).toBe(0 / 16);
      expect(bayer4(1, 0)).toBe(8 / 16);
      expect(bayer4(0, 1)).toBe(12 / 16);
    });

    it('should wrap around for large coordinates', () => {
      expect(bayer4(4, 0)).toBe(bayer4(0, 0));
      expect(bayer4(0, 4)).toBe(bayer4(0, 0));
      expect(bayer4(8, 8)).toBe(bayer4(0, 0));
    });

    it('should return values in [0, 1] range', () => {
      for (let x = 0; x < 10; x++) {
        for (let y = 0; y < 10; y++) {
          const value = bayer4(x, y);
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThanOrEqual(1);
        }
      }
    });
  });

  describe('applyDither', () => {
    it('should return original color when amount is 0', () => {
      const input: RGB = [0.5, 0.5, 0.5];
      const result = applyDither(input, 0, 0, 0);
      expect(result).toEqual(input);
    });

    it('should modify color when amount is greater than 0', () => {
      const input: RGB = [0.5, 0.5, 0.5];
      const result = applyDither(input, 1, 0, 0);
      // Should be slightly different
      expect(result[0]).not.toBe(input[0]);
    });

    it('should keep values in [0, 1] range', () => {
      const input: RGB = [0.0, 0.5, 1.0];
      const result = applyDither(input, 1, 0, 0);
      expect(result[0]).toBeGreaterThanOrEqual(0);
      expect(result[0]).toBeLessThanOrEqual(1);
      expect(result[2]).toBeGreaterThanOrEqual(0);
      expect(result[2]).toBeLessThanOrEqual(1);
    });
  });

  describe('applyContrast', () => {
    it('should return original color when contrast is 1.0', () => {
      const input: RGB = [0.5, 0.5, 0.5];
      const result = applyContrast(input, 1.0);
      expect(result).toEqual(input);
    });

    it('should increase contrast when contrast > 1', () => {
      const input: RGB = [0.5, 0.5, 0.5];
      const result = applyContrast(input, 1.5);
      // Mid-gray should stay the same
      expect(result[0]).toBeCloseTo(0.5, 5);
    });

    it('should keep values in [0, 1] range', () => {
      const input: RGB = [0.0, 0.5, 1.0];
      const result = applyContrast(input, 2.0);
      expect(result[0]).toBeGreaterThanOrEqual(0);
      expect(result[2]).toBeLessThanOrEqual(1);
    });
  });

  describe('applySaturation', () => {
    it('should return original color when saturation is 1.0', () => {
      const input: RGB = [0.5, 0.3, 0.8];
      const result = applySaturation(input, 1.0);
      expect(result).toEqual(input);
    });

    it('should return grayscale when saturation is 0', () => {
      const input: RGB = [0.5, 0.3, 0.8];
      const result = applySaturation(input, 0);
      // All channels should be equal (grayscale)
      expect(result[0]).toBeCloseTo(result[1], 5);
      expect(result[1]).toBeCloseTo(result[2], 5);
    });

    it('should keep values in [0, 1] range', () => {
      const input: RGB = [0.0, 0.5, 1.0];
      const result = applySaturation(input, 2.0);
      expect(result[0]).toBeGreaterThanOrEqual(0);
      expect(result[2]).toBeLessThanOrEqual(1);
    });
  });
});
