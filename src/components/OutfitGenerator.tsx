import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, TrendingUp, Palette, RefreshCw, Link as LinkIcon } from 'lucide-react';
import { useOutfits } from '@/hooks/useOutfits';
import { usePinterestBoard } from '@/hooks/usePinterestBoard';
import { OutfitCollage } from './OutfitCollage';
import { PinterestBoardSelector } from './PinterestBoardSelector';
import { ClothesGallery } from './ClothesGallery';
import { ClothingItem } from '@/hooks/useClothes';

const MOODS = [
  { value: 'casual', label: 'Casual' },
  { value: 'sporty', label: 'Sporty' },
  { value: 'elegant', label: 'Elegant' },
  { value: 'professional', label: 'Professional' },
  { value: 'romantic', label: 'Romantic' },
  { value: 'edgy', label: 'Edgy' },
  { value: 'bohemian', label: 'Bohemian' },
  { value: 'minimalist', label: 'Minimalist' }
];

const QUICK_PROMPTS = [
  'Formal office wear in blue tones',
  'Casual weekend brunch outfit',
  'Date night dinner look',
  'Summer beach vacation style',
  'Winter layered street style',
  'Business meeting attire'
];

export const OutfitGenerator = () => {
  const [prompt, setPrompt] = useState('');
  const [mood, setMood] = useState('');
  const [generatedOutfit, setGeneratedOutfit] = useState<any>(null);
  const [enablePinterestBoard, setEnablePinterestBoard] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ClothingItem | null>(null);
  
  const { generateOutfit, loading } = useOutfits();
  const { connectedBoard, getConnectedBoard } = usePinterestBoard();

  useEffect(() => {
    const loadBoard = async () => {
      await getConnectedBoard();
    };
    loadBoard();
  }, []);

  const handleGenerate = async (forceVariety = false) => {
    if (!prompt.trim()) return;

    try {
      // Add random variation seed to force different results when regenerating
      const varietyPrompt = forceVariety 
        ? `${prompt} (style variation ${Math.floor(Math.random() * 10000)})` 
        : prompt;
      
      const result = await generateOutfit(
        varietyPrompt, 
        mood || undefined, 
        true, 
        enablePinterestBoard && connectedBoard ? connectedBoard.id : undefined,
        selectedItem || undefined
      );
      setGeneratedOutfit(result);
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const handleQuickPrompt = (quickPrompt: string) => {
    setPrompt(quickPrompt);
  };

  return (
    <div className="space-y-6">
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Generate Your Perfect Outfit
          </CardTitle>
          <CardDescription>
            Describe what you're looking for or select a mood. Google Gemini AI will analyze your wardrobe with Pinterest trends to create the perfect outfit.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Quick Prompts */}
          <div className="space-y-2">
            <Label>Quick Ideas</Label>
            <div className="flex flex-wrap gap-2">
              {QUICK_PROMPTS.map((quickPrompt) => (
                <Button
                  key={quickPrompt}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickPrompt(quickPrompt)}
                  className="text-xs"
                >
                  {quickPrompt}
                </Button>
              ))}
            </div>
          </div>

          {/* Custom Prompt */}
          <div className="space-y-2">
            <Label htmlFor="prompt">Describe Your Outfit</Label>
            <Textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., 'Formal office wear in blue tones' or 'Casual summer outfit for a picnic'"
              rows={3}
            />
          </div>

          {/* Mood Selection */}
          <div className="space-y-2">
            <Label htmlFor="mood">Mood (Optional)</Label>
            <Select value={mood} onValueChange={setMood}>
              <SelectTrigger>
                <SelectValue placeholder="Select a mood for your outfit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No specific mood</SelectItem>
                {MOODS.map((moodOption) => (
                  <SelectItem key={moodOption.value} value={moodOption.value}>
                    {moodOption.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Pinterest Board Integration */}
          <PinterestBoardSelector 
            onBoardConnected={(connected) => setEnablePinterestBoard(connected)}
          />

          {/* Selected Item Display */}
          <div className="space-y-2">
            <Label>Base Outfit on Specific Item (Optional)</Label>
            {selectedItem ? (
              <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted">
                <img 
                  src={selectedItem.image_url} 
                  alt={selectedItem.category}
                  className="w-16 h-16 object-cover rounded"
                />
                <div className="flex-1">
                  <p className="font-medium capitalize">{selectedItem.category}</p>
                  <p className="text-sm text-muted-foreground">{selectedItem.color}</p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setSelectedItem(null)}
                >
                  Remove
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Select an item from your wardrobe below to build an outfit around it
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => handleGenerate(false)}
              className="flex-1" 
              disabled={!prompt.trim() || loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate AI Outfit
                </>
              )}
            </Button>
            
            {generatedOutfit && (
              <Button
                onClick={() => handleGenerate(true)}
                variant="outline"
                disabled={loading}
                title="Regenerate with more variety - creates a different outfit combination"
                className="px-3"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
          </div>
          </CardContent>
        </Card>

      {/* Item Selection Gallery */}
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Select Item to Build Around (Optional)</CardTitle>
          <CardDescription>
            Click the sparkle icon on any item to build your outfit around it
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ClothesGallery 
            selectionMode={true}
            selectedItemId={selectedItem?.id}
            onSelectItem={(item) => setSelectedItem(item.id === selectedItem?.id ? null : item)}
          />
        </CardContent>
      </Card>

      {/* Generated Outfit Display */}
      {generatedOutfit && (
        <Card className="w-full max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>{generatedOutfit.outfit.title}</CardTitle>
            <CardDescription>
              {generatedOutfit.outfit.prompt} {generatedOutfit.outfit.mood && `• ${generatedOutfit.outfit.mood} mood`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Outfit Collage */}
            {generatedOutfit.outfit.ai_analysis?.outfit_visualization && (
              <div className="flex justify-center">
                <OutfitCollage
                  items={generatedOutfit.outfit.ai_analysis.outfit_visualization.items}
                  title={generatedOutfit.outfit.title}
                  colorScheme={generatedOutfit.outfit.ai_analysis.color_harmony || 'Harmonious colors'}
                  outfitId={generatedOutfit.outfit.id}
                  onImageGenerated={(imageUrl) => {
                    // Update the local state with the new image URL
                    setGeneratedOutfit(prev => ({
                      ...prev,
                      outfit: { ...prev.outfit, generated_image_url: imageUrl }
                    }));
                  }}
                />
              </div>
            )}

            {/* Description */}
            {generatedOutfit.outfit.description && (
              <div>
                <h4 className="font-semibold mb-2">AI Style Analysis</h4>
                <p className="text-muted-foreground">{generatedOutfit.outfit.description}</p>
              </div>
            )}

            {/* Color Harmony */}
            {generatedOutfit.outfit.ai_analysis?.color_harmony && (
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  Color Harmony
                </h4>
                <p className="text-muted-foreground">{generatedOutfit.outfit.ai_analysis.color_harmony}</p>
              </div>
            )}

            {/* Pinterest Trends */}
            {generatedOutfit.outfit.ai_analysis?.pinterest_trends?.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Pinterest Inspiration
                </h4>
                <div className="space-y-2">
                  {generatedOutfit.outfit.ai_analysis.pinterest_trends.map((trend: any, index: number) => (
                    <div key={index} className="text-sm text-muted-foreground p-2 bg-muted/50 rounded">
                      • {trend.description || 'Trending style inspiration'}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommended Clothes */}
            {generatedOutfit.recommendedClothes && generatedOutfit.recommendedClothes.length > 0 && (
              <div>
                <h4 className="font-semibold mb-3">Your Wardrobe Items</h4>
                <div className="grid gap-3">
                  {generatedOutfit.recommendedClothes.map((item: any) => (
                    <div key={item.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <img
                        src={item.image_url}
                        alt={item.category}
                        className="w-16 h-16 object-cover rounded"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium capitalize">{item.category}</span>
                          <Badge variant="secondary">{item.color}</Badge>
                          <Badge variant="outline">{item.style}</Badge>
                        </div>
                        {item.brand && (
                          <p className="text-xs text-muted-foreground">{item.brand}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Styling Tips */}
            {generatedOutfit.outfit.ai_analysis?.styling_tips && (
              <div>
                <h4 className="font-semibold mb-2">Styling Tips</h4>
                <ul className="space-y-2">
                  {generatedOutfit.outfit.ai_analysis.styling_tips.map((tip: string, index: number) => (
                    <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Occasion */}
            {generatedOutfit.outfit.ai_analysis?.occasion && (
              <div>
                <h4 className="font-semibold mb-2">Perfect For</h4>
                <p className="text-muted-foreground">{generatedOutfit.outfit.ai_analysis.occasion}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
