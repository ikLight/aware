import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  BookOpen,
  LogOut,
  GraduationCap,
  Award,
  TrendingUp,
  Clock,
  Target,
  Zap,
  ChevronRight,
  CheckCircle2,
  XCircle,
  BarChart3,
  Trophy,
  Sparkles,
  Brain,
  Rocket,
  User
} from "lucide-react";

interface Course {
  _id: string;
  course_name: string;
  professor_username: string;
  is_enrolled?: boolean;
  has_course_plan?: boolean;
}

interface EnrolledCourse extends Course {
  proficiency_level: string;
  enrolled_at: string;
}

interface Topic {
  label: string;
  full_path: string;
}

interface Question {
  question_number: number;
  question_text: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correct_answer: string;
  explanation?: string;
}

interface TestResult {
  _id: string;
  submitted_at: string;
  topic: string;
  score: number;
  total_questions: number;
  percentage: number;
  proficiency_level: string;
  course_name: string;
}

const Student = () => {
  const navigate = useNavigate();
  const { logout, username } = useAuth();
  const { toast } = useToast();

  // Main view state
  const [view, setView] = useState<'dashboard' | 'browse-courses' | 'test-taking' | 'test-results' | 'review'>('dashboard');
  
  // Course state
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [isLoadingEnrolled, setIsLoadingEnrolled] = useState(false);
  const [isLoadingAvailable, setIsLoadingAvailable] = useState(false);
  
  // Enrollment state
  const [enrollingCourseId, setEnrollingCourseId] = useState<string | null>(null);
  
  // Test workflow state
  const [selectedCourseForTest, setSelectedCourseForTest] = useState<EnrolledCourse | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);
  const [isGeneratingTest, setIsGeneratingTest] = useState(false);
  
  // Test taking state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [studentAnswers, setStudentAnswers] = useState<Record<number, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Test results state
  const [testResults, setTestResults] = useState<{
    score: number;
    total_questions: number;
    percentage: number;
  } | null>(null);

  // Test history state
  const [showTestHistory, setShowTestHistory] = useState(false);
  const [testHistory, setTestHistory] = useState<TestResult[]>([]);
  const [selectedCourseForHistory, setSelectedCourseForHistory] = useState<EnrolledCourse | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Flashcard/Review state
  const [selectedCourseForReview, setSelectedCourseForReview] = useState<EnrolledCourse | null>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewNumCards, setReviewNumCards] = useState<string>('10');
  const [reviewStyle, setReviewStyle] = useState<string>('concise');
  const [reviewAnswerFormat, setReviewAnswerFormat] = useState<string>('short');
  const [isGeneratingFlashcards, setIsGeneratingFlashcards] = useState(false);
  const [flashcards, setFlashcards] = useState<Array<{question: string; answer: string}>>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  useEffect(() => {
    fetchEnrolledCourses();
  }, []);

  const fetchEnrolledCourses = async () => {
    try {
      setIsLoadingEnrolled(true);
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/student/enrolled-courses', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch enrolled courses');

      const data = await response.json();
      setEnrolledCourses(data.courses || []);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load courses",
        variant: "destructive"
      });
    } finally {
      setIsLoadingEnrolled(false);
    }
  };

  const fetchAvailableCourses = async () => {
    try {
      setIsLoadingAvailable(true);
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/student/available-courses', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch available courses');

      const data = await response.json();
      setAvailableCourses(data.courses || []);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load courses",
        variant: "destructive"
      });
    } finally {
      setIsLoadingAvailable(false);
    }
  };

  const handleEnrollCourse = async (courseId: string, proficiencyLevel: string) => {
    try {
      setEnrollingCourseId(courseId);
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/student/enroll', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          course_id: courseId
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to enroll');
      }

      const data = await response.json();
      toast({
        title: "Enrolled!",
        description: data.message || `Successfully enrolled in ${data.course_name}`
      });

      // Refresh courses
      fetchEnrolledCourses();
      fetchAvailableCourses();
      setView('dashboard');
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to enroll",
        variant: "destructive"
      });
    } finally {
      setEnrollingCourseId(null);
    }
  };


  const fetchCourseTopics = async (courseId: string) => {
    try {
      setIsLoadingTopics(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8000/student/course/${courseId}/topics`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch topics');

      const data = await response.json();
      setTopics(data.topics || []);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load topics",
        variant: "destructive"
      });
    } finally {
      setIsLoadingTopics(false);
    }
  };

  const handleStartTest = async (course: EnrolledCourse) => {
    setSelectedCourseForTest(course);
    await fetchCourseTopics(course._id);
    setView('test-taking');
  };

  const handleViewTestHistory = async (course: EnrolledCourse) => {
    setSelectedCourseForHistory(course);
    setShowTestHistory(true);
    
    try {
      setIsLoadingHistory(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8000/student/course/${course._id}/test-history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch test history');

      const data = await response.json();
      setTestHistory(data.test_history || []);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load test history",
        variant: "destructive"
      });
      setTestHistory([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleGenerateReview = async () => {
    if (!selectedCourseForReview) return;

    try {
      setIsGeneratingFlashcards(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8000/student/course/${selectedCourseForReview._id}/generate-flashcards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          course_id: selectedCourseForReview._id,
          num_cards: parseInt(reviewNumCards),
          style: reviewStyle,
          answer_format: reviewAnswerFormat
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to generate flashcards');
      }

      const data = await response.json();
      setFlashcards(data.cards || []);
      setCurrentCardIndex(0);
      setShowAnswer(false);
      setShowReviewDialog(false);
      setView('review');
      
      toast({
        title: "Flashcards Generated!",
        description: `${data.num_cards} flashcards ready for review`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate flashcards",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingFlashcards(false);
    }
  };

  const handleGenerateTest = async () => {
    if (!selectedCourseForTest || !selectedTopic) {
      toast({
        title: "Error",
        description: "Please select a topic",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsGeneratingTest(true);
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/student/generate-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          course_id: selectedCourseForTest._id,
          topic: selectedTopic
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to generate test');
      }

      const data = await response.json();
      setQuestions(data.questions || []);
      setCurrentQuestionIndex(0);
      setStudentAnswers({});
      
      toast({
        title: "Test Generated!",
        description: `${data.questions.length} questions ready`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate test",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingTest(false);
    }
  };

  const handleAnswerSelect = (answer: string) => {
    const currentQuestion = questions[currentQuestionIndex];
    setStudentAnswers(prev => ({
      ...prev,
      [currentQuestion.question_number]: answer
    }));
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSubmitTest = async () => {
    const unansweredCount = questions.length - Object.keys(studentAnswers).length;
    if (unansweredCount > 0) {
      const confirm = window.confirm(
        `You have ${unansweredCount} unanswered question(s). Submit anyway?`
      );
      if (!confirm) return;
    }

    try {
      setIsSubmitting(true);
      const token = localStorage.getItem('token');
      
      const payload = {
        course_id: selectedCourseForTest!._id,
        topic: selectedTopic,
        questions: questions,
        answers: studentAnswers
      };
      
      console.log('=== SUBMIT TEST DEBUG ===');
      console.log('Payload:', JSON.stringify(payload, null, 2));
      console.log('Course ID:', selectedCourseForTest!._id);
      console.log('Topic:', selectedTopic);
      console.log('Questions count:', questions.length);
      console.log('Answers:', studentAnswers);
      console.log('Answers type:', typeof studentAnswers);
      console.log('Answers keys:', Object.keys(studentAnswers));
      
      const response = await fetch('http://localhost:8000/student/submit-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      if (!response.ok) {
        const error = await response.json();
        console.error('Error response:', error);
        throw new Error(error.detail || 'Failed to submit test');
      }

      const data = await response.json();
      setTestResults({
        score: data.score,
        total_questions: data.total_questions,
        percentage: data.percentage
      });
      setView('test-results');
      
      toast({
        title: "Test Submitted!",
        description: data.message
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit test",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToDashboard = () => {
    setSelectedCourseForTest(null);
    setSelectedTopic('');
    setQuestions([]);
    setStudentAnswers({});
    setTestResults(null);
    setView('dashboard');
  };

  // Dashboard View - Main landing page
  if (view === 'dashboard') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800">
        {/* Header */}
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-card/80 backdrop-blur-lg border-b border-border sticky top-0 z-10 shadow-sm glow-border"
        >
          <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <motion.div
                whileHover={{ rotate: 360, scale: 1.1 }}
                transition={{ duration: 0.5 }}
              >
                <GraduationCap className="w-10 h-10 text-primary" />
              </motion.div>
              <div>
                <h1 className="text-2xl font-bold gradient-text">Student Dashboard</h1>
                <p className="text-sm text-muted-foreground">Your personalized learning journey</p>
              </div>
            </div>
            <div className="flex gap-3 items-center">
              {/* User Profile */}
              <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full border border-primary/20">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm font-medium text-foreground">{username || 'Student'}</span>
              </div>
              <Button 
                variant="outline"
                onClick={() => {
                  fetchAvailableCourses();
                  setView('browse-courses');
                }}
                className="hover:scale-105 transition-transform"
              >
                <BookOpen className="w-4 h-4 mr-2" />
                Browse Courses
              </Button>
              <Button 
                variant="secondary" 
                onClick={async () => { await logout(); navigate('/login'); }}
                className="hover:scale-105 transition-transform"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </motion.div>

        <div className="max-w-7xl mx-auto px-6 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-2 border-primary/20 shadow-2xl bg-white/90 backdrop-blur">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-purple-500/5 border-b">
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Sparkles className="w-8 h-8 text-primary" />
                  </motion.div>
                  <div>
                    <CardTitle className="text-3xl">My Enrolled Courses</CardTitle>
                    <CardDescription className="text-base">
                      Manage your courses and take personalized tests
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {isLoadingEnrolled ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <Brain className="w-16 h-16 text-primary" />
                    </motion.div>
                    <p className="mt-4 text-lg text-muted-foreground">Loading your courses...</p>
                  </div>
                ) : enrolledCourses.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-16 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl border-2 border-dashed border-primary/30"
                  >
                    <Rocket className="w-20 h-20 text-primary/60 mx-auto mb-4" />
                    <p className="text-xl font-semibold text-gray-700 mb-2">Ready to start your learning journey?</p>
                    <p className="text-muted-foreground mb-6">You haven't enrolled in any courses yet.</p>
                    <Button 
                      size="lg"
                      onClick={() => {
                        fetchAvailableCourses();
                        setView('browse-courses');
                      }}
                      className="hover:scale-105 transition-transform"
                    >
                      <Sparkles className="w-5 h-5 mr-2" />
                      Browse Available Courses
                    </Button>
                  </motion.div>
                ) : (
                  <div className="space-y-4">
                    {enrolledCourses.map((course, idx) => (
                      <motion.div
                        key={course._id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        whileHover={{ scale: 1.02, y: -5 }}
                        className="border-2 border-gray-200 rounded-xl p-6 bg-gradient-to-r from-white to-gray-50 hover:border-primary/50 transition-all duration-300 shadow-md hover:shadow-xl"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 flex-1">
                            <div className="w-16 h-16 bg-gradient-to-br from-primary to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                              <BookOpen className="w-8 h-8 text-white" />
                            </div>
                            <div className="flex-1">
                              <h3 className="text-xl font-bold text-gray-800 mb-1">{course.course_name}</h3>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Award className="w-4 h-4" />
                                <span>Professor: {course.professor_username}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col gap-3">
                            <Button 
                              size="lg"
                              onClick={() => handleStartTest(course)}
                              disabled={!course.has_course_plan}
                              className={`${
                                course.has_course_plan 
                                  ? 'bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-700' 
                                  : 'bg-gray-300'
                              } transition-all duration-300 hover:scale-105 shadow-lg`}
                            >
                              {course.has_course_plan ? (
                                <>
                                  <Zap className="w-5 h-5 mr-2" />
                                  Take Test
                                </>
                              ) : (
                                <>
                                  <XCircle className="w-5 h-5 mr-2" />
                                  No Materials
                                </>
                              )}
                            </Button>
                            <Button 
                              size="lg"
                              variant="outline"
                              onClick={() => handleViewTestHistory(course)}
                              className="hover:scale-105 transition-all border-2 hover:border-primary hover:bg-primary/5"
                            >
                              <BarChart3 className="w-5 h-5 mr-2" />
                              View Scores
                            </Button>
                            <Button 
                              size="lg"
                              variant="secondary"
                              onClick={() => { setSelectedCourseForReview(course); setShowReviewDialog(true); }}
                              disabled={!course.has_course_plan}
                              className="hover:scale-105 transition-all border-2"
                            >
                              <BookOpen className="w-5 h-5 mr-2" />
                              Review
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Test History Dialog */}
          <Dialog open={showTestHistory} onOpenChange={setShowTestHistory}>
            <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto bg-white/95 backdrop-blur">
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <Trophy className="w-8 h-8 text-primary" />
                  <div>
                    <DialogTitle className="text-2xl">Test History</DialogTitle>
                    <DialogDescription className="text-base">
                      {selectedCourseForHistory?.course_name} - All your test attempts
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              
              {isLoadingHistory ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Brain className="w-12 h-12 text-primary" />
                  </motion.div>
                  <p className="mt-4 text-muted-foreground">Loading test history...</p>
                </div>
              ) : testHistory.length === 0 ? (
                <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl border-2 border-dashed border-gray-300">
                  <Target className="w-16 h-16 text-gray-400 mx-auto mb-3" />
                  <p className="text-lg font-medium text-gray-600">No tests taken yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Start testing to see your progress here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {testHistory.map((result, idx) => (
                    <motion.div
                      key={result._id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className={`border-2 rounded-xl p-5 transition-all hover:shadow-lg ${
                        result.percentage >= 80 ? 'border-green-200 bg-green-50/50 hover:bg-green-50' :
                        result.percentage >= 60 ? 'border-yellow-200 bg-yellow-50/50 hover:bg-yellow-50' :
                        'border-red-200 bg-red-50/50 hover:bg-red-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Clock className="w-5 h-5 text-gray-500" />
                            <span className="text-sm font-medium text-gray-600">
                              {result.submitted_at ? new Date(result.submitted_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              }) : 'Date not available'}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <Target className="w-5 h-5 text-primary" />
                            <span className="font-bold text-lg text-gray-800">{result.topic}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-600 mb-1">Score</div>
                          <div className="text-3xl font-bold text-gray-800 mb-1">
                            {result.score}/{result.total_questions}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className={`text-2xl font-bold ${
                              result.percentage >= 80 ? 'text-green-600' :
                              result.percentage >= 60 ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>
                              {result.percentage.toFixed(1)}%
                            </div>
                            {result.percentage >= 80 ? (
                              <CheckCircle2 className="w-7 h-7 text-green-600" />
                            ) : result.percentage >= 60 ? (
                              <TrendingUp className="w-7 h-7 text-yellow-600" />
                            ) : (
                              <XCircle className="w-7 h-7 text-red-600" />
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Review Options Dialog */}
          <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
            <DialogContent className="max-w-md bg-white/95 backdrop-blur">
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <BookOpen className="w-8 h-8 text-primary" />
                  <div>
                    <DialogTitle className="text-2xl">Review Options</DialogTitle>
                    <DialogDescription className="text-base">
                      {selectedCourseForReview?.course_name} - Generate flashcards
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="num-cards">Number of Cards:</Label>
                  <Select value={reviewNumCards} onValueChange={setReviewNumCards}>
                    <SelectTrigger className="w-full mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 cards</SelectItem>
                      <SelectItem value="10">10 cards</SelectItem>
                      <SelectItem value="15">15 cards</SelectItem>
                      <SelectItem value="20">20 cards</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="style">Style:</Label>
                  <Select value={reviewStyle} onValueChange={setReviewStyle}>
                    <SelectTrigger className="w-full mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="concise">Concise</SelectItem>
                      <SelectItem value="detailed">Detailed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="answer-format">Answer Format:</Label>
                  <Select value={reviewAnswerFormat} onValueChange={setReviewAnswerFormat}>
                    <SelectTrigger className="w-full mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="short">Short</SelectItem>
                      <SelectItem value="detailed">Detailed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  className="w-full" 
                  onClick={handleGenerateReview}
                  disabled={isGeneratingFlashcards}
                >
                  {isGeneratingFlashcards ? 'Generating...' : 'Generate Flashcards'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    );
  }

  // Browse Courses View
  if (view === 'browse-courses') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-foreground">Browse Courses</h1>
            <Button variant="outline" onClick={() => setView('dashboard')}>
              Back to Dashboard
            </Button>
          </div>

          <Card className="bg-card/80 backdrop-blur-xl border border-border">
            <CardHeader>
              <CardTitle>Available Courses</CardTitle>
              <CardDescription>Enroll in courses to start taking personalized tests</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingAvailable ? (
                <div className="text-center py-8 text-muted-foreground">Loading courses...</div>
              ) : availableCourses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No courses available at this time.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Course Name</TableHead>
                      <TableHead>Professor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {availableCourses.map((course) => (
                      <TableRow key={course._id}>
                        <TableCell className="font-medium">{course.course_name}</TableCell>
                        <TableCell>{course.professor_username}</TableCell>
                        <TableCell>
                          {course.is_enrolled ? (
                            <span className="text-green-600 font-medium">Enrolled</span>
                          ) : (
                            <span className="text-muted-foreground">Not Enrolled</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {course.is_enrolled ? (
                            <Button size="sm" variant="outline" disabled>Already Enrolled</Button>
                          ) : (
                            <Button 
                              size="sm"
                              onClick={() => handleEnrollCourse(course._id, '')}
                              disabled={enrollingCourseId === course._id}
                            >
                              {enrollingCourseId === course._id ? 'Enrolling...' : 'Enroll'}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Test Taking View
  if (view === 'test-taking') {
    // Topic selection phase
    if (questions.length === 0) {
      return (
        <div className="min-h-screen p-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold">Take a Test</h1>
              <Button variant="outline" onClick={handleBackToDashboard}>
                Back to Dashboard
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>{selectedCourseForTest?.course_name}</CardTitle>
                <CardDescription>Select a topic to generate your personalized test</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="topic">Select Topic:</Label>
                  {isLoadingTopics ? (
                    <div className="text-muted-foreground mt-2">Loading topics...</div>
                  ) : topics.length === 0 ? (
                    <div className="text-muted-foreground mt-2">
                      No topics available for this course.
                    </div>
                  ) : (
                    <Select value={selectedTopic} onValueChange={setSelectedTopic}>
                      <SelectTrigger className="w-full mt-2">
                        <SelectValue placeholder="-- Select a Topic --" />
                      </SelectTrigger>
                      <SelectContent>
                        {topics.map((topic, idx) => (
                          <SelectItem key={idx} value={topic.label}>
                            {topic.full_path}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <Button
                  className="w-full"
                  onClick={handleGenerateTest}
                  disabled={!selectedTopic || isGeneratingTest}
                >
                  {isGeneratingTest ? 'Generating Test...' : 'Generate Test'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    // Question answering phase
    const currentQuestion = questions[currentQuestionIndex];
    const currentAnswer = studentAnswers[currentQuestion.question_number] || '';
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

    return (
      <div className="min-h-screen p-6 bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2 text-foreground">
              <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
              <span>{Object.keys(studentAnswers).length} answered</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <Card className="bg-card/80 backdrop-blur-xl border border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Question {currentQuestion.question_number}</CardTitle>
              <CardDescription className="text-base mt-4">
                {currentQuestion.question_text}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup value={currentAnswer} onValueChange={handleAnswerSelect}>
                {Object.entries(currentQuestion.options).map(([key, value]) => (
                  <div 
                    key={key} 
                    className="flex items-center space-x-2 p-3 border border-border rounded-lg hover:bg-primary/10 hover:border-primary/50 transition-all cursor-pointer"
                  >
                    <RadioGroupItem value={key} id={`option-${key}`} />
                    <Label htmlFor={`option-${key}`} className="flex-1 cursor-pointer text-foreground">
                      <span className="font-semibold">{key}.</span> {value}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>

          <div className="flex justify-between mt-6">
            <Button
              variant="outline"
              onClick={handlePreviousQuestion}
              disabled={currentQuestionIndex === 0}
            >
              Previous
            </Button>

            <div className="space-x-2">
              {currentQuestionIndex < questions.length - 1 ? (
                <Button onClick={handleNextQuestion}>Next</Button>
              ) : (
                <Button onClick={handleSubmitTest} disabled={isSubmitting}>
                  {isSubmitting ? 'Submitting...' : 'Submit Test'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Test Results View
  if (view === 'test-results' && testResults) {
    const getScoreColor = () => {
      if (testResults.percentage >= 80) return 'text-green-500';
      if (testResults.percentage >= 60) return 'text-yellow-500';
      return 'text-red-500';
    };

    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800">
        <Card className="w-full max-w-md bg-card/80 backdrop-blur-xl border border-border">
          <CardHeader>
            <CardTitle className="text-center text-foreground">Test Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <div className={`text-6xl font-bold ${getScoreColor()}`}>
                {testResults.percentage}%
              </div>
              <div className="text-2xl mt-4 text-foreground">
                {testResults.score} / {testResults.total_questions}
              </div>
              <div className="text-muted-foreground mt-2">
                Questions Correct
              </div>
            </div>

            <Button className="w-full" onClick={handleBackToDashboard}>
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Review View - Flashcards
  if (view === 'review') {
    const currentCard = flashcards[currentCardIndex];

    return (
      <div className="min-h-screen p-6 bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-foreground">Review - {selectedCourseForReview?.course_name}</h1>
            <Button variant="outline" onClick={handleBackToDashboard}>
              Back to Dashboard
            </Button>
          </div>

          {flashcards.length === 0 ? (
            <Card className="bg-card/80 backdrop-blur-xl border border-border">
              <CardContent className="p-12 text-center">
                <p className="text-muted-foreground">No flashcards available.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="mb-6">
                <div className="flex justify-between text-sm mb-2 text-foreground">
                  <span>Card {currentCardIndex + 1} of {flashcards.length}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${((currentCardIndex + 1) / flashcards.length) * 100}%` }}
                  />
                </div>
              </div>

              <motion.div
                key={currentCardIndex}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="bg-card/80 backdrop-blur-xl border border-border min-h-[400px] flex flex-col">
                  <CardHeader>
                    <CardTitle className="text-foreground text-2xl">
                      {showAnswer ? 'Answer' : 'Question'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 flex items-center justify-center">
                    <AnimatePresence mode="wait">
                      {!showAnswer ? (
                        <motion.div
                          key="question"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          className="text-center"
                        >
                          <p className="text-2xl text-foreground">{currentCard.question}</p>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="answer"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          className="text-center"
                        >
                          <p className="text-2xl text-foreground">{currentCard.answer}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </motion.div>

              <div className="flex justify-between mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (currentCardIndex > 0) {
                      setCurrentCardIndex(prev => prev - 1);
                      setShowAnswer(false);
                    }
                  }}
                  disabled={currentCardIndex === 0}
                >
                  Previous Card
                </Button>

                <Button
                  onClick={() => setShowAnswer(!showAnswer)}
                  className="bg-primary"
                >
                  {showAnswer ? 'Show Question' : 'Show Answer'}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    if (currentCardIndex < flashcards.length - 1) {
                      setCurrentCardIndex(prev => prev + 1);
                      setShowAnswer(false);
                    }
                  }}
                  disabled={currentCardIndex === flashcards.length - 1}
                >
                  Next Card
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return null;
};

export default Student;
