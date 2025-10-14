import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Sparkles, Upload, Users, User, Zap, Heart, Calendar } from "lucide-react";

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
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: Sparkles,
      title: "Daily Outfit Generation",
      description: "Get personalized outfit suggestions tailored to your style and mood",
      action: () => navigate('/outfits'),
      buttonText: "Generate Outfits",
      color: "from-purple-500 to-pink-500"
    },
    {
      icon: Calendar,
      title: "Smart Planning",
      description: "Schedule outfits and create packing lists for any occasion",
      action: () => navigate('/planner'),
      buttonText: "Plan Outfits",
      color: "from-green-500 to-emerald-500"
    },
    {
      icon: Users,
      title: "Community Inspiration",
      description: "Browse and like outfits shared by fashion enthusiasts worldwide",
      action: () => navigate('/community'),
      buttonText: "Explore Community",
      color: "from-orange-500 to-red-500"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/30 to-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-4xl mx-auto animate-fade-in-up">
            <div className="inline-flex items-center justify-center p-2 mb-6 rounded-full bg-primary/10 border border-primary/20">
              <Sparkles className="h-6 w-6 text-primary mr-2" />
              <span className="text-sm font-medium text-primary">Your Personal Fashion Assistant</span>
            </div>
            
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6 bg-gradient-to-r from-foreground via-primary to-accent bg-clip-text text-transparent">
              Your Personal Outfit Of The Day Assistant
            </h1>
            
            <p className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              Transform your wardrobe into endless outfit possibilities. Upload your clothes, get personalized suggestions, and discover your perfect style.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {isAuthenticated ? (
                <Button 
                  onClick={() => navigate('/dashboard')} 
                  size="lg" 
                  className="text-lg px-8 btn-gradient shadow-lg hover:shadow-xl"
                >
                  <Upload className="mr-2 h-5 w-5" />
                  Start Building Your Wardrobe
                </Button>
              ) : (
                <Button 
                  onClick={() => navigate('/auth')} 
                  size="lg" 
                  className="text-lg px-8 btn-gradient shadow-lg hover:shadow-xl"
                >
                  <Zap className="mr-2 h-5 w-5" />
                  Get Started Free
                </Button>
              )}
              <Button 
                onClick={() => navigate('/community')} 
                variant="outline" 
                size="lg" 
                className="text-lg px-8 border-2 hover:bg-muted/50"
              >
                <Users className="mr-2 h-5 w-5" />
                Explore Community
              </Button>
            </div>
          </div>
        </div>
        
        {/* Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-full -z-10 overflow-hidden">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>
      </section>

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

      {/* Stats Section */}
      <section className="py-16 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: "10K+", label: "Active Users" },
              { value: "50K+", label: "Outfits Created" },
              { value: "100K+", label: "Items Uploaded" },
              { value: "4.9", label: "Average Rating" }
            ].map((stat, index) => (
              <div key={index} className="animate-scale-in" style={{ animationDelay: `${index * 100}ms` }}>
                <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
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
  );
};

export default Index;
