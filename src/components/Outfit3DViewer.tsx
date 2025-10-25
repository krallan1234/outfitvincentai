import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, ContactShadows, useGLTF } from '@react-three/drei';
import { Suspense, useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { Button } from './ui/button';
import { RotateCw, ZoomIn, ZoomOut, RotateCcw, Loader2, Settings2, Play, Pause } from 'lucide-react';
import { loadProcessedTexture } from '@/utils/threeTexture';
import { detectFabricType } from '@/utils/fabricMaterial';
import { generateNormalMapFromTexture } from '@/utils/normalMapGenerator';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Outfit2DFallback } from './Outfit2DFallback';

const SUPABASE_URL = 'https://bichfpvapfibrpplrtcr.supabase.co';
interface Outfit3DViewerProps {
  imageUrl?: string;
  title: string;
  clothingItems?: any[];
}

interface TextureWithMaterial {
  texture: THREE.Texture;
  normalMap?: THREE.Texture;
  material: THREE.Material;
}

function MannequinModel({ 
  topMat, 
  bottomMat, 
  outerwearMat 
}: { 
  topMat?: TextureWithMaterial; 
  bottomMat?: TextureWithMaterial; 
  outerwearMat?: TextureWithMaterial;
}) {
  const { scene } = useGLTF('/models/mannequin.glb');
  
  useEffect(() => {
    if (!scene) return;
    // Debug: list mesh names
    const meshNames: string[] = [];
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) meshNames.push(child.name || '(unnamed)');
    });
    console.groupCollapsed('[Outfit3DViewer] Mannequin meshes');
    meshNames.forEach((n) => console.log('mesh:', n));
    console.groupEnd();

    let applied = 0;
    // First pass: try semantic matching
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const name = (child.name || '').toLowerCase();
        let mat: THREE.Material | undefined;
        if (name.includes('torso') || name.includes('shirt') || name.includes('chest') || name.includes('body') || name.includes('upper')) {
          mat = outerwearMat?.material || topMat?.material;
        } else if (name.includes('leg') || name.includes('pants') || name.includes('trouser') || name.includes('hips') || name.includes('thigh')) {
          mat = bottomMat?.material;
        } else if (name.includes('arm') || name.includes('sleeve')) {
          mat = topMat?.material;
        }
        if (mat) {
          const ms = mat as THREE.MeshStandardMaterial;
          if ((child as any).isSkinnedMesh && ms) {
            (ms as any).skinning = true;
            ms.needsUpdate = true;
          }
          child.material = (ms as any) || mat;
          applied++;
          console.debug('[Outfit3DViewer] Applied material to', child.name);
        }
        // Enable shadows
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    // Secondary pass: split by height if both top & bottom exist but names didn't match
    if (applied === 0 && topMat?.material && bottomMat?.material) {
      console.warn('[Outfit3DViewer] No semantic mesh match. Splitting by Y center as fallback.');
      scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const geom = (child.geometry as THREE.BufferGeometry);
          if (!geom.boundingBox) geom.computeBoundingBox();
          const box = geom.boundingBox!;
          const centerY = (box.min.y + box.max.y) / 2;
          const preferTop = centerY >= 0;
          const chosen = preferTop ? topMat.material : bottomMat.material;
          const ms = chosen as THREE.MeshStandardMaterial;
          if ((child as any).isSkinnedMesh && ms) {
            (ms as any).skinning = true;
            ms.needsUpdate = true;
          }
          child.material = (ms as any) || chosen;
          child.castShadow = true;
          child.receiveShadow = true;
          applied++;
        }
      });
    }

    // Fallback: if nothing matched, apply a single material to all meshes
    if (applied === 0) {
      const fallbackMat = (outerwearMat?.material || topMat?.material || bottomMat?.material) as THREE.MeshStandardMaterial | undefined;
      if (fallbackMat) {
        console.warn('[Outfit3DViewer] Applying single fallback material to all meshes.');
        scene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            if ((child as any).isSkinnedMesh) {
              (fallbackMat as any).skinning = true;
              (fallbackMat as any).needsUpdate = true;
            }
            child.material = fallbackMat;
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
      } else {
        console.error('[Outfit3DViewer] No materials available to apply.');
      }
    }
  }, [scene, topMat, bottomMat, outerwearMat]);
  
  return <primitive object={scene} position={[0, -1, 0]} scale={1} />;
}

// Preload the GLTF model
useGLTF.preload('/models/mannequin.glb');

function OutfitMesh({ imageUrl, clothingItems, onLoad, onError }: { imageUrl?: string; clothingItems?: any[]; onLoad: () => void; onError: () => void }) {
  const [topMat, setTopMat] = useState<TextureWithMaterial | undefined>();
  const [bottomMat, setBottomMat] = useState<TextureWithMaterial | undefined>();
  const [outerMat, setOuterMat] = useState<TextureWithMaterial | undefined>();

  const getSignedUrls = async (urls: string[]): Promise<Record<string, string>> => {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data, error } = await supabase.functions.invoke('get-signed-urls', {
        body: { urls, expiresIn: 300 }
      });
      
      if (error) {
        console.error('[Outfit3DViewer] get-signed-urls error:', error);
        // Fallback to original URLs
        const fallback: Record<string, string> = {};
        urls.forEach(url => fallback[url] = url);
        return fallback;
      }
      
      return data?.signedUrls || {};
    } catch (e) {
      console.error('[Outfit3DViewer] Exception calling get-signed-urls:', e);
      // Fallback to original URLs
      const fallback: Record<string, string> = {};
      urls.forEach(url => fallback[url] = url);
      return fallback;
    }
  };

  const normalizeUrl = async (u: string | undefined): Promise<string | undefined> => {
    if (!u) return undefined;
    try {
      // Already valid schemes
      if (u.startsWith('data:') || u.startsWith('blob:')) return u;
      
      // For HTTP URLs, try to get signed version via edge function
      if (u.startsWith('http://') || u.startsWith('https://')) {
        if (u.includes('/storage/v1/object/')) {
          const signedUrls = await getSignedUrls([u]);
          const signed = signedUrls[u];
          if (signed && signed !== u) {
            console.log('[Outfit3DViewer] Using signed URL for:', u);
            return signed;
          }
        }
        return u;
      }

      // Relative URLs - convert to absolute and sign
      if (u.startsWith('/object/') || u.startsWith('/storage/')) {
        const absolute = `${SUPABASE_URL}${u.startsWith('/storage') ? '' : '/storage/v1'}${u}`.replace('/storage/v1/storage', '/storage/v1');
        const signedUrls = await getSignedUrls([absolute]);
        return signedUrls[absolute] || absolute;
      }

      // Other app-relative URLs (assets)
      if (u.startsWith('/')) return new URL(u, window.location.origin).toString();

      // Bare storage path like "clothes/xyz.jpg" -> make public URL and sign
      if (!u.includes('://')) {
        const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${u.startsWith('clothes/') ? u : `clothes/${u}`}`;
        const signedUrls = await getSignedUrls([publicUrl]);
        return signedUrls[publicUrl] || publicUrl;
      }

      return u;
    } catch (e) {
      console.error('[Outfit3DViewer] URL normalization error:', e);
      return u;
    }
  };

  const load = async (url: string, category: string, textureMaps?: any, retryCount = 0): Promise<TextureWithMaterial> => {
    console.log(`[Outfit3DViewer] Loading texture from: ${url} (category: ${category}, retry: ${retryCount}, has AI maps: ${!!textureMaps})`);
    
    try {
      const texture = await loadProcessedTexture(url, { maxSize: 512, mirrorX: true });
    
    let normalMap: THREE.Texture;
    let roughnessMap: THREE.Texture | undefined;
    
    // Use AI-generated texture maps if available (2048x2048 high quality)
    if (textureMaps?.normal_url) {
      console.log('[Outfit3DViewer] Loading AI-generated 2048px normal map from:', textureMaps.normal_url);
      try {
        normalMap = await new Promise<THREE.Texture>((resolve, reject) => {
          new THREE.TextureLoader().load(
            textureMaps.normal_url,
            (tex) => {
              tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
              tex.minFilter = THREE.LinearMipmapLinearFilter;
              tex.magFilter = THREE.LinearFilter;
              tex.colorSpace = THREE.LinearSRGBColorSpace;
              resolve(tex);
            },
            undefined,
            reject
          );
        });
      } catch (e) {
        console.error('[Outfit3DViewer] Failed to load AI normal map, generating fallback:', e);
        normalMap = generateNormalMapFromTexture(texture);
      }
    } else {
      console.debug('[Outfit3DViewer] Generating normal map from base texture');
      normalMap = generateNormalMapFromTexture(texture);
    }
    
    if (textureMaps?.roughness_url) {
      console.log('[Outfit3DViewer] Loading AI-generated roughness map from:', textureMaps.roughness_url);
      try {
        roughnessMap = await new Promise<THREE.Texture>((resolve, reject) => {
          new THREE.TextureLoader().load(
            textureMaps.roughness_url,
            (tex) => {
              tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
              tex.colorSpace = THREE.LinearSRGBColorSpace;
              resolve(tex);
            },
            undefined,
            reject
          );
        });
      } catch (e) {
        console.error('[Outfit3DViewer] Failed to load AI roughness map:', e);
        roughnessMap = undefined;
      }
    }
    
    // Detect fabric type and create appropriate material
    const fabricProps = detectFabricType(category);
    const matParams: THREE.MeshStandardMaterialParameters = {
      map: texture,
      normalMap: normalMap,
      normalScale: new THREE.Vector2(textureMaps?.normal_url ? 1.5 : 0.3, textureMaps?.normal_url ? 1.5 : 0.3),
      roughness: roughnessMap ? 1.0 : fabricProps.roughness,
      metalness: fabricProps.metalness,
      envMapIntensity: fabricProps.envMapIntensity,
      side: THREE.DoubleSide,
    };
    if (roughnessMap) {
      matParams.roughnessMap = roughnessMap;
    }
      const material = new THREE.MeshStandardMaterial(matParams);
      
      return { texture, normalMap, material };
    } catch (error) {
      console.error(`[Outfit3DViewer] Failed to load texture from ${url}:`, error);
      
      // Retry logic with exponential backoff (2 retries max)
      if (retryCount < 2) {
        const backoffMs = retryCount === 0 ? 200 : 600;
        console.log(`[Outfit3DViewer] Retrying after ${backoffMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        
        // Try to get a fresh signed URL
        const freshUrl = await normalizeUrl(url);
        if (freshUrl && freshUrl !== url) {
          console.log('[Outfit3DViewer] Retrying with fresh signed URL');
          return load(freshUrl, category, textureMaps, retryCount + 1);
        }
        
        return load(url, category, textureMaps, retryCount + 1);
      }
      
      // All retries exhausted, throw error
      throw error;
    }
  };

  const getItemUrl = (cats: string[]) => {
    const it = clothingItems?.find((i) => {
      const mc = String(i.main_category || '').toLowerCase();
      const c = String(i.category || '').toLowerCase();
      return cats.some(cat => mc.includes(cat) || c.includes(cat));
    });
    const url = it?.image_url || it?.image || it?.url;
    console.log('Found item for categories', cats, ':', { category: it?.category, main_category: it?.main_category, url });
    return url as string | undefined;
  };

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;
    
    const run = async () => {
      // Set 8s timeout for entire load operation
      timeoutId = setTimeout(() => {
        if (!cancelled) {
          console.error('[Outfit3DViewer] 8s timeout exceeded for entire texture loading operation');
          onError();
        }
      }, 8000);
      
      try {
        let tm: TextureWithMaterial | undefined;
        let bm: TextureWithMaterial | undefined;
        let om: TextureWithMaterial | undefined;

        if (clothingItems && clothingItems.length) {
          console.log('[Outfit3DViewer] Loading textures for clothing items:', clothingItems.length, 'items');
          
          const topItem = clothingItems.find((i) => {
            const mc = String(i.main_category || '').toLowerCase();
            const c = String(i.category || '').toLowerCase();
            return ['top', 'shirt', 't-shirt', 'tshirt', 'blouse', 'sweater', 'sweatshirt'].some(cat => mc.includes(cat) || c.includes(cat));
          });
          
          const bottomItem = clothingItems.find((i) => {
            const mc = String(i.main_category || '').toLowerCase();
            const c = String(i.category || '').toLowerCase();
            return ['bottom', 'pants', 'trousers', 'skirt', 'shorts', 'jeans'].some(cat => mc.includes(cat) || c.includes(cat));
          });
          
          const outerItem = clothingItems.find((i) => {
            const mc = String(i.main_category || '').toLowerCase();
            const c = String(i.category || '').toLowerCase();
            return ['outerwear', 'outer', 'jacket', 'coat', 'blazer', 'hoodie', 'cardigan'].some(cat => mc.includes(cat) || c.includes(cat));
          });
          
          console.log('[Outfit3DViewer] Found items:', { hasTop: !!topItem, hasBottom: !!bottomItem, hasOuter: !!outerItem });
          
          const loadPromises = [];
          
          if (topItem) {
            const rawUrl = topItem.image_url || topItem.image || topItem.url;
            console.log('[Outfit3DViewer] Processing top item URL:', rawUrl);
            const url = await normalizeUrl(rawUrl);
            const category = topItem.category || topItem.main_category || 'top';
            if (url) {
              loadPromises.push(
                load(url, category, topItem.texture_maps)
                  .then(mat => { 
                    tm = mat;
                    console.log('[Outfit3DViewer] Top texture loaded successfully');
                  })
                  .catch(e => console.error('[Outfit3DViewer] Failed to load top texture:', e))
              );
            }
          }
          
          if (bottomItem) {
            const rawUrl = bottomItem.image_url || bottomItem.image || bottomItem.url;
            console.log('[Outfit3DViewer] Processing bottom item URL:', rawUrl);
            const url = await normalizeUrl(rawUrl);
            const category = bottomItem.category || bottomItem.main_category || 'bottom';
            if (url) {
              loadPromises.push(
                load(url, category, bottomItem.texture_maps)
                  .then(mat => { 
                    bm = mat;
                    console.log('[Outfit3DViewer] Bottom texture loaded successfully');
                  })
                  .catch(e => console.error('[Outfit3DViewer] Failed to load bottom texture:', e))
              );
            }
          }
          
          if (outerItem) {
            const rawUrl = outerItem.image_url || outerItem.image || outerItem.url;
            console.log('[Outfit3DViewer] Processing outer item URL:', rawUrl);
            const url = await normalizeUrl(rawUrl);
            const category = outerItem.category || outerItem.main_category || 'outerwear';
            if (url) {
              loadPromises.push(
                load(url, category, outerItem.texture_maps)
                  .then(mat => { 
                    om = mat;
                    console.log('[Outfit3DViewer] Outer texture loaded successfully');
                  })
                  .catch(e => console.error('[Outfit3DViewer] Failed to load outer texture:', e))
              );
            }
          }
          
          await Promise.all(loadPromises);
          console.log('[Outfit3DViewer] All texture loading complete');
        }
        
        // Only fallback to imageUrl if no clothing items were processed
        if (!tm && !bm && !om && imageUrl && (!clothingItems || clothingItems.length === 0)) {
          console.log('[Outfit3DViewer] No clothing items, attempting to load fallback imageUrl:', imageUrl);
          try {
            const url = await normalizeUrl(imageUrl);
            if (url) {
              const one = await load(url, 'top');
              tm = one;
              bm = one;
              console.log('[Outfit3DViewer] Fallback imageUrl loaded successfully');
            }
          } catch (e) {
            console.error('[Outfit3DViewer] Failed to load fallback imageUrl:', e);
          }
        }

        if (!cancelled) {
          clearTimeout(timeoutId);
          
          if (!tm && !bm && !om) {
            console.warn('[Outfit3DViewer] No textures loaded, applying debug checker texture');
            const size = 32; const c = document.createElement('canvas'); c.width = c.height = size;
            const ctx = c.getContext('2d')!; const cells = 8;
            for (let y = 0; y < cells; y++) { for (let x = 0; x < cells; x++) {
              ctx.fillStyle = (x + y) % 2 ? '#a0a0a0' : '#e0e0e0';
              ctx.fillRect((x * size) / cells, (y * size) / cells, size / cells, size / cells);
            } }
            const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
            const mat = new THREE.MeshStandardMaterial({ map: t, roughness: 0.9, side: THREE.DoubleSide });
            tm = { texture: t, material: mat };
          }
          console.log('[Outfit3DViewer] Setting materials:', { hasTop: !!tm, hasBottom: !!bm, hasOuter: !!om });
          setTopMat(tm);
          setBottomMat(bm);
          setOuterMat(om);
        }
      } catch (e) {
        console.error('[Outfit3DViewer] Failed to load textures for 3D outfit:', e);
        if (!cancelled) {
          onError();
        }
      } finally {
        if (!cancelled) {
          clearTimeout(timeoutId);
          console.log('[Outfit3DViewer] Texture loading complete, calling onLoad');
          onLoad();
        }
      }
    };
    run();
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [imageUrl, clothingItems, onLoad, onError]);

  return <MannequinModel topMat={topMat} bottomMat={bottomMat} outerwearMat={outerMat} />;
}

export const Outfit3DViewer = ({ imageUrl, title, clothingItems }: Outfit3DViewerProps) => {
  const controlsRef = useRef<any>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [quality, setQuality] = useState<'low' | 'medium' | 'high'>('medium');

  const handleReset = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
      setAutoRotate(true);
    }
  };

  const handleZoomIn = () => {
    if (controlsRef.current) {
      const camera = controlsRef.current.object;
      camera.position.z = Math.max(2, camera.position.z - 0.5);
    }
  };

  const handleZoomOut = () => {
    if (controlsRef.current) {
      const camera = controlsRef.current.object;
      camera.position.z = Math.min(8, camera.position.z + 0.5);
    }
  };

  const handleRotateLeft = () => {
    if (controlsRef.current) {
      const azimuth = controlsRef.current.getAzimuthalAngle();
      controlsRef.current.setAzimuthalAngle(azimuth + Math.PI / 4);
    }
  };

  const handleRotateRight = () => {
    if (controlsRef.current) {
      const azimuth = controlsRef.current.getAzimuthalAngle();
      controlsRef.current.setAzimuthalAngle(azimuth - Math.PI / 4);
    }
  };
  
  const handleRetry3D = () => {
    setLoadError(false);
    setIsLoading(true);
  };

  // Show 2D fallback if error occurred
  if (loadError) {
    return (
      <div className="relative w-full h-auto bg-gradient-to-b from-muted/30 to-background rounded-xl overflow-hidden border border-primary/10 p-4">
        <Outfit2DFallback 
          clothingItems={clothingItems || []} 
          onRetry={handleRetry3D}
          showRetry={true}
        />
      </div>
    );
  }

  return (
    <div className="relative w-full h-[500px] bg-gradient-to-b from-muted/30 to-background rounded-xl overflow-hidden border border-primary/10">
      {/* Loading Indicator */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading 3D model...</p>
          </div>
        </div>
      )}
      
      <Canvas 
        dpr={[1, 1.25]}
        shadows={false}
        gl={{ antialias: false, alpha: true, powerPreference: 'low-power', preserveDrawingBuffer: false }}
        onCreated={({ gl }) => {
          const cnv = gl.domElement as HTMLCanvasElement;
          cnv.addEventListener('webglcontextlost', (e) => { e.preventDefault(); console.warn('WebGL context lost'); }, false);
          cnv.addEventListener('webglcontextrestored', () => { console.warn('WebGL context restored'); }, false);
        }}
      >
        <Suspense fallback={null}>
          <PerspectiveCamera makeDefault position={[0, 0.5, 5]} />
          
          {/* Enhanced Lighting Setup for realistic fabric appearance */}
          <ambientLight intensity={0.5} />
          
          {/* Main key light from front-right */}
          <directionalLight
            position={[5, 8, 5]}
            intensity={1.4}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
            shadow-camera-far={50}
            shadow-camera-left={-10}
            shadow-camera-right={10}
            shadow-camera-top={10}
            shadow-camera-bottom={-10}
          />
          
          {/* Back rim light for depth */}
          <directionalLight
            position={[-5, 6, -5]}
            intensity={0.6}
            color="#f0f0ff"
          />
          
          {/* Fill light from left */}
          <pointLight position={[-4, 3, 2]} intensity={0.5} color="#ffffff" />
          
          {/* Top spotlight for fashion photography look */}
          <spotLight
            position={[0, 10, 2]}
            angle={0.4}
            penumbra={1}
            intensity={0.8}
            castShadow
          />
          
          {/* Environment for realistic lighting */}
          <Environment preset="studio" />
          
          {/* 3D Outfit Model */}
          <group position={[0, 0.5, 0]}>
            <OutfitMesh 
              imageUrl={imageUrl} 
              clothingItems={clothingItems} 
              onLoad={() => setIsLoading(false)} 
              onError={() => {
                setIsLoading(false);
                setLoadError(true);
              }}
            />
          </group>
          
          {/* Ground shadow with improved visibility */}
          <ContactShadows
            position={[0, -3, 0]}
            opacity={0.4}
            scale={8}
            blur={2.5}
            far={4}
          />
          
          {/* Controls */}
          <OrbitControls
            ref={controlsRef}
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            enableDamping={true}
            dampingFactor={0.05}
            zoomSpeed={0.8}
            rotateSpeed={0.8}
            panSpeed={0.8}
            autoRotate={autoRotate}
            autoRotateSpeed={2}
            minDistance={2}
            maxDistance={8}
            minPolarAngle={Math.PI / 8}
            maxPolarAngle={Math.PI / 1.8}
            onStart={() => setAutoRotate(false)}
          />
        </Suspense>
      </Canvas>
      
      {/* Control Buttons */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2">
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="icon"
            onClick={handleRotateLeft}
            className="bg-background/90 backdrop-blur-sm hover:bg-background shadow-lg"
            title="Rotate left"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={handleRotateRight}
            className="bg-background/90 backdrop-blur-sm hover:bg-background shadow-lg"
            title="Rotate right"
          >
            <RotateCw className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="icon"
            onClick={handleZoomIn}
            className="bg-background/90 backdrop-blur-sm hover:bg-background shadow-lg"
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={handleZoomOut}
            className="bg-background/90 backdrop-blur-sm hover:bg-background shadow-lg"
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="icon"
            onClick={() => setAutoRotate(!autoRotate)}
            className="bg-background/90 backdrop-blur-sm hover:bg-background shadow-lg"
            title={autoRotate ? "Pause rotation" : "Start rotation"}
          >
            {autoRotate ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="bg-background/90 backdrop-blur-sm hover:bg-background shadow-lg"
                title="Settings"
              >
                <Settings2 className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64" align="end">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">3D Viewer Settings</h4>
                  <p className="text-xs text-muted-foreground">Customize your viewing experience</p>
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="auto-rotate" className="text-sm">Auto-rotate</Label>
                  <Switch
                    id="auto-rotate"
                    checked={autoRotate}
                    onCheckedChange={setAutoRotate}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm">Quality</Label>
                  <div className="flex gap-2">
                    {(['low', 'medium', 'high'] as const).map((q) => (
                      <Button
                        key={q}
                        variant={quality === q ? "default" : "outline"}
                        size="sm"
                        onClick={() => setQuality(q)}
                        className="flex-1 capitalize"
                      >
                        {q}
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {quality === 'low' && 'Best for older devices'}
                    {quality === 'medium' && 'Balanced performance'}
                    {quality === 'high' && 'Best visual quality'}
                  </p>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        
        <Button
          variant="secondary"
          size="sm"
          onClick={handleReset}
          className="bg-background/90 backdrop-blur-sm hover:bg-background shadow-lg"
          title="Reset view"
        >
          Reset View
        </Button>
      </div>
      
      {/* Title Overlay */}
      <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg border border-primary/10">
        <p className="font-semibold text-sm font-serif">3D Preview: {title}</p>
        <p className="text-xs text-muted-foreground">
          {autoRotate ? 'Auto-rotating • ' : ''}Drag to rotate • Scroll to zoom
        </p>
        <p className="text-xs text-muted-foreground/70 italic mt-1">Realistic fabric simulation applied</p>
      </div>
    </div>
  );
};