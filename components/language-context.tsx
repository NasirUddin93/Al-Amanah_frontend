'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type Language = 'en' | 'bn';

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  isBn: boolean;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'bn',
  setLang: () => {},
  toggleLang: () => {},
  isBn: true,
});

const STORAGE_KEY = 'al_amanah_lang_v2';

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Default to Bangla ('bn')
  const [lang, setLangState] = useState<Language>('bn');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Language | null;
      if (stored === 'en' || stored === 'bn') {
        setLangState(stored);
      } else {
        setLangState('bn');
        localStorage.setItem(STORAGE_KEY, 'bn');
      }
    } catch {}
    setMounted(true);
  }, []);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    try {
      localStorage.setItem(STORAGE_KEY, newLang);
    } catch {}
  };

  const toggleLang = () => {
    const nextLang: Language = lang === 'bn' ? 'en' : 'bn';
    setLang(nextLang);
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, isBn: lang === 'bn' }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
