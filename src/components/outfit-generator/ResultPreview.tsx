import { OutfitModal } from '@/components/OutfitModal';
import { Outfit } from '@/hooks/useOutfits';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';

interface ResultPreviewProps {
  outfit: Outfit | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ResultPreview = ({ outfit, isOpen, onClose }: ResultPreviewProps) => {
  // Show loading skeleton when outfit is null but modal is open
  if (isOpen && !outfit) {
    return (
      <Card className="fixed inset-4 sm:inset-auto sm:right-4 sm:top-20 sm:w-96 z-50 p-6 animate-in slide-in-from-right">
        <div className="space-y-4">
          <Skeleton className="h-64 w-full rounded-lg" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <div className="flex gap-2 pt-4">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 flex-1" />
          </div>
        </div>
      </Card>
    );
  }

  if (!outfit) return null;

  return (
    <OutfitModal
      outfit={outfit}
      isOpen={isOpen}
      onClose={onClose}
      showLikeButton={false}
    />
  );
};
