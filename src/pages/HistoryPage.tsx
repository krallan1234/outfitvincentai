import { useAuthStore } from '@/store/useAuthStore';
import { useOutfitsQuery } from '@/hooks/useOutfitsQuery';
import { OutfitHistory } from '@/components/OutfitHistory';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const HistoryPage = () => {
  const { user } = useAuthStore();
  const { data: outfits, isLoading, error } = useOutfitsQuery(user?.id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertDescription>Failed to load outfit history</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Outfit History</h1>
      <OutfitHistory outfits={outfits || []} />
    </div>
  );
};
