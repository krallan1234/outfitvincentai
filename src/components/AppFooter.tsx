import { Sparkles } from 'lucide-react';

export const AppFooter = () => {
  return (
    <footer className="border-t bg-muted/30 mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="font-semibold">OOTD</span>
          </div>
          
          <p className="text-sm text-muted-foreground text-center">
            Built with love for fashion enthusiasts
          </p>
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <a href="/policy" className="hover:text-primary transition-colors">Privacy</a>
            <span>·</span>
            <span>© 2025 OOTD</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
