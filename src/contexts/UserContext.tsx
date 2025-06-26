
import React, { createContext, useContext, useState } from 'react';
import { User } from '@/types/issue';

interface UserContextType {
  invigilators: User[];
  addInvigilator: (userData: Omit<User, 'id'>) => void;
  updateInvigilator: (userId: string, updates: Partial<User>) => void;
  removeInvigilator: (userId: string) => void;
  getInvigilatorByCity: (city: string) => User | null;
}

const UserContext = createContext<UserContextType | null>(null);

export const useUsers = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUsers must be used within UserProvider');
  }
  return context;
};

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [invigilators, setInvigilators] = useState<User[]>([
    {
      id: '1',
      name: 'Mumbai Resolver',
      role: 'resolver',
      city: 'Mumbai',
      centreCode: 'MUM001',
      isActive: true
    },
    {
      id: '2',
      name: 'Delhi Resolver',
      role: 'resolver',
      city: 'Delhi',
      centreCode: 'DEL001',
      isActive: true
    }
  ]);

  const addInvigilator = (userData: Omit<User, 'id'>) => {
    const newUser: User = {
      ...userData,
      id: String(invigilators.length + 1)
    };
    setInvigilators(prev => [...prev, newUser]);
  };

  const updateInvigilator = (userId: string, updates: Partial<User>) => {
    setInvigilators(prev => prev.map(user => 
      user.id === userId ? { ...user, ...updates } : user
    ));
  };

  const removeInvigilator = (userId: string) => {
    setInvigilators(prev => prev.filter(user => user.id !== userId));
  };

  const getInvigilatorByCity = (city: string) => {
    return invigilators.find(user => user.city === city) || null;
  };

  return (
    <UserContext.Provider value={{ 
      invigilators, 
      addInvigilator, 
      updateInvigilator, 
      removeInvigilator, 
      getInvigilatorByCity 
    }}>
      {children}
    </UserContext.Provider>
  );
};
