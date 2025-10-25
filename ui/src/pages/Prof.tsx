import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Upload as UploadIcon, FileText, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const Prof = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { logout } = useAuth();
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

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
    } catch (error) {
      toast({ title: "Error", description: "There was an error processing your files.", variant: "destructive" });
      setFiles(prev => prev.filter(f => !validFiles.includes(f)));
    } finally {
      setIsUploading(false); setIsProcessing(false);
    }
  };
  const removeFile = (index: number) => { setFiles(prev => prev.filter((_, i) => i !== index)); };

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
        <div className="text-lg font-semibold text-primary">Prof</div>
        <Button variant="outline" onClick={async () => { await logout(); navigate('/login'); }} className="rounded-full px-4">
          <LogOut className="w-4 h-4 mr-2" /> Logout
        </Button>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="max-w-2xl w-full space-y-8">
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
          {isProcessing === false && files.length === 0 && (
            <div className="mt-8 text-green-600 text-lg font-semibold">Knowledge graph created</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Prof;
