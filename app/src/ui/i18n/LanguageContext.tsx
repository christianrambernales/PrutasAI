import React, { createContext, useContext, useMemo } from 'react';
import { Language, strings } from './strings';

/**
 * Language is read through context rather than threaded as a prop.
 *
 * Screens stay presentational about *data* — they still receive every value and
 * callback they render — but wording is ambient: passing ~90 strings down
 * through ten screens would swamp the prop lists that make those screens
 * readable, and every new string would touch the navigator.
 *
 * The default is English, so a screen rendered outside a provider (as several
 * unit tests do) still renders real words rather than key names.
 */
const LanguageContext = createContext<Language>('EN');

export function LanguageProvider({
  language,
  children,
}: {
  language: Language;
  children: React.ReactNode;
}) {
  return <LanguageContext.Provider value={language}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): Language {
  return useContext(LanguageContext);
}

/** The active dictionary. `const t = useT()` then `t.openCamera`. */
export function useT() {
  const language = useLanguage();
  return useMemo(() => strings(language), [language]);
}
