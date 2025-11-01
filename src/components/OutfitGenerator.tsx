import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CloudRain, Settings, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useWeather } from '@/hooks/useWeather';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { usePurchaseLinks } from '@/hooks/usePurchaseLinks';
import { useOutfitGeneration } from '@/hooks/useOutfitGeneration';
import { ClothesGallery } from './ClothesGallery';
import { ProfilePreferences } from './ProfilePreferences';
import { OutfitHistory } from './OutfitHistory';
import { OutfitGenerationProgress } from './OutfitGenerationProgress';
import { OnboardingTooltips } from './OnboardingTooltips';
import { ErrorModal, useErrorModal } from './ErrorModal';
import { ClothingItem } from '@/hooks/useClothes';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { PinterestTrendsPreview } from './PinterestTrendsPreview';
import { PromptEditor } from './outfit-generator/PromptEditor';
import { QuickPrompts } from './outfit-generator/QuickPrompts';
import { ExamplePrompts } from './outfit-generator/ExamplePrompts';
import { ContextSelectors } from './outfit-generator/ContextSelectors';
import { ResultPreview } from './outfit-generator/ResultPreview';
import { ResultControls } from './outfit-generator/ResultControls';
import { OutfitGenerationResult } from '@/types/generator';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { InfoIcon } from 'lucide-react';

export const OutfitGenerator = () => {
  const [prompt, setPrompt] = useState<string>('');
  const [mood, setMood] = useState<string>('');
  const [occasion, setOccasion] = useState<string>('');
  const [generatedOutfit, setGeneratedOutfit] = useState<OutfitGenerationResult | null>(null);
  const [enablePinterestBoard, setEnablePinterestBoard] = useState<boolean>(false);
  const [selectedItems, setSelectedItems] = useState<ClothingItem[]>([]);
  const [showPreferences, setShowPreferences] = useState<boolean>(false);
  const [showOutfitModal, setShowOutfitModal] = useState<boolean>(false);
  const [pinterestTrendsPins, setPinterestTrendsPins] = useState<any[]>([]);
  const [shouldGenerateImage, setShouldGenerateImage] = useState<boolean>(false);
  const [pinterestBoardId, setPinterestBoardId] = useState<string | undefined>(undefined);
  const [forceVariety, setForceVariety] = useState<boolean>(false);

  const { toast } = useToast();
  const { preferences, location } = useUserPreferences();
  const { weather } = useWeather(location);
  const { loading, step, tip, generate } = useOutfitGeneration();

  const handleGenerate = async (regenerate: boolean = false): Promise<void> => {
    const result = await generate(
      {
        prompt,
        mood: mood || undefined,
        occasion: occasion || undefined,
        isPublic: true,
        pinterestBoardId,
        weather: weather || undefined,
        userPreferences: preferences || undefined,
        shouldGenerateImage,
        forceVariety: regenerate ? true : forceVariety, // Always force variety on regenerate
      },
      selectedItems
    );

    console.log('✅ Generation result received in OutfitGenerator:', {
      hasResult: !!result,
      hasOutfit: !!result?.outfit,
      outfitType: result?.outfit ? typeof result.outfit : 'undefined',
      outfitId: result?.outfit?.id,
      outfitTitle: result?.outfit?.title,
      outfitKeys: result?.outfit ? Object.keys(result.outfit) : [],
      fullResult: result
    });

    if (result) {
      console.log('✅ Setting generated outfit and showing modal');
      setGeneratedOutfit(result);
      setShowOutfitModal(true);
    } else {
      console.log('❌ No result returned, modal will not show');
    }
  };

  const handleItemSelection = (item: ClothingItem): void => {
    const isSelected = selectedItems.some((i) => i.id === item.id);
    if (isSelected) {
      setSelectedItems(selectedItems.filter((i) => i.id !== item.id));
    } else {
      setSelectedItems([...selectedItems, item]);
    }
  };

  return (
    <div className="space-y-6" role="main" aria-label="Outfit Generator">
      {/* Outfit Preview Modal */}
      {generatedOutfit && (
        <ResultPreview
          outfit={generatedOutfit.outfit}
          isOpen={showOutfitModal}
          onClose={() => setShowOutfitModal(false)}
        />
      )}

      {/* Profile Preferences Section */}
      <Collapsible open={showPreferences} onOpenChange={setShowPreferences}>
        <Card className="w-full max-w-2xl mx-auto" id="preferences-section">
          <CardHeader>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between p-0 h-auto hover:bg-transparent"
                aria-expanded={showPreferences}
                aria-controls="preferences-content"
              >
                <div className="flex items-center gap-2">
                  <Settings className="h-5 w-5" aria-hidden="true" />
                  <CardTitle>Personalization Settings</CardTitle>
                </div>
                <Badge variant="secondary">
                  Click to {showPreferences ? 'hide' : 'show'}
                </Badge>
              </Button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent id="preferences-content">
            <CardContent>
              <ProfilePreferences />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Weather Widget */}
      {weather && (
        <Card
          className="w-full max-w-2xl mx-auto bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950"
          id="weather-widget"
          role="region"
          aria-label="Current weather information"
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CloudRain className="h-8 w-8 text-blue-500" aria-hidden="true" />
                <div>
                  <p className="text-sm font-medium">{location}</p>
                  <p
                    className="text-2xl font-bold"
                    aria-label={`Temperature ${weather.temperature} degrees Celsius`}
                  >
                    {weather.temperature}°C
                  </p>
                  <p className="text-sm text-muted-foreground capitalize">
                    {weather.description}
                  </p>
                </div>
              </div>
              <div className="text-right text-sm text-muted-foreground">
                <p>Humidity: {weather.humidity}%</p>
                <p>Wind: {weather.windSpeed} m/s</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Generate Your Perfect Outfit
          </CardTitle>
          <CardDescription>
            Describe what you're looking for or select a mood. We'll analyze your
            wardrobe{weather ? ', current weather,' : ''} and Pinterest trends to create
            the perfect outfit.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Example Prompts - Onboarding */}
          <ExamplePrompts
            onSelect={(prompt, mood, occasion) => {
              setPrompt(prompt);
              if (mood) setMood(mood);
              if (occasion) setOccasion(occasion);
            }}
            disabled={loading}
          />

          {/* Quick Prompts */}
          <QuickPrompts onSelect={setPrompt} disabled={loading} />

          {/* Custom Prompt */}
          <PromptEditor value={prompt} onChange={setPrompt} disabled={loading} />

          {/* Context Selectors */}
          <ContextSelectors
            mood={mood}
            onMoodChange={setMood}
            occasion={occasion}
            onOccasionChange={setOccasion}
            onPinterestBoardConnected={(connected) => {
              setEnablePinterestBoard(connected);
            }}
            disabled={loading}
          />

          {/* Pinterest Trends Preview */}
          {pinterestTrendsPins.length > 0 && (
            <PinterestTrendsPreview pins={pinterestTrendsPins} query={prompt || 'fashion'} />
          )}

          {/* Selected Items Display */}
          <div className="space-y-2">
            <Label>Base Outfit on Specific Items (Optional - Multi-Select)</Label>
            {selectedItems.length > 0 ? (
              <div className="space-y-2">
                {selectedItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 p-3 border rounded-lg bg-muted"
                  >
                    <img
                      src={item.image_url}
                      alt={item.category}
                      className="w-16 h-16 object-cover rounded"
                    />
                    <div className="flex-1">
                      <p className="font-medium capitalize">{item.category}</p>
                      <p className="text-sm text-muted-foreground">{item.color}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setSelectedItems(selectedItems.filter((i) => i.id !== item.id))
                      }
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">
                  {selectedItems.length} item{selectedItems.length > 1 ? 's' : ''}{' '}
                  selected
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Select multiple items from your wardrobe below to build an outfit around
                them
              </p>
            )}
          </div>

          {loading && tip && <OutfitGenerationProgress step={step} tip={tip} />}

          {/* Force Variety Toggle */}
          <div className="flex items-center gap-3 p-4 border rounded-lg bg-muted/50">
            <Switch
              checked={forceVariety}
              onCheckedChange={setForceVariety}
              disabled={loading}
              id="force-variety"
            />
            <div className="flex-1">
              <Label htmlFor="force-variety" className="flex items-center gap-2 cursor-pointer">
                <Sparkles className="h-4 w-4 text-primary" />
                Force Different Items
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                AI will avoid recently used items and create more diverse outfits
              </p>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <InfoIcon className="w-4 h-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Enable this to get outfits with items you haven't used recently. Higher AI creativity for unique combinations.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Result Controls */}
          <ResultControls
            loading={loading}
            canGenerate={!!prompt.trim()}
            hasResult={!!generatedOutfit}
            shouldGenerateImage={shouldGenerateImage}
            onGenerate={() => handleGenerate(false)}
            onRegenerate={() => handleGenerate(true)}
            onImageGenerationToggle={setShouldGenerateImage}
          />
        </CardContent>
      </Card>

      {/* Item Selection Gallery */}
      <Card className="w-full max-w-2xl mx-auto" id="clothes-gallery">
        <CardHeader>
          <CardTitle>Select Items to Build Around (Optional - Multi-Select)</CardTitle>
          <CardDescription>
            Click the sparkle icon on items to select multiple pieces for your outfit
            base
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div role="region" aria-label="Clothing items gallery">
            <ClothesGallery
              selectionMode={true}
              multiSelect={true}
              selectedItemIds={selectedItems.map((i) => i.id)}
              onSelectItem={handleItemSelection}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
