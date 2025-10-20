import * as THREE from 'three';

export interface FabricPreset {
  roughness: number;
  metalness: number;
  envMapIntensity: number;
}

export const fabricPresets: Record<string, FabricPreset> = {
  cotton: { roughness: 0.8, metalness: 0.05, envMapIntensity: 0.25 },
  denim: { roughness: 0.85, metalness: 0.0, envMapIntensity: 0.15 },
  silk: { roughness: 0.35, metalness: 0.1, envMapIntensity: 0.5 },
  wool: { roughness: 0.9, metalness: 0.0, envMapIntensity: 0.1 },
  leather: { roughness: 0.4, metalness: 0.2, envMapIntensity: 0.6 },
  polyester: { roughness: 0.5, metalness: 0.15, envMapIntensity: 0.35 },
};

export function detectFabricType(category: string): FabricPreset {
  const cat = category.toLowerCase();
  if (cat.includes('jean') || cat.includes('denim')) return fabricPresets.denim;
  if (cat.includes('silk') || cat.includes('satin') || cat.includes('dress')) return fabricPresets.silk;
  if (cat.includes('wool') || cat.includes('sweater') || cat.includes('knit')) return fabricPresets.wool;
  if (cat.includes('leather') || cat.includes('jacket')) return fabricPresets.leather;
  if (cat.includes('athletic') || cat.includes('sport')) return fabricPresets.polyester;
  return fabricPresets.cotton; // default for most clothing
}
