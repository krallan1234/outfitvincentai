import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Sparkles, Upload, Users, User } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const features = [
    {
      icon: Upload,
      title: "Upload Your Wardrobe",
      description: "Take photos of your clothes and let AI organize them",
      action: () => navigate('/dashboard'),
      buttonText: "Manage Wardrobe"
    },
    {
      icon: Sparkles,
      title: "Daily Outfit Generation",
      description: "Get personalized outfit suggestions for every day",
      action: () => navigate('/outfits'),
      buttonText: "Generate Outfits"
    },
    {
      icon: Users,
      title: "Community Inspiration",
      description: "Browse and like outfits shared by the community",
      action: () => navigate('/community'),
      buttonText: "Explore Community"
    },
    {
      icon: User,
      title: "Personal Profile",
      description: "Track your style preferences and favorite looks",
      action: () => navigate('/profile'),
      buttonText: "View Profile"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-24 sm:py-32">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight mb-6">
              Your AI-Powered
              <span className="text-primary block">Style Assistant</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Upload your clothes, get personalized outfit suggestions, and discover new styles with the power of artificial intelligence.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {isAuthenticated ? (
                <Button onClick={() => navigate('/dashboard')} size="lg" className="text-lg px-8">
                  <Upload className="mr-2 h-5 w-5" />
                  Start Building Your Wardrobe
                </Button>
              ) : (
                <Button onClick={() => navigate('/auth')} size="lg" className="text-lg px-8">
                  Get Started Free
                </Button>
              )}
              <Button onClick={() => navigate('/community')} variant="outline" size="lg" className="text-lg px-8">
                <Users className="mr-2 h-5 w-5" />
                Explore Community
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Everything You Need for Perfect Outfits</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              From wardrobe management to AI-powered styling, we've got all the tools to elevate your fashion game.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <div key={index} className="bg-background rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="mb-4">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg">
                      <IconComponent className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground mb-4">{feature.description}</p>
                  <Button 
                    onClick={feature.action} 
                    variant="outline" 
                    className="w-full"
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
        <section className="py-24">
          <div className="container mx-auto px-4">
            <div className="bg-primary/5 rounded-2xl p-12 text-center">
              <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Style?</h2>
              <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
                Join thousands of users who have already discovered their perfect style with AI assistance.
              </p>
              <Button onClick={() => navigate('/auth')} size="lg" className="text-lg px-8">
                Sign Up Now - It's Free
              </Button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default Index;
