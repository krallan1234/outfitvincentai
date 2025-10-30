import { create } from 'zustand';
import { Outfit } from '@/types/outfit';
import { outfitsApi } from '@/api/supabase';
import { toast } from 'sonner';

interface OutfitsState {
  outfits: Outfit[];
  loading: boolean;
  error: string | null;
  
  fetchOutfits: (userId: string) => Promise<void>;
  generateOutfit: (params: any) => Promise<any>;
  deleteOutfit: (outfitId: string) => Promise<void>;
  addOutfit: (outfit: Outfit) => void;
  reset: () => void;
}

export const useOutfitsStore = create<OutfitsState>((set, get) => ({
  outfits: [],
  loading: false,
  error: null,

  fetchOutfits: async (userId: string) => {
    try {
      set({ loading: true, error: null });
      const data = await outfitsApi.fetchOutfits(userId);
      set({ outfits: data, loading: false });
    } catch (err) {
      console.error('Error fetching outfits:', err);
      set({ 
        error: err instanceof Error ? err.message : 'Failed to fetch outfits',
        loading: false 
      });
    }
  },

  generateOutfit: async (params: any) => {
    try {
      set({ loading: true, error: null });
      
      const response = await outfitsApi.generateOutfit(params);
      
      console.log('📦 Edge Function full response:', response);
      
      if (!response?.success) {
        throw new Error(response?.error || 'Generation failed');
      }

      const payload = response.data;
      console.log('📦 Payload (response.data):', payload);

      if (!payload?.outfit) {
        console.error('❌ No outfit in payload');
        throw new Error('No outfit data received');
      }

      const outfit = payload.outfit;
      const recommendedClothes = payload.recommendedClothes || [];
      const fromCache = response.meta?.fromCache || false;

      console.log('✅ Extracted outfit:', {
        id: outfit.id,
        title: outfit.title,
        keys: Object.keys(outfit),
        fromCache
      });

      // Add to store
      const current = get().outfits;
      set({ 
        outfits: [outfit, ...current],
        loading: false 
      });

      toast.success(
        fromCache ? 'Loaded from cache!' : 'Outfit generated successfully!'
      );

      return { outfit, recommendedClothes, fromCache };
    } catch (err) {
      console.error('Error generating outfit:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to generate outfit';
      set({ error: errorMsg, loading: false });
      toast.error(errorMsg);
      return null;
    }
  },

  deleteOutfit: async (outfitId: string) => {
    try {
      set({ loading: true, error: null });
      await outfitsApi.deleteOutfit(outfitId);
      
      const current = get().outfits;
      set({ 
        outfits: current.filter(o => o.id !== outfitId),
        loading: false 
      });
      
      toast.success('Outfit deleted');
    } catch (err) {
      console.error('Error deleting outfit:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to delete outfit';
      set({ error: errorMsg, loading: false });
      toast.error(errorMsg);
      throw err;
    }
  },

  addOutfit: (outfit: Outfit) => {
    const current = get().outfits;
    set({ outfits: [outfit, ...current] });
  },

  reset: () => {
    set({ outfits: [], loading: false, error: null });
  }
}));
