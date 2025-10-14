import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClothesUpload } from '@/components/ClothesUpload';
import { ClothesGallery } from '@/components/ClothesGallery';
import { ClipFromWeb } from '@/components/ClipFromWeb';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';

const Dashboard = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background">
      <div className="container mx-auto px-4 py-8 animate-fade-in">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent mb-2">
            My Wardrobe
          </h1>
          <p className="text-muted-foreground text-lg">Upload and manage your clothing items with ease</p>
        </div>
        
        <Tabs defaultValue="gallery" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-2xl mb-8 p-1 bg-muted/50 rounded-xl">
            <TabsTrigger value="gallery" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              My Clothes
            </TabsTrigger>
            <TabsTrigger value="upload" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Upload New
            </TabsTrigger>
            <TabsTrigger value="clip" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Clip from Web
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="gallery" className="mt-6">
            <Card className="card-elegant border-0 shadow-xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Sparkles className="h-6 w-6 text-primary" />
                  Your Clothing Collection
                </CardTitle>
                <CardDescription className="text-base">
                  Browse all your uploaded clothing items and accessories
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ClothesGallery />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="upload" className="mt-6">
            <div className="flex justify-center">
              <ClothesUpload />
            </div>
          </TabsContent>

          <TabsContent value="clip" className="mt-6">
            <div className="flex justify-center">
              <ClipFromWeb />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;