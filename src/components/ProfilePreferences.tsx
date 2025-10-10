import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { User, MapPin, Palette, Tag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const BODY_TYPES = [
  { value: 'athletic', label: 'Athletic' },
  { value: 'curvy', label: 'Curvy' },
  { value: 'petite', label: 'Petite' },
  { value: 'tall', label: 'Tall' },
  { value: 'plus-size', label: 'Plus Size' },
  { value: 'average', label: 'Average' }
];

const STYLE_PREFERENCES = [
  'Casual', 'Sporty', 'Elegant', 'Professional', 'Romantic', 
  'Edgy', 'Bohemian', 'Minimalist', 'Streetwear', 'Vintage'
];

const COLOR_OPTIONS = [
  'Black', 'White', 'Navy', 'Gray', 'Beige', 'Brown',
  'Red', 'Blue', 'Green', 'Yellow', 'Pink', 'Purple'
];

export const ProfilePreferences = () => {
  const [bodyType, setBodyType] = useState('');
  const [location, setLocation] = useState('');
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('body_type, location, style_preferences, favorite_colors')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setBodyType(data.body_type || '');
        setLocation(data.location || '');
        setSelectedStyles(Array.isArray(data.style_preferences) ? data.style_preferences as string[] : []);
        setSelectedColors(Array.isArray(data.favorite_colors) ? data.favorite_colors as string[] : []);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const savePreferences = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({
          body_type: bodyType || null,
          location: location || null,
          style_preferences: selectedStyles,
          favorite_colors: selectedColors
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'Preferences Saved',
        description: 'Your profile preferences have been updated successfully!',
      });
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to save preferences',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleStyle = (style: string) => {
    setSelectedStyles(prev => 
      prev.includes(style) 
        ? prev.filter(s => s !== style)
        : [...prev, style]
    );
  };

  const toggleColor = (color: string) => {
    setSelectedColors(prev => 
      prev.includes(color) 
        ? prev.filter(c => c !== color)
        : [...prev, color]
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Personal Style Preferences
        </CardTitle>
        <CardDescription>
          Help us personalize your outfit recommendations based on your body type, location, and style preferences
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Body Type */}
        <div className="space-y-2">
          <Label htmlFor="body-type">Body Type</Label>
          <Select value={bodyType} onValueChange={setBodyType}>
            <SelectTrigger id="body-type">
              <SelectValue placeholder="Select your body type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Prefer not to say</SelectItem>
              {BODY_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Helps AI suggest outfits with better fit recommendations
          </p>
        </div>

        {/* Location */}
        <div className="space-y-2">
          <Label htmlFor="location" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Location (City)
          </Label>
          <Input
            id="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g., Stockholm, London, New York"
          />
          <p className="text-xs text-muted-foreground">
            Used for weather-based outfit suggestions
          </p>
        </div>

        {/* Style Preferences */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Style Preferences
          </Label>
          <div className="flex flex-wrap gap-2">
            {STYLE_PREFERENCES.map((style) => (
              <Badge
                key={style}
                variant={selectedStyles.includes(style) ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => toggleStyle(style)}
              >
                {style}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Select your favorite styles (click to toggle)
          </p>
        </div>

        {/* Favorite Colors */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Favorite Colors
          </Label>
          <div className="flex flex-wrap gap-2">
            {COLOR_OPTIONS.map((color) => (
              <Badge
                key={color}
                variant={selectedColors.includes(color) ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => toggleColor(color)}
              >
                {color}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Select your favorite colors for outfit palettes
          </p>
        </div>

        <Button 
          onClick={savePreferences} 
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Saving...' : 'Save Preferences'}
        </Button>
      </CardContent>
    </Card>
  );
};
