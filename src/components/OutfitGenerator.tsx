import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, TrendingUp, Palette } from 'lucide-react';
import { useOutfits } from '@/hooks/useOutfits';
import { useCommunity } from '@/hooks/useCommunity';
import { OutfitCollage } from './OutfitCollage';

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
  
  const { generateOutfit, loading } = useOutfits();

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    try {
      const result = await generateOutfit(prompt, mood || undefined, true); // Always public
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


          <Button
            onClick={handleGenerate}
            className="w-full" 
            disabled={!prompt.trim() || loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating with Gemini AI & Pinterest...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate AI Outfit
              </>
            )}
          </Button>
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

            {/* Instagram Inspiration */}
            {generatedOutfit.outfit.ai_analysis?.instagram_inspiration?.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Instagram Inspiration
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {generatedOutfit.outfit.ai_analysis.instagram_inspiration.map((inspo: any, index: number) => (
                    <div key={index} className="relative group">
                      <img
                        src={inspo.image_url}
                        alt={`Instagram outfit inspiration from @${inspo.username}`}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                        <div className="text-xs text-white text-center p-1">
                          <div className="font-medium">@{inspo.username}</div>
                          <div className="text-xs">#{inspo.hashtag}</div>
                        </div>
                      </div>
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