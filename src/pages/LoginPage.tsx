import React from 'react';
import { LoginForm } from '@/components/LoginForm';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-4 md:py-8">
        <div className="mb-4 md:mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gray-800 p-1 rounded">
              <img 
                src="/awign-logo.svg" 
                alt="Awign Logo" 
                className="h-8 w-8 object-contain"
              />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Awign Issue Management</h1>
              <p className="text-sm text-gray-600">Login Portal</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            onClick={() => navigate('/')}
            size="sm"
          >
            <Home className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </div>
        <LoginForm />
      </div>
    </div>
  );
};
