import { create } from 'zustand';
import { UserPreferences, UserPreferencesSchema } from '@/types/generator';
import { profilesApi } from '@/api/supabase';

interface PreferencesState {
  preferences: UserPreferences | null;
  location: string;
  loading: boolean;
  error: string | null;
  
  loadPreferences: (userId: string) => Promise<void>;
  updateLocation: (location: string) => void;
  updatePreferences: (userId: string, updates: Partial<UserPreferences>) => Promise<void>;
  reset: () => void;
}

const defaultPreferences: UserPreferences = {
  body_type: null,
  style_preferences: null,
  favorite_colors: null,
  location: null,
  gender: null,
  skin_tone: null,
};

export const usePreferencesStore = create<PreferencesState>((set, get) => ({
  preferences: null,
  location: '',
  loading: false,
  error: null,

  loadPreferences: async (userId: string) => {
    try {
      set({ loading: true, error: null });

      const data = await profilesApi.getProfile(userId);
      const validatedPreferences = UserPreferencesSchema.parse(data);
      
      set({ 
        preferences: validatedPreferences,
        location: validatedPreferences.location || '',
        loading: false 
      });
    } catch (err) {
      console.error('Error loading preferences:', err);
      set({ 
        preferences: defaultPreferences,
        error: err instanceof Error ? err.message : 'Failed to load preferences',
        loading: false 
      });
    }
  },

  updateLocation: (location: string) => {
    set({ location });
  },

  updatePreferences: async (userId: string, updates: Partial<UserPreferences>) => {
    try {
      set({ loading: true, error: null });
      
      await profilesApi.updateProfile(userId, updates);
      
      const current = get().preferences || defaultPreferences;
      set({ 
        preferences: { ...current, ...updates },
        loading: false 
      });
    } catch (err) {
      console.error('Error updating preferences:', err);
      set({ 
        error: err instanceof Error ? err.message : 'Failed to update preferences',
        loading: false 
      });
      throw err;
    }
  },

  reset: () => {
    set({ 
      preferences: null, 
      location: '', 
      loading: false, 
      error: null 
    });
  }
}));
