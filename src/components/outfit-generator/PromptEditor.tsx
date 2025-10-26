import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface PromptEditorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export const PromptEditor = ({ value, onChange, disabled = false }: PromptEditorProps) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="prompt">Describe Your Outfit</Label>
      <Textarea
        id="prompt"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g., 'Formal office wear in blue tones' or 'Casual summer outfit for a picnic'"
        rows={3}
        disabled={disabled}
        aria-label="Outfit description"
      />
    </div>
  );
};
