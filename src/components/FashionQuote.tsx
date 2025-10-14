import { Sparkles } from 'lucide-react';

const quotes = [
  "Discover your daily style",
  "Style is a way to say who you are without having to speak",
  "Fashion fades, but style is eternal",
  "Dress like you're already famous",
  "Your vibe attracts your tribe",
  "Elegance is the only beauty that never fades"
];

export const FashionQuote = () => {
  const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
  
  return (
    <div className="text-center py-8 animate-fade-in">
      <div className="inline-flex items-center gap-3">
        <Sparkles className="h-5 w-5 text-primary animate-pulse" />
        <p className="text-xl md:text-2xl font-serif italic text-primary">
          "{randomQuote}"
        </p>
        <Sparkles className="h-5 w-5 text-primary animate-pulse" />
      </div>
    </div>
  );
};
