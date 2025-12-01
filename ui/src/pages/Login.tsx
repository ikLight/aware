import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Infinity, Sparkles, Lock, User } from "lucide-react";

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await login(
        formData.username,
        formData.password
      );
      
      // The login function already stores token and returns role
      const role = (response as any).role || localStorage.getItem("userRole");
      
      toast({
        title: "Login successful",
        description: "Welcome back to Loop!",
      });
      
      if (role) {
        localStorage.setItem("userRole", role);
      }
      
      // Navigate based on role
      if (role === "professor") {
        navigate("/prof");
      } else {
        navigate("/student");
      }
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "Invalid username or password.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-72 h-72 bg-gradient-to-br from-violet-600/30 to-fuchsia-600/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-gradient-to-br from-cyan-600/25 to-blue-600/20 rounded-full blur-3xl animate-pulse" />
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100px_100px]" />
      </div>

      {/* Back Button */}
      <div className="p-6 relative z-10">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="rounded-full hover:scale-105 transition-transform backdrop-blur-md bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
        <div className="max-w-md w-full space-y-8">
          {/* Logo & Title */}
          <div className="text-center space-y-6">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-violet-600 via-fuchsia-500 to-cyan-500 rounded-3xl shadow-2xl border border-white/20">
              <Infinity className="w-14 h-14 text-white drop-shadow-lg" strokeWidth={2.5} />
            </div>
            
            <div>
              <h1 className="text-5xl font-black mb-2">
                <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
                  Welcome Back
                </span>
              </h1>
              <p className="text-lg text-slate-400 flex items-center justify-center gap-2">
                <Sparkles className="w-5 h-5 text-fuchsia-400" />
                Continue your learning journey
              </p>
            </div>
          </div>

          {/* Login Form */}
          <div>
            <form onSubmit={handleSubmit} className="space-y-6 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/10">
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Username</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <Input
                      type="text"
                      placeholder="Enter your username"
                      value={formData.username}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          username: e.target.value,
                        }))
                      }
                      required
                      className="pl-12 h-12 text-base bg-white/5 border-white/10 focus:border-fuchsia-500/50 text-white placeholder:text-slate-500 transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <Input
                      type="password"
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          password: e.target.value,
                        }))
                      }
                      required
                      className="pl-12 h-12 text-base bg-white/5 border-white/10 focus:border-fuchsia-500/50 text-white placeholder:text-slate-500 transition-all"
                    />
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500 hover:opacity-90 transition-all shadow-lg shadow-violet-500/25 hover:shadow-fuchsia-500/30 hover:scale-[1.02] border-0 text-white font-semibold"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Sign In
                  </>
                )}
              </Button>

              <div className="text-center text-sm text-slate-400">
                Don't have an account?{" "}
                <Button
                  variant="link"
                  className="p-0 h-auto font-semibold text-fuchsia-400 hover:text-fuchsia-300"
                  onClick={() => navigate("/register")}
                >
                  Register here
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;