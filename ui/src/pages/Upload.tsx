import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Upload as UploadIcon, FileText, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Upload = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);

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

  const handleFiles = (newFiles: File[]) => {
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
    }

    setFiles(prev => [...prev, ...validFiles]);
    
    if (validFiles.length > 0) {
      toast({
        title: "Files uploaded successfully",
        description: `${validFiles.length} file(s) added.`,
      });
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen flex flex-col page-transition">
      {/* Back Button */}
      <div className="p-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
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
                  {files.length} file(s) uploaded
                </p>
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
      <div className="p-6 flex justify-center">
        <Button
          size="lg"
          onClick={() => navigate("/test")}
          disabled={files.length === 0}
          className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-8 py-6 text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next: Knowledge Test
          <ArrowRight className="ml-2 w-5 h-5" />
        </Button>
      </div>
    </div>
  );
};

export default Upload;
