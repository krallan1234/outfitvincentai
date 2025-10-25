import * as THREE from 'three';

function createTestTexture(size: number = 64): THREE.Texture {
  console.log('[threeTexture] Creating checkerboard test texture');
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const cells = 8;
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      ctx.fillStyle = (x + y) % 2 ? '#9aa0a6' : '#e0e0e0';
      ctx.fillRect((x * size) / cells, (y * size) / cells, size / cells, size / cells);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

// Crop transparent or white margins from clothing images
function cropImageToContent(img: HTMLImageElement): { canvas: HTMLCanvasElement; bounds: { x: number; y: number; w: number; h: number } } {
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = img.width;
  tempCanvas.height = img.height;
  // Use willReadFrequently for better performance when reading pixels
  const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
  if (!tempCtx) throw new Error('2D context unavailable');
  
  tempCtx.drawImage(img, 0, 0);
  const imageData = tempCtx.getImageData(0, 0, img.width, img.height);
  const data = imageData.data;
  
  let minX = img.width, minY = img.height, maxX = 0, maxY = 0;
  
  // Detect bounding box of non-transparent and non-white pixels
  let foundContent = false;
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const i = (y * img.width + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
      const isContent = a > 25 && !(r > 240 && g > 240 && b > 240);
      if (isContent) {
        foundContent = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  
  // If nothing detected, use full image bounds
  if (!foundContent) {
    console.warn('[threeTexture] No content detected in image, using full bounds');
    minX = 0; minY = 0; maxX = img.width - 1; maxY = img.height - 1;
  }
  
  // Add small padding and ensure valid bounds
  const padding = 2;
  minX = Math.max(0, minX - padding);
  minY = Math.max(0, minY - padding);
  maxX = Math.min(img.width - 1, maxX + padding);
  maxY = Math.min(img.height - 1, maxY + padding);
  
  const w = Math.max(2, maxX - minX + 1);
  const h = Math.max(2, maxY - minY + 1);
  
  return { canvas: tempCanvas, bounds: { x: minX, y: minY, w, h } };
}

// Calculate average color of image for fallback fills
function calculateAverageColor(canvas: HTMLCanvasElement, bounds: { x: number; y: number; w: number; h: number }): THREE.Color {
  // Use willReadFrequently for better performance
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return new THREE.Color(0xcccccc);
  
  const imageData = ctx.getImageData(bounds.x, bounds.y, Math.min(bounds.w, 50), Math.min(bounds.h, 50));
  const data = imageData.data;
  let r = 0, g = 0, b = 0, count = 0;
  
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha > 25) { // Only count non-transparent pixels
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      count++;
    }
  }
  
  if (count === 0) return new THREE.Color(0xcccccc);
  return new THREE.Color(r / (count * 255), g / (count * 255), b / (count * 255));
}

// Load texture with retry logic and exponential backoff
export async function loadTextureWithRetry(url: string, retryCount = 0): Promise<THREE.Texture> {
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    console.log(`[threeTexture] Loading image (attempt ${retryCount + 1}/3):`, url);
    
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error(`Image load failed: ${url}`));
      img.src = url;
    });
    
    // Use createImageBitmap if available for faster decode
    let bitmap: ImageBitmap | null = null;
    if (typeof createImageBitmap !== 'undefined') {
      try {
        bitmap = await createImageBitmap(img);
        console.log('[threeTexture] Used createImageBitmap for faster decode');
      } catch (e) {
        console.warn('[threeTexture] createImageBitmap failed, using img element:', e);
      }
    }
    
    const texture = new THREE.Texture(bitmap || img);
    texture.needsUpdate = true;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    
    console.log('[threeTexture] Texture loaded successfully:', url);
    return texture;
  } catch (error) {
    console.error(`[threeTexture] Load attempt ${retryCount + 1} failed for:`, url, error);
    
    // Retry with exponential backoff (2 retries max)
    if (retryCount < 2) {
      const backoffMs = retryCount === 0 ? 200 : 600;
      console.log(`[threeTexture] Retrying after ${backoffMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
      return loadTextureWithRetry(url, retryCount + 1);
    }
    
    // All retries exhausted, return fallback checkerboard
    console.error('[threeTexture] Final failure loading', url, '- returning checkerboard fallback');
    return createTestTexture(64);
  }
}

// Load, downscale, and prepare a texture for clothing images
export async function loadProcessedTexture(url: string, opts?: { maxSize?: number; mirrorX?: boolean }) {
  const maxSize = opts?.maxSize ?? 512;
  const mirrorX = opts?.mirrorX ?? true;

  console.log('[threeTexture] Loading texture from:', url);

  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = (e) => reject(e);
      img.src = url;
    });

    console.log('[threeTexture] Image loaded successfully:', { url, width: img.width, height: img.height });
    
    // Crop to content first
    const { canvas: tempCanvas, bounds } = cropImageToContent(img);
    console.log('[threeTexture] Cropped bounds:', bounds);
    
    // Compute scaled size capped at maxSize
    const maxDim = Math.max(bounds.w, bounds.h);
    const scale = Math.min(1, maxSize / maxDim);
    const w = Math.max(2, Math.floor(bounds.w * scale));
    const h = Math.max(2, Math.floor(bounds.h * scale));

    // Ensure power-of-two dims for stability on weaker GPUs
    const toPOT = (n: number) => 2 ** Math.max(1, Math.floor(Math.log2(n)));
    const potW = Math.min(1024, toPOT(w));
    const potH = Math.min(1024, toPOT(h));

    const canvas = document.createElement('canvas');
    canvas.width = potW;
    canvas.height = potH;
    // Use willReadFrequently for better performance when reading pixels
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('2D context unavailable');

    // Fill with average color as a safety net
    const avg = calculateAverageColor(tempCanvas, bounds);
    ctx.fillStyle = avg.getStyle();
    ctx.fillRect(0, 0, potW, potH);

    // Draw the cropped region scaled to POT canvas
    ctx.drawImage(tempCanvas, bounds.x, bounds.y, bounds.w, bounds.h, 0, 0, potW, potH);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = 1;

    if (mirrorX) {
      texture.wrapS = THREE.MirroredRepeatWrapping;
      texture.repeat.set(2, 1);
    } else {
      texture.wrapS = THREE.RepeatWrapping;
      texture.repeat.set(1, 1);
    }
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.needsUpdate = true;

    console.log('[threeTexture] Texture processed successfully:', { url, dimensions: `${potW}x${potH}`, mirrorX });
    return texture;
  } catch (e) {
    console.error('[threeTexture] Failed to process texture', { url, error: e });
    console.warn('[threeTexture] Using checkerboard fallback for:', url);
    return createTestTexture(64);
  }
}
