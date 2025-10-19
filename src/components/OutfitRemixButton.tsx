import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Shuffle, Sparkles } from 'lucide-react';
import { useOutfits } from '@/hooks/useOutfits';
import { toast } from '@/hooks/use-toast';

interface OutfitRemixButtonProps {
  outfit: {
    id: string;
    title: string;
    prompt: string;
    mood?: string | null;
    recommended_clothes?: any;
  };
  variant?: 'default' | 'outline' | 'ghost';
}

export const OutfitRemixButton = ({ outfit, variant = 'outline' }: OutfitRemixButtonProps) => {
  const [open, setOpen] = useState(false);
  const [remixPrompt, setRemixPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const { generateOutfit } = useOutfits();

  const remixSuggestions = [
    "Make it more casual",
    "Change to evening wear",
    "Add more color",
    "Make it business professional",
    "Convert to summer style",
    "Make it minimalist"
  ];

  const handleRemix = async (customPrompt?: string) => {
    setLoading(true);
    try {
      const basePrompt = customPrompt || remixPrompt;
      const fullPrompt = `Remix this outfit: "${outfit.prompt}". Modification: ${basePrompt}. Keep the same overall vibe but make these changes.`;
      
      await generateOutfit(fullPrompt, outfit.mood || undefined, true);
      
      toast({
        title: "Outfit remixed!",
        description: "Your remixed outfit has been created"
      });
      setOpen(false);
      setRemixPrompt('');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remix outfit",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size="sm">
          <Shuffle className="w-4 h-4 mr-2" />
          Remix
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Remix Outfit
          </DialogTitle>
          <DialogDescription>
            Create a variation of "{outfit.title}" with your own twist
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Quick Remix Ideas</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {remixSuggestions.map((suggestion) => (
                <Button
                  key={suggestion}
                  variant="outline"
                  size="sm"
                  onClick={() => handleRemix(suggestion)}
                  disabled={loading}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          <div>
            <Label htmlFor="remix-prompt">Custom Remix Instructions</Label>
            <Textarea
              id="remix-prompt"
              placeholder="Describe how you want to remix this outfit... (e.g., 'make it more colorful with accessories')"
              value={remixPrompt}
              onChange={(e) => setRemixPrompt(e.target.value)}
              rows={4}
              className="mt-2"
            />
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={() => handleRemix()}
              disabled={!remixPrompt.trim() || loading}
              className="flex-1"
            >
              {loading ? "Remixing..." : "Generate Remix"}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};