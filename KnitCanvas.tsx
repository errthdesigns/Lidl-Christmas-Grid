/**
 * KnitCanvas component - manages canvas rendering and image processing
 */

import { useEffect, useRef, useCallback } from 'react';
import { useKnitStore } from '../state/useKnitStore';
import { renderKnitFrame } from '../lib/render';
import { LIDL_COLORS } from '../lib/palette';
import { drawGlyph } from '../lib/glyphs';
import type { RGB } from '../types';
import { ACTIVE_PALETTE } from '../lib/palette';

// Use the light blue from the active palette as background (#0052B0)
const BACKGROUND_COLOR: RGB = ACTIVE_PALETTE[0]; // #0052B0 - Light blue

/**
 * Main canvas component for rendering the knit grid
 */
export function KnitCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const videoObjectUrlRef = useRef<string | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Use selectors to ensure we react to changes
  const image = useKnitStore((state) => state.image);
  const videoFile = useKnitStore((state) => state.videoFile);
  const params = useKnitStore((state) => state.params);
  const dirty = useKnitStore((state) => state.dirty);
  const setDirty = useKnitStore((state) => state.setDirty);
  const setCanvasSize = useKnitStore((state) => state.setCanvasSize);
  const isAnimating = useKnitStore((state) => state.isAnimating);
  const setIsAnimating = useKnitStore((state) => state.setIsAnimating);

  /**
   * Render a single frame from video
   */
  const renderVideoFrame = useCallback(async (video: HTMLVideoElement, size: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Crop video frame to square
    const videoSize = Math.min(video.videoWidth, video.videoHeight);
    const x = (video.videoWidth - videoSize) / 2;
    const y = (video.videoHeight - videoSize) / 2;

    // Create temporary canvas for cropped frame
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = videoSize;
    tempCanvas.height = videoSize;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    tempCtx.drawImage(video, x, y, videoSize, videoSize, 0, 0, videoSize, videoSize);

    // Convert to ImageBitmap
    const bitmap = await createImageBitmap(tempCanvas);
    
    // Render using the utility function
    renderKnitFrame(ctx, bitmap, params, size);
    
    bitmap.close();
  }, [params]);

  /**
   * Render the knit grid to canvas
   */
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to maintain 1:1 aspect ratio
    const rect = container.getBoundingClientRect();
    const containerWidth = Math.floor(rect.width);
    const containerHeight = Math.floor(rect.height);
    
    // Use the smaller dimension to ensure square
    const size = Math.min(containerWidth, containerHeight);

    if (size === 0) return;

    canvas.width = size;
    canvas.height = size;
    setCanvasSize(size, size);

    // If no image, render placeholder
    if (!image) {
      renderPlaceholder(ctx, size, size);
      setDirty(false);
      return;
    }

    // Use the render utility function
    renderKnitFrame(ctx, image, params, size);
    setDirty(false);
  }, [image, params, setDirty, setCanvasSize]);

  /**
   * Render placeholder when no image is loaded
   */
  const renderPlaceholder = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const centerX = width / 2;
    const centerY = height / 2;
    const spacing = 80;
    const size = 40;

    ctx.fillStyle = `rgb(${Math.round(LIDL_COLORS.yellow[0] * 255)}, ${Math.round(LIDL_COLORS.yellow[1] * 255)}, ${Math.round(LIDL_COLORS.yellow[2] * 255)})`;

    // Draw example glyphs
    drawGlyph(ctx, 'diamond', centerX - spacing, centerY, size);
    drawGlyph(ctx, 'square', centerX, centerY, size);
    drawGlyph(ctx, 'circle', centerX + spacing, centerY, size);

    // Draw hint text
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Drop image here', centerX, centerY + 80);
  };

  /**
   * Setup video animation
   */
  useEffect(() => {
    if (!videoFile) {
      // Clean up video if no video file
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.src = '';
        videoRef.current.load();
        videoRef.current = null;
      }
      if (videoObjectUrlRef.current) {
        URL.revokeObjectURL(videoObjectUrlRef.current);
        videoObjectUrlRef.current = null;
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      setIsAnimating(false);
      return;
    }

    // Create video element
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    videoRef.current = video;

    const objectUrl = URL.createObjectURL(videoFile);
    videoObjectUrlRef.current = objectUrl;
    video.src = objectUrl;

    const handleLoadedMetadata = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const rect = container.getBoundingClientRect();
      const size = Math.min(Math.floor(rect.width), Math.floor(rect.height));
      if (size === 0) return;

      canvas.width = size;
      canvas.height = size;
      setCanvasSize(size, size);

      // Start animation
      setIsAnimating(true);
      video.play();

      const animate = async () => {
        if (!videoRef.current || video.paused || video.ended) {
          video.currentTime = 0;
          return;
        }

        await renderVideoFrame(video, size);
        animationFrameRef.current = requestAnimationFrame(animate);
      };

      animate();
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.load();

    return () => {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.src = '';
        videoRef.current.load();
      }
      if (videoObjectUrlRef.current) {
        URL.revokeObjectURL(videoObjectUrlRef.current);
        videoObjectUrlRef.current = null;
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      setIsAnimating(false);
    };
  }, [videoFile, renderVideoFrame, setCanvasSize, setIsAnimating]);

  /**
   * Render loop using requestAnimationFrame (for static images)
   */
  useEffect(() => {
    // Don't render static images if video is animating
    if (isAnimating) return;

    const renderLoop = () => {
      if (dirty) {
        render();
      }
      rafRef.current = requestAnimationFrame(renderLoop);
    };

    rafRef.current = requestAnimationFrame(renderLoop);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [dirty, render, isAnimating]);

  /**
   * Trigger render when params change
   * Watch individual param values to ensure we catch all changes
   */
  useEffect(() => {
    setDirty(true);
  }, [
    params.stitchPx,
    params.paletteMix,
    params.dither,
    params.contrast,
    params.saturation,
    params.edgeCrispness,
    params.showGridLines,
    setDirty,
  ]);

  /**
   * Handle container resize
   */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      setDirty(true);
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, [setDirty]);

  /**
   * Trigger initial render
   */
  useEffect(() => {
    setDirty(true);
  }, [setDirty]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: `rgb(${Math.round(BACKGROUND_COLOR[0] * 255)}, ${Math.round(BACKGROUND_COLOR[1] * 255)}, ${Math.round(BACKGROUND_COLOR[2] * 255)})`,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          imageRendering: 'pixelated', // Keep crisp at low resolutions
        }}
      />
    </div>
  );
}
