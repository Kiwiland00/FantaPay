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
      'home.myWallet': 'My Wallet',
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
      'competitions.nameAvailable': 'Name available',
      'competitions.nameExists': 'Name already exists',
      
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

      // Payment History
      'paymentHistory.title': 'Payment History',
      'paymentHistory.loading': 'Loading payment history...',
      'paymentHistory.loadFailed': 'Failed to load payment history',
      'paymentHistory.loadError': 'Failed to load payment history. Please try again or contact support.',
      'paymentHistory.summary': 'Payment Summary',
      'paymentHistory.options': 'Payment Options',
      'paymentHistory.singlePayment': 'Single Payment',
      'paymentHistory.bulkPayment': 'Bulk Payment',
      'paymentHistory.selected': 'Selected',
      'paymentHistory.matchdays': 'matchdays',
      'paymentHistory.total': 'Total',
      'paymentHistory.clear': 'Clear',
      'paymentHistory.payAll': 'Pay All',
      'paymentHistory.payNow': 'Pay Now',
      'paymentHistory.payMatchday': 'Pay Matchday',
      'paymentHistory.payMultiple': 'Pay Multiple Matchdays',
      'paymentHistory.paymentSuccess': 'Payment Successful!',
      'paymentHistory.paymentFailed': 'Failed to process payment. Please try again.',
      'paymentHistory.matchday': 'Matchday',
      'paymentHistory.paid': 'Paid',
      'paymentHistory.notPaid': 'Not paid',
      'paymentHistory.pending': 'Payment pending',
      'paymentHistory.all': 'All',
      'paymentHistory.allPayments': 'All Payments',
      'paymentHistory.paidMatchdays': 'Paid Matchdays',
      'paymentHistory.pendingMatchdays': 'Pending Matchdays',
      'paymentHistory.each': 'each',
      'paymentHistory.completed': 'payments completed',
      'paymentHistory.bulkHint': '💡 Select multiple pending matchdays below to pay them all at once',

      // Competition Creation & Management
      'competition.step1': 'Step 1: Competition Details',
      'competition.step2': 'Step 2: Prize Rules',
      'competition.step3': 'Step 3: Prize Configuration',
      'competition.step4': 'Step 4: Financial Settings',
      'competition.totalMatchdays': 'Total Matchdays',
      'competition.competitionName': 'Competition Name',
      'competition.enterName': 'Enter competition name',
      'competition.nameValidation': 'Competition name must be at least 3 characters',
      'competition.rules.daily': 'Daily Prize',
      'competition.rules.final': 'Final Prize Pool',
      'competition.rules.mixed': 'Mixed Rules (Daily + Final)',
      'competition.dailyPrizeAmount': 'Daily Prize Amount',
      'competition.finalPrizePool': 'Final Prize Pool',
      'competition.enableDailyPayments': 'Enable Daily Payments',
      'competition.dailyPaymentAmount': 'Daily Payment Amount',
      'competition.participationCost': 'Participation Cost per Team',
      'competition.expectedTeams': 'Expected Teams',
      'competition.totalPrizePool': 'Total Prize Pool',
      'competition.createCompetition': 'Create Competition',
      'competition.creatingCompetition': 'Creating Competition...',
      'competition.created': 'Competition Created!',
      'competition.createdSuccess': 'Your competition has been created successfully!',
      'competition.inviteCode': 'Invite Code',
      'competition.copyCode': 'Copy Code',
      'competition.shareWithParticipants': 'Share this code with participants to join your competition',
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
      'home.myWallet': 'Il mio Portafoglio',
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
      'competitions.nameAvailable': 'Nome disponibile',
      'competitions.nameExists': 'Nome già esistente',
      
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

      // Payment History
      'paymentHistory.title': 'Storico Pagamenti',
      'paymentHistory.loading': 'Caricamento storico pagamenti...',
      'paymentHistory.loadFailed': 'Errore nel caricamento dello storico pagamenti',
      'paymentHistory.loadError': 'Errore nel caricamento dello storico pagamenti. Riprova o contatta il supporto.',
      'paymentHistory.summary': 'Riepilogo Pagamenti',
      'paymentHistory.options': 'Opzioni di Pagamento',
      'paymentHistory.singlePayment': 'Pagamento Singolo',
      'paymentHistory.bulkPayment': 'Pagamento Multiplo',
      'paymentHistory.selected': 'Selezionate',
      'paymentHistory.matchdays': 'giornate',
      'paymentHistory.total': 'Totale',
      'paymentHistory.clear': 'Pulisci',
      'paymentHistory.payAll': 'Paga Tutto',
      'paymentHistory.payNow': 'Paga Ora',
      'paymentHistory.payMatchday': 'Paga Giornata',
      'paymentHistory.payMultiple': 'Paga Giornate Multiple',
      'paymentHistory.paymentSuccess': 'Pagamento Riuscito!',
      'paymentHistory.paymentFailed': 'Errore nel processare il pagamento. Riprova.',
      'paymentHistory.matchday': 'Giornata',
      'paymentHistory.paid': 'Pagato',
      'paymentHistory.notPaid': 'Non pagato',
      'paymentHistory.pending': 'Pagamento in sospeso',
      'paymentHistory.all': 'Tutti',
      'paymentHistory.allPayments': 'Tutti i Pagamenti',
      'paymentHistory.paidMatchdays': 'Giornate Pagate',
      'paymentHistory.pendingMatchdays': 'Giornate in Sospeso',
      'paymentHistory.each': 'ciascuna',
      'paymentHistory.completed': 'pagamenti completati',
      'paymentHistory.bulkHint': '💡 Seleziona giornate multiple in sospeso qui sotto per pagarle tutte insieme',

      // Competition Creation & Management
      'competition.step1': 'Passo 1: Dettagli Competizione',
      'competition.step2': 'Passo 2: Regole Premi',
      'competition.step3': 'Passo 3: Configurazione Premi',
      'competition.step4': 'Passo 4: Impostazioni Finanziarie',
      'competition.totalMatchdays': 'Giornate Totali',
      'competition.competitionName': 'Nome Competizione',
      'competition.enterName': 'Inserisci nome competizione',
      'competition.nameValidation': 'Il nome della competizione deve avere almeno 3 caratteri',
      'competition.rules.daily': 'Premio Giornaliero',
      'competition.rules.final': 'Montepremi Finale',
      'competition.rules.mixed': 'Regole Miste (Giornaliero + Finale)',
      'competition.dailyPrizeAmount': 'Importo Premio Giornaliero',
      'competition.finalPrizePool': 'Montepremi Finale',
      'competition.enableDailyPayments': 'Abilita Pagamenti Giornalieri',
      'competition.dailyPaymentAmount': 'Importo Pagamento Giornaliero',
      'competition.participationCost': 'Costo di Partecipazione per Squadra',
      'competition.expectedTeams': 'Squadre Previste',
      'competition.totalPrizePool': 'Montepremi Totale',
      'competition.createCompetition': 'Crea Competizione',
      'competition.creatingCompetition': 'Creando Competizione...',
      'competition.created': 'Competizione Creata!',
      'competition.createdSuccess': 'La tua competizione è stata creata con successo!',
      'competition.inviteCode': 'Codice Invito',
      'competition.copyCode': 'Copia Codice',
      'competition.shareWithParticipants': 'Condividi questo codice con i partecipanti per unirsi alla tua competizione',
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