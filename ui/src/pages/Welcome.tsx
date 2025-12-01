import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, LogOut, Brain, Rocket, Target, TrendingUp, Award, Infinity, Zap, BookOpen } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

const Welcome = () => {
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuth();

  // Handle back button and prevent accessing welcome page when logged in
  useEffect(() => {
    const handleBackButton = async () => {
      if (isAuthenticated) {
        await logout();
        navigate('/login');
      }
    };

    handleBackButton();

    window.addEventListener('popstate', handleBackButton);
    return () => {
      window.removeEventListener('popstate', handleBackButton);
    };
  }, [isAuthenticated, logout, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Gradient orbs with CSS animation */}
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-gradient-to-br from-violet-600/30 to-fuchsia-600/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-cyan-600/25 to-blue-600/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-gradient-to-br from-emerald-500/20 to-teal-500/10 rounded-full blur-3xl" />
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100px_100px]" />
      </div>

      {/* Logout Button */}
      {isAuthenticated && (
        <div className="absolute top-6 right-6 z-10">
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              await logout();
              navigate('/login');
            }}
            className="rounded-full px-4 py-2 backdrop-blur-md bg-white/5 hover:bg-white/10 transition-all border border-white/10 text-white/80 hover:text-white"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      )}
      
      <div className="max-w-5xl w-full text-center space-y-12 relative z-10">
        {/* Hero Icon - Loop/Infinity Symbol */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-500 rounded-full blur-2xl opacity-60 scale-125 animate-pulse" />
            <div className="relative bg-gradient-to-br from-violet-600 via-fuchsia-500 to-cyan-500 rounded-3xl p-10 shadow-2xl border border-white/20">
              <Infinity className="w-24 h-24 text-white drop-shadow-lg" strokeWidth={2.5} />
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="space-y-6">
          <h1 className="text-8xl font-black tracking-tight">
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent drop-shadow-2xl">
              Loop
            </span>
          </h1>
          <p className="text-2xl text-slate-300 font-medium max-w-2xl mx-auto">
            The AI-powered learning platform that keeps you in the 
            <span className="text-transparent bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text font-bold"> continuous loop </span>
            of improvement.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <div className="group bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-xl rounded-2xl p-8 shadow-xl border border-white/10 hover:border-violet-500/50 transition-all duration-300 hover:scale-105 hover:-translate-y-2">
            <div className="bg-gradient-to-br from-violet-500 to-fuchsia-500 w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform">
              <Brain className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-white">AI-Powered Tests</h3>
            <p className="text-slate-400">Adaptive questions that match your proficiency level</p>
          </div>

          <div className="group bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-xl rounded-2xl p-8 shadow-xl border border-white/10 hover:border-cyan-500/50 transition-all duration-300 hover:scale-105 hover:-translate-y-2">
            <div className="bg-gradient-to-br from-cyan-500 to-blue-500 w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform">
              <BookOpen className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-white">Course Materials</h3>
            <p className="text-slate-400">Learn from real course content uploaded by professors</p>
          </div>

          <div className="group bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-xl rounded-2xl p-8 shadow-xl border border-white/10 hover:border-emerald-500/50 transition-all duration-300 hover:scale-105 hover:-translate-y-2">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-500 w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform">
              <TrendingUp className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-white">Track Progress</h3>
            <p className="text-slate-400">Monitor your growth with detailed analytics</p>
          </div>
        </div>

        {/* How it Works Card */}
        <div className="bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-xl rounded-3xl shadow-2xl p-10 border border-white/10">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Zap className="w-8 h-8 text-amber-400" />
            <h2 className="text-3xl font-bold text-white">How It Works</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            <div className="flex items-start gap-4">
              <div className="bg-violet-500/20 text-violet-400 font-bold text-xl w-10 h-10 rounded-xl flex items-center justify-center shrink-0">1</div>
              <div>
                <h4 className="font-semibold text-white mb-1">Enroll in Courses</h4>
                <p className="text-slate-400 text-sm">Join courses created by your professors</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="bg-fuchsia-500/20 text-fuchsia-400 font-bold text-xl w-10 h-10 rounded-xl flex items-center justify-center shrink-0">2</div>
              <div>
                <h4 className="font-semibold text-white mb-1">Take AI Tests</h4>
                <p className="text-slate-400 text-sm">Test yourself with personalized questions</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="bg-cyan-500/20 text-cyan-400 font-bold text-xl w-10 h-10 rounded-xl flex items-center justify-center shrink-0">3</div>
              <div>
                <h4 className="font-semibold text-white mb-1">Improve Continuously</h4>
                <p className="text-slate-400 text-sm">Track progress and master every topic</p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="pt-8 flex flex-col sm:flex-row gap-6 justify-center items-center">
          {!isAuthenticated ? (
            <>
              <Button
                size="lg"
                onClick={() => navigate("/login")}
                className="bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500 hover:opacity-90 text-white rounded-full px-12 py-7 text-xl shadow-2xl shadow-violet-500/25 hover:shadow-fuchsia-500/30 transition-all hover:scale-105 font-semibold border-0"
              >
                <Sparkles className="mr-3 w-6 h-6" />
                Login
                <ArrowRight className="ml-3 w-6 h-6" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/register")}
                className="border-2 border-white/20 text-white hover:bg-white/10 rounded-full px-12 py-7 text-xl shadow-lg transition-all hover:scale-105 font-semibold backdrop-blur-sm"
              >
                <Award className="mr-3 w-6 h-6" />
                Register
              </Button>
            </>
          ) : (
            <Button
              size="lg"
              onClick={() => navigate("/upload")}
              className="bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500 hover:opacity-90 text-white rounded-full px-12 py-7 text-xl shadow-2xl shadow-violet-500/25 transition-all hover:scale-105 font-semibold border-0"
            >
              <Rocket className="mr-3 w-6 h-6" />
              Get Started
              <ArrowRight className="ml-3 w-6 h-6" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Welcome;
