import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { GraduationCap } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate("/upload");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="container max-w-4xl mx-auto px-6 py-20 text-center">
        {/* Logo/Brand */}
        <div className="mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-primary rounded-2xl mb-6 shadow-soft">
            <GraduationCap className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-6xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-8">
            Aware
          </h1>
        </div>

        {/* Main Message */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-6 leading-relaxed">
            Your AI study partner — upload, assess, and learn with a plan.
          </h2>
          <p className="text-xl text-muted-foreground flex items-center justify-center gap-2">
            <span>✨</span>
            <span>Aware helps you study — never to cheat</span>
          </p>
        </div>

        {/* CTA */}
        <Button 
          size="lg" 
          onClick={handleGetStarted}
          className="px-12 py-6 text-xl font-semibold shadow-soft hover:shadow-hover transition-all duration-300"
        >
          Get Started
        </Button>
      </div>
    </div>
  );
};

export default Index;
