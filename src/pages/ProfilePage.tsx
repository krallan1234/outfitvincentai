import { useAuth } from '@/hooks/useAuth';
import { useOutfits } from '@/hooks/useOutfits';
import { useCommunity } from '@/hooks/useCommunity';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Heart, User, Calendar, TrendingUp, Sparkles } from 'lucide-react';
import { useState } from 'react';

const ProfilePage = () => {
  const { user } = useAuth();
  const { outfits, loading } = useOutfits();
  const { communityOutfits, userLikes, toggleLike } = useCommunity();
  
  // Get user's liked outfits from community
  const likedOutfits = communityOutfits.filter(outfit => userLikes.has(outfit.id));
  
  // Get user's public vs private outfits
  const publicOutfits = outfits.filter(outfit => outfit.is_public);
  const privateOutfits = outfits.filter(outfit => !outfit.is_public);

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Please log in to view your profile.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getTotalLikes = () => {
    return publicOutfits.reduce((total, outfit) => total + (outfit.likes_count || 0), 0);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
              <User className="h-8 w-8 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">{user.email}</h1>
              <p className="text-muted-foreground">Fashion Enthusiast</p>
            </div>
          </div>
          
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">{outfits.length}</div>
                <p className="text-sm text-muted-foreground">Total Outfits</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">{publicOutfits.length}</div>
                <p className="text-sm text-muted-foreground">Public Outfits</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">{getTotalLikes()}</div>
                <p className="text-sm text-muted-foreground">Total Likes</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">{likedOutfits.length}</div>
                <p className="text-sm text-muted-foreground">Liked Outfits</p>
              </CardContent>
            </Card>
          </div>
        </div>

        <Tabs defaultValue="all-outfits" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-lg">
            <TabsTrigger value="all-outfits">All My Outfits</TabsTrigger>
            <TabsTrigger value="liked">Liked</TabsTrigger>
            <TabsTrigger value="private">Private</TabsTrigger>
          </TabsList>

          {/* All My Outfits */}
          <TabsContent value="all-outfits" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  All My Outfits
                </CardTitle>
                <CardDescription>
                  All outfits you've created (public and private)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : outfits.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {outfits.map((outfit) => (
                      <Card key={outfit.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                        {outfit.generated_image_url && (
                          <div className="aspect-square relative">
                            <img
                              src={outfit.generated_image_url}
                              alt={outfit.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg line-clamp-2">{outfit.title}</CardTitle>
                          <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(outfit.created_at)}
                            </span>
                            <div className="flex items-center gap-2">
                              {outfit.mood && (
                                <Badge variant="outline" className="capitalize text-xs">
                                  {outfit.mood}
                                </Badge>
                              )}
                              <Badge variant={outfit.is_public ? "default" : "secondary"} className="text-xs">
                                {outfit.is_public ? "Public" : "Private"}
                              </Badge>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            "{outfit.prompt}"
                          </p>
                          {outfit.is_public && (
                            <div className="flex items-center gap-2">
                              <Heart className="h-4 w-4 text-red-500" />
                              <span className="text-sm font-medium">{outfit.likes_count || 0} likes</span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-8">
                    <p className="text-muted-foreground">
                      No outfits yet. Generate some outfits to get started!
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Liked Outfits */}
          <TabsContent value="liked" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5" />
                  Liked Outfits
                </CardTitle>
                <CardDescription>
                  Outfits you've liked from the community
                </CardDescription>
              </CardHeader>
              <CardContent>
                {likedOutfits.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {likedOutfits.map((outfit) => (
                      <Card key={outfit.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                        {outfit.generated_image_url && (
                          <div className="aspect-square relative">
                            <img
                              src={outfit.generated_image_url}
                              alt={outfit.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg line-clamp-2">{outfit.title}</CardTitle>
                          <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(outfit.created_at)}
                            </span>
                            {outfit.mood && (
                              <Badge variant="outline" className="capitalize text-xs">
                                {outfit.mood}
                              </Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            "{outfit.prompt}"
                          </p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Heart className="h-4 w-4 text-red-500 fill-current" />
                              <span className="text-sm font-medium">{outfit.likes_count} likes</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleLike(outfit.id)}
                              className="text-red-500"
                            >
                              Unlike
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-8 space-y-4">
                    <div className="max-w-xs mx-auto rounded-lg overflow-hidden shadow-md">
                      <img 
                        src="/images/brown-jumpsuit.jpg" 
                        alt="Explore community outfit inspiration"
                        className="w-full h-48 object-cover"
                        loading="lazy"
                      />
                    </div>
                    <p className="text-muted-foreground">
                      No liked outfits yet. Explore the community to discover inspiring looks!
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Private Outfits */}
          <TabsContent value="private" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Private Outfits
                </CardTitle>
                <CardDescription>
                  Outfits visible only to you
                </CardDescription>
              </CardHeader>
              <CardContent>
                {privateOutfits.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {privateOutfits.map((outfit) => (
                      <Card key={outfit.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                        {outfit.generated_image_url && (
                          <div className="aspect-square relative">
                            <img
                              src={outfit.generated_image_url}
                              alt={outfit.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg line-clamp-2">{outfit.title}</CardTitle>
                          <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(outfit.created_at)}
                            </span>
                            {outfit.mood && (
                              <Badge variant="outline" className="capitalize text-xs">
                                {outfit.mood}
                              </Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            "{outfit.prompt}"
                          </p>
                          <Badge variant="secondary">Private</Badge>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-8">
                    <p className="text-muted-foreground">
                      No private outfits. All your outfits are currently public!
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ProfilePage;