import React, { useEffect, useState } from "react";

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

// Function to get JWT from URL or cookies
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getJWT();
    if (!token) return alert("No JWT token! Please log in again.");

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
      setTimeout(() => setUpdateSuccess(false), 3000);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Unknown error");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen text-gray-600 text-lg font-medium">
        Loading profile...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 max-w-xl mx-auto">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded shadow">
          <p className="text-red-700 font-semibold">{error}</p>
        </div>
      </div>
    );
  }

  if (!profile) return <div className="p-4 max-w-xl mx-auto">No profile data found.</div>;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-3xl font-extrabold mb-6 text-gray-800">User Profile</h2>

      {updateSuccess && (
        <div className="mb-4 bg-green-50 border-l-4 border-green-500 p-4 rounded shadow">
          <p className="text-green-700 font-medium">✅ Profile updated successfully!</p>
        </div>
      )}

      {!editMode ? (
        <div className="bg-white shadow-lg rounded-xl p-6 transition-transform transform hover:scale-105 duration-300">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="font-medium text-gray-800">{profile.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Username</p>
              <p className="font-medium text-gray-800">{profile.username || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Display Name</p>
              <p className="font-medium text-gray-800">{profile.displayName || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Phone Number</p>
              <p className="font-medium text-gray-800">{profile.phoneNumber || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Locale</p>
              <p className="font-medium text-gray-800">{profile.locale || "en"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Roles</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {profile.roles.length
                  ? profile.roles.map((role) => (
                      <span
                        key={role}
                        className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-semibold"
                      >
                        {role}
                      </span>
                    ))
                  : "None"}
              </div>
            </div>
          </div>

          <div className="border-t pt-4 flex flex-wrap gap-4 text-sm">
            <span className={`px-2 py-1 rounded ${profile.emailVerified ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
              Email Verified: {profile.emailVerified ? "✅ Yes" : "❌ No"}
            </span>
            <span className={`px-2 py-1 rounded ${profile.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
              Active: {profile.isActive ? "✅ Yes" : "❌ No"}
            </span>
            <span className={`px-2 py-1 rounded ${profile.mfaEnabled ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
              MFA: {profile.mfaEnabled ? "✅ Enabled" : "Disabled"}
            </span>
          </div>

          {profile.lastLoginAt && (
            <div className="mt-4 text-sm text-gray-500 border-t pt-2">
              Last login: {new Date(profile.lastLoginAt).toLocaleString()}
            </div>
          )}

          <button
            onClick={() => setEditMode(true)}
            className="mt-6 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold px-6 py-2 rounded-xl shadow hover:scale-105 transition-transform"
          >
            Edit Profile
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white shadow-lg rounded-xl p-6 space-y-4 transition-transform transform hover:scale-105 duration-300">
          <div className="grid grid-cols-1 gap-4">
            <InputField label="Display Name" name="displayName" value={formData.displayName || ""} onChange={handleChange} />
            <InputField label="Username" name="username" value={formData.username || ""} onChange={handleChange} />
            <InputField label="Phone Number" name="phoneNumber" value={formData.phoneNumber || ""} onChange={handleChange} type="tel" />
            <SelectField label="Locale" name="locale" value={formData.locale || "en"} onChange={handleChange} />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="bg-green-600 text-white font-semibold px-6 py-2 rounded-xl shadow hover:scale-105 transition-transform"
            >
              Save Changes
            </button>
            <button
              type="button"
              onClick={() => {
                setEditMode(false);
                setFormData({
                  displayName: profile.displayName || "",
                  username: profile.username || "",
                  phoneNumber: profile.phoneNumber || "",
                  locale: profile.locale || "en",
                });
              }}
              className="bg-gray-500 text-white font-semibold px-6 py-2 rounded-xl shadow hover:scale-105 transition-transform"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

// Reusable input component
const InputField: React.FC<{ label: string; name: string; value: string; onChange: any; type?: string }> = ({ label, name, value, onChange, type = "text" }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  </div>
);

// Reusable select component
const SelectField: React.FC<{ label: string; name: string; value: string; onChange: any }> = ({ label, name, value, onChange }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <select
      name={name}
      value={value}
      onChange={onChange}
      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <option value="en">English</option>
      <option value="es">Spanish</option>
      <option value="fr">French</option>
      <option value="de">German</option>
    </select>
  </div>
);

export default Profile;
