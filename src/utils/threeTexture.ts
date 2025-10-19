import * as THREE from 'three';

// Load, downscale, and prepare a texture for clothing images
export async function loadProcessedTexture(url: string, opts?: { maxSize?: number; mirrorX?: boolean }) {
  const maxSize = opts?.maxSize ?? 1024;
  const mirrorX = opts?.mirrorX ?? true;

  return new Promise<THREE.Texture>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        // Compute scaled size capped at maxSize
        const maxDim = Math.max(img.width, img.height);
        const scale = Math.min(1, maxSize / maxDim);
        const w = Math.max(2, Math.floor(img.width * scale));
        const h = Math.max(2, Math.floor(img.height * scale));

        // Ensure power-of-two dims for stability on weaker GPUs
        const toPOT = (n: number) => 2 ** Math.max(1, Math.floor(Math.log2(n)));
        const potW = Math.min(2048, toPOT(w));
        const potH = Math.min(2048, toPOT(h));

        const canvas = document.createElement('canvas');
        canvas.width = potW;
        canvas.height = potH;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('2D context unavailable');

        // Fill with average-ish color as a safety net
        ctx.fillStyle = '#cfcfcf';
        ctx.fillRect(0, 0, potW, potH);

        // Draw the source image scaled to POT canvas
        ctx.drawImage(img, 0, 0, potW, potH);

        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.generateMipmaps = false; // fewer GPU resources
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;

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
        reject(e);
      }
    };

    img.onerror = (e) => reject(e);
    img.src = url;
  });
}
