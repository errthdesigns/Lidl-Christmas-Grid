/**
 * Main App component with controls and canvas layout
 */

import { useRef, useCallback, useState } from 'react';
import { useKnitStore } from './state/useKnitStore';
import { KnitCanvas } from './canvas/KnitCanvas';
import { exportPNG, exportGIF, exportMP4 } from './lib/export';
import type { KnitParams } from './types';
import './App.css';

export function App() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { params, updateParam, applyPreset, setImage, image, setVideoFile, videoFile } = useKnitStore();
  const [isExporting, setIsExporting] = useState(false);

  /**
   * Extract a frame from video and convert to ImageBitmap
   */
  const extractVideoFrame = useCallback(async (file: File): Promise<ImageBitmap> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      let objectUrl: string | null = null;
      
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;

      const cleanup = () => {
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
          objectUrl = null;
        }
        video.src = '';
        video.load();
      };

      video.onloadedmetadata = () => {
        // Seek to first frame (or 0.1s to ensure frame is loaded)
        video.currentTime = 0.1;
      };

      video.onseeked = () => {
        try {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0);
          
          // Convert canvas to ImageBitmap
          createImageBitmap(canvas)
            .then((bitmap) => {
              cleanup();
              resolve(bitmap);
            })
            .catch((error) => {
              cleanup();
              reject(error);
            });
        } catch (error) {
          cleanup();
          reject(error);
        }
      };

      video.onerror = () => {
        cleanup();
        reject(new Error('Failed to load video'));
      };

      objectUrl = URL.createObjectURL(file);
      video.src = objectUrl;
    });
  }, []);

  /**
   * Load image or video from file and crop to 1:1 square
   */
  const loadImage = useCallback(async (file: File) => {
    try {
      let bitmap: ImageBitmap;
      
      if (file.type.startsWith('video/')) {
        // Store video file for animation
        setVideoFile(file);
        // Extract frame from video for initial display
        bitmap = await extractVideoFrame(file);
      } else {
        // Clear video file if loading an image
        setVideoFile(null);
        // Load image directly
        bitmap = await createImageBitmap(file);
      }
      
      // Crop to square (1:1 ratio) - center crop
      const size = Math.min(bitmap.width, bitmap.height);
      const x = (bitmap.width - size) / 2;
      const y = (bitmap.height - size) / 2;
      
      // Create a square version of the image
      const squareBitmap = await createImageBitmap(bitmap, x, y, size, size);
      
      // Clean up original bitmap
      bitmap.close();
      
      setImage(squareBitmap);
      
      // Announce to screen readers
      const announcement = document.getElementById('aria-live-region');
      if (announcement) {
        const fileType = file.type.startsWith('video/') ? 'Video' : 'Image';
        announcement.textContent = `${fileType} loaded: ${file.name}`;
      }
    } catch (error) {
      console.error('Failed to load file:', error);
      const fileType = file.type.startsWith('video/') ? 'video' : 'image';
      alert(`Failed to load ${fileType}. Please try a different file.`);
    }
  }, [setImage, setVideoFile, extractVideoFrame]);

  /**
   * Handle file input change
   */
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && (file.type.startsWith('image/') || file.type.startsWith('video/'))) {
      loadImage(file);
    }
  }, [loadImage]);

  /**
   * Handle drag and drop
   */
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files[0];
    if (file && (file.type.startsWith('image/') || file.type.startsWith('video/'))) {
      loadImage(file);
    }
  }, [loadImage]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  /**
   * Process video frames through knit grid algorithm
   */
  const processVideoFrames = useCallback(async (
    file: File,
    currentParams: KnitParams,
    size: number
  ): Promise<HTMLCanvasElement[]> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      let objectUrl: string | null = null;
      const frames: HTMLCanvasElement[] = [];
      const fps = 10; // Target FPS
      let frameCount = 0;

      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;

      const cleanup = () => {
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
          objectUrl = null;
        }
        video.src = '';
        video.load();
      };

      video.onloadedmetadata = () => {
        const duration = video.duration;

        // Process frames
        const processFrame = (time: number) => {
          if (time >= duration) {
            cleanup();
            resolve(frames);
            return;
          }

          video.currentTime = time;
        };

        video.onseeked = async () => {
          try {
            // Create canvas for this frame
            const frameCanvas = document.createElement('canvas');
            frameCanvas.width = size;
            frameCanvas.height = size;
            const ctx = frameCanvas.getContext('2d');
            
            if (!ctx) {
              cleanup();
              reject(new Error('Failed to get canvas context'));
              return;
            }

            // Crop video frame to square
            const videoSize = Math.min(video.videoWidth, video.videoHeight);
            const x = (video.videoWidth - videoSize) / 2;
            const y = (video.videoHeight - videoSize) / 2;

            // Draw video frame to temporary canvas
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = videoSize;
            tempCanvas.height = videoSize;
            const tempCtx = tempCanvas.getContext('2d');
            if (!tempCtx) {
              cleanup();
              reject(new Error('Failed to get temp canvas context'));
              return;
            }
            tempCtx.drawImage(video, x, y, videoSize, videoSize, 0, 0, videoSize, videoSize);

            // Convert to ImageBitmap and process through knit grid
            const bitmap = await createImageBitmap(tempCanvas);
            
            // Import render function dynamically to avoid circular dependency
            const { renderKnitFrame } = await import('./lib/render');
            renderKnitFrame(ctx, bitmap, currentParams, size);
            
            bitmap.close();
            frames.push(frameCanvas);

            // Process next frame
            frameCount++;
            const nextTime = frameCount / fps;
            if (nextTime < duration) {
              processFrame(nextTime);
            } else {
              cleanup();
              resolve(frames);
            }
          } catch (error) {
            cleanup();
            reject(error);
          }
        };

        // Start processing from first frame
        processFrame(0);
      };

      video.onerror = () => {
        cleanup();
        reject(new Error('Failed to load video'));
      };

      objectUrl = URL.createObjectURL(file);
      video.src = objectUrl;
    });
  }, []);

  /**
   * Handle PNG export
   */
  const handleExportPNG = useCallback(() => {
    // Get canvas from KnitCanvas
    const canvasElement = document.querySelector('canvas');
    if (canvasElement) {
      exportPNG(canvasElement, 'lidl-knit.png', 1080, 1080);
    } else {
      console.error('Canvas not found');
    }
  }, []);

  /**
   * Handle GIF export
   */
  const handleExportGIF = useCallback(async () => {
    if (!videoFile) return;
    
    setIsExporting(true);
    try {
      const frames = await processVideoFrames(videoFile, params, 1080);
      await exportGIF(frames, 'lidl-knit.gif', 100, 1080, 1080);
    } catch (error) {
      console.error('Failed to export GIF:', error);
      alert('Failed to export GIF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, [videoFile, params, processVideoFrames]);

  /**
   * Handle MP4 export
   */
  const handleExportMP4 = useCallback(async () => {
    if (!videoFile) return;
    
    setIsExporting(true);
    try {
      const frames = await processVideoFrames(videoFile, params, 1080);
      await exportMP4(frames, 'lidl-knit.mp4', 10, 1080, 1080);
    } catch (error) {
      console.error('Failed to export MP4:', error);
      alert('Failed to export MP4. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, [videoFile, params, processVideoFrames]);

  /**
   * Clamp value to range
   */
  const clamp = (value: number, min: number, max: number): number => {
    return Math.max(min, Math.min(max, value));
  };

  return (
    <div className="app">
      <div className="app-header">
        <h1>Lidl Knit Grid</h1>
      </div>

      <div className="app-layout">
        {/* Left Panel: Controls */}
        <div className="controls-panel">
          {/* Drop Zone */}
          <div
            className="drop-zone"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            role="button"
            tabIndex={0}
            aria-label="Drop image or video here or click to select"
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileChange}
              style={{ display: 'none' }}
              aria-label="Select image or video file"
            />
            <div className="drop-zone-content">
              {image ? (
                <span>✓ File loaded</span>
              ) : (
                <>
                  <span>📁 Drop image or video here</span>
                  <span className="drop-zone-hint">or click to browse</span>
                </>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="controls">
            <div className="control-group">
              <label htmlFor="stitch-size">
                Stitch Size (px)
                <span className="control-value">{params.stitchPx.toFixed(0)}</span>
              </label>
              <input
                id="stitch-size"
                type="range"
                min="8"
                max="50"
                step="1"
                value={params.stitchPx}
                onChange={(e) => updateParam('stitchPx', clamp(parseFloat(e.target.value), 8, 50))}
                aria-valuemin={8}
                aria-valuemax={50}
                aria-valuenow={params.stitchPx}
              />
            </div>

            <div className="control-group">
              <label htmlFor="palette-mix">
                Palette Mix
                <span className="control-value">{(params.paletteMix * 100).toFixed(0)}%</span>
              </label>
              <input
                id="palette-mix"
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={params.paletteMix}
                onChange={(e) => updateParam('paletteMix', clamp(parseFloat(e.target.value), 0, 1))}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={params.paletteMix * 100}
              />
            </div>

            <div className="control-group">
              <label htmlFor="dither">
                Dither
                <span className="control-value">{(params.dither * 100).toFixed(0)}%</span>
              </label>
              <input
                id="dither"
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={params.dither}
                onChange={(e) => updateParam('dither', clamp(parseFloat(e.target.value), 0, 1))}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={params.dither * 100}
              />
            </div>

            <div className="control-group">
              <label htmlFor="contrast">
                Contrast
                <span className="control-value">{params.contrast.toFixed(2)}</span>
              </label>
              <input
                id="contrast"
                type="range"
                min="0.5"
                max="1.5"
                step="0.01"
                value={params.contrast}
                onChange={(e) => updateParam('contrast', clamp(parseFloat(e.target.value), 0.5, 1.5))}
                aria-valuemin={0.5}
                aria-valuemax={1.5}
                aria-valuenow={params.contrast}
              />
            </div>

            <div className="control-group">
              <label htmlFor="saturation">
                Saturation
                <span className="control-value">{params.saturation.toFixed(2)}</span>
              </label>
              <input
                id="saturation"
                type="range"
                min="0"
                max="2"
                step="0.01"
                value={params.saturation}
                onChange={(e) => updateParam('saturation', clamp(parseFloat(e.target.value), 0, 2))}
                aria-valuemin={0}
                aria-valuemax={2}
                aria-valuenow={params.saturation}
              />
            </div>

            <div className="control-group">
              <label htmlFor="edge-crispness">
                Edge Crispness
                <span className="control-value">{(params.edgeCrispness * 100).toFixed(0)}%</span>
              </label>
              <input
                id="edge-crispness"
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={params.edgeCrispness}
                onChange={(e) => updateParam('edgeCrispness', clamp(parseFloat(e.target.value), 0, 1))}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={params.edgeCrispness * 100}
              />
            </div>

            <div className="control-group">
              <label htmlFor="grid-lines">
                <input
                  id="grid-lines"
                  type="checkbox"
                  checked={params.showGridLines}
                  onChange={(e) => updateParam('showGridLines', e.target.checked)}
                />
                Show Grid Lines
              </label>
            </div>
          </div>

          {/* Presets */}
          <div className="presets">
            <h3>Presets</h3>
            <div className="preset-buttons">
              <button
                onClick={() => applyPreset('classic')}
                aria-label="Apply Classic Knit preset"
              >
                Classic Knit
              </button>
              <button
                onClick={() => applyPreset('airy')}
                aria-label="Apply Airy Knit preset"
              >
                Airy Knit
              </button>
              <button
                onClick={() => applyPreset('quilted')}
                aria-label="Apply Quilted preset"
              >
                Quilted
              </button>
            </div>
          </div>

          {/* Export */}
          <div className="export-section">
            <button
              onClick={handleExportPNG}
              className="export-button"
              disabled={!image || isExporting}
              aria-label="Export current knit grid as PNG"
            >
              Export PNG (1080×1080)
            </button>
            {videoFile && (
              <>
                <button
                  onClick={handleExportGIF}
                  className="export-button"
                  disabled={isExporting}
                  aria-label="Export video as animated GIF"
                >
                  {isExporting ? 'Exporting...' : 'Export GIF'}
                </button>
                <button
                  onClick={handleExportMP4}
                  className="export-button"
                  disabled={isExporting}
                  aria-label="Export video as MP4"
                >
                  {isExporting ? 'Exporting...' : 'Export MP4'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Right Panel: Canvas */}
        <div className="canvas-panel">
          <KnitCanvas />
        </div>
      </div>

      {/* ARIA live region for announcements */}
      <div
        id="aria-live-region"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }}
      />
    </div>
  );
}
