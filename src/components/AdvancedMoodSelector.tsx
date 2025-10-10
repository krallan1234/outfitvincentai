import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ChevronRight } from 'lucide-react';

const MOOD_CATEGORIES = {
  casual: {
    label: 'Casual',
    subcategories: ['Beach', 'Brunch', 'Shopping', 'Coffee Date', 'Park Walk']
  },
  sporty: {
    label: 'Sporty',
    subcategories: ['Gym', 'Yoga', 'Running', 'Hiking', 'Athleisure']
  },
  elegant: {
    label: 'Elegant',
    subcategories: ['Cocktail Party', 'Gala', 'Wedding Guest', 'Fine Dining', 'Theater']
  },
  professional: {
    label: 'Professional',
    subcategories: ['Office', 'Meeting', 'Interview', 'Conference', 'Presentation']
  },
  romantic: {
    label: 'Romantic',
    subcategories: ['Date Night', 'Anniversary', 'Valentine\'s', 'Dinner Date', 'Evening Out']
  },
  edgy: {
    label: 'Edgy',
    subcategories: ['Concert', 'Club', 'Festival', 'Night Out', 'Street Style']
  },
  bohemian: {
    label: 'Bohemian',
    subcategories: ['Music Festival', 'Art Show', 'Outdoor Party', 'Vintage Market', 'Picnic']
  },
  minimalist: {
    label: 'Minimalist',
    subcategories: ['Gallery Opening', 'Modern Event', 'Business Casual', 'Clean Look', 'Simple Chic']
  }
};

interface AdvancedMoodSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export const AdvancedMoodSelector = ({ value, onChange }: AdvancedMoodSelectorProps) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('');

  // Parse existing value if it contains subcategory
  useState(() => {
    if (value && value.includes(' > ')) {
      const [cat, subcat] = value.split(' > ');
      setSelectedCategory(cat);
      setSelectedSubcategory(subcat);
    } else if (value) {
      setSelectedCategory(value);
    }
  });

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setSelectedSubcategory('');
    onChange(category);
  };

  const handleSubcategoryChange = (subcategory: string) => {
    setSelectedSubcategory(subcategory);
    onChange(`${selectedCategory} > ${subcategory}`);
  };

  const clearSelection = () => {
    setSelectedCategory('');
    setSelectedSubcategory('');
    onChange('');
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="mood-category">Mood Category</Label>
        <Select value={selectedCategory} onValueChange={handleCategoryChange}>
          <SelectTrigger id="mood-category">
            <SelectValue placeholder="Select a general mood" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No specific mood</SelectItem>
            {Object.entries(MOOD_CATEGORIES).map(([key, category]) => (
              <SelectItem key={key} value={key}>
                {category.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedCategory && selectedCategory !== 'none' && MOOD_CATEGORIES[selectedCategory as keyof typeof MOOD_CATEGORIES] && (
        <div className="space-y-2">
          <Label className="flex items-center gap-1 text-sm">
            <ChevronRight className="h-3 w-3" />
            Specific Occasion
          </Label>
          <div className="flex flex-wrap gap-2">
            {MOOD_CATEGORIES[selectedCategory as keyof typeof MOOD_CATEGORIES].subcategories.map((subcat) => (
              <Badge
                key={subcat}
                variant={selectedSubcategory === subcat ? 'default' : 'outline'}
                className="cursor-pointer hover:bg-primary/80 transition-colors"
                onClick={() => handleSubcategoryChange(subcat)}
              >
                {subcat}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {(selectedCategory || selectedSubcategory) && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Selected:</span>
          <Badge variant="secondary" className="gap-1">
            {selectedCategory}
            {selectedSubcategory && (
              <>
                <ChevronRight className="h-3 w-3" />
                {selectedSubcategory}
              </>
            )}
          </Badge>
          <button
            onClick={clearSelection}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
};
