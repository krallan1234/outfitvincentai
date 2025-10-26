import { OutfitModal } from '@/components/OutfitModal';
import { OutfitItem } from '@/types/outfit';

interface ResultPreviewProps {
  outfit: OutfitItem | null;
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
