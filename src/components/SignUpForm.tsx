
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { UserPlus, Phone, User, MapPin, Building } from 'lucide-react';
import { AuthService } from '@/services/authService';
import { toast } from 'sonner';

interface SignUpFormProps {
  onSuccess: (user: any) => void;
  onBackToLogin: () => void;
}

export const SignUpForm: React.FC<SignUpFormProps> = ({
  onSuccess,
  onBackToLogin
}) => {
  const [formData, setFormData] = useState({
    mobileNumber: '',
    name: '',
    pin: '',
    confirmPin: '',
    city: '',
    centreCode: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const cities = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad', 'Pune', 'Ahmedabad'];

  const validateForm = () => {
    if (!formData.mobileNumber || !formData.name || !formData.pin || !formData.confirmPin) {
      toast.error('Please fill in all required fields');
      return false;
    }

    if (!/^[6-9]\d{9}$/.test(formData.mobileNumber)) {
      toast.error('Please enter a valid 10-digit mobile number');
      return false;
    }

    if (formData.pin.length !== 4) {
      toast.error('PIN must be exactly 4 digits');
      return false;
    }

    if (!/^\d+$/.test(formData.pin)) {
      toast.error('PIN must contain only numbers');
      return false;
    }

    if (formData.pin !== formData.confirmPin) {
      toast.error('PINs do not match');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const result = await AuthService.registerUser({
        mobileNumber: formData.mobileNumber,
        name: formData.name,
        pin: formData.pin,
        city: formData.city || undefined,
        centreCode: formData.centreCode || undefined
      });

      if (result.success && result.user) {
        toast.success('Account created successfully!');
        onSuccess(result.user);
      } else {
        toast.error(result.error || 'Registration failed');
      }
    } catch (error) {
      toast.error('Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <img 
            src="/lovable-uploads/a5f15a9d-5db7-4e0b-94ad-f2db19b50a25.png" 
            alt="Awign Logo" 
            className="h-6 w-6 object-contain" 
          />
        </div>
        <CardTitle className="text-xl md:text-2xl">Create Account</CardTitle>
        <p className="text-sm md:text-base text-muted-foreground">
          Sign up to track your tickets and reports
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="mobileNumber" className="text-sm font-medium">
              Mobile Number *
            </Label>
            <div className="relative mt-1">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="mobileNumber"
                type="tel"
                value={formData.mobileNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, mobileNumber: e.target.value }))}
                placeholder="Enter 10-digit mobile number"
                className="pl-10"
                required
                maxLength={10}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="name" className="text-sm font-medium">
              Full Name *
            </Label>
            <div className="relative mt-1">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter your full name"
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">PIN (4 digits) *</Label>
              <div className="mt-1 flex justify-center">
                <InputOTP
                  maxLength={4}
                  value={formData.pin}
                  onChange={(value) => setFormData(prev => ({ ...prev, pin: value }))}
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

            <div>
              <Label className="text-sm font-medium">Confirm PIN *</Label>
              <div className="mt-1 flex justify-center">
                <InputOTP
                  maxLength={4}
                  value={formData.confirmPin}
                  onChange={(value) => setFormData(prev => ({ ...prev, confirmPin: value }))}
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
          </div>

          <div>
            <Label className="text-sm font-medium">City (Optional)</Label>
            <div className="relative mt-1">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
              <Select
                value={formData.city}
                onValueChange={(value) => setFormData(prev => ({ ...prev, city: value }))}
              >
                <SelectTrigger className="pl-10">
                  <SelectValue placeholder="Select city" />
                </SelectTrigger>
                <SelectContent>
                  {cities.map((city) => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="centreCode" className="text-sm font-medium">
              Centre Code (Optional)
            </Label>
            <div className="relative mt-1">
              <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="centreCode"
                type="text"
                value={formData.centreCode}
                onChange={(e) => setFormData(prev => ({ ...prev, centreCode: e.target.value }))}
                placeholder="e.g., TCS-MUM-001"
                className="pl-10"
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            <UserPlus className="h-4 w-4 mr-2" />
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </Button>

          <div className="text-center">
            <Button
              type="button"
              variant="link"
              onClick={onBackToLogin}
              className="text-sm"
            >
              Already have an account? Login
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
