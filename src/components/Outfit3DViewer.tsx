import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, ContactShadows } from '@react-three/drei';
import { Suspense, useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { Button } from './ui/button';
import { RotateCw, ZoomIn, ZoomOut, RotateCcw, Loader2 } from 'lucide-react';

interface Outfit3DViewerProps {
  imageUrl?: string;
  title: string;
  clothingItems?: any[];
}

function MannequinModel({ topTex, bottomTex, outerwearTex }: { topTex?: THREE.Texture; bottomTex?: THREE.Texture; outerwearTex?: THREE.Texture }) {
  // Create an improved mannequin with better proportions and per-part textures
  return (
    <group>
      {/* Head */}
      <mesh position={[0, 1.6, 0]} castShadow>
        <capsuleGeometry args={[0.35, 0.4, 16, 32]} />
        <meshStandardMaterial color="#e8e8e8" metalness={0.1} roughness={0.8} />
      </mesh>
      
      {/* Neck */}
      <mesh position={[0, 1.1, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.18, 0.3, 16]} />
        <meshStandardMaterial color="#e8e8e8" metalness={0.1} roughness={0.8} />
      </mesh>
      
      {/* Upper Torso - use outerwear if present, else top */}
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.45, 0.35, 1.2, 32]} />
        <meshStandardMaterial 
          {...(outerwearTex || topTex ? { 
            map: (outerwearTex ?? topTex)!,
            side: THREE.DoubleSide
          } : { color: '#e8e8e8' })}
          metalness={0.1} 
          roughness={0.7}
        />
      </mesh>
      
      {/* Lower Torso - use bottom */}
      <mesh position={[0, -0.5, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.35, 0.4, 0.8, 32]} />
        <meshStandardMaterial 
          {...(bottomTex ? { 
            map: bottomTex,
            side: THREE.DoubleSide
          } : { color: '#e8e8e8' })}
          metalness={0.1} 
          roughness={0.7}
        />
      </mesh>
      
      {/* Shoulders */}
      <mesh position={[-0.5, 0.8, 0]} castShadow>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial color="#e8e8e8" metalness={0.1} roughness={0.8} />
      </mesh>
      <mesh position={[0.5, 0.8, 0]} castShadow>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial color="#e8e8e8" metalness={0.1} roughness={0.8} />
      </mesh>
      
      {/* Upper Arms */}
      <mesh position={[-0.65, 0.3, 0]} rotation={[0, 0, 0.2]} castShadow>
        <cylinderGeometry args={[0.14, 0.12, 0.9, 16]} />
        <meshStandardMaterial color="#e8e8e8" metalness={0.1} roughness={0.8} />
      </mesh>
      <mesh position={[0.65, 0.3, 0]} rotation={[0, 0, -0.2]} castShadow>
        <cylinderGeometry args={[0.14, 0.12, 0.9, 16]} />
        <meshStandardMaterial color="#e8e8e8" metalness={0.1} roughness={0.8} />
      </mesh>
      
      {/* Lower Arms */}
      <mesh position={[-0.78, -0.3, 0]} rotation={[0, 0, 0.1]} castShadow>
        <cylinderGeometry args={[0.12, 0.1, 0.8, 16]} />
        <meshStandardMaterial color="#e8e8e8" metalness={0.1} roughness={0.8} />
      </mesh>
      <mesh position={[0.78, -0.3, 0]} rotation={[0, 0, -0.1]} castShadow>
        <cylinderGeometry args={[0.12, 0.1, 0.8, 16]} />
        <meshStandardMaterial color="#e8e8e8" metalness={0.1} roughness={0.8} />
      </mesh>
      
      {/* Hands */}
      <mesh position={[-0.82, -0.75, 0]} castShadow>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial color="#e8e8e8" metalness={0.1} roughness={0.8} />
      </mesh>
      <mesh position={[0.82, -0.75, 0]} castShadow>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial color="#e8e8e8" metalness={0.1} roughness={0.8} />
      </mesh>
      
      {/* Hips */}
      <mesh position={[0, -1.0, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.4, 0.38, 0.4, 32]} />
        <meshStandardMaterial 
          {...(bottomTex ? { 
            map: bottomTex,
            side: THREE.DoubleSide
          } : { color: '#e8e8e8' })}
          metalness={0.1} 
          roughness={0.7}
        />
      </mesh>
      
      {/* Upper Legs */}
      <mesh position={[-0.2, -1.6, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.18, 0.15, 1.0, 16]} />
        <meshStandardMaterial 
          {...(bottomTex ? { 
            map: bottomTex,
            side: THREE.DoubleSide
          } : { color: '#e8e8e8' })}
          metalness={0.1} 
          roughness={0.7}
        />
      </mesh>
      <mesh position={[0.2, -1.6, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.18, 0.15, 1.0, 16]} />
        <meshStandardMaterial 
          {...(bottomTex ? { 
            map: bottomTex,
            side: THREE.DoubleSide
          } : { color: '#e8e8e8' })}
          metalness={0.1} 
          roughness={0.7}
        />
      </mesh>
      
      {/* Lower Legs */}
      <mesh position={[-0.2, -2.5, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.13, 0.8, 16]} />
        <meshStandardMaterial color="#e8e8e8" metalness={0.1} roughness={0.8} />
      </mesh>
      <mesh position={[0.2, -2.5, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.13, 0.8, 16]} />
        <meshStandardMaterial color="#e8e8e8" metalness={0.1} roughness={0.8} />
      </mesh>
      
      {/* Feet */}
      <mesh position={[-0.2, -2.95, 0.1]} castShadow>
        <boxGeometry args={[0.15, 0.1, 0.3]} />
        <meshStandardMaterial color="#e8e8e8" metalness={0.1} roughness={0.8} />
      </mesh>
      <mesh position={[0.2, -2.95, 0.1]} castShadow>
        <boxGeometry args={[0.15, 0.1, 0.3]} />
        <meshStandardMaterial color="#e8e8e8" metalness={0.1} roughness={0.8} />
      </mesh>
    </group>
  );
}

function OutfitMesh({ imageUrl, clothingItems, onLoad }: { imageUrl?: string; clothingItems?: any[]; onLoad: () => void }) {
  const [topTex, setTopTex] = useState<THREE.Texture | undefined>();
  const [bottomTex, setBottomTex] = useState<THREE.Texture | undefined>();
  const [outerTex, setOuterTex] = useState<THREE.Texture | undefined>();

  const loader = new THREE.TextureLoader();
  
  const getFullUrl = (url: string) => {
    if (url.startsWith('http')) return url;
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    return `${supabaseUrl}/storage/v1/object/public/clothes/${url}`;
  };

  const load = (url: string) =>
    new Promise<THREE.Texture>((resolve, reject) => {
      const fullUrl = getFullUrl(url);
      console.log('Loading texture from:', fullUrl);
      loader.load(
        fullUrl,
        (t) => {
          // Configure texture for better appearance
          t.wrapS = THREE.ClampToEdgeWrapping;
          t.wrapT = THREE.ClampToEdgeWrapping;
          t.minFilter = THREE.LinearFilter;
          t.magFilter = THREE.LinearFilter;
          t.needsUpdate = true;
          console.log('Texture loaded successfully:', fullUrl);
          resolve(t);
        },
        undefined,
        (err) => {
          console.error('Failed to load texture:', fullUrl, err);
          reject(err);
        }
      );
    });

  const getItemUrl = (cats: string[]) => {
    const it = clothingItems?.find((i) => {
      const mc = String(i.main_category || '').toLowerCase();
      const c = String(i.category || '').toLowerCase();
      return cats.includes(mc) || cats.includes(c);
    });
    return (it?.image_url || it?.image || it?.url) as string | undefined;
  };

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        let tt: THREE.Texture | undefined;
        let bt: THREE.Texture | undefined;
        let ot: THREE.Texture | undefined;

        if (clothingItems && clothingItems.length) {
          console.log('Loading textures for clothing items:', clothingItems);
          const topUrl = getItemUrl(['top', 'shirt', 'tshirt', 'blouse', 'sweater']);
          const bottomUrl = getItemUrl(['bottom', 'pants', 'trousers', 'skirt', 'shorts', 'jeans']);
          const outerUrl = getItemUrl(['outerwear', 'jacket', 'coat', 'blazer', 'hoodie', 'cardigan']);
          
          console.log('URLs found:', { topUrl, bottomUrl, outerUrl });
          
          if (topUrl) {
            try {
              tt = await load(topUrl);
            } catch (e) {
              console.error('Failed to load top texture:', e);
            }
          }
          if (bottomUrl) {
            try {
              bt = await load(bottomUrl);
            } catch (e) {
              console.error('Failed to load bottom texture:', e);
            }
          }
          if (outerUrl) {
            try {
              ot = await load(outerUrl);
            } catch (e) {
              console.error('Failed to load outer texture:', e);
            }
          }
        }
        
        if (!tt && !bt && imageUrl) {
          try {
            const one = await load(imageUrl);
            tt = one;
            bt = one;
          } catch (e) {
            console.error('Failed to load fallback image:', e);
          }
        }

        if (!cancelled) {
          console.log('Setting textures:', { hasTop: !!tt, hasBottom: !!bt, hasOuter: !!ot });
          setTopTex(tt);
          setBottomTex(bt);
          setOuterTex(ot);
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

  // Show mannequin even with no textures
  return <MannequinModel topTex={topTex} bottomTex={bottomTex} outerwearTex={outerTex} />;
}

export const Outfit3DViewer = ({ imageUrl, title, clothingItems }: Outfit3DViewerProps) => {
  const controlsRef = useRef<any>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

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
      
      <Canvas shadows gl={{ antialias: true, alpha: true }}>
        <Suspense fallback={null}>
          <PerspectiveCamera makeDefault position={[0, 0.5, 5]} />
          
          {/* Lighting Setup */}
          <ambientLight intensity={0.6} />
          <directionalLight
            position={[5, 8, 5]}
            intensity={1.2}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
            shadow-camera-far={50}
            shadow-camera-left={-10}
            shadow-camera-right={10}
            shadow-camera-top={10}
            shadow-camera-bottom={-10}
          />
          <pointLight position={[-5, 5, -5]} intensity={0.4} color="#ffffff" />
          <spotLight
            position={[0, 8, 0]}
            angle={0.3}
            penumbra={1}
            intensity={0.5}
            castShadow
          />
          
          {/* Environment for realistic lighting */}
          <Environment preset="studio" />
          
          {/* 3D Outfit Model */}
          <group position={[0, 0.5, 0]}>
            <OutfitMesh imageUrl={imageUrl} clothingItems={clothingItems} onLoad={() => setIsLoading(false)} />
          </group>
          
          {/* Ground shadow */}
          <ContactShadows
            position={[0, -3, 0]}
            opacity={0.3}
            scale={8}
            blur={2.5}
            far={4}
          />
          
          {/* Controls */}
          <OrbitControls
            ref={controlsRef}
            enablePan={false}
            enableZoom={true}
            enableRotate={true}
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
      </div>
      
      {/* Title Overlay */}
      <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg border border-primary/10">
        <p className="font-semibold text-sm font-serif">3D Preview: {title}</p>
        <p className="text-xs text-muted-foreground">Drag to rotate • Scroll to zoom • Auto-rotating</p>
      </div>
    </div>
  );
};