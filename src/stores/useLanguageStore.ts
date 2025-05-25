import { create } from 'zustand';
import i18n from '../i18n/i18n';

interface LanguageState {
  language: string;
  setLanguage: (lang: string) => void;
}

const useLanguageStore = create<LanguageState>((set) => ({
  language: i18n.language,
  setLanguage: (lang) => {
    i18n.changeLanguage(lang);
    set({ language: lang });
  },
}));

export default useLanguageStore;