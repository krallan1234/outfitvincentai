import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, ArrowRight, Lightbulb } from 'lucide-react';

interface TooltipStep {
  id: string;
  target: string;
  title: string;
  description: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

const ONBOARDING_STEPS: TooltipStep[] = [
  {
    id: 'welcome',
    target: 'quick-ideas',
    title: 'Welcome to AI Outfit Generator!',
    description: 'Start here for quick outfit inspiration. Click any idea to auto-fill your prompt.',
    position: 'bottom'
  },
  {
    id: 'preferences',
    target: 'preferences-section',
    title: 'Personalize Your Experience',
    description: 'Set your body type, location, and style preferences for smarter outfit suggestions.',
    position: 'bottom'
  },
  {
    id: 'weather',
    target: 'weather-widget',
    title: 'Weather-Based Suggestions',
    description: 'AI considers current weather to recommend appropriate outfits!',
    position: 'bottom'
  },
  {
    id: 'mood-selector',
    target: 'mood-selector',
    title: 'Advanced Mood Selection',
    description: 'Choose from categories and specific occasions for perfect outfit recommendations.',
    position: 'top'
  },
  {
    id: 'multi-select',
    target: 'clothes-gallery',
    title: 'Multi-Select Items',
    description: 'Select multiple items from your wardrobe to build outfits around them.',
    position: 'top'
  }
];

interface OnboardingTooltipsProps {
  onComplete: () => void;
}

export const OnboardingTooltips = ({ onComplete }: OnboardingTooltipsProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [show, setShow] = useState(true);

  useEffect(() => {
    // Scroll to target element
    const step = ONBOARDING_STEPS[currentStep];
    const element = document.getElementById(step.target);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Highlight the element
      element.style.outline = '2px solid hsl(var(--primary))';
      element.style.outlineOffset = '4px';
      element.style.transition = 'outline 0.3s ease';

      return () => {
        element.style.outline = '';
        element.style.outlineOffset = '';
      };
    }
  }, [currentStep]);

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    setShow(false);
    onComplete();
  };

  if (!show) return null;

  const step = ONBOARDING_STEPS[currentStep];

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      <div className="absolute inset-0 bg-black/20 pointer-events-auto" onClick={handleSkip} />
      
      <Card className="fixed bottom-4 right-4 w-80 pointer-events-auto shadow-xl border-2 border-primary animate-in slide-in-from-bottom">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">{step.title}</h3>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleSkip}
              aria-label="Skip onboarding"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <p className="text-sm text-muted-foreground">{step.description}</p>
          
          <div className="flex items-center justify-between pt-2">
            <div className="flex gap-1">
              {ONBOARDING_STEPS.map((_, index) => (
                <div
                  key={index}
                  className={`h-1.5 w-6 rounded-full transition-colors ${
                    index === currentStep ? 'bg-primary' : 'bg-muted'
                  }`}
                  aria-label={`Step ${index + 1} of ${ONBOARDING_STEPS.length}`}
                />
              ))}
            </div>
            
            <Button
              size="sm"
              onClick={handleNext}
              className="gap-1"
              aria-label={currentStep < ONBOARDING_STEPS.length - 1 ? 'Next tip' : 'Finish onboarding'}
            >
              {currentStep < ONBOARDING_STEPS.length - 1 ? (
                <>
                  Next <ArrowRight className="h-3 w-3" />
                </>
              ) : (
                'Got it!'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
