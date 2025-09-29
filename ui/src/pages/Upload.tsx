import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, FileText, FileImage, Book } from "lucide-react";
import { useNavigate } from "react-router-dom";

const UploadPage = () => {
  const navigate = useNavigate();

  const handleNext = () => {
    navigate("/knowledge-level");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="container max-w-4xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Start Your Learning Journey
          </h1>
          <p className="text-xl text-muted-foreground">
            Upload your study materials and let AI create a personalized learning plan
          </p>
        </div>

        {/* Upload Card */}
        <Card className="p-8 bg-gradient-card shadow-card border-0 mb-8">
          <div className="border-2 border-dashed border-muted rounded-xl p-12 text-center hover:border-primary/50 transition-all duration-300 cursor-pointer group">
            <div className="mb-6">
              <Upload className="w-16 h-16 text-primary mx-auto mb-4 group-hover:scale-110 transition-transform duration-300" />
            </div>
            
            <h3 className="text-2xl font-semibold text-foreground mb-4">
              Drop files here or click to browse
            </h3>
            
            <div className="flex items-center justify-center gap-6 mb-6">
              <div className="flex items-center gap-2 text-muted-foreground">
                <FileText className="w-5 h-5" />
                <span>PDF</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <FileImage className="w-5 h-5" />
                <span>PPT</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Book className="w-5 h-5" />
                <span>DOCX</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <FileText className="w-5 h-5" />
                <span>TXT</span>
              </div>
            </div>
            
            <Button variant="outline" size="lg" className="mb-4">
              Choose Files
            </Button>
            
            <p className="text-sm text-muted-foreground">
              💡 Upload your study material
            </p>
          </div>
        </Card>

        {/* CTA Button */}
        <div className="text-center">
          <Button 
            size="lg" 
            onClick={handleNext}
            className="px-8 py-4 text-lg font-semibold shadow-soft hover:shadow-hover"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UploadPage;