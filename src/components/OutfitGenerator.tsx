import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, TrendingUp, Palette, RefreshCw, Link as LinkIcon, CloudRain, Settings } from 'lucide-react';
import { useOutfits } from '@/hooks/useOutfits';
import { usePinterestBoard } from '@/hooks/usePinterestBoard';
import { useToast } from '@/hooks/use-toast';
import { useWeather } from '@/hooks/useWeather';
import { usePWA } from '@/hooks/usePWA';
import { PinterestBoardSelector } from './PinterestBoardSelector';
import { ClothesGallery } from './ClothesGallery';
import { ProfilePreferences } from './ProfilePreferences';
import { OutfitHistory } from './OutfitHistory';
import { AdvancedMoodSelector } from './AdvancedMoodSelector';
import { OccasionFilters } from './OccasionFilters';
import { OutfitGenerationProgress } from './OutfitGenerationProgress';
import { OnboardingTooltips } from './OnboardingTooltips';
import { ErrorModal, useErrorModal } from './ErrorModal';
import { OutfitModal } from './OutfitModal';
import { ClothingItem } from '@/hooks/useClothes';
import { supabase } from '@/integrations/supabase/client';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { PinterestTrendsPreview } from './PinterestTrendsPreview';

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

interface PurchaseLink {
  store_name: string;
  price?: string;
  url?: string;
}

export const OutfitGenerator = () => {
  const [prompt, setPrompt] = useState('');
  const [mood, setMood] = useState('');
  const [occasion, setOccasion] = useState('');
  const [generatedOutfit, setGeneratedOutfit] = useState<any>(null);
  const [enablePinterestBoard, setEnablePinterestBoard] = useState(false);
  const [selectedItems, setSelectedItems] = useState<ClothingItem[]>([]);
  const [purchaseLinks, setPurchaseLinks] = useState<PurchaseLink[]>([{ store_name: '', price: '', url: '' }]);
  const [loadingTip, setLoadingTip] = useState('');
  const [generationStep, setGenerationStep] = useState(1);
  const [userLocation, setUserLocation] = useState('');
  const [showPreferences, setShowPreferences] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showOutfitModal, setShowOutfitModal] = useState(false);
  const [pinterestTrendsPins, setPinterestTrendsPins] = useState<any[]>([]);
  
  const { generateOutfit, loading } = useOutfits();
  const { connectedBoard, getConnectedBoard } = usePinterestBoard();
  const { toast } = useToast();
  const { weather } = useWeather(userLocation);
  const { errorState, showError, closeError } = useErrorModal();

  useEffect(() => {
    const loadBoard = async () => {
      await getConnectedBoard();
    };
    loadBoard();
    loadUserPreferences();
    
    // Show onboarding for first-time users
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
    }
  }, []);

  useEffect(() => {
    const loadBoard = async () => {
      await getConnectedBoard();
    };
    loadBoard();
    loadUserPreferences();
  }, []);

  const loadUserPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('profiles')
        .select('location')
        .eq('user_id', user.id)
        .single();

      if (data?.location) {
        setUserLocation(data.location);
      }
    } catch (error) {
      console.error('Error loading user preferences:', error);
    }
  };

  const handleGenerate = async (forceVariety = false) => {
    if (!prompt.trim()) return;

    // Check for conflicts (e.g., multiple tops, multiple bottoms, multiple dresses)
    if (selectedItems.length > 0) {
      const categories = selectedItems.map(item => item.category.toLowerCase());
      
      const topCategories = categories.filter(cat => 
        cat.includes('top') || cat.includes('shirt') || cat.includes('blouse') || 
        cat.includes('sweater') || cat.includes('t-shirt') || cat.includes('tank')
      );
      const bottomCategories = categories.filter(cat => 
        cat.includes('bottom') || cat.includes('pants') || cat.includes('jeans') || 
        cat.includes('skirt') || cat.includes('shorts') || cat.includes('trousers')
      );
      const dressCategories = categories.filter(cat => 
        cat.includes('dress') || cat.includes('jumpsuit')
      );
      
      if (topCategories.length > 1) {
        toast({
          title: 'Selection Conflict',
          description: 'You can only select one top item. Please remove duplicate tops.',
          variant: 'destructive',
        });
        return;
      }
      
      if (bottomCategories.length > 1) {
        toast({
          title: 'Selection Conflict',
          description: 'You can only select one bottom item. Please remove duplicate bottoms.',
          variant: 'destructive',
        });
        return;
      }
      
      if (dressCategories.length > 1) {
        toast({
          title: 'Selection Conflict',
          description: 'You can only select one dress. Please remove duplicates.',
          variant: 'destructive',
        });
        return;
      }
      
      // Check if dress is selected with top/bottom
      if (dressCategories.length > 0 && (topCategories.length > 0 || bottomCategories.length > 0)) {
        toast({
          title: 'Selection Conflict',
          description: 'Cannot select a dress with tops or bottoms. Choose either a dress OR top+bottom combination.',
          variant: 'destructive',
        });
        return;
      }
    }

    const tips = [
      "Analyzing your wardrobe selections...",
      "Finding perfect color combinations...",
      "Checking Pinterest trends for inspiration...",
      weather ? "Considering current weather conditions..." : "Matching styles and patterns...",
      "Finalizing your outfit with AI..."
    ];
    
    let tipIndex = 0;
    setGenerationStep(1);
    setLoadingTip(tips[0]);
    
    const tipInterval = setInterval(() => {
      tipIndex++;
      setGenerationStep(Math.min(tipIndex + 1, 4));
      setLoadingTip(tips[tipIndex % tips.length]);
    }, 3000);

    try {
      // Get user preferences for personalization
      const { data: { user } } = await supabase.auth.getUser();
      let userPreferences = null;
      
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('body_type, style_preferences, favorite_colors')
          .eq('user_id', user.id)
          .single();
        userPreferences = data;
      }

      // Add occasion context if selected
      const contextPrompt = occasion 
        ? `${prompt} for ${occasion}` 
        : prompt;
      
      // Add random variation seed to force different results when regenerating
      const varietyPrompt = forceVariety 
        ? `${contextPrompt} (style variation ${Math.floor(Math.random() * 10000)})` 
        : contextPrompt;
      
      // Fetch Pinterest trends for inspiration with style-specific keywords
      let pinterestContext = '';
      let pinterestPins: any[] = [];
      try {
        // Enhance search query with style-specific keywords for better trend matching
        let enhancedQuery = varietyPrompt;
        const lowerPrompt = varietyPrompt.toLowerCase();
        
        if (lowerPrompt.includes('business') || lowerPrompt.includes('meeting') || lowerPrompt.includes('office')) {
          enhancedQuery += ' professional office business attire formal workwear';
        } else if (lowerPrompt.includes('formal') || lowerPrompt.includes('elegant') || lowerPrompt.includes('gala')) {
          enhancedQuery += ' formal elegant evening wear sophisticated';
        } else if (lowerPrompt.includes('athletic') || lowerPrompt.includes('gym') || lowerPrompt.includes('sporty')) {
          enhancedQuery += ' athletic activewear sportswear fitness gym';
        } else if (lowerPrompt.includes('date') || lowerPrompt.includes('romantic')) {
          enhancedQuery += ' date night romantic dinner outfit stylish';
        } else if (lowerPrompt.includes('street') || lowerPrompt.includes('urban')) {
          enhancedQuery += ' streetwear urban fashion trendy cool';
        } else if (lowerPrompt.includes('casual') || lowerPrompt.includes('weekend')) {
          enhancedQuery += ' casual comfortable relaxed everyday style';
        }
        
        console.log('Fetching Pinterest trends with enhanced query:', enhancedQuery);
        const trendsResponse = await supabase.functions.invoke('fetch-pinterest-trends', {
          body: { query: enhancedQuery, limit: 20 }
        });
        
        if (trendsResponse.data && !trendsResponse.error) {
          pinterestContext = trendsResponse.data.ai_context || '';
          pinterestPins = trendsResponse.data.top_pins || [];
          setPinterestTrendsPins(pinterestPins);
          console.log('Pinterest trends fetched:', pinterestPins.length, 'pins');
        }
      } catch (err) {
        console.warn('Failed to fetch Pinterest trends, continuing without:', err);
      }
      
      // Filter out empty purchase links
      const validPurchaseLinks = purchaseLinks.filter(link => link.store_name.trim() !== '');
      
      const result = await generateOutfit(
        varietyPrompt, 
        mood || undefined, 
        true, 
        enablePinterestBoard && connectedBoard ? connectedBoard.id : undefined,
        selectedItems.length > 0 ? selectedItems : undefined,
        validPurchaseLinks.length > 0 ? validPurchaseLinks : undefined,
        weather || undefined,
        userPreferences || undefined,
        pinterestContext,
        pinterestPins
      );
      setGeneratedOutfit(result);
      
      // Show the outfit modal immediately after generation
      if (result) {
        setShowOutfitModal(true);
      }
    } catch (error) {
      // Error is handled in the hook
    } finally {
      clearInterval(tipInterval);
      setLoadingTip('');
      setGenerationStep(1);
    }
  };

  const handleQuickPrompt = (quickPrompt: string) => {
    setPrompt(quickPrompt);
  };

  const addPurchaseLink = () => {
    setPurchaseLinks([...purchaseLinks, { store_name: '', price: '', url: '' }]);
  };

  const removePurchaseLink = (index: number) => {
    setPurchaseLinks(purchaseLinks.filter((_, i) => i !== index));
  };

  const updatePurchaseLink = (index: number, field: keyof PurchaseLink, value: string) => {
    const updated = [...purchaseLinks];
    updated[index] = { ...updated[index], [field]: value };
    setPurchaseLinks(updated);
  };

  return (
    <div className="space-y-6" role="main" aria-label="Outfit Generator">
      {/* Onboarding Tooltips */}
      {showOnboarding && (
        <OnboardingTooltips 
          onComplete={() => {
            setShowOnboarding(false);
            localStorage.setItem('hasSeenOnboarding', 'true');
          }} 
        />
      )}

      {/* Error Modal */}
      {errorState.error && (
        <ErrorModal 
          isOpen={errorState.isOpen}
          onClose={closeError}
          error={errorState.error}
        />
      )}

      {/* Outfit Preview Modal */}
      {generatedOutfit && (
        <OutfitModal
          outfit={generatedOutfit.outfit}
          isOpen={showOutfitModal}
          onClose={() => setShowOutfitModal(false)}
          showLikeButton={false}
        />
      )}

      {/* Outfit History Insights */}
      <OutfitHistory />

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
                <Badge variant="secondary">Click to {showPreferences ? 'hide' : 'show'}</Badge>
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
                  <p className="text-sm font-medium">{userLocation}</p>
                  <p className="text-2xl font-bold" aria-label={`Temperature ${weather.temperature} degrees Celsius`}>
                    {weather.temperature}°C
                  </p>
                  <p className="text-sm text-muted-foreground capitalize">{weather.description}</p>
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
            <Sparkles className="h-5 w-5" aria-hidden="true" />
            Generate Your Perfect Outfit
          </CardTitle>
          <CardDescription>
            Describe what you're looking for or select a mood. We'll analyze your wardrobe{weather ? ', current weather,' : ''} and Pinterest trends to create the perfect outfit.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Quick Prompts */}
          <div className="space-y-2" id="quick-ideas">
            <Label htmlFor="quick-ideas-section">Quick Ideas</Label>
            <div className="flex flex-wrap gap-2" id="quick-ideas-section" role="group" aria-label="Quick outfit idea buttons">
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

          {/* Occasion Filters */}
          <OccasionFilters 
            selectedOccasion={occasion}
            onOccasionChange={setOccasion}
          />

          {/* Advanced Mood Selection */}
          <div id="mood-selector">
            <AdvancedMoodSelector value={mood} onChange={setMood} />
          </div>

          {/* Pinterest Board Integration */}
          <PinterestBoardSelector 
            onBoardConnected={(connected) => setEnablePinterestBoard(connected)}
          />

          {/* Pinterest Trends Preview */}
          {pinterestTrendsPins.length > 0 && (
            <PinterestTrendsPreview 
              pins={pinterestTrendsPins} 
              query={prompt || 'fashion'} 
            />
          )}

          {/* Selected Items Display */}
          <div className="space-y-2">
            <Label>Base Outfit on Specific Items (Optional - Multi-Select)</Label>
            {selectedItems.length > 0 ? (
              <div className="space-y-2">
                {selectedItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 p-3 border rounded-lg bg-muted">
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
                      onClick={() => setSelectedItems(selectedItems.filter(i => i.id !== item.id))}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">
                  {selectedItems.length} item{selectedItems.length > 1 ? 's' : ''} selected
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Select multiple items from your wardrobe below to build an outfit around them
              </p>
            )}
          </div>

          {/* Purchase Links */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4" />
                Where to Buy (Optional - for sharing)
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addPurchaseLink}
              >
                Add Link
              </Button>
            </div>
            {purchaseLinks.map((link, index) => (
              <div key={index} className="flex gap-2 items-start">
                <div className="flex-1 grid grid-cols-3 gap-2">
                  <Input
                    placeholder="Store name"
                    value={link.store_name}
                    onChange={(e) => updatePurchaseLink(index, 'store_name', e.target.value)}
                  />
                  <Input
                    placeholder="Price (optional)"
                    value={link.price || ''}
                    onChange={(e) => updatePurchaseLink(index, 'price', e.target.value)}
                  />
                  <Input
                    placeholder="URL (optional)"
                    value={link.url || ''}
                    onChange={(e) => updatePurchaseLink(index, 'url', e.target.value)}
                  />
                </div>
                {purchaseLinks.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removePurchaseLink(index)}
                  >
                    Remove
                  </Button>
                )}
              </div>
            ))}
          </div>

          {loading && loadingTip && (
            <OutfitGenerationProgress step={generationStep} tip={loadingTip} />
          )}

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
                  Generate Outfit
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
      <Card className="w-full max-w-2xl mx-auto" id="clothes-gallery">
        <CardHeader>
          <CardTitle>Select Items to Build Around (Optional - Multi-Select)</CardTitle>
          <CardDescription>
            Click the sparkle icon on items to select multiple pieces for your outfit base
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div role="region" aria-label="Clothing items gallery">
            <ClothesGallery 
              selectionMode={true}
              multiSelect={true}
              selectedItemIds={selectedItems.map(i => i.id)}
              onSelectItem={(item) => {
                const isSelected = selectedItems.some(i => i.id === item.id);
                if (isSelected) {
                  setSelectedItems(selectedItems.filter(i => i.id !== item.id));
                } else {
                  setSelectedItems([...selectedItems, item]);
                }
              }}
            />
          </div>
        </CardContent>
      </Card>

    </div>
  );
};
