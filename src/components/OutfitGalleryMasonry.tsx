import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { 
  Heart, 
  Share2, 
  ZoomIn, 
  GitCompare, 
  SlidersHorizontal, 
  Sparkles,
  CloudRain,
  TrendingUp,
  Search,
  X
} from 'lucide-react';
import { OutfitCollage } from './OutfitCollage';
import { OutfitZoomModal } from './OutfitZoomModal';
import { OutfitCompareModal } from './OutfitCompareModal';
import { useOutfitFavorites } from '@/hooks/useOutfitFavorites';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Outfit {
  id: string;
  title: string;
  description?: string;
  recommended_clothes?: any[];
  mood?: string;
  prompt?: string;
  confidence_score?: number;
  trend_relevance?: number;
  weather_score?: number;
  styling_tips?: string[];
  created_at: string;
}

interface OutfitGalleryMasonryProps {
  outfits: Outfit[];
}

const sortOptions = [
  { value: 'recent', label: 'Most Recent' },
  { value: 'confidence', label: 'Confidence Score' },
  { value: 'trend', label: 'Trend Relevance' },
  { value: 'weather', label: 'Weather Score' },
];

const occasionFilters = [
  { value: 'all', label: 'All Occasions' },
  { value: 'work', label: 'Work' },
  { value: 'date', label: 'Date' },
  { value: 'party', label: 'Party' },
  { value: 'casual', label: 'Casual' },
  { value: 'formal', label: 'Formal' },
];

const styleFilters = [
  { value: 'all', label: 'All Styles' },
  { value: 'casual', label: 'Casual' },
  { value: 'formal', label: 'Formal' },
  { value: 'business', label: 'Business' },
  { value: 'sporty', label: 'Sporty' },
  { value: 'elegant', label: 'Elegant' },
];

export const OutfitGalleryMasonry = ({ outfits }: OutfitGalleryMasonryProps) => {
  const [sortBy, setSortBy] = useState('recent');
  const [occasionFilter, setOccasionFilter] = useState('all');
  const [styleFilter, setStyleFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [zoomedOutfit, setZoomedOutfit] = useState<Outfit | null>(null);
  const [compareOutfits, setCompareOutfits] = useState<Outfit[]>([]);
  
  const { isFavorite, toggleFavorite } = useOutfitFavorites();

  // Filter and sort outfits
  const filteredAndSortedOutfits = useMemo(() => {
    let filtered = [...outfits];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(outfit =>
        outfit.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        outfit.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        outfit.prompt?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Occasion filter
    if (occasionFilter !== 'all') {
      filtered = filtered.filter(outfit =>
        outfit.prompt?.toLowerCase().includes(occasionFilter)
      );
    }

    // Style filter
    if (styleFilter !== 'all') {
      filtered = filtered.filter(outfit =>
        outfit.mood?.toLowerCase() === styleFilter.toLowerCase() ||
        outfit.prompt?.toLowerCase().includes(styleFilter)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'confidence':
          return (b.confidence_score || 0) - (a.confidence_score || 0);
        case 'trend':
          return (b.trend_relevance || 0) - (a.trend_relevance || 0);
        case 'weather':
          return (b.weather_score || 0) - (a.weather_score || 0);
        case 'recent':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    return filtered;
  }, [outfits, sortBy, occasionFilter, styleFilter, searchQuery]);

  const handleShare = async (outfit: Outfit) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: outfit.title,
          text: outfit.description || outfit.title,
          url: `${window.location.origin}/outfits?id=${outfit.id}`
        });
      } else {
        // Fallback: Copy to clipboard
        await navigator.clipboard.writeText(
          `${window.location.origin}/outfits?id=${outfit.id}`
        );
        toast.success('Link copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing:', error);
      toast.error('Failed to share outfit');
    }
  };

  const toggleCompare = (outfit: Outfit) => {
    if (compareOutfits.some(o => o.id === outfit.id)) {
      setCompareOutfits(prev => prev.filter(o => o.id !== outfit.id));
    } else if (compareOutfits.length < 2) {
      setCompareOutfits(prev => [...prev, outfit]);
    } else {
      toast.error('You can only compare 2 outfits at a time');
    }
  };

  const getScoreColor = (score?: number) => {
    if (!score) return 'bg-gray-500';
    if (score >= 8.5) return 'bg-green-500';
    if (score >= 7.0) return 'bg-blue-500';
    return 'bg-yellow-500';
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search outfits..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2"
              onClick={() => setSearchQuery('')}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Filter & Sort Controls */}
        <div className="flex flex-wrap gap-3">
          <Button
            variant={showFilters ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="w-4 h-4 mr-2" />
            Filters
          </Button>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {compareOutfits.length > 0 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => compareOutfits.length === 2 && setCompareOutfits(compareOutfits)}
            >
              <GitCompare className="w-4 h-4 mr-2" />
              Compare ({compareOutfits.length}/2)
            </Button>
          )}
        </div>

        {/* Expandable Filters */}
        {showFilters && (
          <Card className="animate-fade-in">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Occasion</label>
                  <Select value={occasionFilter} onValueChange={setOccasionFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {occasionFilters.map(filter => (
                        <SelectItem key={filter.value} value={filter.value}>
                          {filter.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Style</label>
                  <Select value={styleFilter} onValueChange={setStyleFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {styleFilters.map(filter => (
                        <SelectItem key={filter.value} value={filter.value}>
                          {filter.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{filteredAndSortedOutfits.length} outfit{filteredAndSortedOutfits.length !== 1 ? 's' : ''} found</span>
      </div>

      {/* Masonry Grid */}
      <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
        {filteredAndSortedOutfits.map((outfit) => (
          <Card
            key={outfit.id}
            className={cn(
              "break-inside-avoid mb-6 overflow-hidden transition-all duration-300",
              "hover:shadow-2xl hover:scale-[1.02] cursor-pointer group",
              compareOutfits.some(o => o.id === outfit.id) && "ring-2 ring-primary"
            )}
          >
            {/* Score Badges */}
            <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
              {outfit.confidence_score && (
                <Badge className={cn("gap-1", getScoreColor(outfit.confidence_score))}>
                  <Sparkles className="w-3 h-3" />
                  {outfit.confidence_score.toFixed(1)}
                </Badge>
              )}
              {outfit.trend_relevance && (
                <Badge variant="secondary" className="gap-1">
                  <TrendingUp className="w-3 h-3" />
                  {outfit.trend_relevance.toFixed(1)}
                </Badge>
              )}
              {outfit.weather_score && (
                <Badge variant="outline" className="gap-1 bg-background/80 backdrop-blur">
                  <CloudRain className="w-3 h-3" />
                  {outfit.weather_score.toFixed(1)}
                </Badge>
              )}
            </div>

            {/* Image */}
            <div className="relative" onClick={() => setZoomedOutfit(outfit)}>
              <OutfitCollage
                items={outfit.recommended_clothes || []}
                title={outfit.title}
                colorScheme="complementary"
              />
              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button size="sm" variant="secondary">
                  <ZoomIn className="w-4 h-4 mr-2" />
                  View Details
                </Button>
              </div>
            </div>

            {/* Content */}
            <CardContent className="p-4 space-y-3">
              <div>
                <h3 className="font-semibold line-clamp-2 mb-1">{outfit.title}</h3>
                {outfit.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {outfit.description}
                  </p>
                )}
              </div>

              {outfit.mood && (
                <Badge variant="outline" className="capitalize">
                  {outfit.mood}
                </Badge>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2 border-t">
                <Button
                  variant={isFavorite(outfit.id) ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(outfit.id);
                  }}
                >
                  <Heart className={cn(
                    "w-4 h-4 mr-2",
                    isFavorite(outfit.id) && "fill-current"
                  )} />
                  {isFavorite(outfit.id) ? 'Saved' : 'Save'}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleShare(outfit);
                  }}
                >
                  <Share2 className="w-4 h-4" />
                </Button>

                <Button
                  variant={compareOutfits.some(o => o.id === outfit.id) ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleCompare(outfit);
                  }}
                >
                  <GitCompare className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredAndSortedOutfits.length === 0 && (
        <Card className="p-12 text-center">
          <div className="space-y-4">
            <Sparkles className="w-12 h-12 mx-auto text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold">No outfits found</h3>
              <p className="text-muted-foreground">
                Try adjusting your filters or generate some new outfits
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Zoom Modal */}
      {zoomedOutfit && (
        <OutfitZoomModal
          outfit={zoomedOutfit}
          isOpen={!!zoomedOutfit}
          onClose={() => setZoomedOutfit(null)}
          onFavorite={() => toggleFavorite(zoomedOutfit.id)}
          isFavorite={isFavorite(zoomedOutfit.id)}
        />
      )}

      {/* Compare Modal */}
      {compareOutfits.length === 2 && (
        <OutfitCompareModal
          outfits={compareOutfits as [Outfit, Outfit]}
          isOpen={compareOutfits.length === 2}
          onClose={() => setCompareOutfits([])}
        />
      )}
    </div>
  );
};
