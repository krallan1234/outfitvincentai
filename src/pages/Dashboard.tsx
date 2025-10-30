import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClothesUpload } from '@/components/ClothesUpload';
import { ClothesGallery } from '@/components/ClothesGallery';
import { ClipFromWeb } from '@/components/ClipFromWeb';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';
import { InspirationOfTheDay } from '@/components/InspirationOfTheDay';
import { WavyDivider } from '@/components/WavyDivider';
import { FashionQuote } from '@/components/FashionQuote';
import { usePrefetchImages } from '@/hooks/usePrefetchImages';

const Dashboard = () => {
  // Prefetch images on mount for instant display
  usePrefetchImages();
  
  return (
    <div className="min-h-screen relative">
      {/* Subtle background image */}
      <div className="fixed inset-0 z-0 opacity-5">
        <img 
          src="/images/dashboard-background.jpg" 
          alt="Fashion background"
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>
      
      <div className="relative z-10 bg-gradient-to-b from-background/95 via-muted/10 to-background/95 min-h-screen">
        <div className="container mx-auto px-3 xs:px-4 sm:px-6 py-4 xs:py-6 sm:py-8">
          <div className="mb-4 xs:mb-6 sm:mb-8 text-center animate-fade-in">
            <h1 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-bold font-serif mb-2 sm:mb-3">
              My Wardrobe
            </h1>
            <p className="text-muted-foreground text-sm xs:text-base sm:text-lg px-2">Upload and manage your clothing items with ease</p>
          </div>

          <FashionQuote />

          {/* Inspiration of the Day */}
          <div className="mb-8 max-w-md mx-auto animate-slide-in">
            <InspirationOfTheDay />
          </div>

          <WavyDivider />
        
        <Tabs defaultValue="gallery" className="w-full mt-8">
          <TabsList className="grid w-full grid-cols-3 max-w-2xl mx-auto mb-8 p-1 bg-muted/50 rounded-xl shadow-md">
            <TabsTrigger value="gallery" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300">
              My Clothes
            </TabsTrigger>
            <TabsTrigger value="upload" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300">
              Upload New
            </TabsTrigger>
            <TabsTrigger value="clip" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300">
              Clip from Web
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="gallery" className="mt-6 animate-fade-in">
            <Card className="homey-card border-primary/20 shadow-xl">
              <CardHeader className="pb-4 bg-gradient-to-r from-primary/5 to-accent/5">
                <CardTitle className="text-2xl flex items-center gap-2 font-serif">
                  <Sparkles className="h-6 w-6 text-primary animate-pulse-soft" />
                  Your Clothing Collection
                </CardTitle>
                <CardDescription className="text-base">
                  Browse all your uploaded clothing items and accessories
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <ClothesGallery />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="upload" className="mt-6 animate-fade-in">
            <div className="flex justify-center">
              <div className="w-full max-w-2xl">
                <ClothesUpload />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="clip" className="mt-6 animate-fade-in">
            <div className="flex justify-center">
              <div className="w-full max-w-2xl">
                <ClipFromWeb />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
    </div>
  );
};

export default Dashboard;