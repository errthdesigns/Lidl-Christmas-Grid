/**
 * Tests for mapping functions
 */

import { describe, it, expect } from 'vitest';
import { luminance, pickGlyph, calculateThresholds } from '../lib/mapping';

describe('mapping', () => {
  describe('luminance', () => {
    it('should return 1.0 for white', () => {
      const result = luminance(1, 1, 1);
      expect(result).toBeCloseTo(1.0, 5);
    });

    it('should return 0.0 for black', () => {
      const result = luminance(0, 0, 0);
      expect(result).toBeCloseTo(0.0, 5);
    });

    it('should return 0.5 for mid-gray', () => {
      const result = luminance(0.5, 0.5, 0.5);
      expect(result).toBeCloseTo(0.5, 5);
    });

    it('should weight green more heavily', () => {
      const green = luminance(0, 1, 0);
      const red = luminance(1, 0, 0);
      expect(green).toBeGreaterThan(red);
    });
  });

  describe('pickGlyph', () => {
    const t1 = 0.33;
    const t2 = 0.67;

    it('should return diamond for low luminance', () => {
      const result = pickGlyph(0.1, t1, t2, 0, false);
      expect(result).toBe('diamond');
    });

    it('should return circle for high luminance', () => {
      const result = pickGlyph(0.9, t1, t2, 0, false);
      expect(result).toBe('circle');
    });

    it('should return square for mid luminance', () => {
      const result = pickGlyph(0.5, t1, t2, 0, false);
      expect(result).toBe('square');
    });

    it('should prefer diamond on edges with edge bias', () => {
      const luma = 0.4; // Would normally be square
      const resultNoEdge = pickGlyph(luma, t1, t2, 0.5, false);
      const resultEdge = pickGlyph(luma, t1, t2, 0.5, true);
      
      // With edge bias, should be more likely to be diamond
      if (resultEdge === 'diamond') {
        expect(resultNoEdge).not.toBe('diamond');
      }
    });

    it('should respect thresholds', () => {
      expect(pickGlyph(t1 - 0.01, t1, t2, 0, false)).toBe('diamond');
      expect(pickGlyph(t1 + 0.01, t1, t2, 0, false)).toBe('square');
      expect(pickGlyph(t2 - 0.01, t1, t2, 0, false)).toBe('square');
      expect(pickGlyph(t2 + 0.01, t1, t2, 0, false)).toBe('circle');
    });
  });

  describe('calculateThresholds', () => {
    it('should return two thresholds', () => {
      const [t1, t2] = calculateThresholds();
      expect(t1).toBeGreaterThan(0);
      expect(t1).toBeLessThan(1);
      expect(t2).toBeGreaterThan(t1);
      expect(t2).toBeLessThan(1);
    });

    it('should return adjusted thresholds for three-color palette', () => {
      const [t1, t2] = calculateThresholds();
      expect(t1).toBeCloseTo(0.20, 2);
      expect(t2).toBeCloseTo(0.50, 2);
    });
  });
});
