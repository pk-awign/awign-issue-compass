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

    // Validate identifier based on login type
    if (loginType === 'mobile') {
      if (!/^[6-9]\d{9}$/.test(identifier)) {
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
      const success = await loginWithPin(identifier, pin, loginType);
      
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
            <span className="text-base sm:text-xl font-semibold text-gray-900 leading-tight">AWIGN ESCALATION MANAGEMENT</span>
            <span className="text-xs sm:text-sm text-gray-600 mt-1 leading-tight">Login Portal</span>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <Button variant="outline" size="sm" onClick={() => navigate('/')} className="flex items-center gap-2">
              <Home className="h-5 w-5 mr-1" />
              <span className="hidden sm:inline">Back to Home</span>
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
        <div className="flex items-center justify-center px-4" style={{ minHeight: 'calc(100vh - 80px)' }}>
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
      <div className="flex items-center justify-center px-4" style={{ minHeight: 'calc(100vh - 80px)' }}>
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
                  placeholder="Enter mobile number"
                  required
                  className="mt-1"
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
