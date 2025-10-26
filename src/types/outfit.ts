import { z } from 'zod';

// Zod schemas for validation
export const ClothingItemSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  category: z.string().min(1),
  color: z.string().min(1),
  brand: z.string().optional(),
  style: z.string().optional(),
  image_url: z.string().url(),
  ai_detected_metadata: z.any().optional(),
  created_at: z.string().optional(),
});

export const PurchaseLinkSchema = z.object({
  store_name: z.string().min(1),
  price: z.string().optional(),
  url: z.string().url().optional().or(z.literal('')),
});

export const OutfitItemSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  prompt: z.string(),
  mood: z.string().optional(),
  recommended_clothes: z.array(z.string().uuid()),
  outfit_image_url: z.string().url().optional(),
  reasoning: z.string().optional(),
  style_notes: z.string().optional(),
  is_public: z.boolean().default(true),
  pinterest_board_id: z.string().optional(),
  occasion: z.string().optional(),
  purchase_links: z.array(PurchaseLinkSchema).optional(),
  weather_data: z.any().optional(),
  ai_generated_image_url: z.string().url().optional(),
  created_at: z.string().optional(),
  likes_count: z.number().default(0),
});

// TypeScript types derived from schemas
export type ClothingItem = z.infer<typeof ClothingItemSchema>;
export type PurchaseLink = z.infer<typeof PurchaseLinkSchema>;
export type OutfitItem = z.infer<typeof OutfitItemSchema>;

// Validation functions
export const validateClothingItem = (data: unknown): ClothingItem => {
  return ClothingItemSchema.parse(data);
};

export const validatePurchaseLink = (data: unknown): PurchaseLink => {
  return PurchaseLinkSchema.parse(data);
};

export const validateOutfitItem = (data: unknown): OutfitItem => {
  return OutfitItemSchema.parse(data);
};

// Partial validation for updates
export const validateClothingItemPartial = (data: unknown): Partial<ClothingItem> => {
  return ClothingItemSchema.partial().parse(data);
};

export const validateOutfitItemPartial = (data: unknown): Partial<OutfitItem> => {
  return OutfitItemSchema.partial().parse(data);
};
