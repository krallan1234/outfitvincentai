import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

// Weather data schema
export const WeatherDataSchema = z.object({
  temperature: z.number(),
  condition: z.string(),
  description: z.string(),
  icon: z.string().optional(),
  humidity: z.number().optional(),
  windSpeed: z.number().optional(),
}).optional();

// User preferences schema
export const UserPreferencesSchema = z.object({
  body_type: z.string().optional(),
  style_preferences: z.union([z.string(), z.any()]).optional(),
  favorite_colors: z.union([z.string(), z.any()]).optional(),
}).optional();

// Pinterest pin schema
export const PinterestPinSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  image_url: z.string().url().optional(),
  link: z.string().url().optional(),
});

// Selected item schema
export const SelectedItemSchema = z.object({
  id: z.string().uuid(),
  category: z.string(),
  color: z.string(),
  image_url: z.string().url().optional(),
});

// Purchase link schema
export const PurchaseLinkSchema = z.object({
  store_name: z.string().min(1),
  price: z.string().optional(),
  url: z.string().url().optional(),
});

// Main request schema
export const GenerateOutfitRequestSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required').max(1000, 'Prompt too long'),
  mood: z.string().optional(),
  userId: z.string().uuid('Invalid user ID format'),
  isPublic: z.boolean().default(true),
  pinterestBoardId: z.string().optional(),
  selectedItem: z.union([
    SelectedItemSchema,
    z.array(SelectedItemSchema),
  ]).optional(),
  purchaseLinks: z.array(PurchaseLinkSchema).optional(),
  weatherData: WeatherDataSchema,
  userPreferences: UserPreferencesSchema,
  pinterestContext: z.string().optional(),
  pinterestPins: z.array(PinterestPinSchema).optional(),
  generateImage: z.boolean().default(false),
});

export type GenerateOutfitRequest = z.infer<typeof GenerateOutfitRequestSchema>;
