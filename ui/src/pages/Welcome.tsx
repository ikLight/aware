import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

const Welcome = () => {
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuth();

  // Handle back button and prevent accessing welcome page when logged in
  useEffect(() => {
    const handleBackButton = async () => {
      if (isAuthenticated) {
        await logout();
        navigate('/login');
      }
    };

    handleBackButton();

    window.addEventListener('popstate', handleBackButton);
    return () => {
      window.removeEventListener('popstate', handleBackButton);
    };
  }, [isAuthenticated, logout, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 page-transition">
      {/* Logout Button */}
      {isAuthenticated && (
        <div className="absolute top-6 right-6">
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              await logout();
              navigate('/login');
            }}
            className="rounded-full px-4 py-2"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      )}
      
      <div className="max-w-2xl w-full text-center space-y-8">
        {/* Hero Icon */}
        <div className="flex justify-center mb-8">
          <div className="bg-primary-light/30 rounded-full p-8">
            <Sparkles className="w-20 h-20 text-primary" />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-4">
          <h1 className="text-5xl font-medium text-foreground">
            Welcome to Aware
          </h1>
          <p className="text-xl text-muted-foreground">
            Your AI-powered study coach that helps you learn smarter, not harder.
          </p>
        </div>

        {/* Description */}
        <div className="bg-card rounded-2xl shadow-lg p-8 border border-border">
          <p className="text-lg text-foreground/80">
            Upload your material, take a quick test, and get a personalized study plan made just for you.
          </p>
        </div>

        {/* Next Button */}
        <div className="pt-8">
          {!isAuthenticated ? (
            <Button
              size="lg"
              onClick={() => navigate("/login")}
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-8 py-6 text-lg shadow-lg hover:shadow-xl transition-all"
            >
              Login
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          ) : (
            <Button
              size="lg"
              onClick={() => navigate("/upload")}
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-8 py-6 text-lg shadow-lg hover:shadow-xl transition-all"
            >
              Get Started
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Welcome;
