import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UserPreferences, UserPreferencesSchema } from '@/types/generator';

export const useUserPreferences = () => {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [location, setLocation] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadPreferences = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('body_type, style_preferences, favorite_colors, location')
        .eq('user_id', user.id)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      if (data) {
        const validatedPreferences = UserPreferencesSchema.parse(data);
        setPreferences(validatedPreferences);
        
        if (validatedPreferences.location) {
          setLocation(validatedPreferences.location);
        }
      }
    } catch (err) {
      console.error('Error loading user preferences:', err);
      setError(err instanceof Error ? err.message : 'Failed to load preferences');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPreferences();
  }, []);

  const updateLocation = (newLocation: string): void => {
    setLocation(newLocation);
  };

  return {
    preferences,
    location,
    loading,
    error,
    reload: loadPreferences,
    updateLocation,
  };
};
