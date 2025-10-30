import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { QUICK_PROMPTS_CATEGORIZED } from '@/types/generator';

interface QuickPromptsProps {
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}

export const QuickPrompts = ({ onSelect, disabled = false }: QuickPromptsProps) => {
  return (
    <div className="space-y-4" id="quick-ideas">
      <Label htmlFor="quick-ideas-section" className="text-base font-semibold">
        Quick Ideas
      </Label>
      <div className="space-y-4">
        {Object.entries(QUICK_PROMPTS_CATEGORIZED).map(([category, prompts]) => (
          <div key={category} className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">{category}</h3>
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-label={`${category} outfit ideas`}
            >
              {prompts.map((prompt) => (
                <Button
                  key={prompt}
                  variant="outline"
                  size="sm"
                  onClick={() => onSelect(prompt)}
                  className="text-xs transition-all hover:scale-105 hover:shadow-md"
                  disabled={disabled}
                >
                  {prompt}
                </Button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
