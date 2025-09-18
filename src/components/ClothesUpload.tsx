import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Loader2 } from 'lucide-react';
import { useClothes } from '@/hooks/useClothes';

const CATEGORIES = [
  'shirt',
  'pants',
  'dress',
  'shoes',
  'jacket',
  'sweater',
  'shorts',
  'skirt',
  'accessories',
  'other'
];

export const ClothesUpload = () => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [category, setCategory] = useState('');
  const [color, setColor] = useState('');
  const [style, setStyle] = useState('');
  const [brand, setBrand] = useState('');
  const [description, setDescription] = useState('');
  
  const { uploadClothing, loading } = useClothes();

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !category) return;

    try {
      await uploadClothing(file, {
        category,
        color: color || undefined,
        style: style || undefined,
        brand: brand || undefined,
        description: description || undefined,
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
          Upload a photo of your clothing item. Our AI will automatically detect category, color, and style.
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
                    alt="Preview"
                    className="mx-auto max-h-64 rounded-lg object-cover"
                  />
                  <Button type="button" variant="outline" onClick={() => {
                    setFile(null);
                    setPreview('');
                  }}>
                    Change Photo
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                  <div>
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
                    />
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
              <SelectTrigger>
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

          {/* Optional Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="color">Color</Label>
              <Input
                id="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="e.g., Blue, Red, Black"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="style">Style</Label>
              <Input
                id="style"
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                placeholder="e.g., Casual, Formal, Sporty"
              />
            </div>
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
            disabled={!file || !category || loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading & Analyzing...
              </>
            ) : (
              'Upload Clothing Item'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};