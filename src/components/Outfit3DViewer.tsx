import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, ContactShadows } from '@react-three/drei';
import { Suspense, useRef } from 'react';
import * as THREE from 'three';
import { Button } from './ui/button';
import { RotateCw, ZoomIn, ZoomOut } from 'lucide-react';

interface Outfit3DViewerProps {
  imageUrl: string;
  title: string;
}

function OutfitMesh({ imageUrl }: { imageUrl: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Create a simple mannequin-like shape
  return (
    <group>
      {/* Body */}
      <mesh position={[0, 0, 0]} castShadow>
        <cylinderGeometry args={[0.5, 0.6, 2, 32]} />
        <meshStandardMaterial color="#f0f0f0" />
      </mesh>
      
      {/* Head */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <sphereGeometry args={[0.4, 32, 32]} />
        <meshStandardMaterial color="#ffe0bd" />
      </mesh>
      
      {/* Outfit texture as a plane */}
      <mesh position={[0, 0, 0.8]} ref={meshRef}>
        <planeGeometry args={[1.2, 2]} />
        <meshStandardMaterial>
          <primitive 
            attach="map" 
            object={new THREE.TextureLoader().load(imageUrl)} 
          />
        </meshStandardMaterial>
      </mesh>
      
      {/* Arms */}
      <mesh position={[-0.7, 0.5, 0]} rotation={[0, 0, Math.PI / 6]} castShadow>
        <cylinderGeometry args={[0.15, 0.15, 1.2, 16]} />
        <meshStandardMaterial color="#ffe0bd" />
      </mesh>
      <mesh position={[0.7, 0.5, 0]} rotation={[0, 0, -Math.PI / 6]} castShadow>
        <cylinderGeometry args={[0.15, 0.15, 1.2, 16]} />
        <meshStandardMaterial color="#ffe0bd" />
      </mesh>
      
      {/* Legs */}
      <mesh position={[-0.25, -1.5, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.15, 1.5, 16]} />
        <meshStandardMaterial color="#f0f0f0" />
      </mesh>
      <mesh position={[0.25, -1.5, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.15, 1.5, 16]} />
        <meshStandardMaterial color="#f0f0f0" />
      </mesh>
    </group>
  );
}

export const Outfit3DViewer = ({ imageUrl, title }: Outfit3DViewerProps) => {
  const controlsRef = useRef<any>(null);

  const handleReset = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  };

  const handleZoomIn = () => {
    if (controlsRef.current) {
      const camera = controlsRef.current.object;
      camera.position.z = Math.max(3, camera.position.z - 1);
    }
  };

  const handleZoomOut = () => {
    if (controlsRef.current) {
      const camera = controlsRef.current.object;
      camera.position.z = Math.min(10, camera.position.z + 1);
    }
  };

  return (
    <div className="relative w-full h-[500px] bg-gradient-to-b from-muted/30 to-background rounded-xl overflow-hidden border">
      <Canvas shadows>
        <Suspense fallback={null}>
          <PerspectiveCamera makeDefault position={[0, 0, 5]} />
          
          {/* Lighting */}
          <ambientLight intensity={0.5} />
          <directionalLight
            position={[5, 5, 5]}
            intensity={1}
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
          />
          <pointLight position={[-5, 5, 5]} intensity={0.5} />
          
          {/* Environment for realistic lighting */}
          <Environment preset="studio" />
          
          {/* 3D Outfit Model */}
          <OutfitMesh imageUrl={imageUrl} />
          
          {/* Ground shadow */}
          <ContactShadows
            position={[0, -2.5, 0]}
            opacity={0.4}
            scale={10}
            blur={2}
            far={4}
          />
          
          {/* Controls */}
          <OrbitControls
            ref={controlsRef}
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={3}
            maxDistance={10}
            minPolarAngle={Math.PI / 6}
            maxPolarAngle={Math.PI / 1.5}
          />
        </Suspense>
      </Canvas>
      
      {/* Control Buttons */}
      <div className="absolute bottom-4 right-4 flex gap-2">
        <Button
          variant="secondary"
          size="icon"
          onClick={handleZoomIn}
          className="bg-background/80 backdrop-blur"
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          onClick={handleZoomOut}
          className="bg-background/80 backdrop-blur"
        >
          <ZoomOut className="w-4 h-4" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          onClick={handleReset}
          className="bg-background/80 backdrop-blur"
        >
          <RotateCw className="w-4 h-4" />
        </Button>
      </div>
      
      {/* Title Overlay */}
      <div className="absolute top-4 left-4 bg-background/80 backdrop-blur px-4 py-2 rounded-lg">
        <p className="font-semibold text-sm">3D Preview: {title}</p>
        <p className="text-xs text-muted-foreground">Drag to rotate • Scroll to zoom</p>
      </div>
    </div>
  );
};