import * as THREE from 'three';

function createTestTexture(size: number = 64): THREE.Texture {
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
  const tempCtx = tempCanvas.getContext('2d');
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
  const ctx = canvas.getContext('2d');
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

// Load, downscale, and prepare a texture for clothing images
export async function loadProcessedTexture(url: string, opts?: { maxSize?: number; mirrorX?: boolean }) {
  const maxSize = opts?.maxSize ?? 512; // lower to avoid GPU context loss
  const mirrorX = opts?.mirrorX ?? true;

  return new Promise<THREE.Texture>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        // Crop to content first
        const { canvas: tempCanvas, bounds } = cropImageToContent(img);
        
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
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('2D context unavailable');

        // Fill with average color as a safety net
        const avg = calculateAverageColor(tempCanvas, bounds);
        ctx.fillStyle = avg.getStyle();
        ctx.fillRect(0, 0, potW, potH);

        // Draw the cropped region scaled to POT canvas
        ctx.drawImage(tempCanvas, bounds.x, bounds.y, bounds.w, bounds.h, 0, 0, potW, potH);

        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.generateMipmaps = false; // fewer GPU resources
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.anisotropy = 1;

        if (mirrorX) {
          texture.wrapS = THREE.MirroredRepeatWrapping;
          texture.repeat.set(2, 1); // mirror to "cover" back side
        } else {
          texture.wrapS = THREE.RepeatWrapping;
          texture.repeat.set(1, 1);
        }
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.needsUpdate = true;

        resolve(texture);
      } catch (e) {
        console.error('[threeTexture] Failed to process texture', { url, error: e });
        try { resolve(createTestTexture(64)); } catch { reject(e as any); }
      }
    };

    img.onerror = (e) => {
      console.error('[threeTexture] Image failed to load', { url, error: e });
      try { resolve(createTestTexture(64)); } catch { reject(e as any); }
    };
    img.src = url;
  });
}
