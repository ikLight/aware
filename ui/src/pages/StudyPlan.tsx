import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Calendar, Target, BookOpen, Brain, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const StudyPlan = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentDay, setCurrentDay] = useState(1);
  const [reflection, setReflection] = useState("");
  const [dayCompleted, setDayCompleted] = useState(false);

  const handleMarkComplete = () => {
    if (!reflection.trim()) {
      toast({
        title: "Please add a reflection",
        description: "Share what you learned today before marking complete.",
        variant: "destructive",
      });
      return;
    }

    setDayCompleted(true);
    toast({
      title: `Day ${currentDay} Complete! 🎉`,
      description: "Great work! Keep building momentum.",
    });

    // Progress to next day after a short delay
    setTimeout(() => {
      if (currentDay < 5) {
        setCurrentDay(currentDay + 1);
        setReflection("");
        setDayCompleted(false);
      }
    }, 1500);
  };

  const progressPercentage = (currentDay / 5) * 100;

  return (
    <div className="min-h-screen flex flex-col page-transition pb-24">
      {/* Back Button */}
      <div className="p-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/result")}
          className="rounded-full"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center p-6">
        <div className="max-w-3xl w-full space-y-8">
          {/* Title */}
          <div className="text-center space-y-3">
            <h1 className="text-4xl font-medium text-foreground">
              Your Beginner Study Plan
            </h1>
            <p className="text-lg text-muted-foreground">
              A simple, 5-day personalized path to master your basics.
            </p>
          </div>

          {/* Overview Card */}
          <div className="bg-gradient-to-br from-primary-light/20 to-accent-light/20 rounded-2xl shadow-lg p-8 border border-border">
            <div className="flex items-center gap-2 mb-6">
              <Target className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-medium text-foreground">Overview</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-accent" />
                  <p className="font-medium text-foreground">Duration</p>
                </div>
                <p className="text-foreground/70">5 days</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-accent" />
                  <p className="font-medium text-foreground">Focus</p>
                </div>
                <p className="text-foreground/70">Building confidence with basics</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-accent" />
                  <p className="font-medium text-foreground">Goal</p>
                </div>
                <p className="text-foreground/70">Solid understanding</p>
              </div>
            </div>
          </div>

          {/* Current Day Plan Card */}
          <div className="bg-card rounded-2xl shadow-lg border border-border overflow-hidden">
            <div className="bg-primary-light/20 p-6">
              <div className="flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-primary" />
                <h2 className="text-2xl font-medium text-foreground">Day {currentDay} Plan</h2>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Activities */}
              <div className="space-y-4">
                {/* Learn */}
                <div className="p-4 bg-secondary rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-foreground">📖 Learn</h3>
                    <span className="text-sm text-muted-foreground">
                      {currentDay === 1 ? "20 min" : currentDay === 2 ? "25 min" : "20 min"}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/70">
                    {currentDay === 1 && "Read key sections from your uploaded material"}
                    {currentDay === 2 && "Dive deeper into advanced concepts and examples"}
                    {currentDay > 2 && "Continue building on your knowledge"}
                  </p>
                </div>

                {/* Recall */}
                <div className="p-4 bg-secondary rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-foreground">🧠 Recall</h3>
                    <span className="text-sm text-muted-foreground">
                      {currentDay === 1 ? "10 min" : "15 min"}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/70">
                    {currentDay === 1 && "Review 5 short flashcards on core concepts"}
                    {currentDay === 2 && "Review 8 flashcards including yesterday's material"}
                    {currentDay > 2 && "Review all previous concepts with spaced repetition"}
                  </p>
                </div>

                {/* Practice */}
                <div className="p-4 bg-secondary rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-foreground">✍️ Practice</h3>
                    <span className="text-sm text-muted-foreground">
                      {currentDay === 1 ? "15 min" : "20 min"}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/70">
                    {currentDay === 1 && "Complete 2 simple exercises to apply what you learned"}
                    {currentDay === 2 && "Solve 3 exercises with increasing difficulty"}
                    {currentDay > 2 && "Apply concepts with practical exercises"}
                  </p>
                </div>

                {/* Reflect */}
                <div className="p-4 bg-secondary rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-foreground">💭 Reflect</h3>
                    <span className="text-sm text-muted-foreground">5 min</span>
                  </div>
                  <p className="text-sm text-foreground/70 mb-2">
                    What's one thing you learned today?
                  </p>
                  <Textarea
                    placeholder="Type your reflection here..."
                    value={reflection}
                    onChange={(e) => setReflection(e.target.value)}
                    className="min-h-[100px] resize-none"
                    disabled={dayCompleted}
                  />
                </div>
              </div>

              {/* Mark Complete Button */}
              <Button
                onClick={handleMarkComplete}
                disabled={dayCompleted}
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground rounded-full py-6 text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
              >
                {dayCompleted ? (
                  <>
                    <CheckCircle2 className="mr-2 w-5 h-5" />
                    Day {currentDay} Completed!
                  </>
                ) : (
                  `Mark Day ${currentDay} Complete`
                )}
              </Button>
            </div>
          </div>

          {/* Progress Card */}
          <div className="bg-card rounded-2xl shadow-lg p-6 border border-border space-y-4">
            <h2 className="text-xl font-medium text-foreground">Your Progress</h2>
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Day {currentDay} of 5</span>
                <span>{progressPercentage}% Complete</span>
              </div>
              <Progress value={progressPercentage} className="h-3" />
            </div>
            <p className="text-sm text-foreground/70 italic text-center pt-2">
              {currentDay === 5 
                ? "You're almost there — finish strong!" 
                : "Keep going — every step builds momentum."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudyPlan;
