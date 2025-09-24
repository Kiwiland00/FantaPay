import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

const resources = {
  en: {
    translation: {
      // Common
      'common.loading': 'Loading...',
      'common.error': 'Error',
      'common.success': 'Success',
      'common.ok': 'OK',
      'common.cancel': 'Cancel',
      'common.save': 'Save',
      'common.delete': 'Delete',
      'common.edit': 'Edit',
      'common.back': 'Back',
      'common.next': 'Next',
      'common.previous': 'Previous',
      'common.confirm': 'Confirm',
      'common.yes': 'Yes',
      'common.no': 'No',

      // Auth
      'auth.login': 'Login',
      'auth.logout': 'Logout',
      'auth.signup': 'Sign Up',
      'auth.email': 'Email',
      'auth.password': 'Password',
      'auth.confirmPassword': 'Confirm Password',
      'auth.forgotPassword': 'Forgot Password?',
      'auth.dontHaveAccount': "Don't have an account?",
      'auth.alreadyHaveAccount': 'Already have an account?',
      'auth.signupSuccess': 'Account created successfully!',
      'auth.loginSuccess': 'Login successful!',
      'auth.verifyOTP': 'Verify OTP',
      'auth.enterOTP': 'Enter the OTP sent to your email',
      'auth.resendOTP': 'Resend OTP',
      'auth.otpVerified': 'OTP verified successfully!',

      // Navigation
      'nav.home': 'Home',
      'nav.competitions': 'Competitions',
      'nav.wallet': 'Wallet',
      'nav.profile': 'Profile',

      // Home
      'home.welcome': 'Welcome back!',
      'home.balance': 'Your Balance',
      'home.quickActions': 'Quick Actions',
      'home.recentTransactions': 'Recent Transactions',
      'home.createCompetition': 'Create Competition',
      'home.joinCompetition': 'Join Competition',
      'home.wallet': 'Wallet',
      'home.logs': 'Logs & Notifications',

      // Competition
      'competition.create.title': 'Create Competition',
      'competition.create.name': 'Competition Name',
      'competition.create.rules': 'Select Rules',
      'competition.join.title': 'Join Competition',
      'competition.join.code': 'Enter Code',
      'competition.details.title': 'Competition Details',
      'competition.standings': 'Standings',
      'competition.participants': 'Participants',
      'competition.wallet': 'Competition Wallet',

      // Competitions
      'competitions.title': 'Competitions',
      'competitions.myCompetitions': 'My Competitions',
      'competitions.create': 'Create Competition',
      'competitions.join': 'Join Competition',
      'competitions.joinCompetition': 'Join a Competition',
      'competitions.inviteCode': 'Invite Code',
      'competitions.enterCode': 'Enter invite code',
      'competitions.joinButton': 'Join Competition',
      'competitions.createNew': 'Create New Competition',
      'competitions.competitionName': 'Competition Name',
      'competitions.selectRules': 'Select Prize Rules',
      'competitions.dailyPrize': 'Daily Prize',
      'competitions.finalPrize': 'Final Prize Pool',
      'competitions.mixedRules': 'Mixed Rules',
      'competitions.participants': 'Participants',
      'competitions.wallet': 'Competition Wallet',
      'competitions.transactions': 'Transactions',
      'competitions.standings': 'Standings',
      'competitions.matchday': 'Matchday',
      'competitions.points': 'Points',
      'competitions.paid': 'Paid',
      'competitions.pending': 'Pending',
      'competitions.info': 'Info',
      'competitions.copyInvite': 'Copy Invite Link',
      'competitions.inviteCodeLabel': 'Invite Code:',
      'competitions.joinSuccess': 'Successfully joined the competition!',
      'competitions.enterCodeError': 'Please enter an invite code',
      'competitions.validCodeError': 'Please enter a valid invite code',
      'competitions.enterCodeDescription': 'Enter the invite code shared by the competition admin to join',
      'competitions.askAdminForCode': 'Ask the competition admin for the invite code',
      'competitions.useLinkComingSoon': 'Use invite link (Coming soon)',
      'competitions.paymentInstructions': 'Payment Instructions',
      'competitions.paymentInstructionsDetail': 'Payment for each matchday is required before the start. Contact the admin if you have any payment issues.',
      
      // Wallet
      'wallet.balance': 'Balance',
      'wallet.topUp': 'Top Up',
      'wallet.withdraw': 'Withdraw',
      'wallet.transactions': 'Transactions',
      'wallet.myWallet': 'My Wallet',
      'wallet.competitionWallets': 'Competition Wallets',
      'wallet.totalPaid': 'Total Paid',
      'wallet.totalOwed': 'Total Owed',
      'wallet.paymentHistory': 'Payment History',

      // Profile
      'profile.title': 'Profile',
      'profile.settings': 'Settings',
      'profile.language': 'Language',
      'profile.notifications': 'Notifications',
      'profile.security': 'Security',
      'profile.biometric': 'Biometric Authentication',
      'profile.changePassword': 'Change Password',
      'profile.deleteAccount': 'Delete Account',

      // Settings
      'settings.language': 'Language',
      'settings.notifications': 'Notifications',
      'settings.biometric': 'Biometric Authentication',
      'settings.privacy': 'Privacy',
      'settings.about': 'About',

      // Error messages
      'error.networkError': 'Network error. Please check your connection.',
      'error.serverError': 'Server error. Please try again later.',
      'error.invalidCredentials': 'Invalid email or password.',
      'error.emailAlreadyExists': 'Email already exists.',
      'error.weakPassword': 'Password is too weak.',
      'error.invalidEmail': 'Invalid email format.',
      'error.requiredField': 'This field is required.',
      
      // Success messages
      'success.profileUpdated': 'Profile updated successfully!',
      'success.passwordChanged': 'Password changed successfully!',
      'success.settingsSaved': 'Settings saved successfully!',
      
      // Currency
      'currency.euro': '€',
      
      // Logs and Notifications
      'nav.logs': 'Logs & Notifications',
      'logs.payments': 'Payment Logs',
      'logs.paid': 'Paid',
      'logs.notPaid': 'Not Paid',
      'logs.standings': 'Current Standings',
      'logs.position': 'Pos',
      'logs.player': 'Player',
      'logs.points': 'Points',
      'logs.joinedCompetitions': 'My Competitions',
      'logs.noCompetitions': 'No competitions joined',
      'logs.joinFirst': 'Join a competition to see logs and standings here',
      'logs.notificationDesc': 'Receive updates about competitions, payments, and standings',
    },
  },
  it: {
    translation: {
      // Common
      'common.loading': 'Caricamento...',
      'common.error': 'Errore',
      'common.success': 'Successo',
      'common.ok': 'OK',
      'common.cancel': 'Annulla',
      'common.save': 'Salva',
      'common.delete': 'Elimina',
      'common.edit': 'Modifica',
      'common.back': 'Indietro',
      'common.next': 'Avanti',
      'common.previous': 'Precedente',
      'common.confirm': 'Conferma',
      'common.yes': 'Sì',
      'common.no': 'No',

      // Auth
      'auth.login': 'Accedi',
      'auth.logout': 'Esci',
      'auth.signup': 'Registrati',
      'auth.email': 'Email',
      'auth.password': 'Password',
      'auth.confirmPassword': 'Conferma Password',
      'auth.forgotPassword': 'Password dimenticata?',
      'auth.dontHaveAccount': 'Non hai un account?',
      'auth.alreadyHaveAccount': 'Hai già un account?',
      'auth.signupSuccess': 'Account creato con successo!',
      'auth.loginSuccess': 'Accesso effettuato con successo!',
      'auth.verifyOTP': 'Verifica OTP',
      'auth.enterOTP': 'Inserisci il codice OTP inviato alla tua email',
      'auth.resendOTP': 'Reinvia OTP',
      'auth.otpVerified': 'OTP verificato con successo!',

      // Navigation
      'nav.home': 'Home',
      'nav.competitions': 'Competizioni',
      'nav.wallet': 'Portafoglio',
      'nav.profile': 'Profilo',

      // Home
      'home.welcome': 'Bentornato!',
      'home.balance': 'Il tuo Saldo',
      'home.quickActions': 'Azioni Rapide',
      'home.recentTransactions': 'Transazioni Recenti',
      'home.createCompetition': 'Crea Competizione',
      'home.joinCompetition': 'Unisciti Competizione',
      'home.wallet': 'Portafoglio',
      'home.logs': 'Log e Notifiche',

      // Competition
      'competition.create.title': 'Crea Competizione',
      'competition.create.name': 'Nome Competizione',
      'competition.create.rules': 'Seleziona Regole',
      'competition.join.title': 'Unisciti Competizione',
      'competition.join.code': 'Inserisci Codice',
      'competition.details.title': 'Dettagli Competizione',
      'competition.standings': 'Classifica',
      'competition.participants': 'Partecipanti',
      'competition.wallet': 'Portafoglio Competizione',

      // Competitions
      'competitions.title': 'Competizioni',
      'competitions.myCompetitions': 'Le Mie Competizioni',
      'competitions.create': 'Crea Competizione',
      'competitions.join': 'Unisciti ad una Competizione',
      'competitions.joinCompetition': 'Unisciti ad una Competizione',
      'competitions.inviteCode': 'Codice Invito',
      'competitions.enterCode': 'Inserisci codice invito',
      'competitions.joinButton': 'Unisciti Competizione',
      'competitions.createNew': 'Crea Nuova Competizione',
      'competitions.competitionName': 'Nome Competizione',
      'competitions.selectRules': 'Seleziona Regole Premio',
      'competitions.dailyPrize': 'Premio Giornaliero',
      'competitions.finalPrize': 'Montepremi Finale',
      'competitions.mixedRules': 'Regole Miste',
      'competitions.participants': 'Partecipanti',
      'competitions.wallet': 'Portafoglio Competizione',
      'competitions.transactions': 'Transazioni',
      'competitions.standings': 'Classifica',
      'competitions.matchday': 'Giornata',
      'competitions.points': 'Punti',
      'competitions.paid': 'Pagato',
      'competitions.pending': 'In Attesa',
      'competitions.info': 'Info',
      'competitions.copyInvite': 'Copia Link Invito',
      'competitions.inviteCodeLabel': 'Codice Invito:',
      'competitions.joinSuccess': 'Ti sei unito alla competizione con successo!',
      'competitions.enterCodeError': 'Inserisci un codice invito',
      'competitions.validCodeError': 'Inserisci un codice invito valido',
      'competitions.enterCodeDescription': 'Inserisci il codice invito condiviso dall\'amministratore della competizione per unirti',
      'competitions.askAdminForCode': 'Chiedi il codice invito all\'amministratore della competizione',
      'competitions.useLinkComingSoon': 'Usa link invito (Prossimamente)',
      'competitions.paymentInstructions': 'Istruzioni di Pagamento',
      'competitions.paymentInstructionsDetail': 'Il pagamento per ogni giornata è richiesto prima dell\'inizio. Contatta l\'amministratore se hai problemi di pagamento.',
      
      // Wallet
      'wallet.balance': 'Saldo',
      'wallet.topUp': 'Ricarica',
      'wallet.withdraw': 'Preleva',
      'wallet.transactions': 'Transazioni',
      'wallet.myWallet': 'Il mio Portafoglio',
      'wallet.competitionWallets': 'Portafogli Competizione',
      'wallet.totalPaid': 'Totale Pagato',
      'wallet.totalOwed': 'Totale Dovuto',
      'wallet.paymentHistory': 'Storico Pagamenti',

      // Profile
      'profile.title': 'Profilo',
      'profile.settings': 'Impostazioni',
      'profile.language': 'Lingua',
      'profile.notifications': 'Notifiche',
      'profile.security': 'Sicurezza',
      'profile.biometric': 'Autenticazione Biometrica',
      'profile.changePassword': 'Cambia Password',
      'profile.deleteAccount': 'Elimina Account',

      // Settings
      'settings.language': 'Lingua',
      'settings.notifications': 'Notifiche',
      'settings.biometric': 'Autenticazione Biometrica',
      'settings.privacy': 'Privacy',
      'settings.about': 'Informazioni',

      // Error messages
      'error.networkError': 'Errore di rete. Controlla la connessione.',
      'error.serverError': 'Errore del server. Riprova più tardi.',
      'error.invalidCredentials': 'Email o password non validi.',
      'error.emailAlreadyExists': 'Email già esistente.',
      'error.weakPassword': 'Password troppo debole.',
      'error.invalidEmail': 'Formato email non valido.',
      'error.requiredField': 'Questo campo è obbligatorio.',
      
      // Success messages
      'success.profileUpdated': 'Profilo aggiornato con successo!',
      'success.passwordChanged': 'Password cambiata con successo!',
      'success.settingsSaved': 'Impostazioni salvate con successo!',
      
      // Currency
      'currency.euro': '€',
      
      // Logs and Notifications
      'nav.logs': 'Log e Notifiche',
      'logs.payments': 'Log Pagamenti',
      'logs.paid': 'Pagato',
      'logs.notPaid': 'Non Pagato',
      'logs.standings': 'Classifica Attuale',
      'logs.position': 'Pos',
      'logs.player': 'Giocatore',
      'logs.points': 'Punti',
      'logs.joinedCompetitions': 'Le Mie Competizioni',
      'logs.noCompetitions': 'Nessuna competizione',
      'logs.joinFirst': 'Unisciti a una competizione per vedere log e classifiche qui',
      'logs.notificationDesc': 'Ricevi aggiornamenti su competizioni, pagamenti e classifiche',
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'en', // Default language
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

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState('en');

  useEffect(() => {
    loadSavedLanguage();
  }, []);

  const loadSavedLanguage = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem('language');
      if (savedLanguage) {
        setCurrentLanguage(savedLanguage);
        await i18n.changeLanguage(savedLanguage);
      }
    } catch (error) {
      console.error('Failed to load saved language:', error);
    }
  };

  const changeLanguage = async (language: string) => {
    try {
      await i18n.changeLanguage(language);
      await AsyncStorage.setItem('language', language);
      setCurrentLanguage(language);
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