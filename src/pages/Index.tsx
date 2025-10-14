import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Sparkles, Upload, Users, Zap, Heart } from "lucide-react";
import { FashionQuote } from '@/components/FashionQuote';
import { WavyDivider } from '@/components/WavyDivider';

const Index = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const features = [
    {
      icon: Upload,
      title: "Upload Your Wardrobe",
      description: "Snap photos of your clothes and organize them beautifully",
      action: () => navigate('/dashboard'),
      buttonText: "Manage Wardrobe",
      color: "from-primary to-primary/70"
    },
    {
      icon: Sparkles,
      title: "Daily Outfit Generation",
      description: "Get personalized outfit suggestions tailored to your style and mood",
      action: () => navigate('/outfits'),
      buttonText: "Generate Outfits",
      color: "from-accent to-accent/70"
    },
    {
      icon: Users,
      title: "Community Inspiration",
      description: "Browse and like outfits shared by fashion enthusiasts worldwide",
      action: () => navigate('/community'),
      buttonText: "Explore Community",
      color: "from-accent/90 to-primary/90"
    }
  ];

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Hero Section with Full-Width Image */}
      <section className="relative min-h-[700px] flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img 
            src="/images/hero-wardrobe.jpg" 
            alt="Elegant wardrobe styling inspiration with warm natural tones"
            className="w-full h-full object-cover animate-scale-in"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/60 to-background"></div>
        </div>

        <div className="container relative z-10 mx-auto px-4">
          <div className="text-center max-w-4xl mx-auto space-y-8 animate-fade-in-up">
            <h1 className="text-5xl sm:text-6xl lg:text-8xl font-bold tracking-tight drop-shadow-2xl font-serif">
              Transform Your Wardrobe with OOTD
            </h1>
            
            <FashionQuote />
            
            <p className="text-xl sm:text-2xl text-foreground/90 max-w-2xl mx-auto leading-relaxed drop-shadow-lg">
              Your personal styling companion for every day. Build your wardrobe, create stunning outfits, and discover your unique style.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              {isAuthenticated ? (
                <Button 
                  onClick={() => navigate('/dashboard')} 
                  size="lg" 
                  className="warm-button text-lg shadow-2xl"
                >
                  <Upload className="mr-2 h-5 w-5" />
                  Start Building Your Wardrobe
                </Button>
              ) : (
                <Button 
                  onClick={() => navigate('/auth')} 
                  size="lg" 
                  className="warm-button text-lg shadow-2xl"
                >
                  Get Started Free
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      <WavyDivider />

      {/* Rest of content */}
      <div className="bg-gradient-to-b from-background via-muted/30 to-background">
        {/* Features Section */}
        <section className="py-20 sm:py-24">
          <div className="container mx-auto px-4">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Everything You Need for Perfect Outfits</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              From wardrobe management to personalized styling, we've got all the tools to elevate your fashion game.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <div 
                  key={index} 
                  className="group card-elegant bg-card rounded-2xl p-6 hover:scale-105 transition-all duration-300 animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="mb-4">
                    <div className={`inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br ${feature.color} rounded-xl shadow-lg`}>
                      <IconComponent className="h-7 w-7 text-white" />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground mb-6 leading-relaxed">{feature.description}</p>
                  <Button 
                    onClick={feature.action} 
                    variant="outline" 
                    className="w-full group-hover:bg-primary/10 group-hover:border-primary/30 transition-all"
                    disabled={!isAuthenticated && feature.title !== "Community Inspiration"}
                  >
                    {feature.buttonText}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {!isAuthenticated && (
        <section className="py-20 sm:py-24">
          <div className="container mx-auto px-4">
            <div className="relative card-elegant bg-gradient-to-br from-primary/10 via-accent/10 to-primary/10 rounded-3xl p-10 sm:p-16 text-center overflow-hidden">
              <div className="relative z-10">
                <Heart className="h-12 w-12 mx-auto mb-6 text-accent" />
                <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to Transform Your Style?</h2>
                <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
                  Join thousands of users who have already discovered their perfect style. Start your fashion journey today.
                </p>
                <Button 
                  onClick={() => navigate('/auth')} 
                  size="lg" 
                  className="text-lg px-10 btn-gradient shadow-xl hover:shadow-2xl"
                >
                  <Zap className="mr-2 h-5 w-5" />
                  Sign Up Now - It's Free
                </Button>
              </div>
              
              {/* Decorative Background */}
              <div className="absolute inset-0 opacity-30">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent rounded-full blur-3xl"></div>
              </div>
            </div>
          </div>
        </section>
      )}
      </div>
    </div>
  );
};

export default Index;
