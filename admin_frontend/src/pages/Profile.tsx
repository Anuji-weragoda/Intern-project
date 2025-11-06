import React, { useEffect, useState } from "react";
import { 
  User, Mail, Phone, Globe, Shield, CheckCircle, XCircle, 
  Edit2, Save, X, Clock, Calendar, Key, AlertCircle 
} from "lucide-react";

interface UserProfile {
  id?: number;
  email: string;
  username?: string;
  displayName?: string;
  phoneNumber?: string;
  locale?: string;
  roles: string[];
  isActive?: boolean;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  mfaEnabled?: boolean;
  createdAt?: string;
  lastLoginAt?: string | null;
}

interface UpdateProfileRequest {
  displayName?: string;
  username?: string;
  phoneNumber?: string;
  locale?: string;
}

const getJWT = (): string | null => {
  const urlParams = new URLSearchParams(window.location.search);
  const urlToken = urlParams.get("jwt");
  if (urlToken) return urlToken;

  const cookies = document.cookie.split(";");
  for (let cookie of cookies) {
    const [name, value] = cookie.trim().split("=");
    if (name === "jwt_token") return decodeURIComponent(value);
  }
  return null;
};

const Profile: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<UpdateProfileRequest>({});
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    const token = getJWT();

    if (!token) {
      setError("No JWT token found. Please log in.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("http://localhost:8081/api/v1/me", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      });

      if (!response.ok) throw new Error(`Error ${response.status}`);

      const data: UserProfile = await response.json();
      setProfile(data);
      setFormData({
        displayName: data.displayName || "",
        username: data.username || "",
        phoneNumber: data.phoneNumber || "",
        locale: data.locale || "en",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    setUpdateError(null);
    const token = getJWT();
    if (!token) {
      setUpdateError("No JWT token! Please log in again.");
      return;
    }

    try {
      const response = await fetch("http://localhost:8081/api/v1/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error(await response.text());
      const updated: UserProfile = await response.json();
      setProfile(updated);
      setEditMode(false);
      setUpdateSuccess(true);
      setTimeout(() => setUpdateSuccess(false), 5000);
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "Never";
    try {
      return new Date(dateString).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    const colors: { [key: string]: string } = {
      ADMIN: "bg-purple-100 text-purple-700 border-purple-200",
      USER: "bg-blue-100 text-blue-700 border-blue-200",
      MODERATOR: "bg-green-100 text-green-700 border-green-200",
      MANAGER: "bg-orange-100 text-orange-700 border-orange-200",
    };
    return colors[role.toUpperCase()] || "bg-gray-100 text-gray-700 border-gray-200";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg font-medium">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border-l-4 border-red-500">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Profile</h3>
              <p className="text-red-600">{error}</p>
              <button
                onClick={fetchProfile}
                className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center bg-white rounded-2xl shadow-xl p-12">
          <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">No profile data found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <div className="max-w-5xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">My Profile</h1>
          <p className="text-gray-600">Manage your account settings and preferences</p>
        </div>

        {/* Success Message */}
        {updateSuccess && (
          <div className="mb-6 bg-white rounded-xl shadow-lg p-4 border-l-4 border-green-500 animate-fade-in">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-500" />
              <div>
                <h4 className="font-semibold text-green-900">Success!</h4>
                <p className="text-green-700 text-sm">Your profile has been updated successfully.</p>
              </div>
            </div>
          </div>
        )}

        {/* Update Error */}
        {updateError && (
          <div className="mb-6 bg-white rounded-xl shadow-lg p-4 border-l-4 border-red-500">
            <div className="flex items-center gap-3">
              <XCircle className="w-6 h-6 text-red-500" />
              <div>
                <h4 className="font-semibold text-red-900">Update Failed</h4>
                <p className="text-red-700 text-sm">{updateError}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Profile Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              {/* Avatar Section */}
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-8 text-center">
                <div className="w-24 h-24 bg-white rounded-full mx-auto flex items-center justify-center shadow-lg mb-4">
                  <User className="w-12 h-12 text-indigo-600" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-1">
                  {profile.displayName || profile.username || "User"}
                </h2>
                <p className="text-indigo-100 text-sm">{profile.email}</p>
              </div>

              {/* Status Badges */}
              <div className="p-6 space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email Status
                  </span>
                      {profile.emailVerified ? (
                        <span className="flex items-center gap-1 text-green-900 text-sm font-medium">
                          <CheckCircle className="w-4 h-4" />
                          Verified
                        </span>
                  ) : (
                    <span className="flex items-center gap-1 text-red-600 text-sm font-medium">
                      <XCircle className="w-4 h-4" />
                      Not Verified
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600 flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Account Status
                  </span>
                  {profile.isActive ? (
                    <span className="flex items-center gap-1 text-green-900 text-sm font-medium">
                      <CheckCircle className="w-4 h-4" />
                      Active
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-gray-600 text-sm font-medium">
                      <XCircle className="w-4 h-4" />
                      Inactive
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600 flex items-center gap-2">
                    <Key className="w-4 h-4" />
                    Two-Factor Auth
                  </span>
                  {profile.mfaEnabled ? (
                    <span className="flex items-center gap-1 text-green-900 text-sm font-medium">
                      <CheckCircle className="w-4 h-4" />
                      Enabled
                    </span>
                  ) : (
                    <span className="text-gray-500 text-sm font-medium">
                      Disabled
                    </span>
                  )}
                </div>
              </div>

              {/* Roles */}
              <div className="px-6 pb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Roles & Permissions</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.roles.length > 0 ? (
                    profile.roles.map((role) => (
                      <span
                        key={role}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${getRoleBadgeColor(role)}`}
                      >
                        {role}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-500">No roles assigned</span>
                  )}
                </div>
              </div>

              {/* Account Info */}
              <div className="px-6 pb-6 border-t border-gray-100 pt-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>Joined {formatDate(profile.createdAt)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>Last login {formatDate(profile.lastLoginAt)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Profile Details */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-900">Profile Information</h3>
                {!editMode && (
                  <button
                    onClick={() => setEditMode(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-md"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit Profile
                  </button>
                )}
              </div>

              {!editMode ? (
                <div className="space-y-6">
                  {/* Personal Information */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
                      Personal Information
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <InfoField
                        icon={<User className="w-5 h-5 text-indigo-600" />}
                        label="Display Name"
                        value={profile.displayName || "Not set"}
                      />
                      <InfoField
                        icon={<User className="w-5 h-5 text-indigo-600" />}
                        label="Username"
                        value={profile.username || "Not set"}
                      />
                      <InfoField
                        icon={<Mail className="w-5 h-5 text-indigo-600" />}
                        label="Email Address"
                        value={profile.email}
                      />
                      <InfoField
                        icon={<Phone className="w-5 h-5 text-indigo-600" />}
                        label="Phone Number"
                        value={profile.phoneNumber || "Not set"}
                      />
                      <InfoField
                        icon={<Globe className="w-5 h-5 text-indigo-600" />}
                        label="Preferred Language"
                        value={getLocaleName(profile.locale || "en")}
                      />
                      {profile.id && (
                        <InfoField
                          icon={<Key className="w-5 h-5 text-indigo-600" />}
                          label="User ID"
                          value={profile.id.toString()}
                        />
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InputField
                      icon={<User className="w-5 h-5 text-gray-400" />}
                      label="Display Name"
                      name="displayName"
                      value={formData.displayName || ""}
                      onChange={handleChange}
                      placeholder="Enter your display name"
                    />
                    <InputField
                      icon={<User className="w-5 h-5 text-gray-400" />}
                      label="Username"
                      name="username"
                      value={formData.username || ""}
                      onChange={handleChange}
                      placeholder="Enter your username"
                    />
                    <InputField
                      icon={<Phone className="w-5 h-5 text-gray-400" />}
                      label="Phone Number"
                      name="phoneNumber"
                      value={formData.phoneNumber || ""}
                      onChange={handleChange}
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                    />
                    <SelectField
                      icon={<Globe className="w-5 h-5 text-gray-400" />}
                      label="Preferred Language"
                      name="locale"
                      value={formData.locale || "en"}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="flex gap-3 pt-6 border-t border-gray-200">
                    <button
                      onClick={handleSubmit}
                      className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors shadow-md"
                    >
                      <Save className="w-4 h-4" />
                      Save Changes
                    </button>
                    <button
                      onClick={() => {
                        setEditMode(false);
                        setUpdateError(null);
                        setFormData({
                          displayName: profile.displayName || "",
                          username: profile.username || "",
                          phoneNumber: profile.phoneNumber || "",
                          locale: profile.locale || "en",
                        });
                      }}
                      className="flex items-center gap-2 px-6 py-3 bg-gray-500 text-white font-semibold rounded-lg hover:bg-gray-600 transition-colors shadow-md"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper component for displaying info fields
const InfoField: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-100">
    <div className="flex-shrink-0 mt-0.5">{icon}</div>
    <div className="flex-1 min-w-0">
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <p className="text-sm font-semibold text-gray-900 break-words">{value}</p>
    </div>
  </div>
);

// Input field component
const InputField: React.FC<{
  icon: React.ReactNode;
  label: string;
  name: string;
  value: string;
  onChange: any;
  type?: string;
  placeholder?: string;
}> = ({ icon, label, name, value, onChange, type = "text", placeholder }) => (
  <div>
    <label className="block text-sm font-semibold text-gray-700 mb-2">{label}</label>
    <div className="relative">
      <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
        {icon}
      </div>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
      />
    </div>
  </div>
);

// Select field component
const SelectField: React.FC<{
  icon: React.ReactNode;
  label: string;
  name: string;
  value: string;
  onChange: any;
}> = ({ icon, label, name, value, onChange }) => (
  <div>
    <label htmlFor={name} className="block text-sm font-semibold text-gray-700 mb-2">{label}</label>
    <div className="relative">
      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
        {icon}
      </div>
      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors appearance-none bg-white"
      >
        <option value="en">English</option>
        <option value="es">Spanish (Español)</option>
        <option value="fr">French (Français)</option>
        <option value="de">German (Deutsch)</option>
        <option value="it">Italian (Italiano)</option>
        <option value="pt">Portuguese (Português)</option>
        <option value="ja">Japanese (日本語)</option>
        <option value="zh">Chinese (中文)</option>
      </select>
    </div>
  </div>
);

// Helper function to get locale full name
const getLocaleName = (locale: string): string => {
  const locales: { [key: string]: string } = {
    en: "English",
    es: "Spanish (Español)",
    fr: "French (Français)",
    de: "German (Deutsch)",
    it: "Italian (Italiano)",
    pt: "Portuguese (Português)",
    ja: "Japanese (日本語)",
    zh: "Chinese (中文)",
  };
  return locales[locale] || locale;
};

export default Profile;