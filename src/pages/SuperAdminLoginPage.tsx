import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { AlertTriangle, Home, Lock } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { AuthService } from '@/services/authService';

export const SuperAdminLoginPage: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { user, loading: authLoading, isSuperAdmin, establishSession } = useAuth();
  const navigate = useNavigate();

  if (authLoading) {
    return <div className="text-center mt-8">Loading...</div>;
  }

  if (user && isSuperAdmin) {
    return <Navigate to="/super-admin/all-tickets" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!identifier || !pin) {
      toast.error('Please fill in all fields');
      return;
    }

    const cleanNumber = identifier.replace(/\D/g, '');
    let processedIdentifier = identifier;

    if (cleanNumber.length === 12 && cleanNumber.startsWith('91')) {
      const numberWithoutCode = cleanNumber.substring(2);
      if (!/^[6-9]\d{9}$/.test(numberWithoutCode)) {
        toast.error('Please enter a valid 10-digit mobile number');
        return;
      }
      processedIdentifier = numberWithoutCode;
    } else if (cleanNumber.length === 10) {
      if (!/^[6-9]\d{9}$/.test(cleanNumber)) {
        toast.error('Please enter a valid 10-digit mobile number');
        return;
      }
      processedIdentifier = cleanNumber;
    } else {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }

    if (pin.length !== 4) {
      toast.error('PIN must be exactly 4 digits');
      return;
    }

    setIsLoading(true);
    try {
      const result = await AuthService.loginUser({
        mobileNumber: processedIdentifier,
        pin,
      });

      if (!result.success || !result.user) {
        toast.error('Invalid credentials. Please check your details and try again.');
        return;
      }

      if (result.user.role !== 'super_admin') {
        toast.error('Only Super Admin accounts can access this portal.');
        return;
      }

      establishSession(result.user);
      toast.success('Login successful!');
      navigate('/super-admin/all-tickets');
    } catch (error) {
      console.error('Super admin login error:', error);
      toast.error('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-2 py-2 sm:px-6 sm:py-4">
          <div className="flex items-center justify-between w-full">
            <div className="flex flex-col items-start">
              <div className="bg-gray-800 p-1 rounded">
                <img
                  src="/awign-logo.svg"
                  alt="Awign Logo"
                  className="w-8 h-8 object-contain"
                />
              </div>
            </div>
            <div className="flex flex-col items-start flex-1 ml-4">
              <span className="text-base sm:text-xl font-semibold text-gray-900 leading-tight">
                AWIGN ESCALATION MANAGEMENT
              </span>
              <span className="text-xs sm:text-sm text-gray-600 mt-1 leading-tight">
                Super Admin Portal
              </span>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/')}
                className="flex items-center gap-2"
              >
                <Home className="h-5 w-5 mr-1" />
                <span className="hidden sm:inline">Back to Home</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div
        className="flex items-center justify-center px-4"
        style={{ minHeight: 'calc(100vh - 80px)' }}
      >
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <AlertTriangle className="h-6 w-6 md:h-8 md:w-8 text-orange-500" />
            </div>
            <CardTitle className="text-xl md:text-2xl">Super Admin Login</CardTitle>
            <p className="text-sm md:text-base text-muted-foreground">
              Sign in to access All Tickets
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="super-admin-identifier" className="text-sm">
                  Mobile Number
                </Label>
                <Input
                  id="super-admin-identifier"
                  type="tel"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Enter mobile number (10 digits or with +91)"
                  required
                  className="mt-1"
                  maxLength={15}
                />
              </div>

              <div>
                <Label htmlFor="super-admin-pin" className="text-sm">
                  PIN (4 digits)
                </Label>
                <div className="mt-1 flex justify-center">
                  <InputOTP maxLength={4} value={pin} onChange={(value) => setPin(value)}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || !identifier || !pin}
              >
                <Lock className="h-4 w-4 mr-2" />
                {isLoading ? 'Logging in...' : 'Login'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SuperAdminLoginPage;
