import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';

interface SearchFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedStyle?: string;
  onStyleChange: (value: string) => void;
  selectedColor?: string;
  onColorChange: (value: string) => void;
  selectedCategory?: string;
  onCategoryChange: (value: string) => void;
}

const STYLES = ['casual', 'sporty', 'elegant', 'professional', 'romantic', 'edgy', 'bohemian', 'minimalist'];
const COLORS = ['red', 'blue', 'green', 'yellow', 'black', 'white', 'gray', 'brown', 'pink', 'purple'];
const CATEGORIES = ['shirt', 'pants', 'dress', 'jacket', 'shoes', 'accessories', 'ringar', 'kepsar', 'klockor'];

export const SearchFilters = ({
  searchTerm,
  onSearchChange,
  selectedStyle,
  onStyleChange,
  selectedColor,
  onColorChange,
  selectedCategory,
  onCategoryChange
}: SearchFiltersProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {/* Search */}
      <div className="relative md:col-span-2">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search outfits..."
          className="pl-10"
        />
      </div>

      {/* Style Filter */}
      <Select value={selectedStyle} onValueChange={onStyleChange}>
        <SelectTrigger>
          <SelectValue placeholder="Filter by style" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Styles</SelectItem>
          {STYLES.map(style => (
            <SelectItem key={style} value={style} className="capitalize">
              {style}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Color Filter */}
      <Select value={selectedColor} onValueChange={onColorChange}>
        <SelectTrigger>
          <SelectValue placeholder="Filter by color" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Colors</SelectItem>
          {COLORS.map(color => (
            <SelectItem key={color} value={color} className="capitalize">
              {color}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
