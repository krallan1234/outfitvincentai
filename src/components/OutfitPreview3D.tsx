import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

interface TextureItem {
  item_type: string;
  diffuse_url: string;
  normal_url: string;
  roughness_url: string;
  alpha_url: string | null;
}

interface OutfitPreview3DProps {
  textures: TextureItem[];
}

export default function OutfitPreview3D({ textures }: OutfitPreview3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      40,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    mountRef.current.appendChild(renderer.domElement);

    const light = new THREE.HemisphereLight(0xffffff, 0x444444, 1.2);
    scene.add(light);

    const loader = new GLTFLoader();
    loader.load("/models/mannequin.glb", (gltf) => {
      const mannequin = gltf.scene;
      scene.add(mannequin);

      // Apply textures to mannequin meshes
      for (const item of textures) {
        const texLoader = new THREE.TextureLoader();
        
        // Create material with available maps (fallback to diffuse only if others missing)
        const materialConfig: any = {
          map: texLoader.load(item.diffuse_url),
          roughness: 0.8, // Default fabric roughness
          metalness: 0.1, // Minimal metalness for fabric
        };
        
        // Only add optional maps if they exist
        if (item.normal_url) {
          materialConfig.normalMap = texLoader.load(item.normal_url);
        }
        if (item.roughness_url) {
          materialConfig.roughnessMap = texLoader.load(item.roughness_url);
        }
        if (item.alpha_url) {
          materialConfig.transparent = true;
          materialConfig.alphaMap = texLoader.load(item.alpha_url);
        }
        
        const material = new THREE.MeshStandardMaterial(materialConfig);

        // Apply material to matching mesh parts
        mannequin.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            const meshName = child.name.toLowerCase();
            const itemType = item.item_type.toLowerCase();
            
            // Enhanced mesh matching logic
            const isMatch = 
              // Tops/Shirts
              (itemType.includes('shirt') || itemType.includes('top') || itemType.includes('blouse') || itemType.includes('t-shirt')) &&
              (meshName.includes('torso') || meshName.includes('chest') || meshName.includes('shirt') || meshName.includes('body') || meshName.includes('upper')) ||
              // Bottoms
              (itemType.includes('pants') || itemType.includes('jeans') || itemType.includes('trousers') || itemType.includes('shorts')) &&
              (meshName.includes('leg') || meshName.includes('pants') || meshName.includes('lower') || meshName.includes('hips')) ||
              // Outerwear
              (itemType.includes('jacket') || itemType.includes('coat') || itemType.includes('sweater') || itemType.includes('blazer')) &&
              (meshName.includes('torso') || meshName.includes('chest') || meshName.includes('arm') || meshName.includes('sleeve') || meshName.includes('upper')) ||
              // Dresses
              (itemType.includes('dress') || itemType.includes('gown')) &&
              (meshName.includes('torso') || meshName.includes('body') || meshName.includes('dress')) ||
              // Footwear
              (itemType.includes('shoe') || itemType.includes('boot') || itemType.includes('sneaker')) &&
              (meshName.includes('foot') || meshName.includes('shoe') || meshName.includes('feet'));
            
            if (isMatch) {
              child.material = material;
              child.castShadow = true;
              child.receiveShadow = true;
              console.log(`✓ Applied texture to: ${child.name} for ${item.item_type}`);
            }
          }
        });
      }
    });

    const controls = new OrbitControls(camera, renderer.domElement);
    camera.position.set(0, 1.6, 3);
    controls.update();

    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      mountRef.current?.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, [textures]);

  return <div className="w-full h-[500px]" ref={mountRef} />;
}
