import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initReactI18next } from 'react-i18next';
import i18n from 'i18next';

// Translation resources
const resources = {
  en: {
    translation: {
      // Common
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
      cancel: 'Cancel',
      confirm: 'Confirm',
      back: 'Back',
      next: 'Next',
      finish: 'Finish',
      save: 'Save',
      
      // Authentication
      login: 'Login',
      logout: 'Logout',
      'login.google': 'Login with Google',
      'login.biometric': 'Use Biometric Login',
      'auth.welcome': 'Welcome to FantaPay',
      'auth.subtitle': 'Manage your fantasy competitions and winnings',
      
      // Navigation
      'nav.home': 'Home',
      'nav.competitions': 'Competitions',
      'nav.wallet': 'Wallet',
      'nav.profile': 'Profile',
      
      // Home
      'home.welcome': 'Welcome back!',
      'home.createCompetition': 'Create Competition',
      'home.joinCompetition': 'Join Competition',
      'home.myWallet': 'My Wallet',
      'home.logs': 'Logs & Notifications',
      
      // Competition
      'competition.create.title': 'Create Competition',
      'competition.create.name': 'Competition Name',
      'competition.create.rules': 'Rules',
      'competition.create.invite': 'Invite Players',
      'competition.rules.daily': 'Daily Prize',
      'competition.rules.final': 'Final Prize Pool',
      'competition.rules.mixed': 'Daily + Final',
      'competition.join.title': 'Join Competition',
      'competition.join.code': 'Enter Invite Code',
      'competition.join.link': 'Or use invite link',
      'competition.standings': 'Standings',
      'competition.participants': 'Participants',
      'competition.wallet': 'Competition Wallet',
      
      // Wallet
      'wallet.balance': 'Balance',
      'wallet.topup': 'Top Up',
      'wallet.withdraw': 'Withdraw',
      'wallet.transactions': 'Transaction History',
      'wallet.personal': 'Personal Wallet',
      'wallet.competition': 'Competition Wallet',
      
      // Settings
      'settings.language': 'Language',
      'settings.biometric': 'Biometric Authentication',
      'settings.notifications': 'Notifications',
      
      // Prize
      'prize.position': 'Position',
      'prize.amount': 'Amount',
      'prize.first': '1st Place',
      'prize.second': '2nd Place',
      'prize.third': '3rd Place',
      
      // Currency
      'currency.euro': '€',
    },
  },
  it: {
    translation: {
      // Common
      loading: 'Caricamento...',
      error: 'Errore',
      success: 'Successo',
      cancel: 'Annulla',
      confirm: 'Conferma',
      back: 'Indietro',
      next: 'Avanti',
      finish: 'Fine',
      save: 'Salva',
      
      // Authentication
      login: 'Accedi',
      logout: 'Esci',
      'login.google': 'Accedi con Google',
      'login.biometric': 'Usa Login Biometrico',
      'auth.welcome': 'Benvenuto su FantaPay',
      'auth.subtitle': 'Gestisci le tue competizioni fantasy e le vincite',
      
      // Navigation
      'nav.home': 'Home',
      'nav.competitions': 'Competizioni',
      'nav.wallet': 'Portafoglio',
      'nav.profile': 'Profilo',
      
      // Home
      'home.welcome': 'Bentornato!',
      'home.createCompetition': 'Crea Competizione',
      'home.joinCompetition': 'Unisciti Competizione',
      'home.myWallet': 'Il Mio Portafoglio',
      'home.logs': 'Log e Notifiche',
      
      // Competition
      'competition.create.title': 'Crea Competizione',
      'competition.create.name': 'Nome Competizione',
      'competition.create.rules': 'Regole',
      'competition.create.invite': 'Invita Giocatori',
      'competition.rules.daily': 'Premio Giornaliero',
      'competition.rules.final': 'Montepremi Finale',
      'competition.rules.mixed': 'Giornaliero + Finale',
      'competition.join.title': 'Unisciti Competizione',
      'competition.join.code': 'Inserisci Codice Invito',
      'competition.join.link': 'O usa link invito',
      'competition.standings': 'Classifica',
      'competition.participants': 'Partecipanti',
      'competition.wallet': 'Portafoglio Competizione',
      
      // Wallet
      'wallet.balance': 'Saldo',
      'wallet.topup': 'Ricarica',
      'wallet.withdraw': 'Preleva',
      'wallet.transactions': 'Storico Transazioni',
      'wallet.personal': 'Portafoglio Personale',
      'wallet.competition': 'Portafoglio Competizione',
      
      // Settings
      'settings.language': 'Lingua',
      'settings.biometric': 'Autenticazione Biometrica',
      'settings.notifications': 'Notifiche',
      
      // Prize
      'prize.position': 'Posizione',
      'prize.amount': 'Importo',
      'prize.first': '1° Posto',
      'prize.second': '2° Posto',
      'prize.third': '3° Posto',
      
      // Currency
      'currency.euro': '€',
    },
  },
};

// Initialize i18next
i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

interface LanguageContextType {
  currentLanguage: string;
  changeLanguage: (language: string) => Promise<void>;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

interface LanguageProviderProps {
  children: React.ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState('en');

  useEffect(() => {
    loadSavedLanguage();
  }, []);

  const loadSavedLanguage = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem('selected_language');
      if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'it')) {
        setCurrentLanguage(savedLanguage);
        await i18n.changeLanguage(savedLanguage);
      }
    } catch (error) {
      console.error('Failed to load saved language:', error);
    }
  };

  const changeLanguage = async (language: string) => {
    try {
      if (language !== 'en' && language !== 'it') {
        throw new Error('Unsupported language');
      }

      setCurrentLanguage(language);
      await i18n.changeLanguage(language);
      await AsyncStorage.setItem('selected_language', language);
    } catch (error) {
      console.error('Failed to change language:', error);
      throw error;
    }
  };

  const t = (key: string): string => {
    return i18n.t(key);
  };

  const value: LanguageContextType = {
    currentLanguage,
    changeLanguage,
    t,
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};