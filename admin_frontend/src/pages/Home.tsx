import React from 'react';
import { Shield, Users, Activity, ArrowRight } from 'lucide-react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';

const Home: React.FC = () => {
  const handleLogin = () => {
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8081';
    window.location.href = `${backendUrl}/oauth2/authorization/cognito`;
  };

  const features = [
    {
      icon: Users,
      title: 'User Management',
      description: 'Manage user accounts, roles, and permissions with ease',
    },
    {
      icon: Shield,
      title: 'Secure Authentication',
      description: 'AWS Cognito integration for enterprise-grade security',
    },
    {
      icon: Activity,
      title: 'Audit Logging',
      description: 'Track all system activities and user actions in real-time',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary-100 mb-8 animate-fade-in">
            <Shield className="w-10 h-10 text-primary-600" />
          </div>
          
          <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 mb-6 animate-slide-up">
            Staff Management
            <span className="block text-primary-600 mt-2">System</span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto animate-fade-in">
            Streamline your organization's user management with our secure,
            cloud-based platform powered by AWS Cognito
          </p>

          <Button
            size="lg"
            onClick={handleLogin}
            className="animate-slide-up shadow-xl hover:shadow-2xl"
            icon={<ArrowRight className="w-5 h-5" />}
          >
            Login with Cognito
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mt-20">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card
                key={index}
                hover
                className={`text-center animate-fade-in [animation-delay:${index * 100}ms]`}
              >
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary-100 mb-4">
                  <Icon className="w-7 h-7 text-primary-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 text-sm">{feature.description}</p>
              </Card>
            );
          })}
        </div>

        {/* Stats Section */}
        <div className="mt-20 grid grid-cols-3 gap-8 max-w-3xl mx-auto">
          {[
            { value: '99.9%', label: 'Uptime' },
            { value: '256-bit', label: 'Encryption' },
            { value: '24/7', label: 'Support' },
          ].map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-3xl font-bold text-primary-600 mb-1">
                {stat.value}
              </div>
              <div className="text-sm text-gray-600">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;
