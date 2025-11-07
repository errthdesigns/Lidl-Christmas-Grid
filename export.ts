/**
 * Export functionality for PNG, GIF, and MP4
 */

import GIF from 'gif.js';

/**
 * Export canvas to PNG file
 * Handles device pixel ratio for high-DPI displays
 * @param canvas Canvas element to export
 * @param filename Output filename (default: 'lidl-knit.png')
 * @param targetWidth Optional target width (defaults to canvas width)
 * @param targetHeight Optional target height (defaults to canvas height)
 */
export function exportPNG(
  canvas: HTMLCanvasElement,
  filename: string = 'lidl-knit.png',
  targetWidth?: number,
  targetHeight?: number
): void {
  const width = targetWidth ?? canvas.width;
  const height = targetHeight ?? canvas.height;

  // Create export canvas at target size
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = width;
  exportCanvas.height = height;
  const ctx = exportCanvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get 2D context for export');
  }

  // Disable smoothing for crisp export
  ctx.imageSmoothingEnabled = false;

  // Draw source canvas scaled to target size
  ctx.drawImage(canvas, 0, 0, width, height);

  // Convert to blob and download
  exportCanvas.toBlob((blob) => {
    if (!blob) {
      console.error('Failed to create blob from canvas');
      return;
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 'image/png');
}

/**
 * Export frames as animated GIF
 * @param frames Array of canvas elements or ImageData representing frames
 * @param filename Output filename (default: 'lidl-knit.gif')
 * @param delay Delay between frames in milliseconds (default: 100ms = 10fps)
 * @param width Width of output GIF
 * @param height Height of output GIF
 */
export async function exportGIF(
  frames: HTMLCanvasElement[],
  filename: string = 'lidl-knit.gif',
  delay: number = 100,
  width: number = 1080,
  height: number = 1080
): Promise<void> {
  return new Promise((resolve, reject) => {
    const gif = new GIF({
      workers: 2,
      quality: 10,
      width,
      height,
      repeat: 0, // Loop forever
    });

    // Add frames
    frames.forEach((frame) => {
      gif.addFrame(frame, { delay });
    });

    gif.on('finished', (blob: Blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      resolve();
    });

    gif.on('progress', (p: number) => {
      console.log(`GIF export progress: ${Math.round(p * 100)}%`);
    });

    gif.render();
  });
}

/**
 * Export frames as MP4 video using MediaRecorder API
 * @param frames Array of canvas elements representing frames
 * @param filename Output filename (default: 'lidl-knit.mp4')
 * @param fps Frames per second (default: 10)
 * @param width Width of output video
 * @param height Height of output video
 */
export async function exportMP4(
  frames: HTMLCanvasElement[],
  filename: string = 'lidl-knit.mp4',
  fps: number = 10,
  width: number = 1080,
  height: number = 1080
): Promise<void> {
  return new Promise((resolve, reject) => {
    // Create a temporary canvas for recording
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Failed to get 2D context'));
      return;
    }

    // Create a MediaStream from the canvas
    const stream = canvas.captureStream(fps);

    // Set up MediaRecorder
    const options: MediaRecorderOptions = {
      mimeType: 'video/webm;codecs=vp9',
    };

    // Fallback to vp8 if vp9 is not supported
    if (!MediaRecorder.isTypeSupported(options.mimeType!)) {
      options.mimeType = 'video/webm;codecs=vp8';
    }

    // Final fallback
    if (!MediaRecorder.isTypeSupported(options.mimeType!)) {
      options.mimeType = 'video/webm';
    }

    const mediaRecorder = new MediaRecorder(stream, options);
    const chunks: Blob[] = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename.replace('.mp4', '.webm'); // Browser exports as webm
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      resolve();
    };

    mediaRecorder.onerror = (e) => {
      reject(e);
    };

    // Start recording
    mediaRecorder.start();

    // Draw frames at the specified FPS
    let frameIndex = 0;
    const frameInterval = 1000 / fps;

    const drawNextFrame = () => {
      if (frameIndex >= frames.length) {
        mediaRecorder.stop();
        return;
      }

      // Draw frame to canvas
      ctx.drawImage(frames[frameIndex], 0, 0, width, height);
      frameIndex++;

      setTimeout(drawNextFrame, frameInterval);
    };

    // Start drawing frames
    drawNextFrame();
  });
}
