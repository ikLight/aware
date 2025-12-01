import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Infinity, User, Lock, UserCog, Sparkles } from "lucide-react";
import { register } from "@/services/api";

const Register = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    role: "student", // default role
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your passwords match.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const result = await register(formData.username, formData.password, formData.role);
      if (result) {
        toast({
          title: "Welcome to Loop!",
          description: "You can now login with your credentials.",
        });
        navigate("/login");
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
      // Clear the password fields on error
      setFormData(prev => ({
        ...prev,
        password: '',
        confirmPassword: ''
      }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-72 h-72 bg-gradient-to-br from-emerald-600/30 to-teal-600/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-gradient-to-br from-violet-600/25 to-fuchsia-600/20 rounded-full blur-3xl animate-pulse" />
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100px_100px]" />
      </div>

      {/* Back Button */}
      <div className="p-6 relative z-10">
        <Button
          variant="ghost"
          onClick={() => navigate("/login")}
          className="rounded-full hover:scale-105 transition-transform backdrop-blur-md bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Login
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
        <div className="max-w-md w-full space-y-8">
          {/* Logo & Title */}
          <div className="text-center space-y-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 rounded-3xl shadow-2xl border border-white/20">
              <Infinity className="w-12 h-12 text-white drop-shadow-lg" strokeWidth={2.5} />
            </div>
            
            <div>
              <h1 className="text-4xl font-black mb-2">
                <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
                  Join Loop
                </span>
              </h1>
              <p className="text-lg text-slate-400">
                Create your account to start learning
              </p>
            </div>
          </div>

          {/* Register Form */}
          <div>
            <form onSubmit={handleSubmit} className="space-y-5 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/10">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Username</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <Input
                      type="text"
                      placeholder="Choose a username"
                      value={formData.username}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          username: e.target.value,
                        }))
                      }
                      required
                      minLength={3}
                      className="pl-12 h-12 text-base bg-white/5 border-white/10 focus:border-teal-500/50 text-white placeholder:text-slate-500 transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <Input
                      type="password"
                      placeholder="Create a password"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          password: e.target.value,
                        }))
                      }
                      required
                      minLength={6}
                      className="pl-12 h-12 text-base bg-white/5 border-white/10 focus:border-teal-500/50 text-white placeholder:text-slate-500 transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <Input
                      type="password"
                      placeholder="Confirm your password"
                      value={formData.confirmPassword}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          confirmPassword: e.target.value,
                        }))
                      }
                      required
                      minLength={6}
                      className="pl-12 h-12 text-base bg-white/5 border-white/10 focus:border-teal-500/50 text-white placeholder:text-slate-500 transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">I am a</label>
                  <div className="relative">
                    <UserCog className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <select
                      id="role"
                      name="role"
                      value={formData.role}
                      onChange={handleChange}
                      className="w-full h-12 pl-12 pr-4 text-base bg-white/5 border border-white/10 focus:border-teal-500/50 text-white rounded-md transition-all appearance-none cursor-pointer"
                    >
                      <option value="student" className="bg-slate-800 text-white">Student</option>
                      <option value="professor" className="bg-slate-800 text-white">Professor</option>
                    </select>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:opacity-90 transition-all shadow-lg shadow-teal-500/25 hover:shadow-emerald-500/30 hover:scale-[1.02] border-0 text-white font-semibold mt-6"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Create Account
                  </>
                )}
              </Button>

              <div className="text-center text-sm text-slate-400">
                Already have an account?{" "}
                <Button
                  variant="link"
                  className="p-0 h-auto font-semibold text-teal-400 hover:text-teal-300"
                  onClick={() => navigate("/login")}
                >
                  Sign in here
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;