import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { QUICK_PROMPTS } from '@/types/generator';

interface QuickPromptsProps {
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}

export const QuickPrompts = ({ onSelect, disabled = false }: QuickPromptsProps) => {
  return (
    <div className="space-y-2" id="quick-ideas">
      <Label htmlFor="quick-ideas-section">Quick Ideas</Label>
      <div
        className="flex flex-wrap gap-2"
        id="quick-ideas-section"
        role="group"
        aria-label="Quick outfit idea buttons"
      >
        {QUICK_PROMPTS.map((prompt) => (
          <Button
            key={prompt}
            variant="outline"
            size="sm"
            onClick={() => onSelect(prompt)}
            className="text-xs"
            disabled={disabled}
          >
            {prompt}
          </Button>
        ))}
      </div>
    </div>
  );
};
