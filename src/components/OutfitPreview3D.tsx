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

      // applicera texturer per klädtyp
      for (const item of textures) {
        const texLoader = new THREE.TextureLoader();
        const material = new THREE.MeshStandardMaterial({
          map: texLoader.load(item.diffuse_url),
          normalMap: texLoader.load(item.normal_url),
          roughnessMap: texLoader.load(item.roughness_url),
          transparent: !!item.alpha_url,
          alphaMap: item.alpha_url ? texLoader.load(item.alpha_url) : undefined
        });

      // Enhanced mesh name matching for better texture mapping
      mannequin.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const meshName = child.name.toLowerCase();
          const itemType = item.item_type.toLowerCase();
          
          // Map clothing types to mesh parts
          const isMatch = 
            // Tops/Shirts
            (itemType.includes('shirt') || itemType.includes('top') || itemType.includes('blouse')) &&
            (meshName.includes('torso') || meshName.includes('chest') || meshName.includes('shirt') || meshName.includes('body') || meshName.includes('upper')) ||
            // Bottoms
            (itemType.includes('pants') || itemType.includes('jeans') || itemType.includes('trousers') || itemType.includes('shorts')) &&
            (meshName.includes('leg') || meshName.includes('pants') || meshName.includes('lower') || meshName.includes('hips')) ||
            // Outerwear
            (itemType.includes('jacket') || itemType.includes('coat') || itemType.includes('sweater')) &&
            (meshName.includes('torso') || meshName.includes('chest') || meshName.includes('arm') || meshName.includes('sleeve'));
          
          if (isMatch) {
            child.material = material;
            child.castShadow = true;
            child.receiveShadow = true;
            console.log(`Applied texture to mesh: ${child.name} for item type: ${item.item_type}`);
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
