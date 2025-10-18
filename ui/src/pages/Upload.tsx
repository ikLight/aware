import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Upload as UploadIcon, FileText, CheckCircle2, Eye, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { GraphVisualization } from "@/components/GraphVisualization";

const Upload = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { logout } = useAuth();
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showVisualization, setShowVisualization] = useState(false);
  
  useEffect(() => {
    // Check for authentication
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
    }
  }, [navigate]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      handleFiles(selectedFiles);
    }
  };

  const handleFiles = async (newFiles: File[]) => {
    const validFiles = newFiles.filter(file => {
      const validTypes = ['.pdf', '.docx', '.txt'];
      const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
      return validTypes.includes(fileExt);
    });

    if (validFiles.length !== newFiles.length) {
      toast({
        title: "Invalid file type",
        description: "Only PDF, DOCX, and TXT files are supported.",
        variant: "destructive",
      });
      return;
    }

    try {
      setFiles(prev => [...prev, ...validFiles]);
      setIsUploading(true);
      
      // Upload files to backend
      const formData = new FormData();
      validFiles.forEach(file => formData.append('files', file));
      
      // Get token from localStorage
      const token = localStorage.getItem('token');
      
      const response = await fetch('http://localhost:8000/upload', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      setIsProcessing(true);
      toast({
        title: "Files uploaded",
        description: "Analyzing your study materials...",
      });

      const data = await response.json();
      
      // Store the paths returned from the server
      localStorage.setItem('courseMaterialPath', data.course_material);
      localStorage.setItem('proficiencyPath', data.proficiency);
      localStorage.setItem('knowledgeGraphPath', data.knowledge_graph);

      toast({
        title: "Analysis complete",
        description: "Your study materials have been processed successfully!",
      });

      // Navigate to test page after successful processing
      navigate("/test");

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Error",
        description: "There was an error processing your files.",
        variant: "destructive",
      });
      // Remove the files from state since upload failed
      setFiles(prev => prev.filter(f => !validFiles.includes(f)));
    } finally {
      setIsUploading(false);
      setIsProcessing(false);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
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
              Upload Your Study Material
            </h1>
            <p className="text-lg text-muted-foreground">
              Add your PDFs, slides, or notes so Aware can understand what you're studying.
            </p>
          </div>

          {/* Upload Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`bg-card rounded-2xl shadow-lg p-12 border-2 border-dashed transition-all ${
              isDragging
                ? "border-primary bg-primary-light/10"
                : "border-border hover:border-primary/50"
            }`}
          >
            <input
              type="file"
              id="file-upload"
              multiple
              accept=".pdf,.docx,.txt"
              onChange={handleFileInput}
              className="hidden"
            />
            <label
              htmlFor="file-upload"
              className="flex flex-col items-center cursor-pointer space-y-4"
            >
              <div className="bg-primary-light/30 rounded-full p-6">
                <UploadIcon className="w-12 h-12 text-primary" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-lg font-medium text-foreground">
                  Drag & Drop your files here
                </p>
                <p className="text-sm text-muted-foreground">
                  or click to browse
                </p>
                <p className="text-xs text-muted-foreground">
                  Supported formats: PDF, DOCX, TXT
                </p>
              </div>
            </label>
          </div>

          {/* Uploaded Files List */}
          {files.length > 0 && (
            <div className="bg-card rounded-2xl shadow-lg p-6 border border-border space-y-3">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-5 h-5 text-accent" />
                <p className="font-medium text-foreground">
                  {files.length} file(s) {isProcessing ? "being analyzed" : "uploaded"}
                </p>
                {(isUploading || isProcessing) && (
                  <div className="ml-2 animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                )}
              </div>
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-secondary rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-primary" />
                    <span className="text-sm text-foreground">{file.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                    className="text-destructive hover:text-destructive/80"
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Navigation */}
      {files.length > 0 && !isUploading && !isProcessing && (
        <div className="fixed bottom-8 right-8 flex gap-4">
          <Button
            onClick={() => setShowVisualization(true)}
            className="bg-secondary hover:bg-secondary/90 text-secondary-foreground rounded-full px-6 py-6 text-lg shadow-lg hover:shadow-xl transition-all"
          >
            Preview Knowledge Graph
            <Eye className="ml-2 w-5 h-5" />
          </Button>
          <Button
            onClick={() => navigate("/test")}
            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-8 py-6 text-lg shadow-lg hover:shadow-xl transition-all"
          >
            Continue to Test
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      )}

      {/* Visualization Modal */}
      {showVisualization && (
        <GraphVisualization onClose={() => setShowVisualization(false)} />
      )}
    </div>
  );
};

export default Upload;
