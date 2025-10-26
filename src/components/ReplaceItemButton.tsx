import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Sparkles } from 'lucide-react';
import { ClothingItem } from '@/types/outfit';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ReplaceItemButtonProps {
  itemToReplace: {
    id: string;
    category: string;
    color?: string;
    image_url?: string;
  };
  outfitId: string;
  allOutfitItems: any[];
  onReplaceComplete?: (newItem: ClothingItem) => void;
}

export const ReplaceItemButton = ({
  itemToReplace,
  outfitId,
  allOutfitItems,
  onReplaceComplete,
}: ReplaceItemButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [alternatives, setAlternatives] = useState<ClothingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ClothingItem | null>(null);
  const { toast } = useToast();

  const fetchAlternatives = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get all items in the same category, excluding current outfit items
      const currentItemIds = allOutfitItems.map((item) => item.id);
      
      const { data, error } = await supabase
        .from('clothes')
        .select('*')
        .eq('user_id', user.id)
        .eq('category', itemToReplace.category)
        .not('id', 'in', `(${currentItemIds.join(',')})`)
        .limit(6);

      if (error) throw error;

      setAlternatives((data as ClothingItem[]) || []);
      
      if (!data || data.length === 0) {
        toast({
          title: 'No alternatives found',
          description: `Upload more ${itemToReplace.category} items to see alternatives`,
          variant: 'default',
        });
      }
    } catch (error) {
      console.error('Error fetching alternatives:', error);
      toast({
        title: 'Error',
        description: 'Failed to load alternative items',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    fetchAlternatives();
  };

  const handleReplace = async () => {
    if (!selectedItem) return;

    try {
      // Update outfit in database with new item
      const { error } = await supabase
        .from('outfits')
        .update({
          recommended_clothes: allOutfitItems
            .map((item) => (item.id === itemToReplace.id ? selectedItem.id : item.id)),
          updated_at: new Date().toISOString(),
        })
        .eq('id', outfitId);

      if (error) throw error;

      toast({
        title: 'Item replaced!',
        description: `Successfully replaced ${itemToReplace.category}`,
      });

      onReplaceComplete?.(selectedItem);
      setIsOpen(false);
    } catch (error) {
      console.error('Error replacing item:', error);
      toast({
        title: 'Error',
        description: 'Failed to replace item',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleOpen}
        className="min-w-[44px] min-h-[44px]"
        aria-label={`Replace ${itemToReplace.category}`}
      >
        <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
        Replace
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent 
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          aria-describedby="replace-item-description"
        >
          <DialogHeader>
            <DialogTitle>Replace {itemToReplace.category}</DialogTitle>
            <DialogDescription id="replace-item-description">
              Select an alternative {itemToReplace.category} from your wardrobe to replace this item in the outfit
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center p-8" role="status" aria-live="polite">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" aria-hidden="true"></div>
              <span className="sr-only">Loading alternatives...</span>
            </div>
          ) : alternatives.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground" role="status">
              <p>No alternative {itemToReplace.category} items found.</p>
              <p className="text-sm mt-2">Upload more items to see alternatives.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {alternatives.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      'cursor-pointer rounded-lg overflow-hidden border-2 transition-all hover:shadow-md',
                      selectedItem?.id === item.id
                        ? 'border-primary ring-2 ring-primary/20'
                        : 'border-border hover:border-primary/50'
                    )}
                    onClick={() => setSelectedItem(item)}
                    role="button"
                    tabIndex={0}
                    aria-label={`Select ${item.category} in ${item.color}`}
                    aria-pressed={selectedItem?.id === item.id}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedItem(item);
                      }
                    }}
                  >
                    <div className="aspect-square relative bg-muted">
                      <img
                        src={item.image_url}
                        alt={`${item.category} in ${item.color}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      {selectedItem?.id === item.id && (
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                          <Badge className="bg-primary text-primary-foreground">
                            <Sparkles className="h-3 w-3 mr-1" aria-hidden="true" />
                            Selected
                          </Badge>
                        </div>
                      )}
                    </div>
                    <div className="p-2 space-y-1">
                      <p className="text-sm font-medium capitalize">{item.category}</p>
                      {item.color && (
                        <p className="text-xs text-muted-foreground capitalize">{item.color}</p>
                      )}
                      {item.style && (
                        <Badge variant="secondary" className="text-xs">
                          {item.style}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleReplace}
                  disabled={!selectedItem}
                  className="flex-1 min-h-[44px]"
                  aria-label="Confirm item replacement"
                >
                  <Sparkles className="h-4 w-4 mr-2" aria-hidden="true" />
                  Replace with Selected
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  className="min-h-[44px]"
                  aria-label="Cancel replacement"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
