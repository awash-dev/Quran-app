// app/contexts/SidebarContext.tsx

import { createContext, useContext } from 'react';

interface SidebarContextType {
  toggleSidebar: () => void;
  sidebarVisible: boolean;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};

export default SidebarContext;