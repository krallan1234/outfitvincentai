import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Upload, Loader2, ImagePlus, Sparkles } from 'lucide-react';
import { useClothes } from '@/hooks/useClothes';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
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
  'long-sleeve',
  'workout-top',
  
  // Outerwear
  'jacket',
  'coat',
  'blazer',
  'cardigan',
  'vest',
  'sheer',
  'rain-jacket',
  
  // Bottoms
  'pants',
  'jeans',
  'shorts',
  'skirt',
  'denim-skirt',
  'leggings',
  'trousers',
  'sweatpants',
  'bike-shorts',
  'workout-leggings',
  
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
  'shoulder-bag',
  'hobo-bag',
  'hand-bag',
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
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [category, setCategory] = useState('');
  const [color, setColor] = useState('');
  const [style, setStyle] = useState('');
  const [brand, setBrand] = useState('');
  const [description, setDescription] = useState('');
  const [detectingStyle, setDetectingStyle] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingMultiple, setUploadingMultiple] = useState(false);
  
  const { uploadClothing, loading, clothes } = useClothes();
  const { toast } = useToast();

  const processFiles = (selectedFiles: File[]) => {
    setFiles(selectedFiles);
    const newPreviews: string[] = [];
    
    selectedFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        newPreviews.push(reader.result as string);
        if (newPreviews.length === selectedFiles.length) {
          setPreviews(newPreviews);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      processFiles(selectedFiles);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.heic']
    },
    multiple: true,
    maxFiles: 10,
    maxSize: 10 * 1024 * 1024, // 10MB
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        processFiles(acceptedFiles);
      }
    },
    onDropRejected: (fileRejections) => {
      const rejection = fileRejections[0];
      if (rejection.errors[0]?.code === 'file-too-large') {
        toast({
          title: 'File Too Large',
          description: 'Please select an image under 10MB.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Invalid File',
          description: 'Please select a valid image file.',
          variant: 'destructive',
        });
      }
    },
    disabled: loading
  });

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
            setFiles([file]);
            setPreviews([canvas.toDataURL()]);
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

  const detectStyle = async () => {
    if (files.length === 0) {
      toast({
        title: 'No Image',
        description: 'Please select an image first.',
        variant: 'destructive',
      });
      return;
    }

    setDetectingStyle(true);
    try {
      const file = files[0]; // Use first image for style detection
      const reader = new FileReader();
      
      const imageBase64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]); // Remove data:image prefix
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke('detect-clothing-style', {
        body: { imageBase64 },
      });

      if (error) throw error;

      if (data?.style) {
        setStyle(data.style);
        toast({
          title: 'Style Detected',
          description: `AI suggests: ${data.style.charAt(0).toUpperCase() + data.style.slice(1)}`,
        });
      } else {
        throw new Error('No style returned');
      }
    } catch (error) {
      console.error('Style detection error:', error);
      setStyle('casual'); // Fallback
      toast({
        title: 'Detection Failed',
        description: 'Defaulting to "casual". You can change it manually.',
        variant: 'destructive',
      });
    } finally {
      setDetectingStyle(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) return;

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
    const remainingSlots = 100 - clothes.length;
    if (remainingSlots === 0) {
      toast({
        title: 'Upload Limit Reached',
        description: "You've reached the maximum of 100 clothes items. Delete some to add more.",
        variant: 'destructive',
      });
      return;
    }

    if (files.length > remainingSlots) {
      toast({
        title: 'Too Many Files',
        description: `You can only upload ${remainingSlots} more items. Please select fewer files.`,
        variant: 'destructive',
      });
      return;
    }

    // Handle multiple uploads
    if (files.length > 1) {
      setUploadingMultiple(true);
      setUploadProgress(0);
      
      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < files.length; i++) {
        try {
          await uploadClothing(files[i], {
            category: validation.data.category,
            color: validation.data.color,
            style: validation.data.style,
            brand: validation.data.brand,
            description: validation.data.description,
          });
          successCount++;
        } catch (error) {
          failCount++;
        }
        setUploadProgress(((i + 1) / files.length) * 100);
      }

      setUploadingMultiple(false);
      
      toast({
        title: 'Upload Complete',
        description: `${successCount} of ${files.length} items uploaded successfully${failCount > 0 ? `, ${failCount} failed` : ''}.`,
        variant: failCount > 0 ? 'destructive' : 'default',
      });

      // Reset form
      setFiles([]);
      setPreviews([]);
      setCategory('');
      setColor('');
      setStyle('');
      setBrand('');
      setDescription('');
      setUploadProgress(0);
    } else {
      // Single upload
      try {
        await uploadClothing(files[0], {
          category: validation.data.category,
          color: validation.data.color,
          style: validation.data.style,
          brand: validation.data.brand,
          description: validation.data.description,
        });

        // Reset form
        setFiles([]);
        setPreviews([]);
        setCategory('');
        setColor('');
        setStyle('');
        setBrand('');
        setDescription('');
      } catch (error) {
        // Error is handled in the hook
      }
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Upload Clothing Items</CardTitle>
        <CardDescription>
          Upload photos of your clothing items ({clothes.length}/100 items used). Select multiple files to upload in batch. AI can detect style automatically.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Drag & Drop File Upload */}
          <div className="space-y-2">
            <Label htmlFor="file">Clothing Photo</Label>
            <div 
              {...getRootProps()} 
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                isDragActive 
                  ? 'border-primary bg-primary/5' 
                  : 'border-muted-foreground/25 hover:border-muted-foreground/40'
              } ${loading || uploadingMultiple ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {previews.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {previews.map((preview, idx) => (
                      <img
                        key={idx}
                        src={preview}
                        alt={`Preview ${idx + 1} of clothing item`}
                        className="w-full h-32 rounded-lg object-cover"
                        loading="eager"
                      />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {files.length} file{files.length > 1 ? 's' : ''} selected
                  </p>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={(e) => {
                      e.stopPropagation();
                      setFiles([]);
                      setPreviews([]);
                    }}
                    aria-label="Change photos"
                  >
                    Change Photos
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {isDragActive ? (
                    <>
                      <ImagePlus className="mx-auto h-12 w-12 text-primary animate-bounce" aria-hidden="true" />
                      <p className="text-base font-medium text-primary">Drop your photo here!</p>
                    </>
                  ) : (
                    <>
                      <Upload className="mx-auto h-12 w-12 text-muted-foreground" aria-hidden="true" />
                      <div className="space-y-2">
                        <p className="text-base font-medium">
                          Drag & drop your photos here
                        </p>
                        <p className="text-sm text-muted-foreground">
                          or click to browse (max 10MB each, up to 10 files)
                        </p>
                      </div>
                    </>
                  )}
                  <input {...getInputProps()} id="file" />
                  <div className="flex flex-col sm:flex-row gap-2 justify-center">
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCameraCapture();
                      }}
                      className="md:hidden"
                      aria-label="Take photo with camera"
                    >
                      📷 Take Photo
                    </Button>
                  </div>
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

          {/* Style Selection with AI Detection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="style">Style *</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={detectStyle}
                disabled={files.length === 0 || detectingStyle || loading || uploadingMultiple}
                className="text-xs"
              >
                {detectingStyle ? (
                  <>
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    Detecting...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-1 h-3 w-3" />
                    Detect with AI
                  </>
                )}
              </Button>
            </div>
            <Select value={style} onValueChange={setStyle}>
              <SelectTrigger>
                <SelectValue placeholder="Select style or use AI detection" />
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

          {/* Progress Bar for Multi-Upload */}
          {uploadingMultiple && (
            <div className="space-y-2">
              <Label>Upload Progress</Label>
              <Progress value={uploadProgress} className="w-full" />
              <p className="text-sm text-muted-foreground text-center">
                {Math.round(uploadProgress)}% complete
              </p>
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full" 
            disabled={files.length === 0 || !category || !style || loading || uploadingMultiple || clothes.length >= 100}
          >
            {uploadingMultiple ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading {files.length} Items...
              </>
            ) : loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading & Detecting Color...
              </>
            ) : clothes.length >= 100 ? (
              'Max 100 items reached'
            ) : files.length > 1 ? (
              `Upload ${files.length} Items`
            ) : (
              'Upload Clothing Item'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};