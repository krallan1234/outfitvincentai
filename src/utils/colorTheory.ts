/**
 * Color theory utilities for outfit validation
 * Ensures generated outfits have harmonious color combinations
 */

interface RGB {
  r: number;
  g: number;
  b: number;
}

interface HSL {
  h: number;
  s: number;
  l: number;
}

// Convert hex to RGB
const hexToRgb = (hex: string): RGB | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
};

// Convert RGB to HSL
const rgbToHsl = (rgb: RGB): HSL => {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: h * 360,
    s: s * 100,
    l: l * 100,
  };
};

// Check if two colors are complementary (opposite on color wheel)
const areComplementary = (hsl1: HSL, hsl2: HSL): boolean => {
  const hueDiff = Math.abs(hsl1.h - hsl2.h);
  return (hueDiff > 150 && hueDiff < 210) || (hueDiff > 330 && hueDiff < 30);
};

// Check if two colors are analogous (adjacent on color wheel)
const areAnalogous = (hsl1: HSL, hsl2: HSL): boolean => {
  const hueDiff = Math.abs(hsl1.h - hsl2.h);
  return hueDiff < 60 || hueDiff > 300;
};

// Check if colors are monochromatic (same hue, different saturation/lightness)
const areMonochromatic = (hsl1: HSL, hsl2: HSL): boolean => {
  return Math.abs(hsl1.h - hsl2.h) < 10;
};

// Check if colors are neutrals (low saturation)
const isNeutral = (hsl: HSL): boolean => {
  return hsl.s < 20;
};

// Check if two colors clash (too similar but not matching, or high contrast without harmony)
const doColorsClash = (hsl1: HSL, hsl2: HSL): boolean => {
  const hueDiff = Math.abs(hsl1.h - hsl2.h);
  const lightnessDiff = Math.abs(hsl1.l - hsl2.l);
  
  // Colors clash if they're similar hues but different lightness without being monochromatic
  if (hueDiff < 30 && hueDiff > 10 && lightnessDiff > 20) {
    return true;
  }
  
  // High saturation colors that aren't complementary or analogous
  if (hsl1.s > 60 && hsl2.s > 60 && !areComplementary(hsl1, hsl2) && !areAnalogous(hsl1, hsl2)) {
    if (hueDiff > 60 && hueDiff < 150) {
      return true;
    }
  }
  
  return false;
};

/**
 * Validates if an outfit's color combination is harmonious
 * @param colors Array of hex color strings
 * @returns Object with isValid flag and explanation
 */
export const validateColorHarmony = (
  colors: string[]
): { isValid: boolean; explanation: string } => {
  if (colors.length < 2) {
    return { isValid: true, explanation: 'Not enough colors to validate' };
  }

  // Filter out invalid colors
  const validColors = colors.filter((c) => c && c.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i));

  if (validColors.length < 2) {
    return { isValid: true, explanation: 'Not enough valid colors to validate' };
  }

  // Convert to HSL
  const hslColors = validColors
    .map((hex) => {
      const rgb = hexToRgb(hex);
      return rgb ? rgbToHsl(rgb) : null;
    })
    .filter((hsl): hsl is HSL => hsl !== null);

  if (hslColors.length < 2) {
    return { isValid: true, explanation: 'Color conversion failed' };
  }

  // Count neutrals
  const neutralCount = hslColors.filter(isNeutral).length;

  // If all colors are neutral, it's harmonious
  if (neutralCount === hslColors.length) {
    return { isValid: true, explanation: 'Neutral palette - harmonious' };
  }

  // Check for clashing colors
  for (let i = 0; i < hslColors.length - 1; i++) {
    for (let j = i + 1; j < hslColors.length; j++) {
      // Skip if either is neutral
      if (isNeutral(hslColors[i]) || isNeutral(hslColors[j])) continue;

      if (doColorsClash(hslColors[i], hslColors[j])) {
        return {
          isValid: false,
          explanation: `Colors ${validColors[i]} and ${validColors[j]} may clash`,
        };
      }
    }
  }

  // Check for harmony (complementary, analogous, or monochromatic)
  let hasHarmony = false;
  for (let i = 0; i < hslColors.length - 1; i++) {
    for (let j = i + 1; j < hslColors.length; j++) {
      if (
        areComplementary(hslColors[i], hslColors[j]) ||
        areAnalogous(hslColors[i], hslColors[j]) ||
        areMonochromatic(hslColors[i], hslColors[j])
      ) {
        hasHarmony = true;
        break;
      }
    }
    if (hasHarmony) break;
  }

  if (hasHarmony || neutralCount > 0) {
    return { isValid: true, explanation: 'Colors are harmonious' };
  }

  return {
    isValid: true,
    explanation: 'Color combination is acceptable',
  };
};

/**
 * Get a user-friendly color name from hex
 */
export const getColorName = (hex: string): string => {
  const rgb = hexToRgb(hex);
  if (!rgb) return 'unknown';

  const hsl = rgbToHsl(rgb);

  // Neutrals
  if (hsl.s < 10) {
    if (hsl.l < 20) return 'black';
    if (hsl.l < 40) return 'dark gray';
    if (hsl.l < 60) return 'gray';
    if (hsl.l < 80) return 'light gray';
    return 'white';
  }

  // Chromatic colors
  const hue = hsl.h;
  if (hue < 15) return 'red';
  if (hue < 45) return 'orange';
  if (hue < 75) return 'yellow';
  if (hue < 150) return 'green';
  if (hue < 210) return 'cyan';
  if (hue < 270) return 'blue';
  if (hue < 330) return 'purple';
  return 'red';
};
