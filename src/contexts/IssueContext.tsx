import React, { createContext, useContext } from 'react';

interface IssueContextType {
  // Empty for now
}

const IssueContext = createContext<IssueContextType>({});

export const IssueProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <IssueContext.Provider value={{}}>
      {children}
    </IssueContext.Provider>
  );
};

export const useIssues = () => {
  return useContext(IssueContext);
};