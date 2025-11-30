import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload as UploadIcon, FileText, LogOut, BookOpen, List, Trash2, CheckCircle2, Circle, BarChart3, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Users, Award, Target, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';

interface Course {
  _id: string;
  course_name: string;
  professor_username: string;
  roster: Array<{ studentName: string; emailID: string }>;
  course_plan?: unknown;
  course_objectives?: unknown;
  created_at: string;
  updated_at: string;
}

type CourseCreationStep = 1 | 2 | 3 | 4 | 5;

const Prof = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { logout } = useAuth();
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [graphCreated, setGraphCreated] = useState(false);
  
  // Course creation state - step by step
  const [showCourseCreation, setShowCourseCreation] = useState(false);
  const [currentStep, setCurrentStep] = useState<CourseCreationStep>(1);
  const [courseId, setCourseId] = useState<string | null>(null);
  
  // Step 1: Course name
  const [courseName, setCourseName] = useState("");
  const [defaultProficiency, setDefaultProficiency] = useState("intermediate");
  
  // Step 2: Course plan
  const [coursePlanFile, setCoursePlanFile] = useState<File | null>(null);
  
  // Step 3: Course materials (ZIP)
  const [materialsZipFile, setMaterialsZipFile] = useState<File | null>(null);
  const [materialsMapping, setMaterialsMapping] = useState<Record<string, string[]> | null>(null);
  
  // Step 4: Course objectives
  const [courseObjectives, setCourseObjectives] = useState("");
  
  // Step 5: Roster
  const [rosterFile, setRosterFile] = useState<File | null>(null);
  
  const [isProcessingStep, setIsProcessingStep] = useState(false);
  
  // Course viewing state
  const [showCourseList, setShowCourseList] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  
  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Knowledge graph state
  const [showKnowledgeGraph, setShowKnowledgeGraph] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [graphData, setGraphData] = useState<Array<{ objective: string; importance: number }>>([]);
  const [isEditingGraph, setIsEditingGraph] = useState(false);

  // Analytics state
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [analyticsCourse, setAnalyticsCourse] = useState<Course | null>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set());
  
  // Course Report state
  const [courseReport, setCourseReport] = useState<string | null>(null);
  const [reportMeta, setReportMeta] = useState<{
    generated_at: string;
    course_name: string;
    statistics: any;
  } | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [showReport, setShowReport] = useState(false);
  
  // Enrolled students state
  const [enrolledStudents, setEnrolledStudents] = useState<any[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  
  // Proficiency management state
  const [settingProficiency, setSettingProficiency] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    fetch('http://localhost:8000/auth/me', {
      headers: { 'Authorization': `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => { 
        setUserRole(data.role);
        // Fetch courses on mount
        fetchCourses();
      })
      .catch(() => { setUserRole(null); });
  }, [navigate]);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => { setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  };
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) { handleFiles(Array.from(e.target.files)); }
  };
  const handleFiles = async (newFiles: File[]) => {
    const validFiles = newFiles.filter(file => {
      const validTypes = ['.pdf', '.docx', '.txt'];
      const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
      return validTypes.includes(fileExt);
    });
    if (validFiles.length !== newFiles.length) {
      toast({ title: "Invalid file type", description: "Only PDF, DOCX, and TXT files are supported.", variant: "destructive" });
      return;
    }
    try {
      setFiles(prev => [...prev, ...validFiles]);
      setIsUploading(true);
      const formData = new FormData();
      validFiles.forEach(file => formData.append('files', file));
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/upload', {
        method: 'POST', body: formData,
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Upload failed');
      setIsProcessing(true);
      toast({ title: "Files uploaded", description: "Knowledge graph created." });
      setFiles([]);
      setGraphCreated(true);
    } catch (error) {
      toast({ title: "Error", description: "There was an error processing your files.", variant: "destructive" });
      setFiles(prev => prev.filter(f => !validFiles.includes(f)));
      setGraphCreated(false);
    } finally {
      setIsUploading(false); setIsProcessing(false);
    }
  };
  const removeFile = (index: number) => { setFiles(prev => prev.filter((_, i) => i !== index)); };


  const handleStep1 = async () => {
    if (!courseName.trim()) {
      toast({ title: "Error", description: "Please enter a course name.", variant: "destructive" });
      return;
    }

    try {
      setIsProcessingStep(true);
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/course/init', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          course_name: courseName,
          default_proficiency: defaultProficiency
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to create course');
      }

      const data = await response.json();
      setCourseId(data.course_id);
      toast({ title: "Success", description: "Course name saved. Moving to next step..." });
      setCurrentStep(2);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to initialize course.",
        variant: "destructive"
      });
    } finally {
      setIsProcessingStep(false);
    }
  };

  const handleStep2 = async () => {
    if (!coursePlanFile) {
      toast({ title: "Error", description: "Please upload a course plan file.", variant: "destructive" });
      return;
    }

    if (!courseId) return;

    try {
      setIsProcessingStep(true);
      const formData = new FormData();
      formData.append('plan_file', coursePlanFile);

      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8000/course/${courseId}/upload-plan`, {
        method: 'POST',
        body: formData,
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to upload course plan');
      }

      toast({ title: "Success", description: "Course plan uploaded. Moving to next step..." });
      setCurrentStep(4); // Skip step 3 (materials upload) - temporarily disabled
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload course plan.",
        variant: "destructive"
      });
    } finally {
      setIsProcessingStep(false);
    }
  };

  const handleStep3 = async () => {
    if (!materialsZipFile) {
      toast({ title: "Error", description: "Please upload a materials ZIP file.", variant: "destructive" });
      return;
    }

    if (!courseId) return;

    try {
      setIsProcessingStep(true);
      const formData = new FormData();
      formData.append('materials_zip', materialsZipFile);

      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8000/course/${courseId}/upload-materials`, {
        method: 'POST',
        body: formData,
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to upload course materials');
      }

      const data = await response.json();
      setMaterialsMapping(data.topic_mapping || {});
      
      toast({ 
        title: "Success", 
        description: `${data.materials_count} materials uploaded and mapped to topics!` 
      });
      setCurrentStep(4);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload course materials.",
        variant: "destructive"
      });
    } finally {
      setIsProcessingStep(false);
    }
  };

  const handleStep4 = async () => {
    if (!courseObjectives.trim()) {
      toast({ title: "Error", description: "Please enter course objectives.", variant: "destructive" });
      return;
    }

    if (!courseId) return;

    try {
      setIsProcessingStep(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8000/course/${courseId}/set-objectives`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ objectives: courseObjectives })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to save course objectives');
      }

      toast({ title: "Success", description: "Course objectives saved. Moving to final step..." });
      setCurrentStep(5);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save course objectives.",
        variant: "destructive"
      });
    } finally {
      setIsProcessingStep(false);
    }
  };

  const handleStep5 = async () => {
    if (!rosterFile) {
      toast({ title: "Error", description: "Please upload a class roster CSV file.", variant: "destructive" });
      return;
    }

    if (!courseId) return;

    try {
      setIsProcessingStep(true);
      const formData = new FormData();
      formData.append('roster_file', rosterFile);

      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8000/course/${courseId}/upload-roster`, {
        method: 'POST',
        body: formData,
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to upload roster');
      }

      const data = await response.json();
      toast({
        title: "Course created successfully!",
        description: `${courseName} created with ${data.student_count} students.`
      });

      // Reset the form
      setCourseName("");
      setDefaultProficiency("intermediate");
      setCoursePlanFile(null);
      setMaterialsZipFile(null);
      setMaterialsMapping(null);
      setCourseObjectives("");
      setRosterFile(null);
      setCourseId(null);
      setCurrentStep(1);
      setShowCourseCreation(false);

      // Refresh course list
      fetchCourses();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to complete course creation.",
        variant: "destructive"
      });
    } finally {
      setIsProcessingStep(false);
    }
  };

  const fetchCourses = async () => {
    try {
      setIsLoadingCourses(true);
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/course/list', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch courses');
      }

      const data = await response.json();
      setCourses(data.courses || []);
    } catch (error) {
      toast({ 
        title: "Error", 
        description: "Failed to load courses.", 
        variant: "destructive" 
      });
    } finally {
      setIsLoadingCourses(false);
    }
  };

  const handleViewCourses = () => {
    setShowCourseList(true);
    setShowCourseCreation(false);
    setShowAnalytics(false);
    fetchCourses();
  };

  const fetchAnalytics = async (courseId: string) => {
    try {
      setIsLoadingAnalytics(true);
      const token = localStorage.getItem('token');
      
      // Fetch analytics and enrolled students in parallel
      const [analyticsRes, studentsRes] = await Promise.all([
        fetch(`http://localhost:8000/course/${courseId}/analytics`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch(`http://localhost:8000/course/${courseId}/enrolled-students`, {
          headers: { 'Authorization': `Bearer ${token}` },
        })
      ]);

      if (!analyticsRes.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const data = await analyticsRes.json();
      setAnalyticsData(data);
      
      if (studentsRes.ok) {
        const studentsData = await studentsRes.json();
        setEnrolledStudents(studentsData.students || []);
      }
    } catch (error) {
      toast({ 
        title: "Error", 
        description: "Failed to load analytics.", 
        variant: "destructive" 
      });
      setAnalyticsData(null);
    } finally {
      setIsLoadingAnalytics(false);
    }
  };

  const generateCourseReport = async () => {
    if (!analyticsCourse) return;
    
    try {
      setIsGeneratingReport(true);
      setCourseReport(null);
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8000/course/${analyticsCourse._id}/generate-report`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      const data = await response.json();
      
      if (!data.has_data) {
        toast({
          title: "No Data Available",
          description: data.report,
          variant: "default"
        });
        return;
      }
      
      setCourseReport(data.report);
      setReportMeta({
        generated_at: data.generated_at,
        course_name: data.course_name,
        statistics: data.statistics
      });
      setShowReport(true);
      toast({
        title: "Report Generated!",
        description: "AI-powered course analysis complete."
      });
    } catch (error) {
      toast({ 
        title: "Error", 
        description: "Failed to generate course report.", 
        variant: "destructive" 
      });
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleSetProficiency = async (studentUsername: string, proficiencyLevel: string) => {
    try {
      setSettingProficiency(studentUsername);
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/professor/set-student-proficiency', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          course_id: analyticsCourse?._id,
          student_username: studentUsername,
          proficiency_level: proficiencyLevel
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to set proficiency');
      }

      toast({
        title: "Success!",
        description: `Set ${studentUsername}'s proficiency to ${proficiencyLevel}`
      });

      // Refresh analytics to show updated proficiency
      if (analyticsCourse) {
        fetchAnalytics(analyticsCourse._id);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to set proficiency",
        variant: "destructive"
      });
    } finally {
      setSettingProficiency(null);
    }
  };

  const handleViewAnalytics = (course: Course) => {
    setAnalyticsCourse(course);
    setShowAnalytics(true);
    setShowCourseList(false);
    setShowCourseCreation(false);
    fetchAnalytics(course._id);
  };

  const toggleStudentExpand = (username: string) => {
    setExpandedStudents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(username)) {
        newSet.delete(username);
      } else {
        newSet.add(username);
      }
      return newSet;
    });
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600 font-semibold';
    if (percentage >= 60) return 'text-yellow-600 font-semibold';
    return 'text-red-600 font-semibold';
  };

  const handleDeleteClick = (course: Course) => {
    setCourseToDelete(course);
    setDeleteConfirmText("");
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!courseToDelete) return;
    
    if (deleteConfirmText !== courseToDelete.course_name) {
      toast({
        title: "Error",
        description: "Course name doesn't match. Please type the exact course name to delete.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsDeleting(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8000/course/${courseToDelete._id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to delete course');
      }

      toast({
        title: "Course deleted",
        description: `${courseToDelete.course_name} has been deleted successfully.`
      });

      // Refresh the course list
      fetchCourses();
      setDeleteDialogOpen(false);
      setCourseToDelete(null);
      setDeleteConfirmText("");
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete course.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const extractTopicsFromOutline = (outline: any[]): string[] => {
    const topics: string[] = [];
    
    const traverse = (items: any[]) => {
      if (!Array.isArray(items)) return;
      for (const item of items) {
        if (item.label) {
          // Add the label if it's a topic (not just a unit header like "Unit 1:")
          if (!item.label.match(/^Unit\s+\d+:?$/i)) {
            topics.push(item.label);
          }
        }
        if (item.children && Array.isArray(item.children)) {
          traverse(item.children);
        }
      }
    };
    
    if (Array.isArray(outline)) {
      traverse(outline);
    }
    return topics;
  };

  const handleViewKnowledgeGraph = async (course: Course) => {
    setSelectedCourse(course);
    
    try {
      const token = localStorage.getItem('token');
      
      // First, try to fetch saved knowledge graph from database
      const graphResponse = await fetch(`http://localhost:8000/course/${course._id}/get-graph`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (graphResponse.ok) {
        const graphResult = await graphResponse.json();
        const savedGraph = graphResult.knowledge_graph;
        
        // If we have a saved graph, use it
        if (savedGraph && Array.isArray(savedGraph) && savedGraph.length > 0) {
          setGraphData(savedGraph);
          setShowKnowledgeGraph(true);
          setShowCourseList(false);
          return;
        }
      }
      
      // If no saved graph, extract topics from course plan
      const topics: string[] = [];
      if (course.course_plan) {
        const plan = course.course_plan as any;
        if (plan.outline && Array.isArray(plan.outline)) {
          topics.push(...extractTopicsFromOutline(plan.outline));
        }
      }
      
      // Initialize graph data with topics from course plan
      if (topics.length > 0) {
        setGraphData(topics.map(topic => ({
          objective: topic,
          importance: 5
        })));
      } else {
        setGraphData([]);
      }
      
      setShowKnowledgeGraph(true);
      setShowCourseList(false);
    } catch (error) {
      console.error("Error loading knowledge graph:", error);
      // Fallback to default behavior
      setShowKnowledgeGraph(true);
      setShowCourseList(false);
    }
  };

  const handleImportanceChange = (index: number, importance: number) => {
    setGraphData(prev => {
      const updated = [...prev];
      updated[index].importance = importance;
      return updated;
    });
  };

  const handleSaveKnowledgeGraph = async () => {
    if (!selectedCourse) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8000/course/${selectedCourse._id}/save-graph`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ graph_data: graphData })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to save knowledge graph');
      }

      toast({
        title: "Success",
        description: "Knowledge graph saved successfully!"
      });

      setShowKnowledgeGraph(false);
      setSelectedCourse(null);
      setGraphData([]);
      fetchCourses();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save knowledge graph.",
        variant: "destructive"
      });
    }
  };

  if (userRole !== 'professor') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800">
        <div className="text-2xl font-semibold mt-20">Access Denied</div>
        <div className="mt-4 text-muted-foreground">Only professors can access this page.</div>
        <Button className="mt-8" onClick={async () => { await logout(); navigate('/login'); }}>Logout</Button>
      </div>
    );
  }  return (
    <div className="min-h-screen flex flex-col page-transition bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800">
      <div className="p-6 flex justify-between items-center border-b border-border">
        <div className="text-lg font-semibold text-primary">Prof Dashboard</div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => {
              setShowCourseCreation(true);
              setShowCourseList(false);
              setShowAnalytics(false);
            }}
          >
            <BookOpen className="w-4 h-4 mr-2" /> Create Course
          </Button>
          <Button 
            variant="outline" 
            onClick={handleViewCourses}
          >
            <List className="w-4 h-4 mr-2" /> View Courses
          </Button>
          <Button 
            variant="outline" 
            onClick={() => {
              setShowAnalytics(true);
              setShowCourseList(false);
              setShowCourseCreation(false);
              // If we have courses, auto-select the first one
              if (courses.length > 0 && !analyticsCourse) {
                setAnalyticsCourse(courses[0]);
                fetchAnalytics(courses[0]._id);
              }
            }}
          >
            <BarChart3 className="w-4 h-4 mr-2" /> Analytics
          </Button>
          <Button variant="outline" onClick={async () => { await logout(); navigate('/login'); }} className="rounded-full px-4">
            <LogOut className="w-4 h-4 mr-2" /> Logout
          </Button>
        </div>
      </div>
      <div className="flex-1 flex flex-col items-center p-6">
        <div className="max-w-6xl w-full space-y-8">
          
          {/* Course List Section */}
          {showCourseList && (
            <div className="space-y-6">
              <div className="text-center space-y-3">
                <List className="mx-auto w-12 h-12 text-primary" />
                <h1 className="text-4xl font-medium text-foreground">My Courses</h1>
                <p className="text-lg text-muted-foreground">View and manage all your courses.</p>
              </div>
              
              {isLoadingCourses ? (
                <div className="text-center py-8">Loading courses...</div>
              ) : courses.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No courses found. Create your first course!</p>
                  <Button 
                    className="mt-4" 
                    onClick={() => {
                      setShowCourseList(false);
                      setShowCourseCreation(true);
                    }}
                  >
                    Create Course
                  </Button>
                </div>
              ) : (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Course Name</TableHead>
                        <TableHead>Students</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {courses.map((course) => (
                        <TableRow key={course._id}>
                          <TableCell className="font-medium">{course.course_name}</TableCell>
                          <TableCell>{course.roster?.length || 0}</TableCell>
                          <TableCell>
                            {new Date(course.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleViewAnalytics(course)}
                              >
                                <BarChart3 className="w-4 h-4 mr-1" />
                                Analytics
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleViewKnowledgeGraph(course)}
                              >
                                View Knowledge Graph
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleDeleteClick(course)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
          
          {/* Course Creation Section - Step by Step */}
          {showCourseCreation && !showCourseList && (
            <div className="space-y-8">
              <div className="text-center space-y-3">
                <BookOpen className="mx-auto w-12 h-12 text-primary" />
                <h1 className="text-4xl font-medium text-foreground">Create a Course</h1>
                <p className="text-lg text-muted-foreground">Follow these steps to create a new course.</p>
              </div>

              {/* Step Indicator */}
              <div className="flex justify-between items-center">
                {[1, 2, 3, 4, 5].map((step) => (
                  <div key={step} className="flex flex-col items-center flex-1">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full mb-2 ${
                      step < currentStep ? 'bg-green-500' :
                      step === currentStep ? 'bg-primary' :
                      'bg-muted'
                    }`}>
                      {step < currentStep ? (
                        <CheckCircle2 className="w-6 h-6 text-white" />
                      ) : (
                        <Circle className="w-6 h-6 text-white" />
                      )}
                    </div>
                    <span className="text-xs font-medium text-center text-foreground">
                      {step === 1 && "Course Name"}
                      {step === 2 && "Course Plan"}
                      {step === 3 && "Materials"}
                      {step === 4 && "Objectives"}
                      {step === 5 && "Roster"}
                    </span>
                  </div>
                ))}
              </div>

              {/* Step 1: Course Name */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="course-name" className="block text-sm font-medium mb-2 text-foreground">Course Name</label>
                    <Input
                      id="course-name"
                      type="text"
                      placeholder="e.g., Machine Learning 101"
                      value={courseName}
                      onChange={(e) => setCourseName(e.target.value)}
                      disabled={isProcessingStep}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="default-proficiency" className="block text-sm font-medium mb-2 text-foreground">
                      Default Proficiency Level for New Students
                    </label>
                    <Select 
                      value={defaultProficiency} 
                      onValueChange={setDefaultProficiency}
                      disabled={isProcessingStep}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select default proficiency" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        <SelectItem value="beginner" className="text-green-400 focus:text-green-400 focus:bg-green-500/10">
                          🌱 Beginner - Students new to the subject
                        </SelectItem>
                        <SelectItem value="intermediate" className="text-blue-400 focus:text-blue-400 focus:bg-blue-500/10">
                          ⚡ Intermediate - Students with some background
                        </SelectItem>
                        <SelectItem value="advanced" className="text-purple-400 focus:text-purple-400 focus:bg-purple-500/10">
                          🚀 Advanced - Students with strong foundation
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-2">
                      All students enrolling will start at this level. Proficiency adapts based on test performance.
                    </p>
                  </div>
                  
                  <Button 
                    className="w-full" 
                    onClick={handleStep1}
                    disabled={isProcessingStep}
                  >
                    {isProcessingStep ? 'Processing...' : 'Next'}
                  </Button>
                </div>
              )}

              {/* Step 2: Course Plan */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-foreground">Upload Course Plan (JSON)</label>
                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center bg-card/50">
                      <input
                        type="file"
                        accept=".json"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            setCoursePlanFile(e.target.files[0]);
                          }
                        }}
                        style={{ display: 'none' }}
                        id="plan-file"
                        disabled={isProcessingStep}
                      />
                      <label htmlFor="plan-file" className="cursor-pointer">
                        <FileText className="mx-auto mb-2 w-8 h-8 text-primary" />
                        {coursePlanFile ? (
                          <span className="block font-medium text-foreground">{coursePlanFile.name}</span>
                        ) : (
                          <>
                            <span className="block font-medium text-foreground">Click to upload course plan</span>
                            <span className="block text-sm text-muted-foreground">JSON file</span>
                          </>
                        )}
                      </label>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline"
                      className="flex-1" 
                      onClick={() => setCurrentStep(1)}
                      disabled={isProcessingStep}
                    >
                      Back
                    </Button>
                    <Button 
                      className="flex-1" 
                      onClick={handleStep2}
                      disabled={isProcessingStep}
                    >
                      {isProcessingStep ? 'Processing...' : 'Next'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 3: Course Materials (ZIP) - TEMPORARILY DISABLED */}
              {/* Materials upload feature disabled - will be re-enabled later */}

              {/* Step 4: Course Objectives */}
              {currentStep === 4 && (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="objectives" className="block text-sm font-medium mb-2 text-foreground">Course Objectives</label>
                    <textarea
                      id="objectives"
                      placeholder="Enter course objectives (one per line or comma-separated)"
                      value={courseObjectives}
                      onChange={(e) => setCourseObjectives(e.target.value)}
                      disabled={isProcessingStep}
                      className="w-full p-3 border border-border rounded-lg min-h-32 bg-background text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline"
                      className="flex-1" 
                      onClick={() => setCurrentStep(2)}
                      disabled={isProcessingStep}
                    >
                      Back
                    </Button>
                    <Button 
                      className="flex-1" 
                      onClick={handleStep4}
                      disabled={isProcessingStep}
                    >
                      {isProcessingStep ? 'Processing...' : 'Next'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 5: Roster */}
              {currentStep === 5 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-foreground">Upload Class Roster (CSV)</label>
                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center bg-card/50">
                      <input
                        type="file"
                        accept=".csv"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            setRosterFile(e.target.files[0]);
                          }
                        }}
                        style={{ display: 'none' }}
                        id="roster-file-step4"
                        disabled={isProcessingStep}
                      />
                      <label htmlFor="roster-file-step4" className="cursor-pointer">
                        <FileText className="mx-auto mb-2 w-8 h-8 text-primary" />
                        {rosterFile ? (
                          <span className="block font-medium text-foreground">{rosterFile.name}</span>
                        ) : (
                          <>
                            <span className="block font-medium text-foreground">Click to upload roster</span>
                            <span className="block text-sm text-muted-foreground">CSV with columns: studentName, emailID</span>
                          </>
                        )}
                      </label>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline"
                      className="flex-1" 
                      onClick={() => setCurrentStep(4)}
                      disabled={isProcessingStep}
                    >
                      Back
                    </Button>
                    <Button 
                      className="flex-1" 
                      onClick={handleStep5}
                      disabled={isProcessingStep}
                    >
                      {isProcessingStep ? 'Creating Course...' : 'Create Course'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Analytics Section */}
          {showAnalytics && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="space-y-8"
            >
              {/* Header */}
              <div className="text-center space-y-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                >
                  <BarChart3 className="mx-auto w-16 h-16 text-primary drop-shadow-lg" />
                </motion.div>
                <h1 className="text-5xl font-bold gradient-text">Course Analytics</h1>
                <p className="text-lg text-muted-foreground">Comprehensive insights into student performance</p>
              </div>

              {/* Course Selector */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex gap-4 items-center justify-center"
              >
                <label className="font-semibold text-lg text-foreground">Course:</label>
                <Select
                  value={analyticsCourse?._id || ''}
                  onValueChange={(value) => {
                    const course = courses.find(c => c._id === value);
                    if (course) {
                      setAnalyticsCourse(course);
                      fetchAnalytics(course._id);
                    }
                  }}
                >
                  <SelectTrigger className="w-[300px] border-2 border-primary/30 shadow-md hover:shadow-lg transition-all">
                    <SelectValue placeholder="Select a course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((course) => (
                      <SelectItem key={course._id} value={course._id}>
                        {course.course_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </motion.div>

              {isLoadingAnalytics ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <BarChart3 className="w-16 h-16 text-primary" />
                  </motion.div>
                  <p className="mt-4 text-lg text-muted-foreground">Loading analytics...</p>
                </div>
              ) : analyticsData ? (
                <div className="space-y-8">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      whileHover={{ scale: 1.05, y: -5 }}
                      className="relative overflow-hidden border-2 border-blue-200 rounded-2xl p-6 bg-gradient-to-br from-blue-50 to-blue-100 shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      <div className="absolute top-0 right-0 w-20 h-20 bg-blue-200 rounded-full -mr-10 -mt-10 opacity-50" />
                      <Users className="w-10 h-10 text-blue-600 mb-3" />
                      <div className="text-sm font-medium text-blue-700 mb-1">Total Enrolled</div>
                      <div className="text-4xl font-bold text-blue-700">
                        {analyticsData.summary.total_enrolled}
                      </div>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      whileHover={{ scale: 1.05, y: -5 }}
                      className="relative overflow-hidden border-2 border-green-200 rounded-2xl p-6 bg-gradient-to-br from-green-50 to-green-100 shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      <div className="absolute top-0 right-0 w-20 h-20 bg-green-200 rounded-full -mr-10 -mt-10 opacity-50" />
                      <Award className="w-10 h-10 text-green-600 mb-3" />
                      <div className="text-sm font-medium text-green-700 mb-1">Active Students</div>
                      <div className="text-4xl font-bold text-green-700">
                        {analyticsData.summary.students_with_tests}
                      </div>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      whileHover={{ scale: 1.05, y: -5 }}
                      className="relative overflow-hidden border-2 border-purple-200 rounded-2xl p-6 bg-gradient-to-br from-purple-50 to-purple-100 shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      <div className="absolute top-0 right-0 w-20 h-20 bg-purple-200 rounded-full -mr-10 -mt-10 opacity-50" />
                      <Zap className="w-10 h-10 text-purple-600 mb-3" />
                      <div className="text-sm font-medium text-purple-700 mb-1">Tests Taken</div>
                      <div className="text-4xl font-bold text-purple-700">
                        {analyticsData.summary.total_tests_taken}
                      </div>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      whileHover={{ scale: 1.05, y: -5 }}
                      className="relative overflow-hidden border-2 border-orange-200 rounded-2xl p-6 bg-gradient-to-br from-orange-50 to-orange-100 shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      <div className="absolute top-0 right-0 w-20 h-20 bg-orange-200 rounded-full -mr-10 -mt-10 opacity-50" />
                      <Target className="w-10 h-10 text-orange-600 mb-3" />
                      <div className="text-sm font-medium text-orange-700 mb-1">Topics Covered</div>
                      <div className="text-4xl font-bold text-orange-700">
                        {analyticsData.summary.total_topics_tested}
                      </div>
                    </motion.div>
                  </div>

                  {/* Enrolled Students Section */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45 }}
                    className="bg-card/80 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-border"
                  >
                    <div className="flex items-center gap-3 mb-6">
                      <Users className="w-8 h-8 text-primary" />
                      <div>
                        <h2 className="text-2xl font-bold text-foreground">Enrolled Students</h2>
                        <p className="text-sm text-muted-foreground">
                          {enrolledStudents.length} student{enrolledStudents.length !== 1 ? 's' : ''} enrolled in this course
                        </p>
                      </div>
                    </div>
                    
                    {enrolledStudents.length > 0 ? (
                      <div className="border border-border rounded-xl overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/50 border-b border-border">
                              <TableHead className="font-bold text-foreground">Username</TableHead>
                              <TableHead className="font-bold text-foreground">Email</TableHead>
                              <TableHead className="font-bold text-foreground">Proficiency Level</TableHead>
                              <TableHead className="font-bold text-foreground">Enrolled Date</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {enrolledStudents.map((student, idx) => (
                              <motion.tr
                                key={student.username}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="hover:bg-muted/30 transition-colors border-b border-border/50"
                              >
                                <TableCell className="font-semibold text-foreground">
                                  {student.username}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {student.email || 'N/A'}
                                </TableCell>
                                <TableCell>
                                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                    student.proficiency_level === 'advanced' 
                                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                      : student.proficiency_level === 'intermediate'
                                      ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                  }`}>
                                    {student.proficiency_level}
                                  </span>
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {student.enrolled_at 
                                    ? new Date(student.enrolled_at).toLocaleDateString()
                                    : 'N/A'}
                                </TableCell>
                              </motion.tr>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No students enrolled yet</p>
                      </div>
                    )}
                  </motion.div>

                  {/* AI Course Report Section */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950 dark:to-purple-950 rounded-2xl p-8 shadow-xl border-2 border-indigo-200 dark:border-indigo-800"
                  >
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-indigo-500 rounded-lg">
                          <FileText className="w-8 h-8 text-white" />
                        </div>
                        <div>
                          <h2 className="text-3xl font-bold text-foreground">AI Course Report</h2>
                          <p className="text-sm text-muted-foreground mt-1">
                            Get comprehensive AI-powered insights about class performance
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={generateCourseReport}
                        disabled={isGeneratingReport}
                        size="lg"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg"
                      >
                        {isGeneratingReport ? (
                          <>
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              className="mr-2"
                            >
                              <Zap className="w-5 h-5" />
                            </motion.div>
                            Generating...
                          </>
                        ) : (
                          <>
                            <Zap className="w-5 h-5 mr-2" />
                            Generate Report
                          </>
                        )}
                      </Button>
                    </div>

                    <AnimatePresence>
                      {showReport && courseReport && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.4 }}
                          className="mt-6"
                        >
                          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-indigo-100 dark:border-indigo-900 overflow-hidden">
                            {/* Report Header */}
                            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 text-white">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h3 className="text-xl font-bold flex items-center gap-2">
                                    <BarChart3 className="w-5 h-5" />
                                    Course Performance Report
                                  </h3>
                                  <p className="text-indigo-100 text-sm mt-1">
                                    {reportMeta?.course_name}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs text-indigo-200">Generated on</p>
                                  <p className="text-sm font-medium">
                                    {reportMeta?.generated_at 
                                      ? new Date(reportMeta.generated_at).toLocaleDateString('en-US', {
                                          weekday: 'long',
                                          year: 'numeric',
                                          month: 'long',
                                          day: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })
                                      : 'N/A'}
                                  </p>
                                </div>
                              </div>
                            </div>
                            
                            {/* Report Content */}
                            <div className="p-6">
                              <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:text-indigo-700 dark:prose-headings:text-indigo-400 prose-h2:text-lg prose-h2:font-bold prose-h2:border-b prose-h2:border-indigo-200 dark:prose-h2:border-indigo-800 prose-h2:pb-2 prose-h2:mb-3 prose-ul:my-2 prose-li:my-0.5">
                                {courseReport.split('\n').map((line, idx) => {
                                  // Handle headers
                                  if (line.startsWith('## ')) {
                                    return (
                                      <h2 key={idx} className="text-lg font-bold text-indigo-700 dark:text-indigo-400 border-b border-indigo-200 dark:border-indigo-800 pb-2 mb-3 mt-6 first:mt-0">
                                        {line.replace('## ', '')}
                                      </h2>
                                    );
                                  }
                                  // Handle bullet points
                                  if (line.startsWith('- ')) {
                                    return (
                                      <div key={idx} className="flex items-start gap-2 my-1 text-foreground">
                                        <span className="text-indigo-500 mt-1">•</span>
                                        <span>{line.replace('- ', '')}</span>
                                      </div>
                                    );
                                  }
                                  // Handle bold text
                                  if (line.startsWith('**') && line.endsWith('**')) {
                                    return (
                                      <p key={idx} className="font-semibold text-foreground my-2">
                                        {line.replace(/\*\*/g, '')}
                                      </p>
                                    );
                                  }
                                  // Regular text
                                  if (line.trim()) {
                                    return (
                                      <p key={idx} className="text-foreground my-2 leading-relaxed">
                                        {line}
                                      </p>
                                    );
                                  }
                                  return null;
                                })}
                              </div>
                            </div>
                            
                            {/* Report Footer */}
                            <div className="bg-gray-50 dark:bg-gray-800 px-6 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                              <p className="text-xs text-muted-foreground">
                                AI-generated report based on student test performance data
                              </p>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowReport(false)}
                                className="text-muted-foreground hover:text-foreground"
                              >
                                Close Report
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {!showReport && !isGeneratingReport && (
                      <div className="text-center py-8 text-muted-foreground">
                        <p className="text-lg">Click "Generate Report" to get AI-powered insights about your class performance</p>
                        <p className="text-sm mt-2">Analysis includes topic trends, proficiency distribution, and actionable recommendations</p>
                      </div>
                    )}
                  </motion.div>

                  {/* Topic Analytics with Charts */}
                  {analyticsData.topic_analytics.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className="space-y-6"
                    >
                      <div className="flex items-center gap-3">
                        <TrendingUp className="w-8 h-8 text-primary" />
                        <h2 className="text-3xl font-bold">Topic Performance</h2>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        📊 Topics sorted by average score - struggling topics highlighted in red
                      </p>

                      {/* Bar Chart */}
                      <div className="bg-card/80 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-border">
                        <h3 className="text-xl font-semibold mb-4 text-foreground">Performance Overview</h3>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={analyticsData.topic_analytics.slice(0, 10)}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis 
                              dataKey="topic" 
                              angle={-45}
                              textAnchor="end"
                              height={100}
                              tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }}
                            />
                            <YAxis 
                              domain={[0, 100]} 
                              tick={{ fill: 'hsl(var(--foreground))' }}
                            />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'hsl(var(--card))', 
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '12px',
                                padding: '12px',
                                color: 'hsl(var(--foreground))'
                              }}
                            />
                            <Legend wrapperStyle={{ color: 'hsl(var(--foreground))' }} />
                            <Bar 
                              dataKey="average_score" 
                              name="Average Score (%)"
                              fill="hsl(var(--primary))"
                              radius={[8, 8, 0, 0]}
                            >
                              {analyticsData.topic_analytics.map((entry: any, index: number) => (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={entry.average_score < 60 ? '#ef4444' : entry.average_score < 80 ? '#f59e0b' : '#10b981'} 
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Detailed Topic Table */}
                      <div className="border border-border rounded-2xl overflow-hidden shadow-lg bg-card/80 backdrop-blur-xl">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/50 border-b border-border">
                              <TableHead className="font-bold text-foreground">Topic</TableHead>
                              <TableHead className="font-bold text-foreground">Students</TableHead>
                              <TableHead className="font-bold text-foreground">Attempts</TableHead>
                              <TableHead className="font-bold text-foreground">Avg Score</TableHead>
                              <TableHead className="font-bold text-foreground">Highest</TableHead>
                              <TableHead className="font-bold text-foreground">Lowest</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {analyticsData.topic_analytics.map((topic: any, idx: number) => (
                              <motion.tr
                                key={idx}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className={`${
                                  topic.average_score < 60 
                                    ? 'bg-red-500/10 hover:bg-red-500/20' 
                                    : 'hover:bg-muted/30'
                                } transition-colors border-b border-border/50`}
                              >
                                <TableCell className="font-semibold text-foreground">
                                  {topic.average_score < 60 && (
                                    <TrendingDown className="inline w-4 h-4 text-red-500 mr-2" />
                                  )}
                                  {topic.topic}
                                </TableCell>
                                <TableCell className="text-foreground">{topic.students_tested}</TableCell>
                                <TableCell className="text-foreground">{topic.total_attempts}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <div className={`text-lg font-bold ${getScoreColor(topic.average_score)}`}>
                                      {topic.average_score.toFixed(1)}%
                                    </div>
                                    <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                                      <div 
                                        className={`h-full ${
                                          topic.average_score >= 80 ? 'bg-green-500' : 
                                          topic.average_score >= 60 ? 'bg-yellow-500' : 
                                          'bg-red-500'
                                        }`}
                                        style={{ width: `${topic.average_score}%` }}
                                      />
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-green-500 font-semibold">
                                  {topic.highest_score.toFixed(1)}%
                                </TableCell>
                                <TableCell className="text-red-500 font-semibold">
                                  {topic.lowest_score.toFixed(1)}%
                                </TableCell>
                              </motion.tr>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </motion.div>
                  )}

                  {/* Student Analytics */}
                  {analyticsData.student_analytics.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 }}
                      className="space-y-6"
                    >
                      <div className="flex items-center gap-3">
                        <Users className="w-8 h-8 text-primary" />
                        <h2 className="text-3xl font-bold text-foreground">Student Performance</h2>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        👥 Click on a student to see detailed topic-wise breakdown and test history
                      </p>

                      <div className="border border-border rounded-2xl overflow-hidden shadow-lg bg-card/80 backdrop-blur-xl">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/50 border-b border-border">
                              <TableHead className="w-12 font-bold text-foreground"></TableHead>
                              <TableHead className="font-bold text-foreground">Student</TableHead>
                              <TableHead className="font-bold text-foreground">Level</TableHead>
                              <TableHead className="font-bold text-foreground">Tests</TableHead>
                              <TableHead className="font-bold text-foreground">Overall Score</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {analyticsData.student_analytics.map((student: any, studentIdx: number) => (
                              <>
                                <motion.tr
                                  key={student.student_username}
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: studentIdx * 0.05 }}
                                  className="cursor-pointer hover:bg-muted/30 transition-all duration-300 border-b border-border/50"
                                  onClick={() => toggleStudentExpand(student.student_username)}
                                >
                                  <TableCell>
                                    <motion.div
                                      animate={{ rotate: expandedStudents.has(student.student_username) ? 180 : 0 }}
                                      transition={{ duration: 0.3 }}
                                    >
                                      <ChevronDown className="w-5 h-5 text-primary" />
                                    </motion.div>
                                  </TableCell>
                                  <TableCell className="font-semibold text-lg text-foreground">{student.student_username}</TableCell>
                                  <TableCell>
                                    {student.current_proficiency ? (
                                      <div className="flex items-center gap-2">
                                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                          student.current_proficiency === 'advanced' ? 'bg-purple-500/20 text-purple-400' :
                                          student.current_proficiency === 'intermediate' ? 'bg-blue-500/20 text-blue-400' :
                                          'bg-green-500/20 text-green-400'
                                        }`}>
                                          {student.current_proficiency}
                                        </span>
                                      </div>
                                    ) : (
                                      <Select
                                        disabled={settingProficiency === student.student_username}
                                        onValueChange={(value) => handleSetProficiency(student.student_username, value)}
                                      >
                                        <SelectTrigger className="w-[180px] bg-yellow-500/10 border-yellow-500/30 text-yellow-400">
                                          <SelectValue placeholder="⏳ Set Level" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-popover border-border">
                                          <SelectItem value="beginner" className="text-green-400 focus:text-green-400 focus:bg-green-500/10">🌱 Beginner</SelectItem>
                                          <SelectItem value="intermediate" className="text-blue-400 focus:text-blue-400 focus:bg-blue-500/10">⚡ Intermediate</SelectItem>
                                          <SelectItem value="advanced" className="text-purple-400 focus:text-purple-400 focus:bg-purple-500/10">🚀 Advanced</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    )}
                                  </TableCell>
                                  <TableCell className="font-medium text-foreground">{student.total_tests}</TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-3">
                                      <div className={`text-xl font-bold ${getScoreColor(student.overall_percentage)}`}>
                                        {student.overall_percentage.toFixed(1)}%
                                      </div>
                                      <div className="w-24 h-3 bg-muted rounded-full overflow-hidden">
                                        <motion.div 
                                          initial={{ width: 0 }}
                                          animate={{ width: `${student.overall_percentage}%` }}
                                          transition={{ duration: 1, delay: studentIdx * 0.1 }}
                                          className={`h-full ${
                                            student.overall_percentage >= 80 ? 'bg-green-500' : 
                                            student.overall_percentage >= 60 ? 'bg-yellow-500' : 
                                            'bg-red-500'
                                          }`}
                                        />
                                      </div>
                                    </div>
                                  </TableCell>
                                </motion.tr>

                                {/* Expandable Details */}
                                <AnimatePresence>
                                  {expandedStudents.has(student.student_username) && (
                                    <motion.tr
                                      initial={{ opacity: 0, height: 0 }}
                                      animate={{ opacity: 1, height: "auto" }}
                                      exit={{ opacity: 0, height: 0 }}
                                      transition={{ duration: 0.3 }}
                                    >
                                      <TableCell colSpan={5} className="bg-muted/30 p-8 border-b border-border">
                                        <div className="space-y-6">
                                          {/* Topic Breakdown */}
                                          <div>
                                            <h4 className="text-2xl font-bold mb-4 flex items-center gap-2 text-foreground">
                                              <Target className="w-6 h-6 text-primary" />
                                              Topic Breakdown
                                            </h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                              {student.topics_breakdown.map((topic: any, topicIdx: number) => (
                                                <motion.div
                                                  key={topicIdx}
                                                  initial={{ opacity: 0, scale: 0.8 }}
                                                  animate={{ opacity: 1, scale: 1 }}
                                                  transition={{ delay: topicIdx * 0.1 }}
                                                  className="border border-border rounded-xl p-5 bg-card shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105"
                                                >
                                                  <div className="font-bold text-lg mb-3 text-foreground">{topic.topic}</div>
                                                  <div className="grid grid-cols-2 gap-3 text-sm">
                                                    <div className="bg-blue-500/10 p-2 rounded-lg">
                                                      <span className="text-muted-foreground block text-xs">Attempts</span>
                                                      <span className="font-bold text-blue-400">{topic.attempts}</span>
                                                    </div>
                                                    <div className="bg-green-500/10 p-2 rounded-lg">
                                                      <span className="text-muted-foreground block text-xs">Best</span>
                                                      <span className="font-bold text-green-400">{topic.best_score.toFixed(1)}%</span>
                                                    </div>
                                                    <div className="bg-purple-500/10 p-2 rounded-lg">
                                                      <span className="text-muted-foreground block text-xs">Average</span>
                                                      <span className={`font-bold ${getScoreColor(topic.average_score)}`}>
                                                        {topic.average_score.toFixed(1)}%
                                                      </span>
                                                    </div>
                                                    <div className="bg-orange-500/10 p-2 rounded-lg">
                                                      <span className="text-muted-foreground block text-xs">Latest</span>
                                                      <span className={`font-bold ${getScoreColor(topic.latest_score)}`}>
                                                        {topic.latest_score.toFixed(1)}%
                                                      </span>
                                                    </div>
                                                  </div>
                                                </motion.div>
                                              ))}
                                            </div>
                                          </div>

                                          {/* Recent Tests */}
                                          <div>
                                            <h5 className="text-xl font-bold mb-3 flex items-center gap-2 text-foreground">
                                              <Zap className="w-5 h-5 text-primary" />
                                              Recent Test History
                                            </h5>
                                            <div className="border border-border rounded-xl overflow-hidden bg-card">
                                              <Table>
                                                <TableHeader>
                                                  <TableRow className="bg-muted/50 border-b border-border">
                                                    <TableHead className="font-bold text-foreground">Date</TableHead>
                                                    <TableHead className="font-bold text-foreground">Topic</TableHead>
                                                    <TableHead className="font-bold text-foreground">Score</TableHead>
                                                    <TableHead className="font-bold text-foreground">Level</TableHead>
                                                  </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                  {student.recent_tests.map((test: any, testIdx: number) => (
                                                    <TableRow key={testIdx} className="hover:bg-muted/30 border-b border-border/50">
                                                      <TableCell className="font-medium text-foreground">
                                                        {new Date(test.date).toLocaleDateString()}
                                                      </TableCell>
                                                      <TableCell className="text-foreground">{test.topic}</TableCell>
                                                      <TableCell>
                                                        <div className="flex items-center gap-2">
                                                          <span className={`font-bold ${getScoreColor(test.percentage)}`}>
                                                            {test.score}/{test.total}
                                                          </span>
                                                          <span className={`text-sm ${getScoreColor(test.percentage)}`}>
                                                            ({test.percentage.toFixed(1)}%)
                                                          </span>
                                                        </div>
                                                      </TableCell>
                                                      <TableCell>
                                                        <span className="px-2 py-1 bg-muted rounded-md text-sm font-medium text-foreground">
                                                          {test.proficiency}
                                                        </span>
                                                      </TableCell>
                                                    </TableRow>
                                                  ))}
                                                </TableBody>
                                              </Table>
                                            </div>
                                          </div>
                                        </div>
                                      </TableCell>
                                    </motion.tr>
                                  )}
                                </AnimatePresence>
                              </>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </motion.div>
                  )}

                  {analyticsData.topic_analytics.length === 0 && analyticsData.student_analytics.length === 0 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center py-16 bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl border-2 border-dashed border-gray-300"
                    >
                      <BarChart3 className="w-20 h-20 text-gray-400 mx-auto mb-4" />
                      <p className="text-xl text-gray-500 font-medium">No test data available yet</p>
                      <p className="text-sm text-gray-400 mt-2">Students need to take tests first</p>
                    </motion.div>
                  )}
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-16 bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl border-2 border-dashed border-gray-300"
                >
                  <BarChart3 className="w-20 h-20 text-gray-400 mx-auto mb-4" />
                  <p className="text-xl text-gray-500 font-medium">No analytics data available</p>
                </motion.div>
              )}
            </motion.div>
          )}
          
          {/* Upload Section - shown after course creation or when toggled */}
          {!showCourseCreation && !showCourseList && !showAnalytics && (
            <>
              <div className="text-center space-y-3">
                <h1 className="text-4xl font-medium text-foreground">Upload Your Course Material</h1>
                <p className="text-lg text-muted-foreground">Add your PDFs, slides, or notes for knowledge graph creation.</p>
              </div>
              <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer ${isDragging ? 'border-primary bg-primary/10' : 'border-muted'}`}>
                <input type="file" multiple accept=".pdf,.docx,.txt" style={{ display: 'none' }} id="file-upload" onChange={handleFileInput} />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <UploadIcon className="mx-auto mb-2 w-8 h-8 text-primary" />
                  <span className="block font-medium">Drag and drop or click to select files</span>
                  <span className="block text-sm text-muted-foreground">PDF, DOCX, TXT supported</span>
                </label>
              </div>
              {files.length > 0 && (
                <div className="mt-4">
                  <div className="font-semibold mb-2">Files to upload:</div>
                  <ul className="space-y-2">
                    {files.map((file, idx) => (
                      <li key={idx} className="flex items-center justify-between bg-muted rounded px-3 py-2">
                        <span><FileText className="inline-block mr-2 w-4 h-4" />{file.name}</span>
                        <Button variant="ghost" size="sm" onClick={() => removeFile(idx)}>Remove</Button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {files.length > 0 && (
                <Button className="w-full mt-4" onClick={() => handleFiles(files)} disabled={isUploading || isProcessing}>
                  {isUploading ? 'Uploading...' : isProcessing ? 'Processing...' : 'Upload & Create Knowledge Graph'}
                </Button>
              )}
              {graphCreated && (
                <div className="mt-8 text-green-600 text-lg font-semibold">Knowledge graph created</div>
              )}
            </>
          )}
        </div>
      </div>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Course</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the course
              <span className="font-semibold"> {courseToDelete?.course_name}</span> and remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4">
            <label htmlFor="delete-confirm" className="block text-sm font-medium mb-2">
              Type the course name to confirm deletion:
            </label>
            <Input
              id="delete-confirm"
              type="text"
              placeholder={courseToDelete?.course_name}
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              disabled={isDeleting}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} onClick={() => {
              setDeleteConfirmText("");
              setCourseToDelete(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteConfirm();
              }}
              disabled={isDeleting || deleteConfirmText !== courseToDelete?.course_name}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete Course"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Knowledge Graph Modal */}
      {showKnowledgeGraph && selectedCourse && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Knowledge Graph - {selectedCourse.course_name}</h2>
              <button
                onClick={() => {
                  setShowKnowledgeGraph(false);
                  setSelectedCourse(null);
                  setShowCourseList(true);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-lg mb-2">Course Topics</h3>
                <p className="text-sm text-gray-600">Set the importance factor for each topic relative to the course objectives (1-10)</p>
              </div>

              {graphData.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No topics found. Please upload a course plan first.</p>
              ) : (
                <div className="space-y-3">
                  {graphData.map((item, index) => (
                    <div key={index} className="border rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition">
                      <div className="flex justify-between items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-800 truncate">{item.objective}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min="1"
                            max="10"
                            value={item.importance}
                            onChange={(e) => handleImportanceChange(index, parseInt(e.target.value))}
                            className="w-32"
                          />
                          <span className="bg-primary text-white rounded-full w-10 h-10 flex items-center justify-center font-semibold flex-shrink-0">
                            {item.importance}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowKnowledgeGraph(false);
                    setSelectedCourse(null);
                    setShowCourseList(true);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSaveKnowledgeGraph}
                  disabled={graphData.length === 0}
                >
                  Save Knowledge Graph
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Prof;
