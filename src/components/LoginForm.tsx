import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { AlertTriangle, Lock, UserPlus, Mail, Phone, Home } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { SignUpForm } from './SignUpForm';
import { BrandLogo } from '@/components/BrandLogo';

export const LoginForm: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [loginType, setLoginType] = useState<'mobile' | 'email'>('mobile');
  const [identifier, setIdentifier] = useState('');
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { loginWithPin } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!identifier || !pin) {
      toast.error('Please fill in all fields');
      return;
    }

    let processedIdentifier = identifier;

    // Validate identifier based on login type
    if (loginType === 'mobile') {
      // Handle both formats: with country code (91XXXXXXXXXX) or without (XXXXXXXXXX)
      const cleanNumber = identifier.replace(/\D/g, ''); // Remove all non-digits
      if (cleanNumber.length === 12 && cleanNumber.startsWith('91')) {
        // If it's 12 digits and starts with 91, validate the remaining 10 digits
        const numberWithoutCode = cleanNumber.substring(2);
        if (!/^[6-9]\d{9}$/.test(numberWithoutCode)) {
          toast.error('Please enter a valid 10-digit mobile number');
          return;
        }
        // Use the clean number without country code
        processedIdentifier = numberWithoutCode;
      } else if (cleanNumber.length === 10) {
        // If it's exactly 10 digits, validate directly
        if (!/^[6-9]\d{9}$/.test(cleanNumber)) {
          toast.error('Please enter a valid 10-digit mobile number');
          return;
        }
        // Use the clean number
        processedIdentifier = cleanNumber;
      } else {
        toast.error('Please enter a valid 10-digit mobile number');
        return;
      }
    } else {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)) {
        toast.error('Please enter a valid email address');
        return;
      }
    }

    if (pin.length !== 4) {
      toast.error('PIN must be exactly 4 digits');
      return;
    }

    setIsLoading(true);
    
    try {
      const success = await loginWithPin(processedIdentifier, pin, loginType);
      
      if (success) {
        toast.success('Login successful!');
        navigate('/');
      } else {
        toast.error('Invalid credentials. Please check your details and try again.');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Login failed. Please try again.');
    }
    
    setIsLoading(false);
  };

  const handleSignUpSuccess = (user: any) => {
    toast.success('Account created and logged in successfully!');
    navigate('/');
  };

  // Styled header to match PublicIssueForm, with Back to Home button on the right
  const header = (
    <header className="bg-white border-b shadow-sm">
      <div className="container mx-auto px-3 py-3 sm:px-6 sm:py-4">
        <div className="flex w-full items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <BrandLogo />
            <div className="flex min-w-0 flex-col items-start">
              <span className="text-sm sm:text-xl font-semibold text-gray-900 leading-tight">ESCALATION MANAGEMENT</span>
              <span className="text-xs sm:text-sm text-gray-600 mt-1 leading-tight">Login Portal</span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/')} className="flex items-center gap-2">
              <Home className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Back to Home</span>
              <span className="sr-only sm:hidden">Back to Home</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );

  if (activeTab === 'signup') {
    return (
      <div className="min-h-screen bg-background">
        {header}
        <div className="flex items-center justify-center px-4 py-8" style={{ minHeight: 'calc(100dvh - 5rem)' }}>
          <SignUpForm 
            onSuccess={handleSignUpSuccess}
            onBackToLogin={() => setActiveTab('login')}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {header}
      <div className="flex items-center justify-center px-4 py-8" style={{ minHeight: 'calc(100dvh - 5rem)' }}>
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <AlertTriangle className="h-6 w-6 md:h-8 md:w-8 text-orange-500" />
            </div>
            <CardTitle className="text-xl md:text-2xl">User Login</CardTitle>
            <p className="text-sm md:text-base text-muted-foreground">
              Login to access your account and track tickets
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="identifier" className="text-sm">Mobile Number</Label>
                <Input
                  id="identifier"
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
                <Label htmlFor="pin" className="text-sm">PIN (4 digits)</Label>
                <div className="mt-1 flex justify-center">
                  <InputOTP
                    maxLength={4}
                    value={pin}
                    onChange={(value) => setPin(value)}
                  >
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

              <div className="text-center">
                <Button
                  type="button"
                  variant="link"
                  onClick={() => setActiveTab('signup')}
                  className="text-sm"
                >
                  <UserPlus className="h-4 w-4 mr-1" />
                  Don't have an account? Sign up
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
