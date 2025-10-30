import { z } from 'zod';
import { Outfit } from '@/hooks/useOutfits';

// Weather data schema
export const WeatherDataSchema = z.object({
  temperature: z.number(),
  condition: z.string(),
  description: z.string(),
  icon: z.string(),
  humidity: z.number(),
  windSpeed: z.number(),
});

export type WeatherData = z.infer<typeof WeatherDataSchema>;

// User preferences schema
export const UserPreferencesSchema = z.object({
  body_type: z.string().optional().nullable(),
  style_preferences: z.union([z.array(z.string()), z.string()]).optional().nullable(),
  favorite_colors: z.union([z.array(z.string()), z.string()]).optional().nullable(),
  location: z.string().optional().nullable(),
  gender: z.string().optional().nullable(),
  skin_tone: z.string().optional().nullable(),
});

export type UserPreferences = z.infer<typeof UserPreferencesSchema>;

// Pinterest pin schema
export const PinterestPinSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  image_url: z.string().url(),
  link: z.string().url().optional(),
});

export type PinterestPin = z.infer<typeof PinterestPinSchema>;

// Generation parameters
export interface OutfitGenerationParams {
  prompt: string;
  mood?: string;
  occasion?: string;
  isPublic?: boolean;
  pinterestBoardId?: string;
  selectedItems?: string[];
  purchaseLinks?: Array<{ store_name: string; price?: string; url?: string }>;
  weather?: WeatherData;
  userPreferences?: UserPreferences;
  pinterestContext?: string;
  pinterestPins?: PinterestPin[];
  shouldGenerateImage?: boolean;
  forceVariety?: boolean;
}

// Generation result
export interface OutfitGenerationResult {
  outfit: Outfit;
  recommendedClothes?: any[];
  fromCache?: boolean;
  message?: string;
}

// Generation state
export interface GenerationState {
  loading: boolean;
  step: number;
  tip: string;
  error: string | null;
}

// Mood options
export const MOODS = [
  { value: 'casual', label: 'Casual' },
  { value: 'sporty', label: 'Sporty' },
  { value: 'elegant', label: 'Elegant' },
  { value: 'professional', label: 'Professional' },
  { value: 'romantic', label: 'Romantic' },
  { value: 'edgy', label: 'Edgy' },
  { value: 'bohemian', label: 'Bohemian' },
  { value: 'minimalist', label: 'Minimalist' },
] as const;

export type MoodValue = typeof MOODS[number]['value'];

// Quick prompt templates - categorized
export const QUICK_PROMPTS_CATEGORIZED = {
  Casual: [
    'Casual weekend brunch',
    'Coffee shop hangout',
    'Relaxed Sunday vibes',
    'Everyday comfort style',
  ],
  Business: [
    'Business meeting outfit',
    'Professional presentation',
    'Office power look',
    'Corporate lunch attire',
  ],
  Evening: [
    'Date night look',
    'Romantic dinner outfit',
    'Cocktail party style',
    'Night out with friends',
  ],
  Active: [
    'Gym workout attire',
    'Morning yoga session',
    'Running outfit',
    'Athletic streetwear',
  ],
  Weather: [
    'Rainy day outfit',
    'Summer beach vibes',
    'Cozy winter layers',
    'Spring transitional look',
  ],
  Special: [
    'Wedding guest outfit',
    'Job interview attire',
    'Birthday party look',
    'Travel comfortable style',
  ]
} as const;

// Flat list for backward compatibility
export const QUICK_PROMPTS = Object.values(QUICK_PROMPTS_CATEGORIZED).flat() as readonly string[];
