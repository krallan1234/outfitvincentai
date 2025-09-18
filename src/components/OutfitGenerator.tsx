import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Loader2 } from 'lucide-react';
import { useOutfits } from '@/hooks/useOutfits';

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
      const result = await generateOutfit(prompt, mood || undefined);
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
            Describe what you're looking for or select a mood, and our AI will create an outfit from your wardrobe.
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
                <SelectItem value="">No specific mood</SelectItem>
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
                Generating Your Outfit...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Outfit
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
          <CardContent className="space-y-4">
            {/* Generated Image */}
            {generatedOutfit.outfit.generated_image_url && (
              <div className="aspect-square max-w-md mx-auto">
                <img
                  src={generatedOutfit.outfit.generated_image_url}
                  alt={generatedOutfit.outfit.title}
                  className="w-full h-full object-cover rounded-lg"
                />
              </div>
            )}

            {/* Description */}
            {generatedOutfit.outfit.description && (
              <p className="text-muted-foreground">
                {generatedOutfit.outfit.description}
              </p>
            )}

            {/* Recommended Clothes */}
            {generatedOutfit.recommendedClothes && generatedOutfit.recommendedClothes.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Recommended Items from Your Wardrobe:</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {generatedOutfit.recommendedClothes.map((item: any) => (
                    <div key={item.id} className="border rounded-lg p-2">
                      <img
                        src={item.image_url}
                        alt={item.category}
                        className="w-full h-24 object-cover rounded mb-1"
                      />
                      <p className="text-xs font-medium">{item.category}</p>
                      <p className="text-xs text-muted-foreground">{item.color}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Styling Tips */}
            {generatedOutfit.outfit.ai_analysis?.styling_tips && (
              <div className="space-y-2">
                <h4 className="font-medium">Styling Tips:</h4>
                <ul className="list-disc list-inside space-y-1">
                  {generatedOutfit.outfit.ai_analysis.styling_tips.map((tip: string, index: number) => (
                    <li key={index} className="text-sm text-muted-foreground">{tip}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Occasion */}
            {generatedOutfit.outfit.ai_analysis?.occasion && (
              <div className="space-y-2">
                <h4 className="font-medium">Perfect For:</h4>
                <p className="text-sm text-muted-foreground">
                  {generatedOutfit.outfit.ai_analysis.occasion}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};