import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, LogOut } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import api from "@/services/api";

interface Question {
  question: string;
  options: string[];
  correctAnswer: number;
  id: number;
}

const generateDistractors = (answer: string): string[] => {
  // TODO: Implement distractor generation logic
  return ["Option B", "Option C", "Option D"];
};

const Test = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { toast } = useToast();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});

  useEffect(() => {
    // Check for authentication
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    const fetchQuestions = async () => {
      try {
        setIsLoading(true);
        // Get paths from localStorage
        const proficiencyPath = localStorage.getItem('proficiencyPath');
        const courseMaterialPath = localStorage.getItem('courseMaterialPath');

        if (!proficiencyPath || !courseMaterialPath) {
          toast({
            title: "Error",
            description: "Missing required data. Please upload study materials first.",
            variant: "destructive",
          });
          navigate('/upload');
          return;
        }

        // Call the create-test endpoint
        const response = await api.post('/create-test', {
          json_path: proficiencyPath,
          course_material_json: courseMaterialPath
        });

        // Transform the API response into the Question format
        const transformedQuestions = response.data.items.map((item: any, index: number) => {
          const parsed = typeof item === 'string' ? JSON.parse(item) : item;
          // Generate some distractors based on the correct answer
          const distractors = generateDistractors(parsed.answer);
          return {
            id: index + 1,
            question: parsed.question,
            options: [parsed.answer, ...distractors].sort(() => Math.random() - 0.5),
            correctAnswer: 0 // First option is the correct one
          };
        });

        setQuestions(transformedQuestions);
      } catch (error) {
        console.error('Failed to fetch questions:', error);
        toast({
          title: "Error",
          description: "Failed to generate test questions. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuestions();
  }, [navigate, toast]);

  const progress = ((currentQuestion + 1) / questions.length) * 100;

  const handleNext = () => {
    if (selectedOption !== null) {
      setAnswers(prev => ({ ...prev, [currentQuestion]: selectedOption }));
      
      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion(prev => prev + 1);
        setSelectedOption(answers[currentQuestion + 1] ?? null);
      } else {
        // Calculate score and navigate to results
        const correctAnswers = Object.entries(answers).filter(
          ([index, answer]) => questions[parseInt(index)].correctAnswer === answer
        ).length;
        
        // Add current answer to calculation
        const finalScore = questions[currentQuestion].correctAnswer === selectedOption 
          ? correctAnswers + 1 
          : correctAnswers;
        
        const percentage = (finalScore / questions.length) * 100;
        navigate("/result", { state: { score: percentage } });
      }
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
      setSelectedOption(answers[currentQuestion - 1] ?? null);
    }
  };

  if (isLoading || questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg text-muted-foreground">Loading questions...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col page-transition">
      {/* Navigation Header */}
      <div className="p-6 flex justify-end">
        <Button
          variant="outline"
          onClick={async () => {
            await logout();
            navigate('/login');
          }}
          className="rounded-full px-4"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="max-w-2xl w-full space-y-8">
          {/* Title */}
          <div className="text-center space-y-3">
            <h1 className="text-4xl font-medium text-foreground">
              Take a Quick Knowledge Test
            </h1>
            <p className="text-lg text-muted-foreground">
              Let's see how much you already know from your material.
            </p>
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Question {currentQuestion + 1} of {questions.length}</span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Question Card */}
          <div className="bg-card rounded-2xl shadow-lg p-8 border border-border space-y-6">
            <h2 className="text-2xl font-medium text-foreground">
              {questions[currentQuestion].question}
            </h2>

            <RadioGroup
              value={selectedOption?.toString()}
              onValueChange={(value) => setSelectedOption(parseInt(value))}
              className="space-y-3"
            >
              {questions[currentQuestion].options.map((option, index) => (
                <div
                  key={index}
                  className={`flex items-center space-x-3 p-4 rounded-lg border-2 transition-all cursor-pointer ${
                    selectedOption === index
                      ? "border-primary bg-primary-light/10"
                      : "border-border hover:border-primary/50 bg-secondary"
                  }`}
                  onClick={() => setSelectedOption(index)}
                >
                  <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                  <Label
                    htmlFor={`option-${index}`}
                    className="flex-1 cursor-pointer text-base"
                  >
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Navigation Buttons */}
          <div className="flex gap-4">
            {currentQuestion > 0 && (
              <Button
                variant="outline"
                onClick={handlePrevious}
                className="rounded-full px-6"
              >
                Previous
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="p-6 flex justify-center">
        <Button
          size="lg"
          onClick={handleNext}
          disabled={selectedOption === null}
          className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-8 py-6 text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {currentQuestion === questions.length - 1 ? "View Results" : "Next Question"}
          <ArrowRight className="ml-2 w-5 h-5" />
        </Button>
      </div>
    </div>
  );
};

export default Test;
