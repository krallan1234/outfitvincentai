import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Calendar, Briefcase, Heart, Sun, Music, Coffee, Plane, PartyPopper } from 'lucide-react';

const OCCASIONS = [
  { 
    value: 'wedding', 
    label: 'Wedding Guest',
    icon: Heart,
    description: 'Elegant formal attire'
  },
  { 
    value: 'interview', 
    label: 'Job Interview',
    icon: Briefcase,
    description: 'Professional business wear'
  },
  { 
    value: 'date', 
    label: 'Date Night',
    icon: Heart,
    description: 'Romantic evening outfit'
  },
  { 
    value: 'beach', 
    label: 'Beach Vacation',
    icon: Sun,
    description: 'Light summer style'
  },
  { 
    value: 'concert', 
    label: 'Concert/Festival',
    icon: Music,
    description: 'Fun and expressive'
  },
  { 
    value: 'brunch', 
    label: 'Brunch',
    icon: Coffee,
    description: 'Casual chic'
  },
  { 
    value: 'travel', 
    label: 'Travel',
    icon: Plane,
    description: 'Comfortable and versatile'
  },
  { 
    value: 'party', 
    label: 'Party',
    icon: PartyPopper,
    description: 'Festive celebration'
  },
  { 
    value: 'meeting', 
    label: 'Business Meeting',
    icon: Briefcase,
    description: 'Smart professional'
  },
  { 
    value: 'casual', 
    label: 'Casual Weekend',
    icon: Coffee,
    description: 'Relaxed everyday wear'
  },
];

interface OccasionFiltersProps {
  selectedOccasion: string;
  onOccasionChange: (occasion: string) => void;
}

export const OccasionFilters = ({ selectedOccasion, onOccasionChange }: OccasionFiltersProps) => {
  return (
    <div className="space-y-3">
      <Label>Occasion (Optional)</Label>
      <p className="text-sm text-muted-foreground">
        Select an occasion for tailored outfit suggestions
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {OCCASIONS.map((occasion) => {
          const Icon = occasion.icon;
          const isSelected = selectedOccasion === occasion.value;
          
          return (
            <button
              key={occasion.value}
              type="button"
              onClick={() => onOccasionChange(isSelected ? '' : occasion.value)}
              className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                isSelected
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-muted hover:border-muted-foreground/40 hover:bg-muted/50'
              }`}
              title={occasion.description}
            >
              <Icon className={`h-5 w-5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className={`text-xs font-medium text-center ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                {occasion.label}
              </span>
            </button>
          );
        })}
      </div>
      {selectedOccasion && (
        <Badge variant="secondary" className="mt-2">
          Selected: {OCCASIONS.find(o => o.value === selectedOccasion)?.label}
        </Badge>
      )}
    </div>
  );
};
