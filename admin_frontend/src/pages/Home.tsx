import React from "react";

export default function Home() {
  const backendUrl = "http://localhost:8081";

  const handleLogin = () => {
    window.location.href = `${backendUrl}/oauth2/authorization/cognito`;
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white">
      <h1 className="text-5xl font-extrabold mb-6">Staff Management System</h1>
      <button
        onClick={handleLogin}
        className="bg-white text-indigo-600 px-8 py-3 rounded-full font-semibold shadow-lg hover:bg-gray-100 transition duration-300"
      >
        Login with Cognito
      </button>
    </div>
  );
}
