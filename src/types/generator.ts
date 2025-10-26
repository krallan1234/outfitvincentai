import { z } from 'zod';

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
  body_type: z.string().optional(),
  style_preferences: z.string().optional(),
  favorite_colors: z.string().optional(),
  location: z.string().optional(),
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
  outfit: {
    id: string;
    prompt: string;
    mood?: string;
    recommended_clothes: string[];
    outfit_image_url?: string;
    reasoning?: string;
    style_notes?: string;
    ai_generated_image_url?: string;
  };
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

// Quick prompt templates
export const QUICK_PROMPTS = [
  'Formal office wear in blue tones',
  'Casual weekend brunch outfit',
  'Date night dinner look',
  'Summer beach vacation style',
  'Winter layered street style',
  'Business meeting attire',
] as const;

export type QuickPrompt = typeof QUICK_PROMPTS[number];
