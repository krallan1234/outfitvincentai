import { useState, useEffect, useMemo } from 'react';
import { Heart, Users, TrendingUp, Sparkles, UserPlus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCommunity, CommunityOutfit, RecommendedOutfit } from '@/hooks/useCommunity';
import { useFollow } from '@/hooks/useFollow';
import { CommunityStats } from '@/components/CommunityStats';
import { OutfitModal } from '@/components/OutfitModal';
import { SearchFilters } from '@/components/SearchFilters';
import { cn } from '@/lib/utils';

export const CommunityOutfitCard = ({ 
  outfit, 
  onLike, 
  onClick,
  onFollowUser,
  isFollowing,
  showRecommendationReason = false 
}: { 
  outfit: CommunityOutfit | RecommendedOutfit; 
  onLike: (id: string) => void;
  onClick: () => void;
  onFollowUser?: (userId: string) => void;
  isFollowing?: boolean;
  showRecommendationReason?: boolean;
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const isRecommended = 'recommendation_score' in outfit;

  return (
    <Card className="overflow-hidden group hover:shadow-lg transition-shadow cursor-pointer" onClick={onClick}>
      {/* Image */}
      {outfit.generated_image_url && (
        <div className="aspect-square relative">
          <img
            src={outfit.generated_image_url}
            alt={outfit.title}
            className="w-full h-full object-cover"
          />
          {isRecommended && (
            <div className="absolute top-2 left-2">
              <Badge className="bg-primary text-primary-foreground">
                <Sparkles className="h-3 w-3 mr-1" />
                Recommended
              </Badge>
            </div>
          )}
        </div>
      )}

      <CardHeader className="pb-3">
        <CardTitle className="text-lg line-clamp-2">{outfit.title}</CardTitle>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{formatDate(outfit.created_at)}</span>
          {outfit.mood && (
            <Badge variant="outline" className="capitalize text-xs">
              {outfit.mood}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Prompt */}
        <p className="text-sm text-muted-foreground line-clamp-2">
          "{outfit.prompt}"
        </p>

        {/* Description */}
        {outfit.description && (
          <p className="text-sm line-clamp-2">
            {outfit.description}
          </p>
        )}

        {/* Recommendation Reason */}
        {showRecommendationReason && isRecommended && (
          <div className="bg-muted/50 p-2 rounded-lg">
            <p className="text-xs text-muted-foreground">
              {(outfit as RecommendedOutfit).reason}
            </p>
          </div>
        )}

        {/* Like Button */}
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onLike(outfit.id);
            }}
            className={cn(
              "flex items-center gap-2",
              outfit.is_liked && "text-red-500"
            )}
          >
            <Heart 
              className={cn(
                "h-4 w-4",
                outfit.is_liked && "fill-current"
              )} 
            />
            <span>{outfit.likes_count}</span>
          </Button>

          {/* Follow Button */}
          {onFollowUser && (
            <Button
              variant={isFollowing ? "secondary" : "outline"}
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onFollowUser(outfit.user_id);
              }}
            >
              <UserPlus className="h-3 w-3 mr-1" />
              {isFollowing ? 'Following' : 'Follow'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const CommunityPage = () => {
  const { 
    communityOutfits, 
    recommendations, 
    topLikedOutfits,
    loading, 
    toggleLike, 
    fetchRecommendations 
  } = useCommunity();
  const { following, toggleFollow, isFollowing } = useFollow();
  const [selectedOutfit, setSelectedOutfit] = useState<CommunityOutfit | RecommendedOutfit | null>(null);
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('all');
  const [selectedColor, setSelectedColor] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Filter outfits based on search and filters
  const filteredOutfits = useMemo(() => {
    return communityOutfits.filter(outfit => {
      const matchesSearch = outfit.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          outfit.prompt.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          outfit.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStyle = selectedStyle === 'all' || 
                          outfit.mood?.toLowerCase() === selectedStyle ||
                          outfit.ai_analysis?.style_analysis?.toLowerCase().includes(selectedStyle);
      
      const matchesColor = selectedColor === 'all' ||
                          outfit.ai_analysis?.color_harmony?.toLowerCase().includes(selectedColor) ||
                          outfit.ai_analysis?.outfit_visualization?.items?.some((item: any) => 
                            item.color?.toLowerCase().includes(selectedColor)
                          );

      return matchesSearch && matchesStyle && matchesColor;
    });
  }, [communityOutfits, searchTerm, selectedStyle, selectedColor]);

  useEffect(() => {
    fetchRecommendations();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8" />
            Community Outfits
          </h1>
          <p className="text-muted-foreground">
            Discover and like outfits from other fashion enthusiasts. Our recommendation system learns from your preferences and community trends.
          </p>
        </div>

        {/* Community Stats */}
        <div className="mb-8">
          <CommunityStats />
        </div>

        {/* Search and Filters */}
        <div className="mb-8">
          <SearchFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            selectedStyle={selectedStyle}
            onStyleChange={setSelectedStyle}
            selectedColor={selectedColor}
            onColorChange={setSelectedColor}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
          />
        </div>

        {/* Top Liked Outfits - Style Trends */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Style Trends - Most Loved Outfits
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Top outfits from the community with the most likes
            </p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : topLikedOutfits.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {topLikedOutfits.map((outfit) => (
                  <CommunityOutfitCard
                    key={outfit.id}
                    outfit={outfit}
                    onLike={toggleLike}
                    onClick={() => setSelectedOutfit(outfit)}
                    onFollowUser={toggleFollow}
                    isFollowing={isFollowing(outfit.user_id)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center p-8">
                <p className="text-muted-foreground">
                  No liked outfits yet. Share your first outfit and like others to see trends here!
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="recommended" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="recommended" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              For You
            </TabsTrigger>
            <TabsTrigger value="trending" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Trending
            </TabsTrigger>
          </TabsList>

          <TabsContent value="recommended" className="mt-6">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Recommended For You
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Outfits curated based on your style preferences and popular community choices
                </p>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : recommendations.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {recommendations.map((outfit) => (
                      <CommunityOutfitCard
                        key={outfit.id}
                        outfit={outfit}
                        onLike={toggleLike}
                        onClick={() => setSelectedOutfit(outfit)}
                        onFollowUser={toggleFollow}
                        isFollowing={isFollowing(outfit.user_id)}
                        showRecommendationReason={true}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-8">
                    <p className="text-muted-foreground">
                      Upload some clothes and generate outfits to get personalized recommendations!
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trending" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Trending Outfits
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {searchTerm || selectedStyle !== 'all' || selectedColor !== 'all' 
                    ? `Found ${filteredOutfits.length} matching outfits`
                    : 'Latest public outfits from the community'}
                </p>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : filteredOutfits.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredOutfits.map((outfit) => (
                      <CommunityOutfitCard
                        key={outfit.id}
                        outfit={outfit}
                        onLike={toggleLike}
                        onClick={() => setSelectedOutfit(outfit)}
                        onFollowUser={toggleFollow}
                        isFollowing={isFollowing(outfit.user_id)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-8">
                    <p className="text-muted-foreground">
                      {searchTerm || selectedStyle !== 'all' || selectedColor !== 'all'
                        ? 'No outfits match your filters. Try adjusting your search!'
                        : 'No public outfits available yet. Be the first to share your style!'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        <OutfitModal
          outfit={selectedOutfit}
          isOpen={!!selectedOutfit}
          onClose={() => setSelectedOutfit(null)}
          onLike={toggleLike}
          showLikeButton={true}
        />
      </div>
    </div>
  );
};

export default CommunityPage;