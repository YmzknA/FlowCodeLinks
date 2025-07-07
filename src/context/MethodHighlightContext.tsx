'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface HighlightState {
  originalClickedMethod: string | null;
  setOriginalMethod: (methodName: string) => void;
  clearOriginalMethod: () => void;
}

const MethodHighlightContext = createContext<HighlightState | undefined>(undefined);

interface MethodHighlightProviderProps {
  children: ReactNode;
}

export const MethodHighlightProvider: React.FC<MethodHighlightProviderProps> = ({ children }) => {
  const [originalClickedMethod, setOriginalClickedMethod] = useState<string | null>(null);

  const setOriginalMethod = (methodName: string) => {
    setOriginalClickedMethod(methodName);
  };

  const clearOriginalMethod = () => {
    setOriginalClickedMethod(null);
  };

  const value: HighlightState = {
    originalClickedMethod,
    setOriginalMethod,
    clearOriginalMethod
  };

  return (
    <MethodHighlightContext.Provider value={value}>
      {children}
    </MethodHighlightContext.Provider>
  );
};

export const useMethodHighlight = (): HighlightState => {
  const context = useContext(MethodHighlightContext);
  if (context === undefined) {
    throw new Error('useMethodHighlight must be used within a MethodHighlightProvider');
  }
  return context;
};