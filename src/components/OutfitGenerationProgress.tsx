import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, Search, Palette, Lightbulb } from 'lucide-react';

interface OutfitGenerationProgressProps {
  step: number;
  tip: string;
}

const STEPS = [
  { 
    id: 1, 
    label: 'Analyzing wardrobe',
    icon: Search,
    progress: 25 
  },
  { 
    id: 2, 
    label: 'Fetching Pinterest trends',
    icon: Sparkles,
    progress: 50 
  },
  { 
    id: 3, 
    label: 'AI processing',
    icon: Palette,
    progress: 75 
  },
  { 
    id: 4, 
    label: 'Finalizing outfit',
    icon: Lightbulb,
    progress: 100 
  },
];

export const OutfitGenerationProgress = ({ step, tip }: OutfitGenerationProgressProps) => {
  const currentStep = STEPS[step - 1] || STEPS[0];
  const Icon = currentStep.icon;
  
  return (
    <Card className="w-full border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-primary/10">
            <Icon className="h-5 w-5 text-primary animate-pulse" />
          </div>
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium">{currentStep.label}</p>
            <p className="text-xs text-muted-foreground">{tip}</p>
          </div>
        </div>
        
        <div className="space-y-2">
          <Progress value={currentStep.progress} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Step {step} of {STEPS.length}</span>
            <span>{currentStep.progress}%</span>
          </div>
        </div>
        
        {/* Step indicators */}
        <div className="flex justify-between pt-2">
          {STEPS.map((s) => {
            const StepIcon = s.icon;
            return (
              <div 
                key={s.id} 
                className={`flex flex-col items-center gap-1 ${
                  s.id <= step ? 'opacity-100' : 'opacity-30'
                }`}
              >
                <div className={`p-1.5 rounded-full ${
                  s.id <= step ? 'bg-primary/20' : 'bg-muted'
                }`}>
                  <StepIcon className={`h-3 w-3 ${
                    s.id <= step ? 'text-primary' : 'text-muted-foreground'
                  }`} />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
