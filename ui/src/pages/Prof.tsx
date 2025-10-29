import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload as UploadIcon, FileText, LogOut, BookOpen, List, Trash2, CheckCircle2, Circle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
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

type CourseCreationStep = 1 | 2 | 3 | 4;

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
  
  // Step 2: Course plan
  const [coursePlanFile, setCoursePlanFile] = useState<File | null>(null);
  
  // Step 3: Course objectives
  const [courseObjectives, setCourseObjectives] = useState("");
  
  // Step 4: Roster
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
        body: JSON.stringify({ course_name: courseName })
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
      setCurrentStep(3);
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
      setCurrentStep(4);
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

  const handleStep4 = async () => {
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
      setCoursePlanFile(null);
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
    fetchCourses();
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
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="text-2xl font-semibold mt-20">Access Denied</div>
        <div className="mt-4 text-muted-foreground">Only professors can access this page.</div>
        <Button className="mt-8" onClick={async () => { await logout(); navigate('/login'); }}>Logout</Button>
      </div>
    );
  }  return (
    <div className="min-h-screen flex flex-col page-transition">
      <div className="p-6 flex justify-between items-center">
        <div className="text-lg font-semibold text-primary">Prof Dashboard</div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => {
              setShowCourseCreation(true);
              setShowCourseList(false);
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
                {[1, 2, 3, 4].map((step) => (
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
                    <span className="text-xs font-medium text-center">
                      {step === 1 && "Course Name"}
                      {step === 2 && "Course Plan"}
                      {step === 3 && "Objectives"}
                      {step === 4 && "Roster"}
                    </span>
                  </div>
                ))}
              </div>

              {/* Step 1: Course Name */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="course-name" className="block text-sm font-medium mb-2">Course Name</label>
                    <Input
                      id="course-name"
                      type="text"
                      placeholder="e.g., Machine Learning 101"
                      value={courseName}
                      onChange={(e) => setCourseName(e.target.value)}
                      disabled={isProcessingStep}
                    />
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
                    <label className="block text-sm font-medium mb-2">Upload Course Plan (JSON)</label>
                    <div className="border-2 border-dashed rounded-lg p-6 text-center">
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
                          <span className="block font-medium">{coursePlanFile.name}</span>
                        ) : (
                          <>
                            <span className="block font-medium">Click to upload course plan</span>
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

              {/* Step 3: Course Objectives */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="objectives" className="block text-sm font-medium mb-2">Course Objectives</label>
                    <textarea
                      id="objectives"
                      placeholder="Enter course objectives (one per line or comma-separated)"
                      value={courseObjectives}
                      onChange={(e) => setCourseObjectives(e.target.value)}
                      disabled={isProcessingStep}
                      className="w-full p-3 border rounded-lg min-h-32"
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
                      onClick={handleStep3}
                      disabled={isProcessingStep}
                    >
                      {isProcessingStep ? 'Processing...' : 'Next'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 4: Roster */}
              {currentStep === 4 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Upload Class Roster (CSV)</label>
                    <div className="border-2 border-dashed rounded-lg p-6 text-center">
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
                          <span className="block font-medium">{rosterFile.name}</span>
                        ) : (
                          <>
                            <span className="block font-medium">Click to upload roster</span>
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
                      onClick={() => setCurrentStep(3)}
                      disabled={isProcessingStep}
                    >
                      Back
                    </Button>
                    <Button 
                      className="flex-1" 
                      onClick={handleStep4}
                      disabled={isProcessingStep}
                    >
                      {isProcessingStep ? 'Creating Course...' : 'Create Course'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Upload Section - shown after course creation or when toggled */}
          {!showCourseCreation && !showCourseList && (
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
