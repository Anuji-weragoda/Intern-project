import React from 'react';
import { useNavigate } from 'react-router-dom';

const Unauthorized: React.FC = () => {
  const navigate = useNavigate();

//   const handleSignInDifferent = () => {
//     try {
//       // Clear any locally stored tokens
//       try { localStorage.clear(); sessionStorage.clear(); } catch(e) { /* ignore */ }
//       // Clear cookie used by backend
//       // best-effort clear (may not clear httpOnly cookies set by the server)
//       document.cookie = 'jwt_token=; Max-Age=0; path=/';
//     } catch (e) {
//       // ignore
//     }

//     // Redirect to backend OAuth2 authorization endpoint to choose a different account
//     window.location.href = 'http://localhost:8081/oauth2/authorization/cognito';
//   };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-xl w-full bg-white rounded-xl shadow-md p-8 text-center">
        <h1 className="text-3xl font-bold text-red-700 mb-4">403 — Access Denied</h1>
        <p className="text-slate-600 mb-6">You do not have permission to access this application with your current account.</p>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
             Sign in with a different account
          </button>

          {/* <button
            type="button"
            onClick={handleSignInDifferent}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            Sign in with a different account
          </button> */}

          <p className="text-xs text-slate-400 mt-4">If you believe this is an error, contact your administrator.</p>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;
