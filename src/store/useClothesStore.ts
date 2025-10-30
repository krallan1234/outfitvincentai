import { create } from 'zustand';
import { clothesApi } from '@/api/supabase';
import { toast } from 'sonner';

interface ClothingItem {
  id: string;
  user_id: string;
  image_url: string;
  category: string;
  color: string;
  brand: string;
  style: string;
  description: string;
  ai_detected_metadata: any;
  texture_maps: any;
  created_at?: string;
  updated_at?: string;
}

interface ClothesState {
  clothes: ClothingItem[];
  loading: boolean;
  error: string | null;
  
  fetchClothes: (userId: string) => Promise<void>;
  addClothingItem: (item: ClothingItem) => void;
  deleteClothingItem: (id: string, imagePath?: string) => Promise<void>;
  reset: () => void;
}

export const useClothesStore = create<ClothesState>((set, get) => ({
  clothes: [],
  loading: false,
  error: null,

  fetchClothes: async (userId: string) => {
    try {
      set({ loading: true, error: null });
      const data = await clothesApi.fetchClothes(userId);
      set({ clothes: data || [], loading: false });
    } catch (err) {
      console.error('Error fetching clothes:', err);
      set({ 
        error: err instanceof Error ? err.message : 'Failed to fetch clothes',
        loading: false 
      });
    }
  },

  addClothingItem: (item: ClothingItem) => {
    const current = get().clothes;
    set({ clothes: [item, ...current] });
  },

  deleteClothingItem: async (id: string, imagePath?: string) => {
    try {
      set({ loading: true, error: null });
      await clothesApi.deleteClothingItem(id, imagePath);
      
      const current = get().clothes;
      set({ 
        clothes: current.filter(c => c.id !== id),
        loading: false 
      });
      
      toast.success('Item deleted');
    } catch (err) {
      console.error('Error deleting item:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to delete item';
      set({ error: errorMsg, loading: false });
      toast.error(errorMsg);
      throw err;
    }
  },

  reset: () => {
    set({ clothes: [], loading: false, error: null });
  }
}));
