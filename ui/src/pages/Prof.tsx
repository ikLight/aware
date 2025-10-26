import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload as UploadIcon, FileText, LogOut, BookOpen, List, Trash2 } from "lucide-react";
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
  created_at: string;
  updated_at: string;
}

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
  
  // Course creation state
  const [showCourseCreation, setShowCourseCreation] = useState(true);
  const [courseName, setCourseName] = useState("");
  const [rosterFile, setRosterFile] = useState<File | null>(null);
  const [isCreatingCourse, setIsCreatingCourse] = useState(false);
  const [courseCreated, setCourseCreated] = useState(false);
  
  // Course viewing state
  const [showCourseList, setShowCourseList] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  
  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

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
      .then(data => { setUserRole(data.role); })
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

  const handleCreateCourse = async () => {
    if (!courseName.trim()) {
      toast({ title: "Error", description: "Please enter a course name.", variant: "destructive" });
      return;
    }
    if (!rosterFile) {
      toast({ title: "Error", description: "Please upload a class roster CSV file.", variant: "destructive" });
      return;
    }

    try {
      setIsCreatingCourse(true);
      const formData = new FormData();
      formData.append('course_name', courseName);
      formData.append('roster_file', rosterFile);

      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/course/create', {
        method: 'POST',
        body: formData,
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to create course');
      }

      const data = await response.json();
      toast({ 
        title: "Course created", 
        description: `${data.course_name} created with ${data.student_count} students.` 
      });
      
      setCourseCreated(true);
      setShowCourseCreation(false);
      setCourseName("");
      setRosterFile(null);
      // Refresh course list
      fetchCourses();
    } catch (error) {
      toast({ 
        title: "Error", 
        description: error instanceof Error ? error.message : "Failed to create course.", 
        variant: "destructive" 
      });
    } finally {
      setIsCreatingCourse(false);
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

  const handleRosterFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.name.endsWith('.csv')) {
        toast({ title: "Invalid file type", description: "Please upload a CSV file.", variant: "destructive" });
        return;
      }
      setRosterFile(file);
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
  }

  return (
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
                                onClick={() => {
                                  // TODO: Implement view roster functionality
                                  toast({ 
                                    title: "Roster", 
                                    description: `${course.roster?.length || 0} students enrolled` 
                                  });
                                }}
                              >
                                View Roster
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
          
          {/* Course Creation Section */}
          {showCourseCreation && !showCourseList && (
            <div className="space-y-6">
              <div className="text-center space-y-3">
                <BookOpen className="mx-auto w-12 h-12 text-primary" />
                <h1 className="text-4xl font-medium text-foreground">Create a Course</h1>
                <p className="text-lg text-muted-foreground">Start by creating a course and uploading the class roster.</p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="course-name" className="block text-sm font-medium mb-2">Course Name</label>
                  <Input
                    id="course-name"
                    type="text"
                    placeholder="e.g., Machine Learning 101"
                    value={courseName}
                    onChange={(e) => setCourseName(e.target.value)}
                    disabled={isCreatingCourse}
                  />
                </div>
                
                <div>
                  <label htmlFor="roster-file" className="block text-sm font-medium mb-2">Class Roster (CSV)</label>
                  <div className="border-2 border-dashed rounded-lg p-6 text-center">
                    <input
                      type="file"
                      id="roster-file"
                      accept=".csv"
                      onChange={handleRosterFileChange}
                      style={{ display: 'none' }}
                      disabled={isCreatingCourse}
                    />
                    <label htmlFor="roster-file" className="cursor-pointer">
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
                
                <Button 
                  className="w-full" 
                  onClick={handleCreateCourse}
                  disabled={isCreatingCourse}
                >
                  {isCreatingCourse ? 'Creating Course...' : 'Create Course'}
                </Button>
                
                <Button 
                  variant="outline"
                  className="w-full" 
                  onClick={handleViewCourses}
                >
                  View All Courses
                </Button>
              </div>
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
              
              {courseCreated && (
                <Button 
                  variant="outline" 
                  className="w-full mt-4" 
                  onClick={() => setShowCourseCreation(true)}
                >
                  Create Another Course
                </Button>
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
    </div>
  );
};

export default Prof;
