import { OutfitModal } from '@/components/OutfitModal';
import { Outfit } from '@/hooks/useOutfits';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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

  // Extract AI analysis data
  const aiAnalysis = outfit.ai_analysis as any;
  const reasoningFeedback = aiAnalysis?.reasoningFeedback || aiAnalysis?.reasoning;
  const styleProfile = aiAnalysis?.styleProfile;

  return (
    <>
      <OutfitModal
        outfit={outfit}
        isOpen={isOpen}
        onClose={onClose}
        showLikeButton={false}
      />
      
      {/* AI Reasoning Display - shown in modal */}
      {isOpen && reasoningFeedback && (
        <div className="fixed inset-x-4 bottom-20 sm:right-4 sm:left-auto sm:w-96 z-50 animate-in slide-in-from-bottom">
          <div className="p-4 bg-muted/95 backdrop-blur-sm rounded-lg border border-muted-foreground/20 shadow-lg">
            <p className="text-sm text-muted-foreground italic">
              💭 <strong className="text-foreground">AI's analys:</strong> "{reasoningFeedback}"
            </p>
            {styleProfile && (
              <Badge variant="secondary" className="mt-2">
                Stil: {styleProfile}
              </Badge>
            )}
          </div>
        </div>
      )}
    </>
  );
};
