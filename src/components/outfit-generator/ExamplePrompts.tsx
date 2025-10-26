import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Briefcase, Sun, Snowflake, Heart, PartyPopper } from 'lucide-react';

interface ExamplePromptsProps {
  onSelect: (prompt: string, mood?: string, occasion?: string) => void;
  disabled?: boolean;
}

const examplePrompts = [
  {
    icon: Briefcase,
    label: 'Business Meeting',
    prompt: 'Professional outfit for an important business meeting',
    mood: 'confident',
    occasion: 'work',
    color: 'from-blue-500/10 to-indigo-500/10',
    iconColor: 'text-blue-600',
  },
  {
    icon: Sun,
    label: 'Summer Casual',
    prompt: 'Light and breezy summer outfit for a casual day out',
    mood: 'relaxed',
    occasion: 'casual',
    color: 'from-yellow-500/10 to-orange-500/10',
    iconColor: 'text-yellow-600',
  },
  {
    icon: Snowflake,
    label: 'Cozy Winter',
    prompt: 'Warm and stylish winter outfit for cold weather',
    mood: 'cozy',
    occasion: 'casual',
    color: 'from-cyan-500/10 to-blue-500/10',
    iconColor: 'text-cyan-600',
  },
  {
    icon: Heart,
    label: 'Date Night',
    prompt: 'Elegant and stylish outfit for a romantic dinner',
    mood: 'romantic',
    occasion: 'date',
    color: 'from-pink-500/10 to-rose-500/10',
    iconColor: 'text-pink-600',
  },
  {
    icon: PartyPopper,
    label: 'Party Outfit',
    prompt: 'Fun and trendy outfit for a night out with friends',
    mood: 'energetic',
    occasion: 'party',
    color: 'from-purple-500/10 to-fuchsia-500/10',
    iconColor: 'text-purple-600',
  },
  {
    icon: Sparkles,
    label: 'Weekend Vibes',
    prompt: 'Comfortable yet stylish outfit for weekend activities',
    mood: 'casual',
    occasion: 'weekend',
    color: 'from-green-500/10 to-emerald-500/10',
    iconColor: 'text-green-600',
  },
];

export const ExamplePrompts = ({ onSelect, disabled }: ExamplePromptsProps) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-accent" aria-hidden="true" />
        <h3 className="text-sm font-semibold">Quick Start Ideas</h3>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {examplePrompts.map((example) => {
          const Icon = example.icon;
          return (
            <Card
              key={example.label}
              className={`
                cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] 
                bg-gradient-to-br ${example.color} border-primary/10
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
              onClick={() => !disabled && onSelect(example.prompt, example.mood, example.occasion)}
              role="button"
              tabIndex={disabled ? -1 : 0}
              aria-label={`Select ${example.label} prompt: ${example.prompt}`}
              aria-disabled={disabled}
              onKeyDown={(e) => {
                if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  onSelect(example.prompt, example.mood, example.occasion);
                }
              }}
            >
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-5 w-5 ${example.iconColor}`} aria-hidden="true" />
                    <h4 className="font-semibold text-sm">{example.label}</h4>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {example.mood}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {example.prompt}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground text-center pt-2">
        💡 Tip: Click any example to get started, or write your own custom prompt below
      </p>
    </div>
  );
};
