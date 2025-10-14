import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Loader2 } from 'lucide-react';
import { useClothes } from '@/hooks/useClothes';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

// Security: Input validation schema
const clothingSchema = z.object({
  category: z.string().min(1, 'Category is required').max(50, 'Category must be less than 50 characters'),
  color: z.string().max(30, 'Color must be less than 30 characters').optional(),
  style: z.string().min(1, 'Style is required').max(50, 'Style must be less than 50 characters'),
  brand: z.string().max(100, 'Brand must be less than 100 characters').optional(),
  description: z.string().max(500, 'Description must be less than 500 characters').optional()
});

const CATEGORIES = [
  // Tops
  't-shirt',
  'shirt',
  'blouse',
  'sweater',
  'hoodie',
  'tank-top',
  'crop-top',
  
  // Outerwear
  'jacket',
  'coat',
  'blazer',
  'cardigan',
  'vest',
  
  // Bottoms
  'pants',
  'jeans',
  'shorts',
  'skirt',
  'leggings',
  'trousers',
  
  // Dresses & Suits
  'dress',
  'suit',
  'jumpsuit',
  
  // Footwear
  'shoes',
  'sneakers',
  'boots',
  'sandals',
  'heels',
  'slippers',
  
  // Accessories - Jewelry
  'ring',
  'watch',
  'bracelet',
  'necklace',
  'earrings',
  
  // Accessories - Headwear
  'hat',
  'cap',
  'beanie',
  'kepsar',
  
  // Accessories - Other
  'belt',
  'scarf',
  'gloves',
  'socks',
  'strumpor',
  'sunglasses',
  'bag',
  'tie',
  
  // Underwear & Other
  'underwear',
  'other'
];

const STYLES = [
  'casual',
  'formal',
  'sporty',
  'business',
  'elegant',
  'vintage',
  'streetwear',
  'bohemian'
];

export const ClothesUpload = () => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [category, setCategory] = useState('');
  const [color, setColor] = useState('');
  const [style, setStyle] = useState('');
  const [brand, setBrand] = useState('');
  const [description, setDescription] = useState('');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  
  const { uploadClothing, loading, clothes } = useClothes();
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleCameraCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      video.onloadedmetadata = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx?.drawImage(video, 0, 0);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' });
            setFile(file);
            setPreview(canvas.toDataURL());
          }
          stream.getTracks().forEach(track => track.stop());
        }, 'image/jpeg');
      };
    } catch (error) {
      toast({
        title: 'Camera Error',
        description: 'Unable to access camera. Please use file upload instead.',
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    // Security: Validate inputs before submission
    const validation = clothingSchema.safeParse({ 
      category, 
      color: color || undefined, 
      style, 
      brand: brand || undefined, 
      description: description || undefined 
    });
    
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      toast({
        title: "Validation Error",
        description: firstError.message,
        variant: "destructive",
      });
      return;
    }

    // Check for 100 image limit
    if (clothes.length >= 100) {
      toast({
        title: 'Upload Limit Reached',
        description: "You've reached the maximum of 100 clothes items. Delete some to add more.",
        variant: 'destructive',
      });
      return;
    }

    try {
      await uploadClothing(file, {
        category: validation.data.category,
        color: validation.data.color,
        style: validation.data.style,
        brand: validation.data.brand,
        description: validation.data.description,
      });

      // Reset form
      setFile(null);
      setPreview('');
      setCategory('');
      setColor('');
      setStyle('');
      setBrand('');
      setDescription('');
    } catch (error) {
      // Error is handled in the hook
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Upload Clothing Item</CardTitle>
        <CardDescription>
          Upload a photo of your clothing item ({clothes.length}/100 items used). Color detection is automatic, but you'll need to manually tag category and style.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="file">Clothing Photo</Label>
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
              {preview ? (
                <div className="space-y-4">
                  <img
                    src={preview}
                    alt="Preview of clothing item"
                    className="mx-auto max-h-64 rounded-lg object-cover"
                    loading="lazy"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setFile(null);
                      setPreview('');
                    }}
                    aria-label="Change photo"
                  >
                    Change Photo
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <Upload className="mx-auto h-12 w-12 text-muted-foreground" aria-hidden="true" />
                  <div className="flex flex-col sm:flex-row gap-2 justify-center">
                    <Label htmlFor="file" className="cursor-pointer">
                      <Button type="button" variant="outline" asChild>
                        <span>Choose Photo</span>
                      </Button>
                    </Label>
                    <Input
                      id="file"
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                      aria-label="Upload clothing photo"
                    />
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={handleCameraCapture}
                      className="md:hidden"
                      aria-label="Take photo with camera"
                    >
                      📷 Take Photo
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Upload a clear photo of your clothing item
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Category Selection */}
          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger aria-label="Select clothing category">
                <SelectValue placeholder="Select clothing category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Style Selection - Required */}
          <div className="space-y-2">
            <Label htmlFor="style">Style *</Label>
            <Select value={style} onValueChange={setStyle}>
              <SelectTrigger>
                <SelectValue placeholder="Select style" />
              </SelectTrigger>
              <SelectContent>
                {STYLES.map((styleOption) => (
                  <SelectItem key={styleOption} value={styleOption}>
                    {styleOption.charAt(0).toUpperCase() + styleOption.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Color - Auto-detected */}
          <div className="space-y-2">
            <Label htmlFor="color">Color (Auto-detected)</Label>
            <Input
              id="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="Leave empty for automatic color detection"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="brand">Brand</Label>
            <Input
              id="brand"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="e.g., Nike, Zara, H&M"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Additional details about this item..."
              rows={3}
            />
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={!file || !category || !style || loading || clothes.length >= 100}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading & Detecting Color...
              </>
            ) : clothes.length >= 100 ? (
              'Max 100 items reached'
            ) : (
              'Upload Clothing Item'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};