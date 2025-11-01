import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Save, Palette, Ruler, ShoppingBag, Calendar, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const styleOptions = [
  { value: 'casual', label: 'Casual', emoji: '👕' },
  { value: 'formal', label: 'Formal', emoji: '🤵' },
  { value: 'business', label: 'Business', emoji: '💼' },
  { value: 'sporty', label: 'Sporty', emoji: '⚽' },
  { value: 'bohemian', label: 'Bohemian', emoji: '🌺' },
  { value: 'minimalist', label: 'Minimalist', emoji: '⬜' },
  { value: 'vintage', label: 'Vintage', emoji: '📻' },
  { value: 'streetwear', label: 'Streetwear', emoji: '🛹' },
  { value: 'elegant', label: 'Elegant', emoji: '💎' },
  { value: 'romantic', label: 'Romantic', emoji: '🌹' },
];

const occasionOptions = [
  { value: 'work', label: 'Work/Office', emoji: '💼' },
  { value: 'date', label: 'Date Night', emoji: '❤️' },
  { value: 'party', label: 'Party', emoji: '🎉' },
  { value: 'casual', label: 'Casual Outings', emoji: '☕' },
  { value: 'wedding', label: 'Wedding', emoji: '💒' },
  { value: 'gym', label: 'Gym/Sports', emoji: '🏋️' },
  { value: 'travel', label: 'Travel', emoji: '✈️' },
  { value: 'beach', label: 'Beach', emoji: '🏖️' },
];

const bodyTypeOptions = [
  { value: 'rectangle', label: 'Rectangle' },
  { value: 'triangle', label: 'Triangle (Pear)' },
  { value: 'inverted_triangle', label: 'Inverted Triangle' },
  { value: 'hourglass', label: 'Hourglass' },
  { value: 'oval', label: 'Oval (Apple)' },
];

const colorPresets = [
  '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF',
  '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080',
  '#FFC0CB', '#A52A2A', '#808080', '#FFD700', '#4B0082',
];

const profileSchema = z.object({
  body_type: z.string().optional(),
  gender: z.string().optional(),
  style_preferences: z.array(z.string()).default([]),
  favorite_colors: z.array(z.string()).default([]),
  occasion_preferences: z.array(z.string()).default([]),
  size_top: z.string().optional(),
  size_bottom: z.string().optional(),
  size_shoes: z.string().optional(),
  size_dress: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export const StyleProfile = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      body_type: '',
      gender: '',
      style_preferences: [],
      favorite_colors: [],
      occasion_preferences: [],
      size_top: '',
      size_bottom: '',
      size_shoes: '',
      size_dress: '',
    },
  });

  // Load user profile
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast.error('Please sign in to access your style profile');
          return;
        }

        setUserId(user.id);

        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        if (data) {
          const stylePrefs = data.style_preferences;
          const favColors = data.favorite_colors;
          const occasionPrefs = data.occasion_preferences;
          const sizeInfo = data.size_information as any;

          form.reset({
            body_type: data.body_type || '',
            gender: data.gender || '',
            style_preferences: Array.isArray(stylePrefs) 
              ? stylePrefs as string[]
              : (typeof stylePrefs === 'string' ? JSON.parse(stylePrefs) : []),
            favorite_colors: Array.isArray(favColors)
              ? favColors as string[]
              : (typeof favColors === 'string' ? JSON.parse(favColors) : []),
            occasion_preferences: Array.isArray(occasionPrefs)
              ? occasionPrefs as string[]
              : [],
            size_top: sizeInfo?.top || '',
            size_bottom: sizeInfo?.bottom || '',
            size_shoes: sizeInfo?.shoes || '',
            size_dress: sizeInfo?.dress || '',
          });
        }
      } catch (error) {
        console.error('Error loading profile:', error);
        toast.error('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [form]);

  // Auto-save with debounce
  const autoSave = async (values: ProfileFormValues) => {
    if (!userId) return;

    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }

    const timeout = setTimeout(async () => {
      setSaving(true);
      try {
        const { error } = await supabase
          .from('profiles')
          .update({
            body_type: values.body_type || null,
            gender: values.gender || null,
            style_preferences: values.style_preferences,
            favorite_colors: values.favorite_colors,
            occasion_preferences: values.occasion_preferences,
            size_information: {
              top: values.size_top || null,
              bottom: values.size_bottom || null,
              shoes: values.size_shoes || null,
              dress: values.size_dress || null,
            },
          })
          .eq('user_id', userId);

        if (error) throw error;

        toast.success('Profile saved automatically', { duration: 2000 });
      } catch (error) {
        console.error('Error saving profile:', error);
        toast.error('Failed to save profile');
      } finally {
        setSaving(false);
      }
    }, 1000); // 1 second debounce

    setAutoSaveTimeout(timeout);
  };

  // Watch form changes for auto-save
  useEffect(() => {
    const subscription = form.watch((values) => {
      autoSave(values as ProfileFormValues);
    });
    return () => subscription.unsubscribe();
  }, [form, userId]);

  const toggleArrayValue = (
    field: 'style_preferences' | 'favorite_colors' | 'occasion_preferences',
    value: string
  ) => {
    const current = form.getValues(field) || [];
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    form.setValue(field, updated, { shouldValidate: true });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <User className="w-6 h-6 text-primary" />
                Style Profile
              </CardTitle>
              <CardDescription>
                Customize your style preferences for personalized outfit recommendations
              </CardDescription>
            </div>
            {saving && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      <Form {...form}>
        <form className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gender</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="non-binary">Non-binary</SelectItem>
                          <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="body_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Body Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select body type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {bodyTypeOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Helps us recommend flattering fits
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Style Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-primary" />
                Style Preferences
              </CardTitle>
              <CardDescription>
                Select all styles that resonate with you
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="style_preferences"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex flex-wrap gap-2">
                      {styleOptions.map((option) => {
                        const isSelected = field.value?.includes(option.value);
                        return (
                          <Badge
                            key={option.value}
                            variant={isSelected ? 'default' : 'outline'}
                            className={cn(
                              'cursor-pointer transition-all hover:scale-105',
                              isSelected && 'ring-2 ring-primary ring-offset-2'
                            )}
                            onClick={() => toggleArrayValue('style_preferences', option.value)}
                          >
                            <span className="mr-2">{option.emoji}</span>
                            {option.label}
                          </Badge>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Favorite Colors */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Palette className="w-5 h-5 text-primary" />
                Favorite Colors
              </CardTitle>
              <CardDescription>
                Choose colors you love to wear
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="favorite_colors"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex flex-wrap gap-3">
                      {colorPresets.map((color) => {
                        const isSelected = field.value?.includes(color);
                        return (
                          <button
                            key={color}
                            type="button"
                            className={cn(
                              'w-12 h-12 rounded-full transition-all hover:scale-110',
                              isSelected && 'ring-4 ring-primary ring-offset-2'
                            )}
                            style={{ backgroundColor: color }}
                            onClick={() => toggleArrayValue('favorite_colors', color)}
                            aria-label={`Select color ${color}`}
                          />
                        );
                      })}
                    </div>
                    {field.value && field.value.length > 0 && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-sm font-medium mb-2">Selected colors:</p>
                        <div className="flex flex-wrap gap-2">
                          {field.value.map((color) => (
                            <Badge
                              key={color}
                              variant="secondary"
                              className="gap-2"
                              onClick={() => toggleArrayValue('favorite_colors', color)}
                            >
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: color }}
                              />
                              {color}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Occasion Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Occasion Preferences
              </CardTitle>
              <CardDescription>
                What occasions do you dress for most often?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="occasion_preferences"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex flex-wrap gap-2">
                      {occasionOptions.map((option) => {
                        const isSelected = field.value?.includes(option.value);
                        return (
                          <Badge
                            key={option.value}
                            variant={isSelected ? 'default' : 'outline'}
                            className={cn(
                              'cursor-pointer transition-all hover:scale-105',
                              isSelected && 'ring-2 ring-primary ring-offset-2'
                            )}
                            onClick={() => toggleArrayValue('occasion_preferences', option.value)}
                          >
                            <span className="mr-2">{option.emoji}</span>
                            {option.label}
                          </Badge>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Size Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Ruler className="w-5 h-5 text-primary" />
                Size Information
              </CardTitle>
              <CardDescription>
                Helps us recommend the right sizes when shopping
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="size_top"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Top Size</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., M, L, XL" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="size_bottom"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bottom Size</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 32, 34, M" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="size_shoes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shoe Size</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 42, 9.5" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="size_dress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dress Size</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 8, M" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>
        </form>
      </Form>
    </div>
  );
};
