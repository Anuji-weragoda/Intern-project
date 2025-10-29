import React, { useEffect, useState } from 'react';
import { Mail, User, Phone, Globe, Shield, CheckCircle, XCircle, Edit2, Save, X } from 'lucide-react';
import { authService } from '../api/services/auth.service';
import { useApi } from '../hooks/useApi';
import { useToast } from '../hooks/useToast';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { Badge } from '../components/Badge';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorAlert } from '../components/ErrorAlert';
import { PageHeader } from '../components/PageHeader';
import type { UserProfile } from '../types/user.types';

const Profile: React.FC = () => {
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<Partial<UserProfile>>({});
  
  const { data: profile, loading, error, execute: fetchProfile } = useApi(authService.getCurrentUser);
  const { execute: updateProfile, loading: updating } = useApi(authService.updateProfile);
  
  const toast = useToast();

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (profile) {
      setFormData({
        displayName: profile.displayName || '',
        username: profile.username || '',
        phoneNumber: profile.phoneNumber || '',
        locale: profile.locale || 'en',
      });
    }
  }, [profile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await updateProfile(formData);
    
    if (result) {
      toast.success('Profile updated successfully!');
      setEditMode(false);
      fetchProfile();
    } else {
      toast.error('Failed to update profile');
    }
  };

  const handleCancel = () => {
    setEditMode(false);
    if (profile) {
      setFormData({
        displayName: profile.displayName || '',
        username: profile.username || '',
        phoneNumber: profile.phoneNumber || '',
        locale: profile.locale || 'en',
      });
    }
  };

  if (loading) {
    return <LoadingSpinner size="lg" message="Loading your profile..." />;
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <ErrorAlert message={error} onRetry={() => fetchProfile()} />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title="My Profile"
        description="Manage your account settings and preferences"
        action={
          !editMode && (
            <Button onClick={() => setEditMode(true)} icon={<Edit2 className="w-4 h-4" />}>
              Edit Profile
            </Button>
          )
        }
      />

      <div className="grid gap-6">
        <Card>
          {editMode ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <Input label="Display Name" name="displayName" value={formData.displayName || ''} onChange={handleChange} icon={<User className="w-5 h-5" />} placeholder="Enter your display name" />
                <Input label="Username" name="username" value={formData.username || ''} onChange={handleChange} icon={<User className="w-5 h-5" />} placeholder="Enter your username" />
                <Input label="Phone Number" name="phoneNumber" type="tel" value={formData.phoneNumber || ''} onChange={handleChange} icon={<Phone className="w-5 h-5" />} placeholder="+1 (555) 000-0000" />
                <Select label="Language" name="locale" value={formData.locale || 'en'} onChange={handleChange} options={[
                  { value: 'en', label: 'English' },
                  { value: 'es', label: 'Spanish' },
                  { value: 'fr', label: 'French' },
                  { value: 'de', label: 'German' },
                ]} />
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button type="submit" variant="success" loading={updating} icon={<Save className="w-4 h-4" />}>Save Changes</Button>
                <Button type="button" variant="ghost" onClick={handleCancel} disabled={updating} icon={<X className="w-4 h-4" />}>Cancel</Button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <InfoField icon={<Mail className="w-5 h-5" />} label="Email" value={profile.email} />
                <InfoField icon={<User className="w-5 h-5" />} label="Username" value={profile.username || '-'} />
                <InfoField icon={<User className="w-5 h-5" />} label="Display Name" value={profile.displayName || '-'} />
                <InfoField icon={<Phone className="w-5 h-5" />} label="Phone Number" value={profile.phoneNumber || '-'} />
                <InfoField icon={<Globe className="w-5 h-5" />} label="Language" value={profile.locale || 'en'} />
                <InfoField icon={<Shield className="w-5 h-5" />} label="Roles" value={
                  <div className="flex flex-wrap gap-2">
                    {profile.roles.length > 0 ? profile.roles.map((role) => <Badge key={role} variant="primary">{role}</Badge>) : <span className="text-gray-500">No roles</span>}
                  </div>
                } />
              </div>

              <div className="flex flex-wrap gap-3 pt-6 border-t">
                <StatusBadge icon={profile.emailVerified ? <CheckCircle /> : <XCircle />} label="Email" verified={profile.emailVerified} />
                <StatusBadge icon={profile.isActive ? <CheckCircle /> : <XCircle />} label="Account Active" verified={profile.isActive} />
                <StatusBadge icon={profile.mfaEnabled ? <CheckCircle /> : <XCircle />} label="MFA" verified={profile.mfaEnabled} />
              </div>

              {profile.lastLoginAt && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-500">
                    Last login: <span className="font-medium text-gray-700">{new Date(profile.lastLoginAt).toLocaleString()}</span>
                  </p>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

// Helper Components
const InfoField: React.FC<{ icon: React.ReactNode; label: string; value: React.ReactNode; }> = ({ icon, label, value }) => (
  <div>
    <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">{icon}<span>{label}</span></div>
    <div className="text-base font-medium text-gray-900">{value}</div>
  </div>
);

const StatusBadge: React.FC<{ icon: React.ReactNode; label: string; verified?: boolean; }> = ({ icon, label, verified }) => (
  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${verified ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
    <span className="w-4 h-4">{icon}</span>
    <span className="text-sm font-medium">{label}</span>
  </div>
);

export default Profile;
