import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface CallerInfo {
  methodName: string;
  filePath: string;
  lineNumber?: number;
}

export interface CallersModalState {
  isOpen: boolean;
  methodName: string | null;
  callers: CallerInfo[];
  showOpenWindowsOnly: boolean;
}

export interface CallersModalContextValue {
  state: CallersModalState;
  openModal: (methodName: string, callers: CallerInfo[]) => void;
  closeModal: () => void;
  toggleShowOpenWindowsOnly: () => void;
}

const CallersModalContext = createContext<CallersModalContextValue | null>(null);

export const useCallersModal = (): CallersModalContextValue => {
  const context = useContext(CallersModalContext);
  if (!context) {
    // SSR時はデフォルト値を返す
    if (typeof window === 'undefined') {
      return {
        state: {
          isOpen: false,
          methodName: null,
          callers: [],
          showOpenWindowsOnly: true
        },
        openModal: () => {},
        closeModal: () => {},
        toggleShowOpenWindowsOnly: () => {}
      };
    }
    throw new Error('useCallersModal must be used within a CallersModalProvider');
  }
  return context;
};

export interface CallersModalProviderProps {
  children: ReactNode;
}

export const CallersModalProvider: React.FC<CallersModalProviderProps> = ({ children }) => {
  const [state, setState] = useState<CallersModalState>({
    isOpen: false,
    methodName: null,
    callers: [],
    showOpenWindowsOnly: true
  });

  const openModal = useCallback((methodName: string, callers: CallerInfo[]) => {
    setState({
      isOpen: true,
      methodName,
      callers,
      showOpenWindowsOnly: true
    });
  }, []);

  const closeModal = useCallback(() => {
    setState(prev => ({
      ...prev,
      isOpen: false,
      methodName: null,
      callers: []
    }));
  }, []);

  const toggleShowOpenWindowsOnly = useCallback(() => {
    setState(prev => ({
      ...prev,
      showOpenWindowsOnly: !prev.showOpenWindowsOnly
    }));
  }, []);

  const value: CallersModalContextValue = {
    state,
    openModal,
    closeModal,
    toggleShowOpenWindowsOnly
  };

  return (
    <CallersModalContext.Provider value={value}>
      {children}
    </CallersModalContext.Provider>
  );
};