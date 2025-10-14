import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OutfitGenerator } from '@/components/OutfitGenerator';
import { OutfitGallery } from '@/components/OutfitGallery';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Images } from 'lucide-react';

const OutfitPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background">
      <div className="container mx-auto px-4 py-8 animate-fade-in">
        {/* Inspirational Carousel */}
        <div className="mb-8 overflow-hidden rounded-2xl shadow-elegant">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
            <div className="aspect-[4/5] relative group">
              <img 
                src="/images/beige-cream-ensemble.jpg" 
                alt="Beige and cream outfit inspiration"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                <p className="text-white font-serif text-xl">Timeless Elegance</p>
              </div>
            </div>
            <div className="aspect-[4/5] relative group">
              <img 
                src="/images/mens-brown-outfit.jpg" 
                alt="Brown and beige men's outfit inspiration"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                <p className="text-white font-serif text-xl">Modern Sophistication</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent mb-2">
            Outfit Generator
          </h1>
          <p className="text-muted-foreground text-lg">Create perfect outfits from your wardrobe</p>
        </div>
        
        <Tabs defaultValue="generate" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md mb-8 p-1 bg-muted/50 rounded-xl">
            <TabsTrigger value="generate" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Generate Outfit
            </TabsTrigger>
            <TabsTrigger value="gallery" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              My Outfits
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="generate" className="mt-6">
            <OutfitGenerator />
          </TabsContent>
          
          <TabsContent value="gallery" className="mt-6">
            <Card className="card-elegant border-0 shadow-xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Images className="h-6 w-6 text-primary" />
                  Your Generated Outfits
                </CardTitle>
                <CardDescription className="text-base">
                  Browse all your outfit combinations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <OutfitGallery />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default OutfitPage;
