import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, LogOut, GraduationCap, Brain, Rocket, Target, TrendingUp, Award } from "lucide-react";
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
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800 overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 180, 360],
          }}
          transition={{ duration: 25, repeat: Infinity }}
          className="absolute top-0 left-0 w-96 h-96 bg-primary/20 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [360, 180, 0],
          }}
          transition={{ duration: 20, repeat: Infinity }}
          className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-accent/20 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            y: [0, -30, 0],
          }}
          transition={{ duration: 15, repeat: Infinity }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl"
        />
      </div>

      {/* Logout Button */}
      {isAuthenticated && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-6 right-6 z-10"
        >
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              await logout();
              navigate('/login');
            }}
            className="rounded-full px-4 py-2 backdrop-blur-sm bg-card/70 hover:scale-105 transition-transform border border-border"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </motion.div>
      )}
      
      <div className="max-w-5xl w-full text-center space-y-12 relative z-10">
        {/* Hero Icon */}
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
          className="flex justify-center mb-8"
        >
          <div className="relative">
            <motion.div
              animate={{
                rotate: 360,
              }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 bg-gradient-to-r from-primary via-accent to-purple-500 rounded-full blur-2xl opacity-50"
            />
            <div className="relative bg-gradient-to-br from-primary to-accent rounded-3xl p-10 shadow-2xl border border-primary/20">
              <GraduationCap className="w-24 h-24 text-white drop-shadow-lg" />
            </div>
          </div>
        </motion.div>

        {/* Title */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-6"
        >
          <h1 className="text-7xl font-bold gradient-text leading-tight glow-text">
            Welcome to Aware
          </h1>
          <p className="text-2xl text-gray-300 font-medium">
            Your AI-powered study coach that helps you learn <span className="text-primary font-bold">smarter</span>, not harder.
          </p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12"
        >
          <motion.div
            whileHover={{ scale: 1.05, y: -5 }}
            className="bg-card/80 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-border hover:border-primary/50 transition-all"
          >
            <Brain className="w-12 h-12 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2 text-foreground">AI-Powered</h3>
            <p className="text-muted-foreground">Personalized tests based on your proficiency level</p>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.05, y: -5 }}
            transition={{ delay: 0.1 }}
            className="bg-card/80 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-border hover:border-accent/50 transition-all"
          >
            <Target className="w-12 h-12 text-accent mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2 text-foreground">Topic-Focused</h3>
            <p className="text-muted-foreground">Test yourself on specific topics you want to master</p>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.05, y: -5 }}
            transition={{ delay: 0.2 }}
            className="bg-card/80 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-border hover:border-purple-500/50 transition-all"
          >
            <TrendingUp className="w-12 h-12 text-purple-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2 text-foreground">Track Progress</h3>
            <p className="text-muted-foreground">Monitor your improvement with detailed analytics</p>
          </motion.div>
        </motion.div>

        {/* Description Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-card/80 backdrop-blur-xl rounded-3xl shadow-2xl p-10 border border-border"
        >
          <div className="flex items-center justify-center gap-3 mb-6">
            <Rocket className="w-8 h-8 text-primary" />
            <h2 className="text-3xl font-bold text-foreground">How It Works</h2>
          </div>
          <p className="text-xl text-gray-300 leading-relaxed">
            Professors upload course materials and create personalized learning paths. 
            Students select their proficiency level, take AI-generated tests, and receive 
            instant feedback. Our intelligent system adapts to your learning style, 
            helping you master topics efficiently.
          </p>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="pt-8 flex flex-col sm:flex-row gap-6 justify-center items-center"
        >
          {!isAuthenticated ? (
            <>
              <Button
                size="lg"
                onClick={() => navigate("/login")}
                className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-700 text-white rounded-full px-10 py-7 text-xl shadow-2xl hover:shadow-xl transition-all hover:scale-105 font-semibold"
              >
                <Sparkles className="mr-3 w-6 h-6" />
                Login
                <ArrowRight className="ml-3 w-6 h-6" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/register")}
                className="border-2 border-primary text-primary rounded-full px-10 py-7 text-xl shadow-lg hover:bg-primary/10 transition-all hover:scale-105 font-semibold"
              >
                <Award className="mr-3 w-6 h-6" />
                Register
              </Button>
            </>
          ) : (
            <Button
              size="lg"
              onClick={() => navigate("/upload")}
              className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-700 text-white rounded-full px-10 py-7 text-xl shadow-2xl hover:shadow-xl transition-all hover:scale-105 font-semibold"
            >
              <Rocket className="mr-3 w-6 h-6" />
              Get Started
              <ArrowRight className="ml-3 w-6 h-6" />
            </Button>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Welcome;
