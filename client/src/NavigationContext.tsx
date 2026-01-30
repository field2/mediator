import { createContext } from 'react';

const NavigationContext = createContext({
  hasPreviousView: false,
  setHasPreviousView: (v: boolean) => {},
});

export default NavigationContext;
