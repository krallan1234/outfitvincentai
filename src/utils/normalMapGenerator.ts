import * as THREE from 'three';

/**
 * Generate a simple normal map from a texture using edge detection
 * This adds subtle depth to clothing textures for more realistic rendering
 */
export function generateNormalMapFromTexture(texture: THREE.Texture): THREE.Texture {
  try {
    const canvas = document.createElement('canvas');
    const size = 256; // Small size for performance
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
  
  // Draw the source texture
  const img = texture.image as HTMLCanvasElement | HTMLImageElement;
  ctx.drawImage(img, 0, 0, size, size);
  
  const imageData = ctx.getImageData(0, 0, size, size);
  const data = imageData.data;
  const normalData = new Uint8ClampedArray(data.length);
  
  // Apply Sobel operator for edge detection
  for (let y = 1; y < size - 1; y++) {
    for (let x = 1; x < size - 1; x++) {
      const i = (y * size + x) * 4;
      
      // Get surrounding pixel luminance values
      const getL = (dx: number, dy: number): number => {
        const idx = ((y + dy) * size + (x + dx)) * 4;
        return (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
      };
      
      // Sobel kernels
      const gx = (-getL(-1, -1) + getL(1, -1) +
                  -2 * getL(-1, 0) + 2 * getL(1, 0) +
                  -getL(-1, 1) + getL(1, 1)) / 4;
      
      const gy = (-getL(-1, -1) - 2 * getL(0, -1) - getL(1, -1) +
                  getL(-1, 1) + 2 * getL(0, 1) + getL(1, 1)) / 4;
      
      // Convert gradients to normal map colors
      // Normal map: R = X, G = Y, B = Z (pointing out)
      normalData[i] = Math.floor(127 + gx * 0.5);     // R channel
      normalData[i + 1] = Math.floor(127 - gy * 0.5); // G channel (inverted Y)
      normalData[i + 2] = 255;                         // B channel (Z always positive)
      normalData[i + 3] = 255;                         // Alpha
    }
  }
  
  // Handle edges (set to flat normal)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (x === 0 || x === size - 1 || y === 0 || y === size - 1) {
        const i = (y * size + x) * 4;
        normalData[i] = 127;
        normalData[i + 1] = 127;
        normalData[i + 2] = 255;
        normalData[i + 3] = 255;
      }
    }
  }
  
    ctx.putImageData(new ImageData(normalData, size, size), 0, 0);
    
    const normalTexture = new THREE.CanvasTexture(canvas);
    normalTexture.wrapS = texture.wrapS;
    normalTexture.wrapT = texture.wrapT;
    normalTexture.repeat.copy(texture.repeat);
    normalTexture.needsUpdate = true;
    
    console.log('[normalMapGenerator] Normal map generated successfully');
    return normalTexture;
  } catch (e) {
    console.error('[normalMapGenerator] Failed to generate normal map, creating flat normal:', e);
    // Return a flat normal map (neutral blue)
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'rgb(127, 127, 255)'; // Flat normal pointing out
      ctx.fillRect(0, 0, 64, 64);
    }
    const flatNormal = new THREE.CanvasTexture(canvas);
    flatNormal.wrapS = texture.wrapS;
    flatNormal.wrapT = texture.wrapT;
    flatNormal.repeat.copy(texture.repeat);
    return flatNormal;
  }
}
