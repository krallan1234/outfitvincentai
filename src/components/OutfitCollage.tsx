import { useEffect, useRef, useState } from 'react';
import { Canvas as FabricCanvas, FabricImage, Rect, Text } from 'fabric';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Palette } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface OutfitItem {
  id: string;
  category: string;
  color: string;
  image_url: string;
}

interface OutfitCollageProps {
  items: OutfitItem[];
  title: string;
  colorScheme: string;
  outfitId?: string; // Optional outfit ID for saving the image
  onImageGenerated?: (imageUrl: string) => void; // Callback when image is generated
}

export const OutfitCollage = ({ items, title, colorScheme, outfitId, onImageGenerated }: OutfitCollageProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (!canvasRef.current || items.length === 0) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: 400,
      height: 300,
      backgroundColor: '#f8f9fa',
    });

    setFabricCanvas(canvas);
    generateCollage(canvas);

    return () => {
      canvas.dispose();
    };
  }, [items]);

  const generateCollage = async (canvas: FabricCanvas) => {
    setIsGenerating(true);
    try {
      // Clear canvas
      canvas.clear();
      canvas.backgroundColor = '#f8f9fa';

      // Add title text
      const titleText = new Text(title, {
        left: 20,
        top: 20,
        fontSize: 18,
        fontWeight: 'bold',
        fill: '#1f2937',
        fontFamily: 'Arial, sans-serif'
      });
      canvas.add(titleText);

      // Add color scheme indicator
      const colorText = new Text(`Colors: ${colorScheme}`, {
        left: 20,
        top: 45,
        fontSize: 12,
        fill: '#6b7280',
        fontFamily: 'Arial, sans-serif'
      });
      canvas.add(colorText);

      // Calculate grid layout for clothing items
      const itemSize = 80;
      const padding = 10;
      const startY = 80;
      const itemsPerRow = Math.min(4, items.length);
      const totalWidth = (itemSize + padding) * itemsPerRow - padding;
      const startX = (canvas.width! - totalWidth) / 2;

      // Load and position clothing images
      const imagePromises = items.map(async (item, index) => {
        try {
          const img = await FabricImage.fromURL(item.image_url, {
            crossOrigin: 'anonymous'
          });

          const row = Math.floor(index / itemsPerRow);
          const col = index % itemsPerRow;
          const x = startX + col * (itemSize + padding);
          const y = startY + row * (itemSize + padding);

          // Scale image to fit
          const scale = Math.min(itemSize / img.width!, itemSize / img.height!);
          img.scale(scale);
          img.set({
            left: x,
            top: y,
            cornerStyle: 'circle',
            borderColor: '#e5e7eb',
            borderScaleFactor: 2
          });

          // Add category label
          const label = new Text(item.category, {
            left: x,
            top: y + itemSize + 5,
            fontSize: 10,
            fill: '#374151',
            fontFamily: 'Arial, sans-serif',
            textAlign: 'center',
            originX: 'left'
          });

          return [img, label];
        } catch (error) {
          console.error(`Failed to load image for ${item.category}:`, error);
          
          // Create placeholder rectangle if image fails to load
          const placeholder = new Rect({
            left: startX + (index % itemsPerRow) * (itemSize + padding),
            top: startY + Math.floor(index / itemsPerRow) * (itemSize + padding),
            width: itemSize,
            height: itemSize,
            fill: '#e5e7eb',
            stroke: '#d1d5db',
            strokeWidth: 1
          });

          const placeholderText = new Text(item.category, {
            left: placeholder.left! + itemSize / 2,
            top: placeholder.top! + itemSize / 2,
            fontSize: 12,
            fill: '#6b7280',
            textAlign: 'center',
            originX: 'center',
            originY: 'center'
          });

          return [placeholder, placeholderText];
        }
      });

      const resolvedImages = await Promise.all(imagePromises);
      resolvedImages.flat().forEach(obj => canvas.add(obj));

      // Add outfit description at bottom
      const itemsText = items.map(item => `${item.color} ${item.category}`).join(' + ');
      const description = new Text(itemsText, {
        left: 20,
        top: canvas.height! - 40,
        fontSize: 11,
        fill: '#374151',
        fontFamily: 'Arial, sans-serif',
        width: canvas.width! - 40,
        splitByGrapheme: false
      });
      canvas.add(description);

      canvas.renderAll();
      
      // Auto-save the generated image if outfitId is provided
      if (outfitId && onImageGenerated) {
        await saveGeneratedImage(canvas);
      }
    } catch (error) {
      console.error('Error generating collage:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const saveGeneratedImage = async (canvas: FabricCanvas) => {
    try {
      const dataURL = canvas.toDataURL({
        format: 'png',
        quality: 1,
        multiplier: 2 // Higher resolution
      });

      // Convert data URL to blob
      const response = await fetch(dataURL);
      const blob = await response.blob();

      // Upload to Supabase storage
      const fileName = `outfit-${outfitId}-${Date.now()}.png`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('clothes')
        .upload(`outfit-images/${fileName}`, blob, {
          contentType: 'image/png',
          upsert: true
        });

      if (uploadError) {
        console.error('Error uploading image:', uploadError);
        return;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('clothes')
        .getPublicUrl(`outfit-images/${fileName}`);

      const imageUrl = urlData.publicUrl;

      // Update outfit with generated image URL
      const { error: updateError } = await supabase
        .from('outfits')
        .update({ generated_image_url: imageUrl })
        .eq('id', outfitId);

      if (updateError) {
        console.error('Error updating outfit with image URL:', updateError);
      } else {
        console.log('Outfit image saved successfully:', imageUrl);
        onImageGenerated?.(imageUrl);
      }
    } catch (error) {
      console.error('Error saving generated image:', error);
    }
  };

  const downloadCollage = () => {
    if (!fabricCanvas) return;
    
    const dataURL = fabricCanvas.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 2 // Higher resolution
    });
    
    const link = document.createElement('a');
    link.download = `outfit-${title.replace(/\s+/g, '-').toLowerCase()}.png`;
    link.href = dataURL;
    link.click();
  };

  if (items.length === 0) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="p-6 text-center">
          <Palette className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No items selected for outfit</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between">
          <span>Outfit Collage</span>
          <Button 
            onClick={downloadCollage} 
            size="sm" 
            variant="outline"
            disabled={isGenerating}
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <canvas 
            ref={canvasRef} 
            className="w-full h-auto border border-border rounded-lg shadow-sm"
            style={{ maxWidth: '100%' }}
          />
          {isGenerating && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg">
              <p className="text-sm text-muted-foreground">Generating collage...</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};