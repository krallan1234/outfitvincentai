import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold">Outfit AI</h1>
        <p className="text-xl text-muted-foreground">Upload your clothes and get AI-powered outfit suggestions</p>
        <div className="flex gap-4 justify-center">
          <Button onClick={() => navigate('/dashboard')} size="lg">
            Manage Wardrobe
          </Button>
          <Button onClick={() => navigate('/outfits')} variant="outline" size="lg">
            Generate Outfits
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
