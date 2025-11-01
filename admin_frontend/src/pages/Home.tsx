import { User, Shield, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { API_BASE_URL } from "../api";

export default function Home() {
  // Note: We no longer auto-redirect from Home. Backend can choose the post-login
  // redirect (often /dashboard). Avoiding client-side redirect here prevents
  // accidental navigation to /dashboard after logout when session state is syncing.

  const { isAuthenticated, user, loading } = useAuth();

  const handleLogin = () => {
    window.location.href = `${API_BASE_URL}/oauth2/authorization/cognito`;
  };

  // (Content data removed since it wasn't used; keeps the component lean and avoids unused variable warnings.)

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
          {(!isAuthenticated && !loading) ? (
            <button
              onClick={handleLogin}
              className="px-6 py-2.5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl font-medium hover:bg-white/20 transition-all duration-300 text-sm"
            >
              Sign In
            </button>
          ) : (
            <Link
              to="/dashboard"
              className="px-6 py-2.5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl font-medium hover:bg-white/20 transition-all duration-300 text-sm"
            >
              Go to Dashboard
            </Link>
          )}
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
            {isAuthenticated ? (
              <>
                Welcome{user?.displayName ? `, ${user.displayName}` : ""}
              </>
            ) : (
              <>
                Staff Management
                <br />
                Made Simple
              </>
            )}
          </h1>

          {/* Subheading */}
          <p className="text-xl md:text-2xl text-blue-200/80 mb-12 max-w-3xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom duration-700 delay-200">
           Track, secure, and organize with ease.</p>

          {/* Primary CTA */}
          <div className="flex items-center justify-center mb-16 animate-in fade-in slide-in-from-bottom duration-700 delay-300">
            {(!isAuthenticated && !loading) ? (
              <button
                onClick={handleLogin}
                className="group relative px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl font-semibold shadow-2xl shadow-blue-500/50 hover:shadow-blue-500/70 transition-all duration-300 hover:scale-105 flex items-center gap-2 text-lg"
              >
                <User className="w-5 h-5" />
                Sign In to Dashboard
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            ) : (
              <Link
                to="/dashboard"
                className="group relative px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl font-semibold shadow-2xl shadow-blue-500/50 hover:shadow-blue-500/70 transition-all duration-300 hover:scale-105 flex items-center gap-2 text-lg"
              >
                <User className="w-5 h-5" />
                Go to Dashboard
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            )}
          </div>

      </div>
      </main> 

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-8">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-blue-200/60 text-sm">
            © 2025 Staff Management System. All rights reserved.
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