import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';

export interface CalendarEntry {
  id: string;
  user_id: string;
  outfit_id: string;
  scheduled_date: string;
  notes: string | null;
  outfit?: {
    title: string;
    generated_image_url: string | null;
    mood: string | null;
  };
}

export const useOutfitCalendar = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCalendarEntries = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('outfit_calendar')
        .select(`
          *,
          outfit:outfits(title, generated_image_url, mood)
        `)
        .eq('user_id', user.id)
        .order('scheduled_date', { ascending: true });

      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error('Error fetching calendar:', error);
      toast({
        title: "Error",
        description: "Failed to load calendar entries",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addToCalendar = async (outfitId: string, date: Date, notes?: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('outfit_calendar')
        .insert({
          user_id: user.id,
          outfit_id: outfitId,
          scheduled_date: date.toISOString().split('T')[0],
          notes: notes || null
        })
        .select(`
          *,
          outfit:outfits(title, generated_image_url, mood)
        `)
        .single();

      if (error) {
        if (error.code === '23505') {
          toast({
            title: "Date already scheduled",
            description: "You already have an outfit for this date. Remove it first.",
            variant: "destructive"
          });
        } else {
          throw error;
        }
        return null;
      }

      setEntries(prev => [...prev, data]);
      toast({
        title: "Added to calendar",
        description: `Outfit scheduled for ${date.toLocaleDateString()}`
      });
      return data;
    } catch (error) {
      console.error('Error adding to calendar:', error);
      toast({
        title: "Error",
        description: "Failed to add outfit to calendar",
        variant: "destructive"
      });
      return null;
    }
  };

  const removeFromCalendar = async (entryId: string) => {
    try {
      const { error } = await supabase
        .from('outfit_calendar')
        .delete()
        .eq('id', entryId);

      if (error) throw error;

      setEntries(prev => prev.filter(e => e.id !== entryId));
      toast({
        title: "Removed from calendar",
        description: "Outfit unscheduled successfully"
      });
    } catch (error) {
      console.error('Error removing from calendar:', error);
      toast({
        title: "Error",
        description: "Failed to remove outfit from calendar",
        variant: "destructive"
      });
    }
  };

  const updateCalendarEntry = async (entryId: string, date: Date, notes?: string) => {
    try {
      const { data, error } = await supabase
        .from('outfit_calendar')
        .update({
          scheduled_date: date.toISOString().split('T')[0],
          notes: notes || null
        })
        .eq('id', entryId)
        .select(`
          *,
          outfit:outfits(title, generated_image_url, mood)
        `)
        .single();

      if (error) throw error;

      setEntries(prev => prev.map(e => e.id === entryId ? data : e));
      toast({
        title: "Calendar updated",
        description: "Outfit rescheduled successfully"
      });
    } catch (error) {
      console.error('Error updating calendar:', error);
      toast({
        title: "Error",
        description: "Failed to update calendar entry",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchCalendarEntries();
  }, [user]);

  return {
    entries,
    loading,
    addToCalendar,
    removeFromCalendar,
    updateCalendarEntry,
    refetch: fetchCalendarEntries
  };
};