import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, TrendingUp, AlertCircle } from "lucide-react";

const Result = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const score = location.state?.score || 0;

  const weakAreas = [
    "Definitions and key concepts",
    "Core principles and fundamentals",
  ];

  return (
    <div className="min-h-screen flex flex-col page-transition">
      {/* Back Button */}
      <div className="p-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/test")}
          className="rounded-full"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="max-w-2xl w-full space-y-8">
          {/* Title */}
          <div className="text-center space-y-3">
            <div className="flex justify-center mb-4">
              <div className="bg-accent-light/30 rounded-full p-6">
                <TrendingUp className="w-16 h-16 text-accent" />
              </div>
            </div>
            <h1 className="text-4xl font-medium text-foreground">
              You're in the Beginner Level!
            </h1>
            <p className="text-lg text-muted-foreground">
              Based on your results, we'll focus on building your foundational understanding.
            </p>
          </div>

          {/* Results Card */}
          <div className="bg-card rounded-2xl shadow-lg border border-border overflow-hidden">
            {/* Score Section */}
            <div className="bg-primary-light/20 p-8 text-center">
              <p className="text-sm text-muted-foreground mb-2">Your Score</p>
              <p className="text-6xl font-medium text-primary mb-2">
                {Math.round(score)}%
              </p>
              <p className="text-sm text-foreground/70">
                {score >= 70 ? "Great start!" : score >= 40 ? "Good effort!" : "You've got this!"}
              </p>
            </div>

            {/* Weak Areas */}
            <div className="p-8 space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-5 h-5 text-accent" />
                <h3 className="text-lg font-medium text-foreground">
                  Areas to Focus On
                </h3>
              </div>
              <ul className="space-y-2">
                {weakAreas.map((area, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 p-3 bg-secondary rounded-lg"
                  >
                    <span className="w-2 h-2 bg-accent rounded-full mt-2" />
                    <span className="text-foreground/80">{area}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Encouragement */}
            <div className="bg-accent-light/20 p-6 text-center">
              <p className="text-foreground/80 italic">
                "You're off to a great start — let's make learning easier."
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="p-6 flex justify-center">
        <Button
          size="lg"
          onClick={() => navigate("/study-plan")}
          className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-8 py-6 text-lg shadow-lg hover:shadow-xl transition-all"
        >
          Next: View Study Plan
          <ArrowRight className="ml-2 w-5 h-5" />
        </Button>
      </div>
    </div>
  );
};

export default Result;
