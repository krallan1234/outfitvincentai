import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';

interface Example {
  text: string;
  mood?: string;
  icon: string;
}

const INSPIRATION_EXAMPLES: Example[] = [
  { text: 'Urban street för hösten', mood: 'edgy', icon: '🏙️' },
  { text: 'Date night chic', mood: 'romantic', icon: '❤️' },
  { text: 'Somrig stil med pasteller', mood: 'cheerful', icon: '🌸' },
  { text: 'Business casual för möte', mood: 'professional', icon: '💼' },
  { text: 'Cozy weekend vibes', mood: 'relaxed', icon: '☕' },
  { text: 'Elegant kvällsoutfit', mood: 'confident', icon: '✨' },
  { text: 'Sportig minimalism', mood: 'energetic', icon: '⚡' },
];

interface InspirationExamplesProps {
  onSelect: (text: string, mood?: string) => void;
  disabled?: boolean;
}

export const InspirationExamples = ({ onSelect, disabled = false }: InspirationExamplesProps) => {
  return (
    <div className="space-y-3 p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
        <h3 className="font-semibold text-purple-900 dark:text-purple-100">
          💡 Inspiration
        </h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {INSPIRATION_EXAMPLES.map((example, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            onClick={() => onSelect(example.text, example.mood)}
            disabled={disabled}
            className="text-sm hover:bg-purple-100 dark:hover:bg-purple-900/50 border-purple-300 dark:border-purple-700"
          >
            <span className="mr-1.5">{example.icon}</span>
            {example.text}
          </Button>
        ))}
      </div>
    </div>
  );
};
