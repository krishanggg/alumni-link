import { createContext, useContext } from 'react';

export interface NavigationFocusRequest {
  sourcePathname: string;
  destinationPathname: string;
  drawerWasOpen: boolean;
}

interface NavigationFocusHandoffValue {
  requestNavigationFocusRestore: (request: NavigationFocusRequest) => void;
  clearNavigationFocusRestore: () => void;
}

const DEFAULT_VALUE: NavigationFocusHandoffValue = {
  requestNavigationFocusRestore: () => {},
  clearNavigationFocusRestore: () => {},
};

export const NavigationFocusHandoffContext = createContext(DEFAULT_VALUE);

export function useNavigationFocusHandoff() {
  return useContext(NavigationFocusHandoffContext);
}
