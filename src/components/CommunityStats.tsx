import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Heart, Users, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface CommunityStats {
  totalOutfits: number;
  totalLikes: number;
  mostLikedOutfit: any;
  trendingColors: { color: string; count: number }[];
  trendingStyles: { style: string; count: number }[];
}

export const CommunityStats = () => {
  const [stats, setStats] = useState<CommunityStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);

      // Get total public outfits
      const { count: totalOutfits } = await supabase
        .from('outfits')
        .select('*', { count: 'exact', head: true })
        .eq('is_public', true);

      // Get total likes
      const { count: totalLikes } = await supabase
        .from('outfit_likes')
        .select('*', { count: 'exact', head: true });

      // Get most liked outfit
      const { data: mostLikedData } = await supabase
        .from('outfits')
        .select('title, likes_count, prompt, mood')
        .eq('is_public', true)
        .order('likes_count', { ascending: false })
        .limit(1);

      // Get user's clothes to analyze trending colors and styles
      const { data: clothesData } = await supabase
        .from('clothes')
        .select('color, style');

      // Analyze trending colors and styles
      const colorCounts: Record<string, number> = {};
      const styleCounts: Record<string, number> = {};

      clothesData?.forEach(item => {
        if (item.color) {
          colorCounts[item.color.toLowerCase()] = (colorCounts[item.color.toLowerCase()] || 0) + 1;
        }
        if (item.style) {
          styleCounts[item.style.toLowerCase()] = (styleCounts[item.style.toLowerCase()] || 0) + 1;
        }
      });

      const trendingColors = Object.entries(colorCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([color, count]) => ({ color, count }));

      const trendingStyles = Object.entries(styleCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([style, count]) => ({ style, count }));

      setStats({
        totalOutfits: totalOutfits || 0,
        totalLikes: totalLikes || 0,
        mostLikedOutfit: mostLikedData?.[0] || null,
        trendingColors,
        trendingStyles
      });
    } catch (error) {
      console.error('Error fetching community stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-1/3"></div>
            <div className="h-4 bg-muted rounded w-1/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Outfits */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Community Outfits</CardTitle>
          <Sparkles className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalOutfits}</div>
          <p className="text-xs text-muted-foreground">
            Public outfit creations
          </p>
        </CardContent>
      </Card>

      {/* Total Likes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Likes</CardTitle>
          <Heart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalLikes}</div>
          <p className="text-xs text-muted-foreground">
            Community appreciation
          </p>
        </CardContent>
      </Card>

      {/* Most Liked Outfit */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Most Liked</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {stats.mostLikedOutfit ? (
            <>
              <div className="text-2xl font-bold">{stats.mostLikedOutfit.likes_count} ❤️</div>
              <p className="text-xs text-muted-foreground line-clamp-2">
                "{stats.mostLikedOutfit.title}"
              </p>
            </>
          ) : (
            <>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">
                Share your first outfit to compete!
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Trending Colors */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Trending Colors</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stats.trendingColors.length > 0 ? (
              stats.trendingColors.slice(0, 3).map(({ color, count }) => (
                <div key={color} className="flex items-center justify-between">
                  <Badge variant="secondary" className="capitalize text-xs">
                    {color}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{count}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">Upload clothes to see trends</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Community Insights */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Style Trends</CardTitle>
          <CardDescription>Popular styles in the community</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {stats.trendingStyles.length > 0 ? (
              stats.trendingStyles.map(({ style, count }) => (
                <Badge key={style} variant="outline" className="capitalize">
                  {style} ({count})
                </Badge>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No style data yet</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recommendation Engine Info */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-sm font-medium">AI Recommendation System</CardTitle>
          <CardDescription>How we personalize your feed</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-sm space-y-1">
            <p>• <strong>Color Matching:</strong> Outfits featuring your favorite colors get priority</p>
            <p>• <strong>Style Preferences:</strong> Based on your uploaded clothing styles</p>
            <p>• <strong>Community Popularity:</strong> Highly-liked outfits from other users</p>
            <p>• <strong>Pinterest Trends:</strong> Current fashion trends integrated into suggestions</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};