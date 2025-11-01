import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Sparkles, Loader2, RefreshCw } from 'lucide-react';

interface ResultControlsProps {
  loading: boolean;
  canGenerate: boolean;
  hasResult: boolean;
  shouldGenerateImage: boolean;
  onGenerate: () => void;
  onRegenerate: () => void;
  onRandomize: () => void;
  onImageGenerationToggle: (checked: boolean) => void;
}

export const ResultControls = ({
  loading,
  canGenerate,
  hasResult,
  shouldGenerateImage,
  onGenerate,
  onRegenerate,
  onRandomize,
  onImageGenerationToggle,
}: ResultControlsProps) => {
  return (
    <div className="space-y-4">
      {/* Image Generation Option */}
      <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg">
        <Checkbox
          id="generate-image"
          checked={shouldGenerateImage}
          onCheckedChange={(checked) => onImageGenerationToggle(checked as boolean)}
          disabled={loading}
        />
        <div className="flex-1">
          <Label htmlFor="generate-image" className="cursor-pointer font-medium">
            Generera AI-bild av outfit
          </Label>
          <p className="text-xs text-muted-foreground mt-1">
            Skapar en stiliserad bild av outfiten. Snabbare och billigare utan bild.
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        {/* Randomize Button */}
        <Button
          onClick={onRandomize}
          disabled={loading}
          variant="outline"
          size="icon"
          className="px-4"
          title="Överraska mig med en slumpmässig outfit"
        >
          🎲
        </Button>

        <Button
          onClick={onGenerate}
          className="flex-1"
          disabled={!canGenerate || loading}
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

        {hasResult && (
          <Button
            onClick={onRegenerate}
            variant="outline"
            disabled={loading}
            title="Regenerate with more variety - creates a different outfit combination"
            className="px-3"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};
