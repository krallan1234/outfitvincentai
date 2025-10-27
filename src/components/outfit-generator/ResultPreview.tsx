import { OutfitModal } from '@/components/OutfitModal';
import { Outfit } from '@/hooks/useOutfits';

interface ResultPreviewProps {
  outfit: Outfit | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ResultPreview = ({ outfit, isOpen, onClose }: ResultPreviewProps) => {
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
