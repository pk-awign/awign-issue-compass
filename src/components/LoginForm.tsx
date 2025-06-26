import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { AlertTriangle, Lock, UserPlus, Mail, Phone } from 'lucide-react';
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

  if (activeTab === 'signup') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <SignUpForm 
          onSuccess={handleSignUpSuccess}
          onBackToLogin={() => setActiveTab('login')}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
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
              <Label className="text-sm font-medium">Login Method</Label>
              <RadioGroup 
                value={loginType} 
                onValueChange={(value: 'mobile' | 'email') => setLoginType(value)}
                className="mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="mobile" id="mobile" />
                  <Label htmlFor="mobile" className="flex items-center gap-2 cursor-pointer">
                    <Phone className="h-4 w-4" />
                    Mobile Number
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="email" id="email" />
                  <Label htmlFor="email" className="flex items-center gap-2 cursor-pointer">
                    <Mail className="h-4 w-4" />
                    Email Address
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label htmlFor="identifier" className="text-sm">
                {loginType === 'mobile' ? 'Mobile Number' : 'Email Address'}
              </Label>
              <Input
                id="identifier"
                type={loginType === 'mobile' ? 'tel' : 'email'}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={loginType === 'mobile' ? 'Enter mobile number' : 'Enter email address'}
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
          
          <div className="mt-4 p-3 bg-muted rounded-lg text-xs md:text-sm text-muted-foreground space-y-2">
            <p className="font-medium mb-2">Demo Credentials:</p>
            <div className="space-y-1">
              <p><strong>Database Users (4-digit PIN):</strong></p>
              <p>Mobile: 9897700777 / PIN: 7060</p>
              <p>Mobile: 9876543210 / PIN: 1234</p>
              <p>Mobile: 9876543211 / PIN: 2345</p>
              <p>Mobile: 9876543213 / PIN: 4567</p>
              
              <p><strong>Note:</strong> All PINs are now exactly 4 digits</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
