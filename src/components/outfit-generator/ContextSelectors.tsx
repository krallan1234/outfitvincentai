import { AdvancedMoodSelector } from '@/components/AdvancedMoodSelector';
import { OccasionFilters } from '@/components/OccasionFilters';
import { PinterestBoardSelector } from '@/components/PinterestBoardSelector';

interface ContextSelectorsProps {
  mood: string;
  onMoodChange: (mood: string) => void;
  occasion: string;
  onOccasionChange: (occasion: string) => void;
  onPinterestBoardConnected: (connected: boolean) => void;
  disabled?: boolean;
}

export const ContextSelectors = ({
  mood,
  onMoodChange,
  occasion,
  onOccasionChange,
  onPinterestBoardConnected,
  disabled = false,
}: ContextSelectorsProps) => {
  return (
    <div className="space-y-6">
      {/* Occasion Filters */}
      <OccasionFilters
        selectedOccasion={occasion}
        onOccasionChange={onOccasionChange}
      />

      {/* Advanced Mood Selection */}
      <div id="mood-selector">
        <AdvancedMoodSelector
          value={mood}
          onChange={onMoodChange}
        />
      </div>

      {/* Pinterest Board Integration */}
      <PinterestBoardSelector onBoardConnected={onPinterestBoardConnected} />
    </div>
  );
};
