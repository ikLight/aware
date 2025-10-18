import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, LogOut } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";

// Mock questions
const questions = [
  {
    id: 1,
    question: "What is the primary purpose of a study plan?",
    options: [
      "To make studying more complicated",
      "To organize and structure learning activities",
      "To avoid studying altogether",
      "To impress teachers",
    ],
    correctAnswer: 1,
  },
  {
    id: 2,
    question: "Which learning technique involves recalling information without looking at notes?",
    options: [
      "Passive reading",
      "Active recall",
      "Highlighting",
      "Copying notes",
    ],
    correctAnswer: 1,
  },
  {
    id: 3,
    question: "What is spaced repetition?",
    options: [
      "Studying all material in one session",
      "Reviewing material at increasing intervals",
      "Reading notes multiple times in a row",
      "Studying only the day before exams",
    ],
    correctAnswer: 1,
  },
  {
    id: 4,
    question: "What does 'active learning' mean?",
    options: [
      "Listening to lectures without taking notes",
      "Engaging with material through questions and practice",
      "Memorizing facts without understanding",
      "Studying while walking around",
    ],
    correctAnswer: 1,
  },
  {
    id: 5,
    question: "Why is it important to take breaks while studying?",
    options: [
      "To procrastinate longer",
      "To maintain focus and prevent burnout",
      "To avoid learning too much",
      "Breaks are not important",
    ],
    correctAnswer: 1,
  },
];

const Test = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  useEffect(() => {
    // Check for authentication
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
    }
  }, [navigate]);

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
