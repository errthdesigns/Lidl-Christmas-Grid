/**
 * Image sampling and downscaling functions
 */

/**
 * Sample an image into a downscaled grid
 * Uses an offscreen canvas to efficiently downsample the image
 * @param image Source image (ImageBitmap or HTMLImageElement)
 * @param cols Number of columns in the output grid
 * @param rows Number of rows in the output grid
 * @returns ImageData of the downscaled image
 */
export function sampleImage(
  image: ImageBitmap | HTMLImageElement,
  cols: number,
  rows: number
): ImageData {
  // Create offscreen canvas at target grid size
  const canvas = new OffscreenCanvas(cols, rows);
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get 2D context for sampling');
  }

  // Disable image smoothing for pixel-perfect downsampling
  ctx.imageSmoothingEnabled = false;

  // Draw image scaled to grid size
  ctx.drawImage(image, 0, 0, cols, rows);

  // Get pixel data
  return ctx.getImageData(0, 0, cols, rows);
}

/**
 * Sample a 2×2 average from the source image at a given cell position
 * This provides better quality than single-pixel sampling
 * @param image Source image
 * @param cellX Cell x coordinate (0-based)
 * @param cellY Cell y coordinate (0-based)
 * @param cellWidth Width of each cell in source image pixels
 * @param cellHeight Height of each cell in source image pixels
 * @returns RGB color [r, g, b] in [0, 1] range
 */
export function sampleCellAverage(
  image: ImageBitmap | HTMLImageElement,
  cellX: number,
  cellY: number,
  cellWidth: number,
  cellHeight: number
): [number, number, number] {
  // Create a temporary canvas to sample from
  const tempCanvas = new OffscreenCanvas(2, 2);
  const ctx = tempCanvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get 2D context for cell sampling');
  }

  // Calculate source position (center of cell)
  const srcX = cellX * cellWidth + cellWidth * 0.5 - 1;
  const srcY = cellY * cellHeight + cellHeight * 0.5 - 1;

  // Draw a 2×2 region from the source
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    image,
    srcX,
    srcY,
    2,
    2,
    0,
    0,
    2,
    2
  );

  // Get pixel data and average
  const imageData = ctx.getImageData(0, 0, 2, 2);
  const data = imageData.data;

  let r = 0, g = 0, b = 0;
  const pixelCount = 4;

  for (let i = 0; i < data.length; i += 4) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
  }

  return [
    (r / pixelCount) / 255,
    (g / pixelCount) / 255,
    (b / pixelCount) / 255,
  ];
}

/**
 * Get pixel color from ImageData at a given position
 * @param imageData ImageData from sampled image
 * @param x X coordinate (0-based)
 * @param y Y coordinate (0-based)
 * @param width Width of the image
 * @returns RGB color [r, g, b] in [0, 1] range
 */
export function getPixelFromImageData(
  imageData: ImageData,
  x: number,
  y: number,
  width: number
): [number, number, number] {
  const index = (y * width + x) * 4;
  const data = imageData.data;

  return [
    data[index] / 255,
    data[index + 1] / 255,
    data[index + 2] / 255,
  ];
}
