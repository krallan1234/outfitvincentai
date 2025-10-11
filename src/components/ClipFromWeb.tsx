import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useClothes } from '@/hooks/useClothes';
import { Loader2, Link, Image } from 'lucide-react';

const CATEGORIES = [
  'tops',
  'bottoms',
  'dresses',
  'outerwear',
  'shoes',
  'accessories'
];

export const ClipFromWeb = () => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const { uploadClothing, clothes } = useClothes();
  const { toast } = useToast();

  const handleFetchMetadata = async () => {
    if (!url.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a URL',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-url-metadata', {
        body: { url }
      });

      if (error) throw error;

      if (!data.image) {
        throw new Error('No product image found - try a product page with images');
      }

      setPreview({
        ...data,
        category: data.category || 'tops'
      });

      toast({
        title: 'Product found!',
        description: 'Review the details and save to your wardrobe'
      });
    } catch (error: any) {
      console.error('Error fetching metadata:', error);
      toast({
        title: 'Error',
        description: error.message || 'Invalid URL - try a product page',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!preview) return;

    if (clothes.length >= 100) {
      toast({
        title: 'Upload limit reached',
        description: 'You can only upload up to 100 clothing items',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      // Download image and convert to blob
      const imageResponse = await fetch(preview.image);
      const imageBlob = await imageResponse.blob();
      
      // Create a File object from the blob
      const fileName = `web-clip-${Date.now()}.jpg`;
      const file = new File([imageBlob], fileName, { type: imageBlob.type || 'image/jpeg' });

      await uploadClothing(file, {
        category: preview.category,
        color: preview.color,
        brand: preview.brand,
        description: preview.title || preview.description
      });

      toast({
        title: 'Success',
        description: 'Item added to your wardrobe!'
      });

      // Reset form
      setUrl('');
      setPreview(null);
    } catch (error: any) {
      console.error('Error saving item:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save item',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link className="h-5 w-5" />
          Clip from Web
        </CardTitle>
        <CardDescription>
          Add clothing to your wardrobe from product URLs
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="product-url">Product URL</Label>
          <div className="flex gap-2">
            <Input
              id="product-url"
              type="url"
              placeholder="https://www.example.com/product..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={loading}
            />
            <Button 
              onClick={handleFetchMetadata}
              disabled={loading || !url.trim()}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Fetch'
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Paste a product link from H&M, Zalando, or other retailers
          </p>
        </div>

        {preview && (
          <div className="border rounded-lg p-4 space-y-4">
            <div className="flex gap-4">
              {preview.image ? (
                <img 
                  src={preview.image} 
                  alt={preview.title}
                  className="w-32 h-32 object-cover rounded-md"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder.svg';
                  }}
                />
              ) : (
                <div className="w-32 h-32 bg-muted rounded-md flex items-center justify-center">
                  <Image className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              
              <div className="flex-1 space-y-2">
                <div>
                  <Label>Title</Label>
                  <p className="text-sm">{preview.title || 'No title found'}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Brand</Label>
                    <Input
                      value={preview.brand}
                      onChange={(e) => setPreview({ ...preview, brand: e.target.value })}
                      placeholder="Brand"
                    />
                  </div>
                  <div>
                    <Label>Color</Label>
                    <Input
                      value={preview.color}
                      onChange={(e) => setPreview({ ...preview, color: e.target.value })}
                      placeholder="Color"
                    />
                  </div>
                </div>

                <div>
                  <Label>Category</Label>
                  <Select 
                    value={preview.category}
                    onValueChange={(value) => setPreview({ ...preview, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat}>
                          {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setPreview(null);
                  setUrl('');
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSave}
                disabled={loading || !preview.image}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  'Save to Wardrobe'
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
