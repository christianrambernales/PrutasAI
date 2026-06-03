import React, { createContext, useContext, useState } from 'react';
import en from '../i18n/en.json';
import fil from '../i18n/fil.json';

const translations = { en, fil };
const LanguageContext = createContext(null);

export function LanguageProvider({ children, initialLanguage = 'en' }) {
  const [language, setLanguage] = useState(initialLanguage);

  const t = (key) => {
    return translations[language]?.[key] || translations['en']?.[key] || key;
  };

  const switchLanguage = (lang) => {
    if (['en', 'fil'].includes(lang)) {
      setLanguage(lang);
    }
  };

  return (
    <LanguageContext.Provider value={{ language, t, switchLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
