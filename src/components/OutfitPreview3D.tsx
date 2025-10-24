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

        // hitta rätt del av mannequin (t.ex. shirt → torso)
        mannequin.traverse((child) => {
          if (child instanceof THREE.Mesh && child.name.toLowerCase().includes(item.item_type)) {
            child.material = material;
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
