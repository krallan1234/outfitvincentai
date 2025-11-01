import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CloudRain, Sparkles, Loader2 } from 'lucide-react';
import { OutfitCard } from './OutfitCard';
import { OutfitGenerationProgress } from './OutfitGenerationProgress';
import { useAdvancedOutfitGenerator, GenerationParams } from '@/hooks/useAdvancedOutfitGenerator';
import { useWeather } from '@/hooks/useWeather';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { MOODS } from '@/types/generator';

const OCCASIONS = [
  { value: 'casual', label: 'Casual' },
  { value: 'business', label: 'Business' },
  { value: 'formal', label: 'Formal' },
  { value: 'sporty', label: 'Sporty' },
  { value: 'date', label: 'Date Night' },
  { value: 'party', label: 'Party' },
];

export const AdvancedOutfitGenerator = () => {
  const [prompt, setPrompt] = useState('');
  const [occasion, setOccasion] = useState('');
  const [mood, setMood] = useState('');
  
  const { outfits, loading, generateMultiple, saveFeedback } = useAdvancedOutfitGenerator();
  const { preferences, location } = useUserPreferences();
  const { weather } = useWeather(location);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      return;
    }

    const params: GenerationParams = {
      prompt: prompt.trim(),
      occasion: occasion || undefined,
      mood: mood || undefined,
      weather: weather || undefined,
      userPreferences: preferences || undefined,
    };

    await generateMultiple(params);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleGenerate();
    }
  };

  return (
    <div className="space-y-6" role="main" aria-label="Advanced Outfit Generator">
      {/* Header Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Sparkles className="w-6 h-6 text-primary" />
            Advanced Outfit Generator
          </CardTitle>
          <CardDescription>
            Generate 5 unique outfit recommendations with detailed confidence scores, 
            styling tips, and trend analysis
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle>Describe Your Outfit</CardTitle>
          <CardDescription>
            Tell us what you're looking for - be as specific or creative as you want
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Prompt Input */}
          <div className="space-y-2">
            <Label htmlFor="prompt">What kind of outfit do you want?</Label>
            <Input
              id="prompt"
              placeholder="e.g., A stylish business casual outfit for a presentation"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={loading}
              className="text-base"
            />
          </div>

          {/* Occasion & Mood Selectors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="occasion">Occasion (Optional)</Label>
              <Select value={occasion} onValueChange={setOccasion} disabled={loading}>
                <SelectTrigger id="occasion">
                  <SelectValue placeholder="Select occasion" />
                </SelectTrigger>
                <SelectContent>
                  {OCCASIONS.map((occ) => (
                    <SelectItem key={occ.value} value={occ.value}>
                      {occ.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mood">Mood (Optional)</Label>
              <Select value={mood} onValueChange={setMood} disabled={loading}>
                <SelectTrigger id="mood">
                  <SelectValue placeholder="Select mood" />
                </SelectTrigger>
                <SelectContent>
                  {MOODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Weather Info */}
          {weather && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CloudRain className="w-4 h-4" />
              <span>
                Current weather: {weather.temperature}°C, {weather.condition}
              </span>
            </div>
          )}

          {/* Generate Button */}
          <Button 
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            size="lg"
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Generating 5 Outfits...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Generate 5 Unique Outfits
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Loading State */}
      {loading && (
        <OutfitGenerationProgress 
          step={1} 
          tip="Analyzing your preferences and generating 5 unique outfits..." 
        />
      )}

      {/* Results Grid */}
      {outfits.length > 0 && !loading && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Your 5 Outfit Recommendations</CardTitle>
              <CardDescription>
                Each outfit is scored based on style match, weather suitability, color harmony, and trend relevance
              </CardDescription>
            </CardHeader>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {outfits.map((outfit) => (
              <OutfitCard
                key={outfit.id}
                outfit={outfit}
                onLike={() => saveFeedback(outfit.id, 'like')}
                onDislike={() => saveFeedback(outfit.id, 'dislike')}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {outfits.length === 0 && !loading && (
        <Card className="p-12 text-center">
          <div className="space-y-4">
            <Sparkles className="w-12 h-12 mx-auto text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold">Ready to Create Magic?</h3>
              <p className="text-muted-foreground">
                Describe your ideal outfit and let AI generate 5 unique recommendations
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
