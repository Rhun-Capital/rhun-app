'use client';

import { createContext, useContext, useState, ReactNode, useCallback } from 'react';

interface ModalContextType {
  isAnyModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: ReactNode }) {
  const [openModalCount, setOpenModalCount] = useState(0);

  // Use useCallback to memoize these functions
  const openModal = useCallback(() => {
    setOpenModalCount(prev => prev + 1);
  }, []);

  const closeModal = useCallback(() => {
    setOpenModalCount(prev => Math.max(0, prev - 1));
  }, []);

  return (
    <ModalContext.Provider 
      value={{ 
        isAnyModalOpen: openModalCount > 0,
        openModal,
        closeModal,
      }}
    >
      {children}
    </ModalContext.Provider>
  );
}

export function useModal() {
  const context = useContext(ModalContext);
  if (context === undefined) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
}