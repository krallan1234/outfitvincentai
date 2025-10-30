import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { calendarApi } from '@/api/supabase';
import { CalendarEntrySchema } from '@/lib/validations';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';

export const useCalendarQuery = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['calendar', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID required');
      const entries = await calendarApi.fetchEntries(userId);
      logger.info('Calendar entries fetched', { count: entries.length });
      return entries;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
    retry: 2,
  });
};

export const useAddToCalendar = (userId: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { outfitId: string; date: Date; notes?: string }) => {
      if (!userId) throw new Error('User ID required');
      const validated = CalendarEntrySchema.parse(input);
      const entry = await calendarApi.addEntry(
        userId,
        validated.outfitId,
        validated.date,
        validated.notes
      );
      logger.info('Added to calendar', { entryId: entry.id });
      return entry;
    },
    retry: 2,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar', userId] });
      toast.success('Added to calendar');
    },
    onError: (error) => {
      logger.error('Failed to add to calendar', error);
      toast.error('Failed to add to calendar');
    },
  });
};

export const useUpdateCalendarEntry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      entryId,
      date,
      notes,
    }: {
      entryId: string;
      date: Date;
      notes?: string;
    }) => {
      await calendarApi.updateEntry(entryId, date, notes);
      logger.info('Calendar entry updated', { entryId });
    },
    retry: 2,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      toast.success('Calendar entry updated');
    },
    onError: (error) => {
      logger.error('Failed to update calendar entry', error);
      toast.error('Failed to update entry');
    },
  });
};

export const useDeleteCalendarEntry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entryId: string) => {
      await calendarApi.deleteEntry(entryId);
      logger.info('Calendar entry deleted', { entryId });
    },
    retry: 2,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      toast.success('Removed from calendar');
    },
    onError: (error) => {
      logger.error('Failed to delete calendar entry', error);
      toast.error('Failed to remove from calendar');
    },
  });
};
