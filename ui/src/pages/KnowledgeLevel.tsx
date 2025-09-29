import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BookOpen, GraduationCap, Award, Menu } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const KnowledgeLevel = () => {
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const navigate = useNavigate();

  const levels = [
    {
      id: "beginner",
      emoji: "📘",
      icon: BookOpen,
      title: "Beginner",
      description: "I'm new or lost.",
      bgColor: "bg-beginner",
      hoverColor: "hover:bg-beginner-accent",
      borderColor: "border-beginner-accent"
    },
    {
      id: "intermediate", 
      emoji: "📗",
      icon: GraduationCap,
      title: "Intermediate",
      description: "I know some basics.",
      bgColor: "bg-intermediate",
      hoverColor: "hover:bg-intermediate-accent", 
      borderColor: "border-intermediate-accent"
    },
    {
      id: "confident",
      emoji: "📕", 
      icon: Award,
      title: "Confident",
      description: "I mostly get it; want to sharpen.",
      bgColor: "bg-confident",
      hoverColor: "hover:bg-confident-accent",
      borderColor: "border-confident-accent"
    }
  ];

  const handleStartCheck = () => {
    // Placeholder action
    alert("Knowledge check feature coming soon! 🚀");
  };

  const handleMenuClick = () => {
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            How much do you know about this material?
          </h1>
          <p className="text-xl text-muted-foreground">
            Pick the option that best matches your current knowledge.
          </p>
        </div>

        {/* Knowledge Level Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {levels.map((level) => {
            const IconComponent = level.icon;
            const isSelected = selectedLevel === level.id;
            
            return (
              <Card
                key={level.id}
                className={`
                  p-8 text-center cursor-pointer transition-all duration-300 border-2 shadow-card
                  ${level.bgColor} ${level.hoverColor}
                  ${isSelected 
                    ? `${level.borderColor} shadow-hover scale-105` 
                    : 'border-transparent hover:scale-102'
                  }
                `}
                onClick={() => setSelectedLevel(level.id)}
              >
                <div className="mb-6">
                  <div className="text-6xl mb-4">{level.emoji}</div>
                  <IconComponent className="w-12 h-12 text-foreground mx-auto" />
                </div>
                
                <h3 className="text-2xl font-bold text-foreground mb-3">
                  {level.title}
                </h3>
                
                <p className="text-lg text-foreground/80">
                  {level.description}
                </p>
              </Card>
            );
          })}
        </div>

        {/* CTA Buttons */}
        <div className="text-center space-y-4">
          <Button 
            size="lg" 
            onClick={handleStartCheck}
            className="px-8 py-4 text-lg font-semibold shadow-soft hover:shadow-hover"
          >
            Start Quick Knowledge Check
          </Button>
          
          <div>
            <Button 
              variant="outline"
              size="lg"
              onClick={handleMenuClick}
              className="px-6 py-3 text-base font-medium"
            >
              <Menu className="w-4 h-4 mr-2" />
              Menu
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeLevel;