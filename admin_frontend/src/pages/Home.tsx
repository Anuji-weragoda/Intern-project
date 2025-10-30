import { User, Shield, Users, BarChart3, ArrowRight, CheckCircle } from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";

export default function Home() {
  const backendUrl = "http://localhost:8081";
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (user && !loading) {
      navigate("/admin/dashboard");
    }
  }, [user, loading, navigate]);

  const handleLogin = () => {
    window.location.href = `${backendUrl}/oauth2/authorization/cognito`;
  };

  const features = [
    {
      icon: Users,
      title: "User Management",
      description: "Efficiently manage staff members and their roles"
    },
    {
      icon: Shield,
      title: "Secure Access",
      description: "Enterprise-grade security with AWS Cognito"
    },
    {
      icon: BarChart3,
      title: "Analytics",
      description: "Track and monitor staff performance metrics"
    }
  ];

  const benefits = [
    "Centralized staff data management",
    "Role-based access control",
    "Comprehensive audit logging",
    "Real-time updates and notifications"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse delay-500"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 px-6 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-xl">S</span>
            </div>
            <span className="text-2xl font-bold">Staff MS</span>
          </div>
          <button
            onClick={handleLogin}
            className="px-6 py-2.5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl font-medium hover:bg-white/20 transition-all duration-300 text-sm"
          >
            Sign In
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col items-center justify-center px-6 pt-20 pb-32">
        <div className="max-w-5xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/20 backdrop-blur-sm border border-blue-400/30 rounded-full mb-8 animate-in fade-in slide-in-from-top duration-700">
            <Shield className="w-4 h-4 text-blue-300" />
            <span className="text-sm font-medium text-blue-200">Secure & Reliable</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-6xl md:text-7xl font-extrabold mb-6 bg-gradient-to-r from-white via-blue-100 to-indigo-200 bg-clip-text text-transparent leading-tight animate-in fade-in slide-in-from-bottom duration-700 delay-100">
            Staff Management
            <br />
            Made Simple
          </h1>

          {/* Subheading */}
          <p className="text-xl md:text-2xl text-blue-200/80 mb-12 max-w-3xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom duration-700 delay-200">
            Streamline your workforce operations with powerful tools for managing staff, tracking activities, and ensuring security.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-in fade-in slide-in-from-bottom duration-700 delay-300">
            <button
              onClick={handleLogin}
              className="group relative px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl font-semibold shadow-2xl shadow-blue-500/50 hover:shadow-blue-500/70 transition-all duration-300 hover:scale-105 flex items-center gap-2 text-lg"
            >
              <User className="w-5 h-5" />
              Get Started
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              className="px-8 py-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl font-semibold hover:bg-white/20 transition-all duration-300 text-lg"
            >
              Learn More
            </button>
          </div>

          {/* Benefits List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto mb-20 animate-in fade-in slide-in-from-bottom duration-700 delay-400">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="flex items-center gap-3 px-4 py-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl"
              >
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                <span className="text-sm text-blue-100">{benefit}</span>
              </div>
            ))}
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom duration-700 delay-500">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="group relative p-8 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl hover:bg-white/10 hover:border-white/20 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/20"
                >
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                  <p className="text-blue-200/70 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-8">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-blue-200/60 text-sm">
            © 2025 Staff Management System. Powered by AWS Cognito.
          </p>
        </div>
      </footer>

      <style>{`
        @keyframes animate-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-in {
          animation: animate-in 0.7s ease-out forwards;
        }
        
        .delay-100 {
          animation-delay: 0.1s;
        }
        
        .delay-200 {
          animation-delay: 0.2s;
        }
        
        .delay-300 {
          animation-delay: 0.3s;
        }
        
        .delay-400 {
          animation-delay: 0.4s;
        }
        
        .delay-500 {
          animation-delay: 0.5s;
        }
        
        .delay-1000 {
          animation-delay: 1s;
        }
      `}</style>
    </div>
  );
}