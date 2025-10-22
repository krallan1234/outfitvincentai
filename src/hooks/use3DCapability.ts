import { useState, useEffect } from 'react';

export interface DeviceCapability {
  supports3D: boolean;
  isHighPerformance: boolean;
  gpuTier: 'high' | 'medium' | 'low' | 'none';
  isMobile: boolean;
}

export function use3DCapability(): DeviceCapability {
  const [capability, setCapability] = useState<DeviceCapability>({
    supports3D: true,
    isHighPerformance: false,
    gpuTier: 'medium',
    isMobile: false
  });

  useEffect(() => {
    const detectCapability = () => {
      // Check if mobile
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      // Check WebGL support
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      
      if (!gl) {
        setCapability({
          supports3D: false,
          isHighPerformance: false,
          gpuTier: 'none',
          isMobile
        });
        return;
      }

      // Get GPU info
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : '';
      
      // Simple GPU tier detection
      let gpuTier: 'high' | 'medium' | 'low' = 'medium';
      let isHighPerformance = false;

      if (renderer) {
        const lowEnd = /Mali|Adreno [34]|PowerVR|Tegra/i.test(renderer);
        const highEnd = /NVIDIA|AMD|Intel Iris|Apple GPU|Adreno [67]/i.test(renderer);
        
        if (lowEnd) {
          gpuTier = 'low';
        } else if (highEnd) {
          gpuTier = 'high';
          isHighPerformance = true;
        }
      }

      // On mobile, be more conservative
      if (isMobile && gpuTier === 'medium') {
        gpuTier = 'low';
      } else if (isMobile && gpuTier === 'high') {
        isHighPerformance = true;
      }

      // Check device memory (if available)
      const deviceMemory = (navigator as any).deviceMemory;
      if (deviceMemory && deviceMemory < 4) {
        gpuTier = 'low';
        isHighPerformance = false;
      } else if (deviceMemory && deviceMemory >= 8) {
        isHighPerformance = true;
      }

      setCapability({
        supports3D: true,
        isHighPerformance,
        gpuTier,
        isMobile
      });
    };

    detectCapability();
  }, []);

  return capability;
}
