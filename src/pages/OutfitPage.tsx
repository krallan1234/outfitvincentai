import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OutfitGenerator } from '@/components/OutfitGenerator';
import { OutfitGallery } from '@/components/OutfitGallery';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const OutfitPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Outfit Generator</h1>
          <p className="text-muted-foreground">Create perfect outfits from your wardrobe</p>
        </div>
        
        <Tabs defaultValue="generate" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="generate">Generate Outfit</TabsTrigger>
            <TabsTrigger value="gallery">My Outfits</TabsTrigger>
          </TabsList>
          
          <TabsContent value="generate" className="mt-6">
            <OutfitGenerator />
          </TabsContent>
          
          <TabsContent value="gallery" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Your Generated Outfits</CardTitle>
                <CardDescription>
                  Browse all your AI-generated outfit combinations
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