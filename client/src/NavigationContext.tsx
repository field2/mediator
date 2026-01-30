import React, { createContext } from 'react';

type NavigationContextType = {
	hasPreviousView: boolean;
	setHasPreviousView: React.Dispatch<React.SetStateAction<boolean>>;
};

const NavigationContext = createContext<NavigationContextType>({
	hasPreviousView: false,
	setHasPreviousView: () => {},
});

export default NavigationContext;
