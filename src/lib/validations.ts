import { z } from 'zod';

// ============================================
// OUTFIT GENERATION VALIDATIONS
// ============================================

export const OutfitGenerationParamsSchema = z.object({
  prompt: z
    .string()
    .trim()
    .min(3, 'Prompt must be at least 3 characters')
    .max(500, 'Prompt must be less than 500 characters'),
  occasion: z.string().trim().max(100).optional(),
  weather: z.any().optional(),
  selectedItems: z.array(z.any()).optional(),
  pinterestContext: z.string().max(5000).optional(),
  pinterestPins: z.array(z.any()).optional(),
  forceVariety: z.boolean().optional(),
});

export type OutfitGenerationParams = z.infer<typeof OutfitGenerationParamsSchema>;

// ============================================
// CLOTHING ITEM VALIDATIONS
// ============================================

export const ClothingUploadSchema = z.object({
  file: z
    .instanceof(File)
    .refine((file) => file.size <= 10 * 1024 * 1024, 'File must be less than 10MB')
    .refine(
      (file) => ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type),
      'File must be an image (JPEG, PNG, or WebP)'
    ),
  category: z.string().trim().min(1).max(50).optional(),
});

export type ClothingUpload = z.infer<typeof ClothingUploadSchema>;

// ============================================
// USER PREFERENCES VALIDATIONS
// ============================================

export const LocationSchema = z
  .string()
  .trim()
  .min(2, 'Location must be at least 2 characters')
  .max(100, 'Location must be less than 100 characters');

export const UserPreferencesUpdateSchema = z.object({
  body_type: z.string().trim().max(50).nullable().optional(),
  style_preferences: z.string().trim().max(500).nullable().optional(),
  favorite_colors: z.string().trim().max(200).nullable().optional(),
  location: LocationSchema.nullable().optional(),
  gender: z.string().trim().max(20).nullable().optional(),
  skin_tone: z.string().trim().max(50).nullable().optional(),
});

export type UserPreferencesUpdate = z.infer<typeof UserPreferencesUpdateSchema>;

// ============================================
// CALENDAR VALIDATIONS
// ============================================

export const CalendarEntrySchema = z.object({
  outfitId: z.string().uuid('Invalid outfit ID'),
  date: z.date(),
  notes: z.string().trim().max(500, 'Notes must be less than 500 characters').optional(),
});

export type CalendarEntry = z.infer<typeof CalendarEntrySchema>;

// ============================================
// COMMENT VALIDATIONS
// ============================================

export const CommentSchema = z.object({
  outfitId: z.string().uuid('Invalid outfit ID'),
  content: z
    .string()
    .trim()
    .min(1, 'Comment cannot be empty')
    .max(1000, 'Comment must be less than 1000 characters'),
});

export type Comment = z.infer<typeof CommentSchema>;

// ============================================
// SEARCH/FILTER VALIDATIONS
// ============================================

export const SearchQuerySchema = z
  .string()
  .trim()
  .max(200, 'Search query must be less than 200 characters');

export type SearchQuery = z.infer<typeof SearchQuerySchema>;
