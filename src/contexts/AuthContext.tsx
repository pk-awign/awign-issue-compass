
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '@/types/issue';
import { AuthService } from '@/services/authService';

interface AuthContextType {
  user: User | null;
  isSuperAdmin: boolean;
  isResolver: boolean;
  isApprover: boolean;
  isInvigilator: boolean;
  login: (identifier: string, otp: string, type: 'mobile' | 'email') => boolean;
  loginWithPin: (identifier: string, pin: string, type?: 'mobile' | 'email') => Promise<boolean>;
  logout: () => void;
  switchRole: (role: 'invigilator' | 'resolver' | 'approver' | 'super_admin') => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// Fallback demo users for backward compatibility (OTP-based)
const fallbackDemoUsers = {
  'admin@example.com': { otp: '5555', userData: { id: 'admin_1', name: 'Super Admin User', role: 'super_admin' as const, city: 'Mumbai', centreCode: 'MUM001', email: 'admin@example.com', isActive: true }},
  'approver@example.com': { otp: '4444', userData: { id: 'approver_1', name: 'Vikram Gupta', role: 'approver' as const, city: 'Mumbai', centreCode: 'MUM001', email: 'approver@example.com', isActive: true }}
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  // Load user from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('awign_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        localStorage.removeItem('awign_user');
      }
    }
  }, []);

  // Save user to localStorage when user changes
  useEffect(() => {
    if (user) {
      localStorage.setItem('awign_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('awign_user');
    }
  }, [user]);

  console.log('AuthProvider rendered, user:', user);

  // Updated role checking logic
  const isSuperAdmin = user?.role === 'super_admin';
  const isResolver = user?.role === 'resolver';
  const isApprover = user?.role === 'approver';
  const isInvigilator = user?.role === 'invigilator';

  // Fallback login method for admin users (OTP-based) - kept for backward compatibility
  const login = (identifier: string, otp: string, type: 'mobile' | 'email'): boolean => {
    console.log('Fallback admin login attempt:', identifier, otp, type);
    const userRecord = fallbackDemoUsers[identifier as keyof typeof fallbackDemoUsers];
    
    if (userRecord && userRecord.otp === otp) {
      console.log('Fallback admin login successful:', userRecord.userData);
      setUser(userRecord.userData);
      return true;
    }
    
    console.log('Fallback admin login failed');
    return false;
  };

  // Primary PIN-based login for all users (database)
  const loginWithPin = async (identifier: string, pin: string, type: 'mobile' | 'email' = 'mobile'): Promise<boolean> => {
    console.log('PIN login attempt:', identifier, 'type:', type);
    
    try {
      const loginParams = type === 'mobile' 
        ? { mobileNumber: identifier, pin }
        : { email: identifier, pin };
        
      const result = await AuthService.loginUser(loginParams);
      
      if (result.success && result.user) {
        console.log('PIN login successful:', result.user);
        setUser(result.user);
        return true;
      } else {
        console.log('PIN login failed:', result.error);
        return false;
      }
    } catch (error) {
      console.log('PIN login error:', error);
      return false;
    }
  };

  const logout = () => {
    console.log('Logout');
    setUser(null);
  };

  const switchRole = (role: 'invigilator' | 'resolver' | 'approver' | 'super_admin') => {
    let userData: User;
    
    switch (role) {
      case 'invigilator':
        userData = {
          id: 'user_a',
          name: 'Invigilator User',
          role: 'invigilator',
          city: 'Mumbai',
          centreCode: 'MUM001',
          isActive: true
        };
        break;
      case 'resolver':
        userData = {
          id: 'resolver_1',
          name: 'Amit Singh',
          role: 'resolver',
          city: 'Mumbai',
          centreCode: 'MUM001',
          isActive: true
        };
        break;
      case 'approver':
        userData = {
          id: 'approver_1',
          name: 'Vikram Gupta',
          role: 'approver',
          city: 'Mumbai',
          centreCode: 'MUM001',
          isActive: true
        };
        break;
      case 'super_admin':
        userData = {
          id: 'admin_1',
          name: 'Super Admin User',
          role: 'super_admin',
          city: 'Mumbai',
          centreCode: 'MUM001',
          isActive: true
        };
        break;
    }
    
    setUser(userData);
  };

  console.log('AuthProvider providing context');

  return (
    <AuthContext.Provider value={{ 
      user, 
      isSuperAdmin, 
      isResolver, 
      isApprover, 
      isInvigilator,
      login, 
      loginWithPin,
      logout, 
      switchRole 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
