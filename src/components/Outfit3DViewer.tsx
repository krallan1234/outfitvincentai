import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, ContactShadows } from '@react-three/drei';
import { Suspense, useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { Button } from './ui/button';
import { RotateCw, ZoomIn, ZoomOut, RotateCcw, Loader2 } from 'lucide-react';

interface Outfit3DViewerProps {
  imageUrl: string;
  title: string;
  clothingItems?: any[];
}

function MannequinModel({ outfitTexture }: { outfitTexture: THREE.Texture }) {
  // Create an improved mannequin with better proportions
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
      
      {/* Upper Torso with outfit texture */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.45, 0.35, 1.2, 32]} />
        <meshStandardMaterial 
          map={outfitTexture}
          metalness={0.1} 
          roughness={0.7}
        />
      </mesh>
      
      {/* Lower Torso with outfit texture */}
      <mesh position={[0, -0.5, 0]} castShadow>
        <cylinderGeometry args={[0.35, 0.4, 0.8, 32]} />
        <meshStandardMaterial 
          map={outfitTexture}
          metalness={0.1} 
          roughness={0.7}
        />
      </mesh>
      
      {/* Left Shoulder */}
      <mesh position={[-0.5, 0.8, 0]} castShadow>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial color="#e8e8e8" metalness={0.1} roughness={0.8} />
      </mesh>
      
      {/* Right Shoulder */}
      <mesh position={[0.5, 0.8, 0]} castShadow>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial color="#e8e8e8" metalness={0.1} roughness={0.8} />
      </mesh>
      
      {/* Left Upper Arm */}
      <mesh position={[-0.65, 0.3, 0]} rotation={[0, 0, 0.2]} castShadow>
        <cylinderGeometry args={[0.14, 0.12, 0.9, 16]} />
        <meshStandardMaterial color="#e8e8e8" metalness={0.1} roughness={0.8} />
      </mesh>
      
      {/* Right Upper Arm */}
      <mesh position={[0.65, 0.3, 0]} rotation={[0, 0, -0.2]} castShadow>
        <cylinderGeometry args={[0.14, 0.12, 0.9, 16]} />
        <meshStandardMaterial color="#e8e8e8" metalness={0.1} roughness={0.8} />
      </mesh>
      
      {/* Left Lower Arm */}
      <mesh position={[-0.78, -0.3, 0]} rotation={[0, 0, 0.1]} castShadow>
        <cylinderGeometry args={[0.12, 0.1, 0.8, 16]} />
        <meshStandardMaterial color="#e8e8e8" metalness={0.1} roughness={0.8} />
      </mesh>
      
      {/* Right Lower Arm */}
      <mesh position={[0.78, -0.3, 0]} rotation={[0, 0, -0.1]} castShadow>
        <cylinderGeometry args={[0.12, 0.1, 0.8, 16]} />
        <meshStandardMaterial color="#e8e8e8" metalness={0.1} roughness={0.8} />
      </mesh>
      
      {/* Left Hand */}
      <mesh position={[-0.82, -0.75, 0]} castShadow>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial color="#e8e8e8" metalness={0.1} roughness={0.8} />
      </mesh>
      
      {/* Right Hand */}
      <mesh position={[0.82, -0.75, 0]} castShadow>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial color="#e8e8e8" metalness={0.1} roughness={0.8} />
      </mesh>
      
      {/* Hips */}
      <mesh position={[0, -1.0, 0]} castShadow>
        <cylinderGeometry args={[0.4, 0.38, 0.4, 32]} />
        <meshStandardMaterial 
          map={outfitTexture}
          metalness={0.1} 
          roughness={0.7}
        />
      </mesh>
      
      {/* Left Upper Leg */}
      <mesh position={[-0.2, -1.6, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.15, 1.0, 16]} />
        <meshStandardMaterial 
          map={outfitTexture}
          metalness={0.1} 
          roughness={0.7}
        />
      </mesh>
      
      {/* Right Upper Leg */}
      <mesh position={[0.2, -1.6, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.15, 1.0, 16]} />
        <meshStandardMaterial 
          map={outfitTexture}
          metalness={0.1} 
          roughness={0.7}
        />
      </mesh>
      
      {/* Left Lower Leg */}
      <mesh position={[-0.2, -2.5, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.13, 0.8, 16]} />
        <meshStandardMaterial color="#e8e8e8" metalness={0.1} roughness={0.8} />
      </mesh>
      
      {/* Right Lower Leg */}
      <mesh position={[0.2, -2.5, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.13, 0.8, 16]} />
        <meshStandardMaterial color="#e8e8e8" metalness={0.1} roughness={0.8} />
      </mesh>
      
      {/* Left Foot */}
      <mesh position={[-0.2, -2.95, 0.1]} castShadow>
        <boxGeometry args={[0.15, 0.1, 0.3]} />
        <meshStandardMaterial color="#e8e8e8" metalness={0.1} roughness={0.8} />
      </mesh>
      
      {/* Right Foot */}
      <mesh position={[0.2, -2.95, 0.1]} castShadow>
        <boxGeometry args={[0.15, 0.1, 0.3]} />
        <meshStandardMaterial color="#e8e8e8" metalness={0.1} roughness={0.8} />
      </mesh>
    </group>
  );
}

function OutfitMesh({ imageUrl, onLoad }: { imageUrl: string; onLoad: () => void }) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  
  useEffect(() => {
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
      imageUrl,
      (loadedTexture) => {
        loadedTexture.wrapS = THREE.RepeatWrapping;
        loadedTexture.wrapT = THREE.RepeatWrapping;
        setTexture(loadedTexture);
        onLoad();
      },
      undefined,
      (error) => {
        console.error('Error loading texture:', error);
        // Create a default white texture as fallback
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#f0f0f0';
          ctx.fillRect(0, 0, 512, 512);
        }
        const fallbackTexture = new THREE.CanvasTexture(canvas);
        setTexture(fallbackTexture);
        onLoad();
      }
    );
  }, [imageUrl, onLoad]);
  
  if (!texture) return null;
  
  return <MannequinModel outfitTexture={texture} />;
}

export const Outfit3DViewer = ({ imageUrl, title }: Outfit3DViewerProps) => {
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
            <OutfitMesh imageUrl={imageUrl} onLoad={() => setIsLoading(false)} />
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