/**
 * Zustand store for managing knit grid state and parameters
 */

import { create } from 'zustand';
import type { KnitParams, PresetName } from '../types';
import { DEFAULT_PARAMS, PRESETS } from '../types';

interface KnitStore {
  /** Current image source (ImageBitmap or null) */
  image: ImageBitmap | null;
  /** Current video file (if video is loaded) */
  videoFile: File | null;
  /** Current knit parameters */
  params: KnitParams;
  /** Dirty flag to trigger re-render */
  dirty: boolean;
  /** Canvas dimensions */
  canvasWidth: number;
  canvasHeight: number;
  /** Whether video is currently animating */
  isAnimating: boolean;

  /** Set the loaded image */
  setImage: (image: ImageBitmap | null) => void;
  /** Set the loaded video file */
  setVideoFile: (file: File | null) => void;
  /** Update a single parameter */
  updateParam: <K extends keyof KnitParams>(key: K, value: KnitParams[K]) => void;
  /** Apply a preset */
  applyPreset: (preset: PresetName) => void;
  /** Mark as dirty to trigger re-render */
  setDirty: (dirty: boolean) => void;
  /** Set canvas dimensions */
  setCanvasSize: (width: number, height: number) => void;
  /** Set animation state */
  setIsAnimating: (isAnimating: boolean) => void;
}

/**
 * Load params from localStorage
 */
function loadParams(): KnitParams {
  try {
    const stored = localStorage.getItem('lidl-knit-params');
    if (stored) {
      const parsed = JSON.parse(stored);
      // Validate and merge with defaults
      return { ...DEFAULT_PARAMS, ...parsed };
    }
  } catch (e) {
    console.warn('Failed to load params from localStorage', e);
  }
  return DEFAULT_PARAMS;
}

/**
 * Save params to localStorage
 */
function saveParams(params: KnitParams): void {
  try {
    localStorage.setItem('lidl-knit-params', JSON.stringify(params));
  } catch (e) {
    console.warn('Failed to save params to localStorage', e);
  }
}

/**
 * Zustand store with manual localStorage persistence
 */
export const useKnitStore = create<KnitStore>((set) => ({
  image: null,
  videoFile: null,
  params: loadParams(),
  dirty: true,
  canvasWidth: 1080,
  canvasHeight: 1080,
  isAnimating: false,

  setImage: (image) => set({ image, dirty: true }),

  setVideoFile: (file) => set({ videoFile: file }),

  updateParam: (key, value) =>
    set((state) => {
      const newParams = { ...state.params, [key]: value };
      saveParams(newParams);
      return {
        params: newParams,
        dirty: true,
      };
    }),

  applyPreset: (preset) => {
    // Create a new object to ensure reference changes
    const newParams = { ...PRESETS[preset] };
    saveParams(newParams);
    set({
      params: newParams,
      dirty: true,
    });
  },

  setDirty: (dirty) => set({ dirty }),

  setCanvasSize: (width, height) => set({ canvasWidth: width, canvasHeight: height }),

  setIsAnimating: (isAnimating) => set({ isAnimating }),
}));
