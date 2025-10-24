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
    let applied = 0;
    // First pass: try semantic matching
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const name = child.name.toLowerCase();
        let mat: THREE.Material | undefined;
        if (name.includes('torso') || name.includes('shirt') || name.includes('chest') || name.includes('body')) {
          mat = outerwearMat?.material || topMat?.material;
        } else if (name.includes('leg') || name.includes('pants') || name.includes('trouser') || name.includes('hips')) {
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
        }
        // Enable shadows
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    // Fallback: if nothing matched, apply a single material to all meshes
    if (applied === 0) {
      const fallbackMat = (outerwearMat?.material || topMat?.material || bottomMat?.material) as THREE.MeshStandardMaterial | undefined;
      if (fallbackMat) {
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
      }
    }
  }, [scene, topMat, bottomMat, outerwearMat]);
  
  return <primitive object={scene} position={[0, -1, 0]} scale={1} />;
}

// Preload the GLTF model
useGLTF.preload('/models/mannequin.glb');

function OutfitMesh({ imageUrl, clothingItems, onLoad }: { imageUrl?: string; clothingItems?: any[]; onLoad: () => void }) {
  const [topMat, setTopMat] = useState<TextureWithMaterial | undefined>();
  const [bottomMat, setBottomMat] = useState<TextureWithMaterial | undefined>();
  const [outerMat, setOuterMat] = useState<TextureWithMaterial | undefined>();

  const load = async (url: string, category: string, textureMaps?: any): Promise<TextureWithMaterial> => {
    console.log('Loading processed texture from:', url, 'for category:', category, 'with AI maps:', !!textureMaps);
    // Use smaller textures to avoid GPU context loss on mid/low devices
    const texture = await loadProcessedTexture(url, { maxSize: 512, mirrorX: true });
    
    let normalMap: THREE.Texture;
    let roughnessMap: THREE.Texture | undefined;
    
    // Use AI-generated texture maps if available (2048x2048 high quality)
    if (textureMaps?.normal_url) {
      console.log('Loading AI-generated 2048px normal map from:', textureMaps.normal_url);
      normalMap = await new Promise<THREE.Texture>((resolve, reject) => {
        new THREE.TextureLoader().load(
          textureMaps.normal_url,
          (tex) => {
            tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
            tex.minFilter = THREE.LinearMipmapLinearFilter;
            tex.magFilter = THREE.LinearFilter;
            resolve(tex);
          },
          undefined,
          reject
        );
      });
    } else {
      // Fallback: Generate normal map from texture
      normalMap = generateNormalMapFromTexture(texture);
    }
    
    if (textureMaps?.roughness_url) {
      console.log('Loading AI-generated roughness map from:', textureMaps.roughness_url);
      roughnessMap = await new Promise<THREE.Texture>((resolve, reject) => {
        new THREE.TextureLoader().load(
          textureMaps.roughness_url,
          (tex) => {
            tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
            resolve(tex);
          },
          undefined,
          reject
        );
      });
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
    const run = async () => {
      try {
        let tm: TextureWithMaterial | undefined;
        let bm: TextureWithMaterial | undefined;
        let om: TextureWithMaterial | undefined;

        if (clothingItems && clothingItems.length) {
          console.log('Loading textures for clothing items:', clothingItems);
          
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
          
          const loadPromises = [];
          
          if (topItem) {
            const url = topItem.image_url || topItem.image || topItem.url;
            const category = topItem.category || topItem.main_category || 'top';
            if (url) {
              loadPromises.push(
                load(url, category, topItem.texture_maps)
                  .then(mat => { tm = mat; })
                  .catch(e => console.error('Failed to load top texture:', e))
              );
            }
          }
          
          if (bottomItem) {
            const url = bottomItem.image_url || bottomItem.image || bottomItem.url;
            const category = bottomItem.category || bottomItem.main_category || 'bottom';
            if (url) {
              loadPromises.push(
                load(url, category, bottomItem.texture_maps)
                  .then(mat => { bm = mat; })
                  .catch(e => console.error('Failed to load bottom texture:', e))
              );
            }
          }
          
          if (outerItem) {
            const url = outerItem.image_url || outerItem.image || outerItem.url;
            const category = outerItem.category || outerItem.main_category || 'outerwear';
            if (url) {
              loadPromises.push(
                load(url, category, outerItem.texture_maps)
                  .then(mat => { om = mat; })
                  .catch(e => console.error('Failed to load outer texture:', e))
              );
            }
          }
          
          await Promise.all(loadPromises);
        }
        
        if (!tm && !bm && imageUrl) {
          try {
            const one = await load(imageUrl, 'top');
            tm = one;
            bm = one;
          } catch (e) {
            console.error('Failed to load fallback image:', e);
          }
        }

        if (!cancelled) {
          console.log('Setting materials:', { hasTop: !!tm, hasBottom: !!bm, hasOuter: !!om });
          setTopMat(tm);
          setBottomMat(bm);
          setOuterMat(om);
          onLoad();
        }
      } catch (e) {
        console.error('Failed to load textures for 3D outfit:', e);
        if (!cancelled) onLoad();
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [imageUrl, clothingItems, onLoad]);

  return <MannequinModel topMat={topMat} bottomMat={bottomMat} outerwearMat={outerMat} />;
}

export const Outfit3DViewer = ({ imageUrl, title, clothingItems }: Outfit3DViewerProps) => {
  const controlsRef = useRef<any>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
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
            <OutfitMesh imageUrl={imageUrl} clothingItems={clothingItems} onLoad={() => setIsLoading(false)} />
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