import React, { createContext, useContext, useState, useEffect } from 'react';
import { FaqCategory, defaultFaq } from '../data/defaultFaq';

interface FaqContextType {
  faqData: FaqCategory[];
  updateFaqData: (newData: FaqCategory[]) => void;
  resetToDefault: () => void;
}

const FaqContext = createContext<FaqContextType | undefined>(undefined);

export const FaqProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [faqData, setFaqData] = useState<FaqCategory[]>([]);

  useEffect(() => {
    const storedData = localStorage.getItem('luatools_faq');
    if (storedData) {
      try {
        setFaqData(JSON.parse(storedData));
      } catch (e) {
        console.error("Failed to parse stored FAQ data", e);
        setFaqData(defaultFaq);
      }
    } else {
      setFaqData(defaultFaq);
    }
  }, []);

  const updateFaqData = (newData: FaqCategory[]) => {
    setFaqData(newData);
    localStorage.setItem('luatools_faq', JSON.stringify(newData));
  };

  const resetToDefault = () => {
    setFaqData(defaultFaq);
    localStorage.removeItem('luatools_faq');
  };

  return (
    <FaqContext.Provider value={{ faqData, updateFaqData, resetToDefault }}>
      {children}
    </FaqContext.Provider>
  );
};

export const useFaq = () => {
  const context = useContext(FaqContext);
  if (context === undefined) {
    throw new Error('useFaq must be used within a FaqProvider');
  }
  return context;
};
