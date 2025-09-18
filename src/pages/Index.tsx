import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const navigate = useNavigate();
  const { isAuthenticated, signOut, user } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-6">
        <div className="absolute top-4 right-4">
          {isAuthenticated ? (
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                Welcome, {user?.email}
              </span>
              <Button onClick={handleSignOut} variant="outline" size="sm">
                Sign Out
              </Button>
            </div>
          ) : (
            <Button onClick={() => navigate('/auth')} variant="outline" size="sm">
              Sign In
            </Button>
          )}
        </div>
        
        <h1 className="text-4xl font-bold">Outfit AI</h1>
        <p className="text-xl text-muted-foreground">Upload your clothes and get AI-powered outfit suggestions</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button onClick={() => navigate('/dashboard')} size="lg">
            Manage Wardrobe
          </Button>
          <Button onClick={() => navigate('/outfits')} variant="outline" size="lg">
            Generate Outfits
          </Button>
          <Button onClick={() => navigate('/community')} variant="outline" size="lg">
            Community
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
